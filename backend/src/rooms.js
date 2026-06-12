const crypto = require('node:crypto')

const INVITE_CODE_LENGTH = 10
const LEADERBOARD_TTL_SECONDS = 30

function generateInviteCode() {
  return crypto
    .randomBytes(12)
    .toString('base64url')
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, INVITE_CODE_LENGTH)
}

function buildInviteUrl(baseUrl, inviteCode) {
  const normalizedBaseUrl = String(baseUrl || 'http://localhost:3001').replace(/\/$/, '')
  return `${normalizedBaseUrl}/rooms/join?code=${encodeURIComponent(inviteCode)}`
}

function leaderboardCacheKey(salaId) {
  return `leaderboard:sala:${salaId}`
}

function normalizeLeaderboardRows(users) {
  return users
    .map((user) => ({
      id: user.id,
      nombre: user.nombre || user.email?.split('@')[0] || 'Participante',
      email: user.email,
      puntaje_total: Number(user.puntaje_total || 0),
    }))
    .sort((a, b) => b.puntaje_total - a.puntaje_total || a.nombre.localeCompare(b.nombre))
    .map((user, index) => ({
      posicion: index + 1,
      ...user,
    }))
}

async function assertRoomMember(supabase, salaId, usuarioId) {
  const { data, error } = await supabase
    .from('sala_miembros')
    .select('sala_id')
    .eq('sala_id', salaId)
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (error) throw error
  if (!data) {
    const notMemberError = new Error('El usuario no pertenece a esta sala')
    notMemberError.status = 403
    throw notMemberError
  }
}

async function createRoom({ supabase, redis, nombre, creadorId, frontendUrl }) {
  const roomName = String(nombre || '').trim()

  if (!roomName) {
    throw new Error('Room name is required')
  }

  if (!creadorId) {
    throw new Error('creadorId is required')
  }

  let lastError

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const inviteCode = generateInviteCode()
    const { data, error } = await supabase
      .from('salas')
      .insert({
        nombre: roomName,
        codigo_invitacion: inviteCode,
        creador_id: creadorId,
      })
      .select('id, nombre, codigo_invitacion, creador_id, creado_en')
      .single()

    if (!error && data) {
      await supabase
        .from('sala_miembros')
        .upsert({
          sala_id: data.id,
          usuario_id: creadorId,
        })

      if (redis) {
        await redis.del(leaderboardCacheKey(data.id))
      }

      return {
        ...data,
        inviteUrl: buildInviteUrl(frontendUrl, data.codigo_invitacion),
      }
    }

    lastError = error
    if (!String(error?.message || '').toLowerCase().includes('duplicate')) {
      throw error
    }
  }

  throw lastError || new Error('Could not create unique invite code')
}

async function joinRoom({ supabase, redis, codigoInvitacion, usuarioId, frontendUrl }) {
  const inviteCode = String(codigoInvitacion || '').trim().toUpperCase()

  if (!inviteCode) {
    throw new Error('El codigo de invitacion es requerido')
  }

  if (!usuarioId) {
    throw new Error('usuarioId is required')
  }

  const { data: room, error: roomError } = await supabase
    .from('salas')
    .select('id, nombre, codigo_invitacion, creador_id, creado_en')
    .eq('codigo_invitacion', inviteCode)
    .maybeSingle()

  if (roomError) throw roomError
  if (!room) {
    const notFoundError = new Error('No existe una sala con ese codigo')
    notFoundError.status = 404
    throw notFoundError
  }

  const { error: memberError } = await supabase
    .from('sala_miembros')
    .upsert({
      sala_id: room.id,
      usuario_id: usuarioId,
    })

  if (memberError) throw memberError

  if (redis) {
    await redis.del(leaderboardCacheKey(room.id))
  }

  return {
    ...room,
    inviteUrl: buildInviteUrl(frontendUrl, room.codigo_invitacion),
  }
}

