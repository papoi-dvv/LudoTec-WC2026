const { calculatePredictionPoints } = require('../scoring')
const { leaderboardCacheKey } = require('../rooms')

const PAGE_SIZE = 500

async function fetchFinalizedMatch(supabase, partidoId) {
  const { data, error } = await supabase
    .from('partidos')
    .select('id, fecha_partido, estado, goles_local, goles_visitante')
    .eq('id', partidoId)
    .single()

  if (error) throw error
  if (!data) throw new Error(`Match ${partidoId} was not found`)
  if (data.estado !== 'FINALIZADO') throw new Error(`Match ${partidoId} is not FINALIZADO`)
  if (!Number.isInteger(data.goles_local) || !Number.isInteger(data.goles_visitante)) {
    throw new Error(`Match ${partidoId} does not have a final score`)
  }

  return data
}

async function fetchPredictionPage(supabase, partidoId, from, to) {
  const { data, error } = await supabase
    .from('predicciones')
    .select('id, usuario_id, marcador_local, marcador_visitante, fecha_creacion')
    .eq('partido_id', partidoId)
    .eq('procesado', false)
    .order('fecha_creacion', { ascending: true })
    .range(from, to)

  if (error) throw error
  return data || []
}

async function applyPredictionScore(supabase, prediction, match) {
  const points = calculatePredictionPoints(prediction, {
    goles_local: match.goles_local,
    goles_visitante: match.goles_visitante,
    fecha_partido: match.fecha_partido,
  })
  const wasCorrect = points.basePoints > 0

  const { data, error } = await supabase.rpc('apply_prediction_score', {
    p_prediction_id: prediction.id,
    p_usuario_id: prediction.usuario_id,
    p_base_points: points.basePoints,
    p_time_bonus: points.bonusPoints,
    p_was_correct: wasCorrect,
  })

  if (error) throw error

  return {
    predictionId: prediction.id,
    userId: prediction.usuario_id,
    basePoints: points.basePoints,
    timeBonus: points.bonusPoints,
    wasCorrect,
    applied: data?.[0] || null,
  }
}

async function invalidateUserLeaderboards({ supabase, redis, usuarioId }) {
  if (!redis) return

  const { data, error } = await supabase
    .from('sala_miembros')
    .select('sala_id')
    .eq('usuario_id', usuarioId)

  if (error) throw error

  const keys = (data || []).map((member) => leaderboardCacheKey(member.sala_id))
  if (keys.length > 0) {
    await redis.del(keys)
  }
}

async function processMatchScoring({ supabase, redis, partidoId }) {
  const match = await fetchFinalizedMatch(supabase, partidoId)
  let processed = 0
  let skipped = 0

  while (true) {
    const page = await fetchPredictionPage(supabase, partidoId, 0, PAGE_SIZE - 1)
    if (page.length === 0) break

    for (const prediction of page) {
      const result = await applyPredictionScore(supabase, prediction, match)
      if (result.applied?.already_processed) skipped += 1
      else {
        processed += 1
        await invalidateUserLeaderboards({
          supabase,
          redis,
          usuarioId: prediction.usuario_id,
        })
      }
    }

    if (page.length < PAGE_SIZE) break
  }

  return {
    partidoId,
    processed,
    skipped,
  }
}

module.exports = {
  processMatchScoring,
  applyPredictionScore,
  invalidateUserLeaderboards,
}
