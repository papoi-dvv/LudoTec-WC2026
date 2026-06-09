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
    .select('id, email, nombre, puntaje_total')
    .in('id', userIds)

  if (usersError) throw usersError

  const rows = normalizeLeaderboardRows(users || [])
  if (redis) {
    await redis.setEx(cacheKey, LEADERBOARD_TTL_SECONDS, JSON.stringify(rows))
  }

  return {
    source: redis ? 'database' : 'database-no-cache',
    rows,
    ttlSeconds: LEADERBOARD_TTL_SECONDS,
  }
}

module.exports = {
  createRoom,
  getRoomLeaderboard,
  generateInviteCode,
  buildInviteUrl,
  leaderboardCacheKey,
  normalizeLeaderboardRows,
}
