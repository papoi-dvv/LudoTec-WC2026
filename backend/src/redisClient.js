const { createClient } = require('redis')

let redisClient

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://localhost:6379'
}

async function getRedisClient() {
  if (!redisClient) {
    redisClient = createClient({
      url: getRedisUrl(),
    })

    redisClient.on('error', (error) => {
      console.error('Redis client error', error)
    })
  }

  if (!redisClient.isOpen) {
    await redisClient.connect()
  }

  return redisClient
}

module.exports = {
  getRedisClient,
}
