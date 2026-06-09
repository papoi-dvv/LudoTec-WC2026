export const ALLOWED_EMAIL_DOMAIN = '@tecsup.edu.pe'

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isAllowedEmailDomain(email: string) {
  const normalizedEmail = normalizeEmail(email)
  return /^[^@\s]+@tecsup\.edu\.pe$/.test(normalizedEmail)
}
