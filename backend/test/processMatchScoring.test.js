const test = require('node:test')
const assert = require('node:assert/strict')
const { applyPredictionScore } = require('../src/jobs/processMatchScoring')

test('applyPredictionScore sends atomic score update to the database rpc', async () => {
  const calls = []
  const supabase = {
    rpc(name, payload) {
      calls.push({ name, payload })
      return {
        data: [{
          prediction_id: payload.p_prediction_id,
          user_id: payload.p_usuario_id,
          base_points: payload.p_base_points,
          time_bonus: payload.p_time_bonus,
          streak_bonus: 2,
          total_points: payload.p_base_points + payload.p_time_bonus + 2,
          new_streak: 3,
          already_processed: false,
        }],
        error: null,
      }
    },
  }

  const result = await applyPredictionScore(supabase, {
    id: 'prediction-1',
    usuario_id: 'user-1',
    marcador_local: 2,
    marcador_visitante: 1,
    fecha_creacion: '2026-06-10T17:00:00.000Z',
  }, {
    goles_local: 2,
    goles_visitante: 1,
    fecha_partido: '2026-06-11T18:00:00.000Z',
  })

  assert.deepEqual(calls, [{
    name: 'apply_prediction_score',
    payload: {
      p_prediction_id: 'prediction-1',
      p_usuario_id: 'user-1',
      p_base_points: 5,
      p_time_bonus: 1,
      p_was_correct: true,
    },
  }])
  assert.equal(result.applied.streak_bonus, 2)
  assert.equal(result.applied.total_points, 8)
})
