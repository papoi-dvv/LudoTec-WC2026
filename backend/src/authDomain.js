const ALLOWED_EMAIL_DOMAIN = '@tecsup.edu.pe'

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function isAllowedEmailDomain(email) {
  return /^[^@\s]+@tecsup\.edu\.pe$/.test(normalizeEmail(email))
}

module.exports = {
  ALLOWED_EMAIL_DOMAIN,
  normalizeEmail,
  isAllowedEmailDomain,
}
