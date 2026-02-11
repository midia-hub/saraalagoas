import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasAdminAccess(request: NextRequest): boolean {
  const access = request.cookies.get('admin_access')?.value
  if (access === '1') return true

  const secret = process.env.ADMIN_SECRET
  if (!secret) return false

  return (
    request.cookies.get('admin_secret')?.value === secret ||
    request.headers.get('x-admin-secret') === secret
  )
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  return response
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Nunca aplicar regras de admin a estáticos (favicon, _next, public)
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname === '/robots.txt' || pathname === '/manifest.json') {
    return applySecurityHeaders(NextResponse.next())
  }
  const normalizedPath =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const isAdminPage = normalizedPath.startsWith('/admin')
  const isAdminApi = normalizedPath.startsWith('/api/admin')
  const isLoginPage = normalizedPath === '/admin/login'
  const isCompletarCadastroPage = normalizedPath === '/admin/completar-cadastro'
  const isPublicAdminPage = isLoginPage || isCompletarCadastroPage

  if ((isAdminPage || isAdminApi) && !isPublicAdminPage) {
    if (!hasAdminAccess(request)) {
      if (isAdminApi) {
        return applySecurityHeaders(NextResponse.json({ error: 'Acesso negado.' }, { status: 401 }))
      }
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return applySecurityHeaders(NextResponse.redirect(url))
    }
  }

  return applySecurityHeaders(NextResponse.next())
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon|robots\\.txt|manifest\\.json).*)',
  ],
}

