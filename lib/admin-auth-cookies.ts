import type { NextRequest, NextResponse } from 'next/server'
import { getSharedCookieDomainFromHost } from '@/lib/cookie-domain'

export const ADMIN_ACCESS_COOKIE = 'admin_access'
export const ADMIN_REFRESH_COOKIE = 'admin_refresh'
const COOKIE_MAX_AGE = 86400

export function getHostnameFromRequest(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
  return host.split(':')[0].toLowerCase()
}

export function isHttpsRequest(request: NextRequest): boolean {
  return (
    request.headers.get('x-forwarded-proto') === 'https' ||
    request.url.startsWith('https:')
  )
}

function cookieOptions(request: NextRequest, maxAge: number) {
  const domain = getSharedCookieDomainFromHost(getHostnameFromRequest(request))
  return {
    path: '/',
    maxAge,
    sameSite: 'lax' as const,
    secure: isHttpsRequest(request),
    httpOnly: true,
    ...(domain ? { domain } : {}),
  }
}

export function setAdminAuthCookies(
  response: NextResponse,
  request: NextRequest,
  refreshToken: string,
): void {
  const options = cookieOptions(request, COOKIE_MAX_AGE)

  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: '1',
    ...options,
  })

  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: refreshToken,
    ...options,
  })
}

export function clearAdminAuthCookies(response: NextResponse, request: NextRequest): void {
  const options = cookieOptions(request, 0)

  response.cookies.set({
    name: ADMIN_ACCESS_COOKIE,
    value: '',
    ...options,
  })

  response.cookies.set({
    name: ADMIN_REFRESH_COOKIE,
    value: '',
    ...options,
  })
}
