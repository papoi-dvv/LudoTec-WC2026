const EARLY_BONUS_HOURS = 24
const LAST_MINUTE_MINUTES = 10

function toNumber(value, fieldName) {
  const numberValue = Number(value)

  if (!Number.isInteger(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`)
  }

  return numberValue
}

function toDate(value, fieldName) {
  const dateValue = new Date(value)

  if (Number.isNaN(dateValue.getTime())) {
    throw new Error(`${fieldName} must be a valid date`)
  }

  return dateValue
}

function getOutcome(localGoals, visitorGoals) {
  if (localGoals > visitorGoals) return 'LOCAL'
  if (localGoals < visitorGoals) return 'VISITOR'
  return 'DRAW'
}

function calculateBasePoints(prediction, result) {
  const predictedLocal = toNumber(prediction.marcador_local, 'prediction.marcador_local')
  const predictedVisitor = toNumber(prediction.marcador_visitante, 'prediction.marcador_visitante')
  const realLocal = toNumber(result.goles_local, 'result.goles_local')
  const realVisitor = toNumber(result.goles_visitante, 'result.goles_visitante')

  const exactScore = predictedLocal === realLocal && predictedVisitor === realVisitor
  if (exactScore) return 5

  const predictedOutcome = getOutcome(predictedLocal, predictedVisitor)
  const realOutcome = getOutcome(realLocal, realVisitor)
  if (predictedOutcome === realOutcome) return 3

  const predictedGoalDifference = Math.abs(predictedLocal - predictedVisitor)
  const realGoalDifference = Math.abs(realLocal - realVisitor)
  if (predictedGoalDifference === realGoalDifference) return 2

  return 0
}

function calculateTimeBonus(prediction, result) {
  const predictionDate = toDate(prediction.fecha_creacion, 'prediction.fecha_creacion')
  const matchDate = toDate(result.fecha_partido, 'result.fecha_partido')
  const minutesBeforeMatch = (matchDate.getTime() - predictionDate.getTime()) / (1000 * 60)

  if (minutesBeforeMatch <= LAST_MINUTE_MINUTES) {
    return {
      points: 0,
      reason: 'last_minute',
      minutesBeforeMatch,
    }
  }

  if (minutesBeforeMatch > EARLY_BONUS_HOURS * 60) {
    return {
      points: 1,
      reason: 'early_prediction',
      minutesBeforeMatch,
    }
  }

  return {
    points: 0,
    reason: 'standard_time',
    minutesBeforeMatch,
  }
}

function calculatePredictionPoints(prediction, result) {
  const basePoints = calculateBasePoints(prediction, result)
  const timeBonus = calculateTimeBonus(prediction, result)

  return {
    basePoints,
    bonusPoints: timeBonus.points,
    totalPoints: basePoints + timeBonus.points,
    timeBonusReason: timeBonus.reason,
    minutesBeforeMatch: timeBonus.minutesBeforeMatch,
  }
}

module.exports = {
  calculatePredictionPoints,
  calculateBasePoints,
  calculateTimeBonus,
}
