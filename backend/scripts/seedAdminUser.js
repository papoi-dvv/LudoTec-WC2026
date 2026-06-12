require('dotenv').config()

const { createSupabaseAdminClient } = require('../src/supabaseAdmin')
const { upsertUserProfile } = require('../src/userProfiles')

const DEFAULT_ADMIN_EMAIL = 'admin@tecsup.edu.pe'
const DEFAULT_ADMIN_PASSWORD = 'Admin123456'

async function findUserByEmail(supabase, email) {
  const normalizedEmail = email.toLowerCase()
  let page = 1
  const perPage = 100

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) throw error

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === normalizedEmail)
    if (user) return user
    if (data.users.length < perPage) return null

    page += 1
  }
}

async function seedAdminUser() {
  const email = String(process.env.ADMIN_SEED_EMAIL || DEFAULT_ADMIN_EMAIL).trim().toLowerCase()
  const password = String(process.env.ADMIN_SEED_PASSWORD || DEFAULT_ADMIN_PASSWORD)
  const nombre = String(process.env.ADMIN_SEED_NAME || 'Admin LudoTec').trim()

  if (!email.endsWith('@tecsup.edu.pe')) {
    throw new Error('ADMIN_SEED_EMAIL must use the @tecsup.edu.pe domain')
  }

  if (password.length < 6) {
    throw new Error('ADMIN_SEED_PASSWORD must have at least 6 characters')
  }

  const supabase = createSupabaseAdminClient()
  let user = await findUserByEmail(supabase, email)

  if (user) {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        nombre,
        role: 'admin',
      },
      app_metadata: {
        ...user.app_metadata,
        role: 'admin',
      },
    })

    if (error) throw error
    user = data.user
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        role: 'admin',
      },
      app_metadata: {
        role: 'admin',
      },
    })

    if (error) throw error
    user = data.user
  }

  await upsertUserProfile(supabase, {
    ...user,
    user_metadata: {
      ...user.user_metadata,
      nombre,
    },
  })

  console.log(`Admin seed ready: ${email}`)
  console.log(`Password: ${password}`)
}

seedAdminUser().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
