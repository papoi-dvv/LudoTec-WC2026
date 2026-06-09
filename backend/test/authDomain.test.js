const test = require('node:test')
const assert = require('node:assert/strict')
const { isAllowedEmailDomain, normalizeEmail } = require('../src/authDomain')

test('normalizes email before auth validation', () => {
  assert.equal(normalizeEmail(' Usuario@Tecsup.edu.pe '), 'usuario@tecsup.edu.pe')
})

test('allows only exact tecsup email domain', () => {
  assert.equal(isAllowedEmailDomain('usuario@tecsup.edu.pe'), true)
  assert.equal(isAllowedEmailDomain('usuario@sub.tecsup.edu.pe'), false)
  assert.equal(isAllowedEmailDomain('usuario@tecsup.edu.pe.fake'), false)
})
