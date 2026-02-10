import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'
import { getSiteConfig } from '@/lib/site-config-server'
import { requireAccess } from '@/lib/admin-api'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'upload', action: 'view' })
  if (!access.ok) return access.response

  const config = await getSiteConfig()
  const services = (config.services || []).map((s) => ({
    id: s.id,
    name: s.name,
  }))
  return NextResponse.json(services)
}
