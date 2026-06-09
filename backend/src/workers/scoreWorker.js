require('dotenv').config()

const { Worker } = require('bullmq')
const { createSupabaseAdminClient } = require('../supabaseAdmin')
const { getRedisClient } = require('../redisClient')
const { SCORE_MATCH_QUEUE_NAME, getRedisConnection } = require('../queues/scoringQueue')
const { processMatchScoring } = require('../jobs/processMatchScoring')

function createScoreWorker() {
  const supabase = createSupabaseAdminClient()

  return new Worker(
    SCORE_MATCH_QUEUE_NAME,
    async (job) => {
      const { partidoId } = job.data
      if (!partidoId) throw new Error('Missing partidoId')

      const redis = await getRedisClient()
      return processMatchScoring({ supabase, redis, partidoId })
    },
    {
      connection: getRedisConnection(),
      concurrency: Number(process.env.SCORE_WORKER_CONCURRENCY || 3),
    },
  )
}

if (require.main === module) {
  startScoreWorker().catch((error) => {
    console.error('Score worker could not start', error)
    process.exit(1)
  })
}

async function startScoreWorker() {
  try {
    const redis = await getRedisClient()
    await redis.ping()
  } catch (error) {
    throw new Error(
      `Redis is not available at ${process.env.REDIS_URL || 'redis://localhost:6379'}. Start Redis before running npm run worker:score.`,
      { cause: error },
    )
  }

  const worker = createScoreWorker()

  worker.on('completed', (job, result) => {
    console.log(`Scoring job ${job.id} completed`, result)
  })

  worker.on('failed', (job, error) => {
    console.error(`Scoring job ${job?.id} failed`, error)
  })

  console.log('Score worker is listening for finalized matches')
  return worker
}

module.exports = { createScoreWorker, startScoreWorker }
