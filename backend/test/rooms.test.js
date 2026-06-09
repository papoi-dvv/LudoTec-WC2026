const test = require('node:test')
const assert = require('node:assert/strict')
const {
  buildInviteUrl,
  generateInviteCode,
  normalizeLeaderboardRows,
} = require('../src/rooms')

test('generateInviteCode returns a short uppercase code', () => {
  const inviteCode = generateInviteCode()

  assert.match(inviteCode, /^[A-Z0-9]{10}$/)
})

test('buildInviteUrl creates a join link with the invite code', () => {
  const inviteUrl = buildInviteUrl('https://ludotec.example/', 'ABC123')

  assert.equal(inviteUrl, 'https://ludotec.example/rooms/join?code=ABC123')
})

test('normalizeLeaderboardRows sorts users by accumulated score', () => {
  const rows = normalizeLeaderboardRows([
    { id: 'u1', nombre: 'Ana', email: 'ana@tecsup.edu.pe', puntaje_total: 20 },
    { id: 'u2', nombre: 'Bruno', email: 'bruno@tecsup.edu.pe', puntaje_total: 35 },
    { id: 'u3', nombre: null, email: 'carlos@tecsup.edu.pe', puntaje_total: 20 },
  ])

  assert.deepEqual(rows.map((row) => ({
    posicion: row.posicion,
    nombre: row.nombre,
    puntaje_total: row.puntaje_total,
  })), [
    { posicion: 1, nombre: 'Bruno', puntaje_total: 35 },
    { posicion: 2, nombre: 'Ana', puntaje_total: 20 },
    { posicion: 3, nombre: 'carlos', puntaje_total: 20 },
  ])
})
