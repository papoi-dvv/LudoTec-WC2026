require('dotenv').config()

const express = require('express')
const cors = require('cors')
const { calculatePredictionPoints } = require('./scoring')
const { createScoringQueue, enqueueMatchScoring } = require('./queues/scoringQueue')
const { createSupabaseAdminClient } = require('./supabaseAdmin')
const { getRedisClient } = require('./redisClient')
const { createRoom, getRoomLeaderboard } = require('./rooms')
const { generateMatchAnalysis, normalizeGeminiError } = require('./aiAnalysis')
const { isAllowedEmailDomain, normalizeEmail } = require('./authDomain')
const { ensureUserProfileById, upsertUserProfile } = require('./userProfiles')

async function getOptionalRedisClient() {
  try {
    return await getRedisClient()
  } catch (error) {
    console.warn(
      `Redis is not available; continuing without cache. ${error instanceof Error ? error.message : ''}`.trim(),
    )
    return null
  }
}

function createApp() {
  const app = express()
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'

  app.use(cors({
    origin: frontendUrl,
    credentials: true,
  }))
  app.use(express.json())

  app.get('/health', (_req, res) => {
    res.json({ ok: true })
  })

  app.post('/api/auth/register', async (req, res) => {
    try {
      const email = normalizeEmail(req.body.email)
      const password = String(req.body.password || '')

      if (!isAllowedEmailDomain(email)) {
        return res.status(400).json({
          error: 'El correo debe pertenecer al dominio @tecsup.edu.pe',
        })
      }

      if (password.length < 6) {
        return res.status(400).json({
          error: 'La contraseña debe tener al menos 6 caracteres',
        })
      }

      const supabase = createSupabaseAdminClient()
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (error) {
        return res.status(400).json({ error: error.message })
      }

      await upsertUserProfile(supabase, data.user)

      return res.status(201).json({ user: data.user })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Could not register user',
      })
    }
  })

  app.post('/api/auth/set-session', async (req, res) => {
    try {
      const { access_token } = req.body
      if (!access_token) {
        return res.status(400).json({ error: 'token missing' })
      }

      const supabase = createSupabaseAdminClient()
      const { data, error } = await supabase.auth.getUser(access_token)

      if (error || !data?.user) {
        return res.status(401).json({ error: 'invalid token' })
      }

      if (!data.user.email || !isAllowedEmailDomain(data.user.email)) {
        return res.status(403).json({ error: 'email domain not allowed' })
      }

      res.cookie('sb-access-token', access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 7,
        path: '/',
      })

      return res.json({ ok: true })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Could not set session',
      })
    }
  })

  app.post('/api/ai/match-analysis', async (req, res) => {
    try {
      const { equipoA, equipoB } = req.body
      const analysis = await generateMatchAnalysis({ equipoA, equipoB })

      return res.json(analysis)
    } catch (error) {
      const geminiError = normalizeGeminiError(error)
      return res.status(geminiError.status).json(geminiError)
    }
  })

  app.post('/api/scoring/calculate', (req, res) => {
    try {
      const { prediction, result } = req.body

      if (!prediction || !result) {
        return res.status(400).json({
          error: 'prediction and result are required',
        })
      }

      return res.json(calculatePredictionPoints(prediction, result))
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Invalid scoring request',
      })
    }
  })

  app.post('/api/salas', async (req, res) => {
    try {
      const { nombre, creador_id } = req.body
      const supabase = createSupabaseAdminClient()
      const redis = await getOptionalRedisClient()
      await ensureUserProfileById(supabase, creador_id)
      const sala = await createRoom({
        supabase,
        redis,
        nombre,
        creadorId: creador_id,
        frontendUrl: process.env.FRONTEND_URL,
      })

      return res.status(201).json({ sala })
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Could not create room',
      })
    }
  })

  app.get('/api/salas/:salaId/leaderboard', async (req, res) => {
    try {
      const { salaId } = req.params
      const supabase = createSupabaseAdminClient()
      const redis = await getOptionalRedisClient()
      const leaderboard = await getRoomLeaderboard({ supabase, redis, salaId })

      return res.json(leaderboard)
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Could not load leaderboard',
      })
    }
  })

  app.post('/api/admin/partidos/:partidoId/finalizar', async (req, res) => {
    try {
      const { partidoId } = req.params
      const { goles_local, goles_visitante } = req.body

      if (!Number.isInteger(goles_local) || !Number.isInteger(goles_visitante)) {
        return res.status(400).json({
          error: 'goles_local and goles_visitante must be integers',
        })
      }

      const supabase = createSupabaseAdminClient()
      const { data, error } = await supabase
        .from('partidos')
        .update({
          estado: 'FINALIZADO',
          goles_local,
          goles_visitante,
        })
        .eq('id', partidoId)
        .select('id, estado, goles_local, goles_visitante')
        .single()

      if (error) throw error

      const scoringQueue = createScoringQueue()
      const job = await enqueueMatchScoring(scoringQueue, partidoId)

      return res.json({
        partido: data,
        scoringJob: {
          id: job.id,
          name: job.name,
        },
      })
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : 'Could not finalize match',
      })
    }
  })

  return app
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000)
  const app = createApp()

  app.listen(port, () => {
    console.log(`LudoTec backend listening on port ${port}`)
  })
}

module.exports = { createApp }
