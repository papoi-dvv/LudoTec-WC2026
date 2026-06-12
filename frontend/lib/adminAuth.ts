import type { User } from '@supabase/supabase-js'

export function isAdminUser(user: User | null | undefined) {
  return user?.app_metadata?.role === 'admin' || user?.user_metadata?.role === 'admin'
}
