const { Queue } = require('bullmq')

const SCORE_MATCH_QUEUE_NAME = 'score-match-finalized'

function getRedisConnection() {
  const redisUrl = new URL(process.env.REDIS_URL || 'redis://localhost:6379')

  return {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    tls: redisUrl.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: null,
  }
}

function createScoringQueue() {
  return new Queue(SCORE_MATCH_QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 1000,
      removeOnFail: 5000,
    },
  })
}

async function enqueueMatchScoring(queue, partidoId) {
  return queue.add(
    'score-match',
    { partidoId },
    {
      jobId: `score-match:${partidoId}`,
    },
  )
}

module.exports = {
  SCORE_MATCH_QUEUE_NAME,
  createScoringQueue,
  enqueueMatchScoring,
  getRedisConnection,
}
