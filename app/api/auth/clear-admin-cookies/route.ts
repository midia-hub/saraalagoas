import { NextRequest, NextResponse } from 'next/server'
import { clearAdminAuthCookies } from '@/lib/admin-auth-cookies'

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true })
  clearAdminAuthCookies(response, request)
  return response
}
