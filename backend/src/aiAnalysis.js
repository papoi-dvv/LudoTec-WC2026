const { GoogleGenerativeAI } = require('@google/generative-ai')

const DEFAULT_GEMINI_MODEL = 'gemini-2.0-flash'
const MAX_TEAM_NAME_LENGTH = 60

function normalizeTeamName(value, fieldName) {
  const teamName = String(value || '').trim()

  if (!teamName) {
    throw new Error(`${fieldName} is required`)
  }

  if (teamName.length > MAX_TEAM_NAME_LENGTH) {
    throw new Error(`${fieldName} must be ${MAX_TEAM_NAME_LENGTH} characters or less`)
  }

  return teamName
}

function buildMatchAnalysisPrompt(equipoA, equipoB) {
  return [
    'Actua como analista de futbol.',
    `Analiza ${equipoA} vs. ${equipoB}.`,
    'Da una estimacion breve de probabilidad de victoria basada en rendimiento historico, sin afirmar certeza absoluta.',
    'Responde en espanol, maximo 2 lineas, sin markdown.',
  ].join(' ')
}

function clampToTwoLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('\n')
}

function createGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY')
  }

  const genAI = new GoogleGenerativeAI(apiKey)
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  })
}

function extractRetryAfterSeconds(errorMessage) {
  const retryMatch = String(errorMessage).match(/retry in\s+(\d+(?:\.\d+)?)s/i)
  if (retryMatch) return Math.ceil(Number(retryMatch[1]))

  const retryDelayMatch = String(errorMessage).match(/"retryDelay":"(\d+)s"/i)
  if (retryDelayMatch) return Number(retryDelayMatch[1])

  return null
}

function normalizeGeminiError(error) {
  const message = error instanceof Error ? error.message : String(error || '')

  if (message.includes('[429 Too Many Requests]') || message.toLowerCase().includes('quota exceeded')) {
    return {
      status: 429,
      error: 'Gemini no tiene cuota disponible para esta API key. Revisa billing/cuotas o usa otra key con cuota activa.',
      retryAfterSeconds: extractRetryAfterSeconds(message),
    }
  }

  if (message.includes('[404 Not Found]') && message.includes('models/')) {
    return {
      status: 400,
      error: 'El modelo Gemini configurado no esta disponible para generateContent. Cambia GEMINI_MODEL en backend/.env.',
    }
  }

  if (message.includes('Missing GEMINI_API_KEY')) {
    return {
      status: 500,
      error: 'Falta configurar GEMINI_API_KEY en backend/.env.',
    }
  }

  return {
    status: 400,
    error: 'No se pudo generar el analisis con Gemini.',
  }
}

async function generateMatchAnalysis({ equipoA, equipoB, model = createGeminiModel() }) {
  const normalizedEquipoA = normalizeTeamName(equipoA, 'equipoA')
  const normalizedEquipoB = normalizeTeamName(equipoB, 'equipoB')
  const prompt = buildMatchAnalysisPrompt(normalizedEquipoA, normalizedEquipoB)
  const result = await model.generateContent(prompt)
  const text = result.response.text()

  return {
    matchup: `${normalizedEquipoA} vs. ${normalizedEquipoB}`,
    analysis: clampToTwoLines(text),
    model: process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
  }
}

module.exports = {
  buildMatchAnalysisPrompt,
  clampToTwoLines,
  generateMatchAnalysis,
  normalizeGeminiError,
  normalizeTeamName,
}