async function getRoomLeaderboard({ supabase, redis, salaId }) {
  const cacheKey = leaderboardCacheKey(salaId)
  const cached = redis ? await redis.get(cacheKey) : null

  if (cached) {
    return {
      source: 'redis',
      rows: JSON.parse(cached),
      ttlSeconds: LEADERBOARD_TTL_SECONDS,
    }
  }

  const { data: members, error: memberError } = await supabase
    .from('sala_miembros')
    .select('usuario_id')
    .eq('sala_id', salaId)

  if (memberError) throw memberError

  const userIds = (members || []).map((member) => member.usuario_id)
  if (userIds.length === 0) {
    if (redis) {
      await redis.setEx(cacheKey, LEADERBOARD_TTL_SECONDS, JSON.stringify([]))
    }

    return {
      source: redis ? 'database' : 'database-no-cache',
      rows: [],
      ttlSeconds: LEADERBOARD_TTL_SECONDS,
    }
  }

  const { data: users, error: usersError } = await supabase
    .from('usuarios')
    .select('id, email, nombre')
    .in('id', userIds)

  if (usersError) throw usersError

  const { data: predictions, error: predictionsError } = await supabase
    .from('predicciones')
    .select('usuario_id, puntos_obtenidos')
    .eq('sala_id', salaId)
    .in('usuario_id', userIds)

  if (predictionsError) throw predictionsError

  const pointsByUser = new Map()
  for (const prediction of predictions || []) {
    pointsByUser.set(
      prediction.usuario_id,
      (pointsByUser.get(prediction.usuario_id) || 0) + Number(prediction.puntos_obtenidos || 0),
    )
  }

  const rows = normalizeLeaderboardRows((users || []).map((user) => ({
    ...user,
    puntaje_total: pointsByUser.get(user.id) || 0,
  })))
  if (redis) {
    await redis.setEx(cacheKey, LEADERBOARD_TTL_SECONDS, JSON.stringify(rows))
  }

  return {
    source: redis ? 'database' : 'database-no-cache',
    rows,
    ttlSeconds: LEADERBOARD_TTL_SECONDS,
  }
}

async function listRoomMatches({ supabase, salaId, usuarioId }) {
  await assertRoomMember(supabase, salaId, usuarioId)

  const { data: matches, error: matchesError } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, fecha_partido, estado, goles_local, goles_visitante')
    .order('fecha_partido', { ascending: true })

  if (matchesError) throw matchesError

  const matchIds = (matches || []).map((match) => match.id)
  const predictionsByMatch = new Map()

  if (matchIds.length > 0) {
    const { data: predictions, error: predictionsError } = await supabase
      .from('predicciones')
      .select('id, partido_id, tipo_prediccion, prediccion_metadata, marcador_local, marcador_visitante, puntos_obtenidos, procesado')
      .eq('sala_id', salaId)
      .eq('usuario_id', usuarioId)
      .in('partido_id', matchIds)

    if (predictionsError) throw predictionsError

    for (const prediction of predictions || []) {
      predictionsByMatch.set(prediction.partido_id, prediction)
    }
  }

  return (matches || []).map((match) => ({
    ...match,
    mi_prediccion: predictionsByMatch.get(match.id) || null,
  }))
}

async function upsertRoomPrediction({
  supabase,
  redis,
  salaId,
  usuarioId,
  partidoId,
  marcadorLocal,
  marcadorVisitante,
  tipoPrediccion = 'exact',
  prediccionMetadata = {},
}) {
  await assertRoomMember(supabase, salaId, usuarioId)

  if (!partidoId) {
    throw new Error('partidoId is required')
  }

  if (!Number.isInteger(marcadorLocal) || !Number.isInteger(marcadorVisitante)) {
    throw new Error('Los marcadores deben ser numeros enteros')
  }

  if (marcadorLocal < 0 || marcadorVisitante < 0) {
    throw new Error('Los marcadores no pueden ser negativos')
  }

  if (!['exact', 'winner', 'difference'].includes(tipoPrediccion)) {
    throw new Error('tipoPrediccion is invalid')
  }

  const { data: match, error: matchError } = await supabase
    .from('partidos')
    .select('id, estado, fecha_partido')
    .eq('id', partidoId)
    .maybeSingle()

  if (matchError) throw matchError
  if (!match) {
    const notFoundError = new Error('El partido no existe')
    notFoundError.status = 404
    throw notFoundError
  }

  if (match.estado !== 'PROGRAMADO') {
    throw new Error('Solo se puede predecir partidos programados')
  }

  if (new Date(match.fecha_partido).getTime() <= Date.now()) {
    throw new Error('El partido ya empezo')
  }

  const { data: prediction, error: predictionError } = await supabase
    .from('predicciones')
    .upsert({
      usuario_id: usuarioId,
      sala_id: salaId,
      partido_id: partidoId,
      tipo_prediccion: tipoPrediccion,
      prediccion_metadata: prediccionMetadata,
      marcador_local: marcadorLocal,
      marcador_visitante: marcadorVisitante,
      puntos_base: 0,
      bonus_tiempo: 0,
      bonus_racha: 0,
      puntos_obtenidos: 0,
      procesado: false,
      procesado_en: null,
    }, {
      onConflict: 'usuario_id,sala_id,partido_id',
    })
    .select('id, usuario_id, sala_id, partido_id, tipo_prediccion, prediccion_metadata, marcador_local, marcador_visitante, puntos_obtenidos, procesado, fecha_creacion')
    .single()

  if (predictionError) throw predictionError

  if (redis) {
    await redis.del(leaderboardCacheKey(salaId))
  }

  return prediction
}

