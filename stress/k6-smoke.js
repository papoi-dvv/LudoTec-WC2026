import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<800'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost'

export default function () {
  const health = http.get(`${BASE_URL}/api/health`)
  check(health, {
    'health status is 200': (response) => response.status === 200,
  })

  const scoring = http.post(
    `${BASE_URL}/api/scoring/calculate`,
    JSON.stringify({
      prediction: {
        marcador_local: 2,
        marcador_visitante: 1,
        fecha_creacion: '2026-06-10T17:00:00.000Z',
      },
      result: {
        goles_local: 2,
        goles_visitante: 1,
        fecha_partido: '2026-06-11T18:00:00.000Z',
      },
    }),
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  )

  check(scoring, {
    'scoring status is 200': (response) => response.status === 200,
    'scoring returns totalPoints': (response) => response.json('totalPoints') !== undefined,
  })

  sleep(1)
}
