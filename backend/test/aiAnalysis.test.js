const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildMatchAnalysisPrompt,
  clampToTwoLines,
  generateMatchAnalysis,
  normalizeGeminiError,
  normalizeTeamName,
} = require('../src/aiAnalysis')

test('normalizeTeamName trims valid team names', () => {
  assert.equal(normalizeTeamName(' Argentina ', 'equipoA'), 'Argentina')
})

test('buildMatchAnalysisPrompt requests a two-line Spanish analysis', () => {
  const prompt = buildMatchAnalysisPrompt('Argentina', 'Brasil')

  assert.match(prompt, /Argentina vs\. Brasil/)
  assert.match(prompt, /maximo 2 lineas/)
})

test('clampToTwoLines keeps only the first two non-empty lines', () => {
  assert.equal(clampToTwoLines('Linea 1\n\nLinea 2\nLinea 3'), 'Linea 1\nLinea 2')
})

test('generateMatchAnalysis uses the provided Gemini model', async () => {
  const model = {
    async generateContent(prompt) {
      assert.match(prompt, /Argentina vs\. Brasil/)

      return {
        response: {
          text() {
            return 'Argentina llega con ligera ventaja historica.\nBrasil mantiene opciones altas por su poder ofensivo.\nLinea extra.'
          },
        },
      }
    },
  }

  const result = await generateMatchAnalysis({
    equipoA: 'Argentina',
    equipoB: 'Brasil',
    model,
  })

  assert.equal(result.matchup, 'Argentina vs. Brasil')
  assert.equal(
    result.analysis,
    'Argentina llega con ligera ventaja historica.\nBrasil mantiene opciones altas por su poder ofensivo.',
  )
})

test('normalizeGeminiError returns a short quota error', () => {
  const error = normalizeGeminiError(new Error('[429 Too Many Requests] Quota exceeded. Please retry in 51.8s.'))

  assert.equal(error.status, 429)
  assert.equal(error.retryAfterSeconds, 52)
  assert.match(error.error, /cuota disponible/)
})
