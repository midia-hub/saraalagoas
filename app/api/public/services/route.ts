import { NextResponse } from 'next/server'
import { getSiteConfig } from '@/lib/site-config-server'

/**
 * GET /api/public/services
 * Lista os cultos disponíveis para seleção no upload público.
 * Rota aberta — não requer autenticação.
 */
export async function GET() {
  try {
    const config = await getSiteConfig()
    const services = (config.services || []).map((s) => ({
      id: s.id,
      name: s.name,
    }))
    return NextResponse.json(services)
  } catch {
    return NextResponse.json([], { status: 200 })
  }
}
