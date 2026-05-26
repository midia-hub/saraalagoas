import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ROOT_DOMAIN, adminModuleRoutes } from '@/lib/admin-module-routes'

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

function getHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const host = forwardedHost || request.headers.get('host') || request.nextUrl.host
  return host.split(':')[0].toLowerCase()
}

function getModuleRouteByHost(request: NextRequest) {
  const hostname = getHostname(request)
  const rootDomain = ROOT_DOMAIN.toLowerCase()
  if (!hostname.endsWith(`.${rootDomain}`)) return null

  const subdomain = hostname.slice(0, -(rootDomain.length + 1))
  if (!subdomain || subdomain.includes('.')) return null

  return adminModuleRoutes.find((route) => route.subdomain === subdomain) ?? null
}

export function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl
    const moduleRoute = getModuleRouteByHost(request)
    // Nunca aplicar regras a estáticos: _next (CSS, JS, chunks), favicon, etc.
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname === '/robots.txt' ||
      pathname === '/manifest.json' ||
      pathname.startsWith('/brand/') ||
      pathname.includes('.png') ||
      pathname.includes('.ico')
    ) {
      return applySecurityHeaders(NextResponse.next())
    }
    const normalizedPath =
      pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
    const effectivePath =
      moduleRoute && normalizedPath === '/' ? moduleRoute.mainHref : normalizedPath
    
    // Bypass para Cron (Supabase/GitHub)
    if (normalizedPath.startsWith('/api/cron')) {
      return applySecurityHeaders(NextResponse.next())
    }

    const isXp26ResultadosPage = normalizedPath === '/xp26-resultados'
    const isXp26ResultadosApi = normalizedPath === '/api/public/xp26-resultados'

    if (isXp26ResultadosPage || isXp26ResultadosApi) {
      return applySecurityHeaders(NextResponse.next())
    }

    const isAdminPage = effectivePath.startsWith('/admin')
    const isAdminApi = effectivePath.startsWith('/api/admin')
    const isLoginPage = effectivePath === '/admin/login'
    const isCompletarCadastroPage = effectivePath === '/admin/completar-cadastro'
    const isPublicAdminPage = isLoginPage || isCompletarCadastroPage

    if ((isAdminPage || isAdminApi) && !isPublicAdminPage) {
      if (!hasAdminAccess(request)) {
        if (isAdminApi) {
          return applySecurityHeaders(NextResponse.json({ error: 'Acesso negado.' }, { status: 401 }))
        }
        const url = request.nextUrl.clone()
        url.pathname = '/admin/login'
        url.searchParams.set('next', normalizedPath)
        return applySecurityHeaders(NextResponse.redirect(url))
      }
    }

    if (moduleRoute && normalizedPath === '/') {
      const url = request.nextUrl.clone()
      url.pathname = moduleRoute.mainHref
      return applySecurityHeaders(NextResponse.rewrite(url))
    }

    return applySecurityHeaders(NextResponse.next())
  } catch (err) {
    console.error('[Middleware] Erro inesperado:', err)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/admin/:path*',
    '/((?!_next/static|_next/image|favicon|robots\\.txt|manifest\\.json).*)',
  ],
}