async function compareRoomPredictions({ supabase, salaId, usuarioId, partidoId }) {
  await assertRoomMember(supabase, salaId, usuarioId)

  let selectedPartidoId = partidoId

  if (!selectedPartidoId) {
    const { data: nextMatch, error: nextMatchError } = await supabase
      .from('partidos')
      .select('id')
      .order('fecha_partido', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextMatchError) throw nextMatchError
    selectedPartidoId = nextMatch?.id
  }

  if (!selectedPartidoId) {
    return {
      partido: null,
      miembros: [],
      resumen: [],
    }
  }

  const { data: match, error: matchError } = await supabase
    .from('partidos')
    .select('id, equipo_local, equipo_visitante, fecha_partido, estado, goles_local, goles_visitante')
    .eq('id', selectedPartidoId)
    .maybeSingle()

  if (matchError) throw matchError
  if (!match) {
    const notFoundError = new Error('El partido no existe')
    notFoundError.status = 404
    throw notFoundError
  }

  const { data: members, error: membersError } = await supabase
    .from('sala_miembros')
    .select('usuario_id')
    .eq('sala_id', salaId)

  if (membersError) throw membersError

  const userIds = (members || []).map((member) => member.usuario_id)
  const usersById = new Map()
  const predictionsByUser = new Map()

  if (userIds.length > 0) {
    const { data: users, error: usersError } = await supabase
      .from('usuarios')
      .select('id, email, nombre')
      .in('id', userIds)

    if (usersError) throw usersError

    for (const user of users || []) {
      usersById.set(user.id, user)
    }

    const { data: predictions, error: predictionsError } = await supabase
      .from('predicciones')
      .select('id, usuario_id, tipo_prediccion, prediccion_metadata, marcador_local, marcador_visitante, puntos_obtenidos, procesado, fecha_creacion')
      .eq('sala_id', salaId)
      .eq('partido_id', selectedPartidoId)
      .in('usuario_id', userIds)

    if (predictionsError) throw predictionsError

    for (const prediction of predictions || []) {
      predictionsByUser.set(prediction.usuario_id, prediction)
    }
  }

  const rows = userIds
    .map((id) => {
      const user = usersById.get(id)
      const prediction = predictionsByUser.get(id)

      return {
        usuario_id: id,
        nombre: user?.nombre || user?.email?.split('@')[0] || 'Participante',
        email: user?.email || '',
        prediccion: prediction ? {
          id: prediction.id,
          tipo_prediccion: prediction.tipo_prediccion || 'exact',
          prediccion_metadata: prediction.prediccion_metadata || {},
          marcador_local: prediction.marcador_local,
          marcador_visitante: prediction.marcador_visitante,
          puntos_obtenidos: Number(prediction.puntos_obtenidos || 0),
          procesado: Boolean(prediction.procesado),
          fecha_creacion: prediction.fecha_creacion,
        } : null,
      }
    })
    .sort((a, b) => {
      if (a.prediccion && !b.prediccion) return -1
      if (!a.prediccion && b.prediccion) return 1
      return a.nombre.localeCompare(b.nombre)
    })

  const summaryMap = new Map()
  for (const row of rows) {
    if (!row.prediccion) continue
    const key = `${row.prediccion.marcador_local}-${row.prediccion.marcador_visitante}`
    const summary = summaryMap.get(key) || {
      marcador_local: row.prediccion.marcador_local,
      marcador_visitante: row.prediccion.marcador_visitante,
      cantidad: 0,
    }
    summary.cantidad += 1
    summaryMap.set(key, summary)
  }

  return {
    partido: match,
    miembros: rows,
    resumen: Array.from(summaryMap.values()).sort((a, b) => b.cantidad - a.cantidad),
  }
}

module.exports = {
  createRoom,
  joinRoom,
  getRoomLeaderboard,
  listRoomMatches,
  upsertRoomPrediction,
  compareRoomPredictions,
  generateInviteCode,
  buildInviteUrl,
  leaderboardCacheKey,
  normalizeLeaderboardRows,
  assertRoomMember,
}
