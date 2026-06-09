const test = require('node:test')
const assert = require('node:assert/strict')
const { calculatePredictionPoints } = require('../src/scoring')

const match = {
  goles_local: 2,
  goles_visitante: 1,
  fecha_partido: '2026-06-11T18:00:00.000Z',
}

test('awards 5 base points for an exact score', () => {
  const points = calculatePredictionPoints({
    marcador_local: 2,
    marcador_visitante: 1,
    fecha_creacion: '2026-06-10T17:59:00.000Z',
  }, match)

  assert.equal(points.basePoints, 5)
  assert.equal(points.bonusPoints, 1)
  assert.equal(points.totalPoints, 6)
})

test('awards 3 base points when only the winner is correct', () => {
  const points = calculatePredictionPoints({
    marcador_local: 3,
    marcador_visitante: 0,
    fecha_creacion: '2026-06-11T12:00:00.000Z',
  }, match)

  assert.equal(points.basePoints, 3)
  assert.equal(points.bonusPoints, 0)
  assert.equal(points.totalPoints, 3)
})

test('awards 3 base points when only the draw outcome is correct', () => {
  const points = calculatePredictionPoints({
    marcador_local: 0,
    marcador_visitante: 0,
    fecha_creacion: '2026-06-11T12:00:00.000Z',
  }, {
    goles_local: 1,
    goles_visitante: 1,
    fecha_partido: match.fecha_partido,
  })

  assert.equal(points.basePoints, 3)
})

test('awards 2 base points when only the goal difference is correct', () => {
  const points = calculatePredictionPoints({
    marcador_local: 1,
    marcador_visitante: 2,
    fecha_creacion: '2026-06-11T12:00:00.000Z',
  }, {
    goles_local: 2,
    goles_visitante: 1,
    fecha_partido: match.fecha_partido,
  })

  assert.equal(points.basePoints, 2)
  assert.equal(points.totalPoints, 2)
})

test('does not add early bonus for predictions made in the last 10 minutes', () => {
  const points = calculatePredictionPoints({
    marcador_local: 2,
    marcador_visitante: 1,
    fecha_creacion: '2026-06-11T17:55:00.000Z',
  }, match)

  assert.equal(points.basePoints, 5)
  assert.equal(points.bonusPoints, 0)
  assert.equal(points.totalPoints, 5)
  assert.equal(points.timeBonusReason, 'last_minute')
})

test('awards 0 points when no rule matches', () => {
  const points = calculatePredictionPoints({
    marcador_local: 0,
    marcador_visitante: 4,
    fecha_creacion: '2026-06-11T12:00:00.000Z',
  }, match)

  assert.equal(points.basePoints, 0)
  assert.equal(points.totalPoints, 0)
})
