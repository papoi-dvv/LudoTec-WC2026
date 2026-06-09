async function upsertUserProfile(supabase, user) {
  if (!user?.id || !user?.email) {
    throw new Error('User id and email are required to create a profile')
  }

  const { error } = await supabase
    .from('usuarios')
    .upsert({
      id: user.id,
      email: user.email,
      nombre: user.user_metadata?.nombre || user.email.split('@')[0],
    }, {
      onConflict: 'id',
    })

  if (error) throw error
}

async function ensureUserProfileById(supabase, userId) {
  const { data: existingProfile, error: profileError } = await supabase
    .from('usuarios')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (existingProfile) return

  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error || !data?.user) {
    throw error || new Error(`Auth user ${userId} was not found`)
  }

  await upsertUserProfile(supabase, data.user)
}

module.exports = {
  ensureUserProfileById,
  upsertUserProfile,
}
