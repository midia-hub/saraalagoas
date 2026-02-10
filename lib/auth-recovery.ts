import type { Session, SupabaseClient } from '@supabase/supabase-js'

function isInvalidRefreshTokenMessage(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('invalid refresh token') ||
    normalized.includes('refresh token not found') ||
    normalized.includes('jwt expired')
  )
}

export async function clearSupabaseLocalSession(
  supabaseClient: SupabaseClient
): Promise<void> {
  try {
    await supabaseClient.auth.signOut({ scope: 'local' })
  } catch {
    // Sign out can fail if token is already invalid. Continue local cleanup.
  }

  if (typeof window === 'undefined') return

  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      window.localStorage.removeItem(key)
    }
  }
}

export async function getSessionWithRecovery(
  supabaseClient: SupabaseClient
): Promise<Session | null> {
  const { data, error } = await supabaseClient.auth.getSession()
  if (!error) {
    return data.session ?? null
  }

  if (isInvalidRefreshTokenMessage(error.message)) {
    await clearSupabaseLocalSession(supabaseClient)
    return null
  }

  throw error
}
