import type { NextRequest } from 'next/server'

export function isAdminRequest(request: NextRequest): boolean {
  const access = request.cookies.get('admin_access')?.value
  if (access === '1') return true

  const headerSecret = request.headers.get('x-admin-secret')
  const cookieSecret = request.cookies.get('admin_secret')?.value
  const envSecret = process.env.ADMIN_SECRET

  if (envSecret && (headerSecret === envSecret || cookieSecret === envSecret)) {
    return true
  }

  return false
}

