import { supabase } from '@/lib/supabase'
import { getSharedCookieDomainFromHost } from '@/lib/cookie-domain'
import { getSessionWithRecovery } from '@/lib/auth-recovery'

export function getAppBasePath(): string {
  return typeof process.env.NEXT_PUBLIC_USE_BASEPATH === 'string' &&
    process.env.NEXT_PUBLIC_USE_BASEPATH === 'true'
    ? '/saraalagoas'
    : ''
}

export function setClientAdminAccessFlag(): void {
  if (typeof document === 'undefined') return

  const domain = getSharedCookieDomainFromHost(window.location.hostname)
  const isHttps = window.location.protocol === 'https:'
  let cookie = 'admin_access=1; path=/; max-age=86400; SameSite=Lax'
  if (isHttps) cookie += '; Secure'
  if (domain) cookie += `; domain=${domain}`
  document.cookie = cookie
}

export function clearClientAdminAccessFlag(): void {
  if (typeof document === 'undefined') return

  const domain = getSharedCookieDomainFromHost(window.location.hostname)
  const base = 'admin_access=; path=/; max-age=0'
  document.cookie = base
  if (domain) document.cookie = `${base}; domain=${domain}`
}

export async function syncAdminAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const basePath = getAppBasePath()
  await fetch(`${basePath}/api/auth/set-admin-cookie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, refreshToken }),
    credentials: 'same-origin',
  }).catch(() => {})
}

export async function restoreSupabaseSessionFromCookie(): Promise<boolean> {
  const client = supabase
  if (!client) return false

  const existing = await getSessionWithRecovery(client)
  if (existing?.user) return true

  const basePath = getAppBasePath()
  const response = await fetch(`${basePath}/api/auth/restore-session`, {
    method: 'POST',
    credentials: 'same-origin',
  })
  if (!response.ok) return false

  const payload = await response.json().catch(() => ({}))
  if (typeof payload.access_token !== 'string' || typeof payload.refresh_token !== 'string') {
    return false
  }

  const { error } = await client.auth.setSession({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
  })

  return !error
}

export async function signOutAdmin(): Promise<void> {
  await supabase?.auth.signOut({ scope: 'local' })

  const basePath = getAppBasePath()
  await fetch(`${basePath}/api/auth/clear-admin-cookies`, {
    method: 'POST',
    credentials: 'same-origin',
  }).catch(() => {})

  clearClientAdminAccessFlag()
}
