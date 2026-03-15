import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'

const EXPIRY_WARN_DAYS = 7

type IntegrationHealth = {
  id: string
  name: string
  status: 'expired' | 'expiring_soon'
  daysLeft: number | null
}

/**
 * GET /api/meta/token-health
 *
 * Retorna integrações Meta com token expirado ou prestes a expirar (≤7 dias).
 * Também registra `metadata.last_expiry_alert_at` para rastrear quando o alerta
 * foi detectado pela primeira vez — útil para auditar e evitar disparos repetidos.
 */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const db = createSupabaseServerClient(request)
  const userId = access.snapshot.userId
  const now = new Date()

  const { data: rows, error } = await db
    .from('meta_integrations')
    .select('id, page_name, instagram_username, token_expires_at, is_active, metadata')
    .eq('created_by', userId)
    .eq('is_active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const items: IntegrationHealth[] = []
  const toAlert: Array<{ id: string; metadata: Record<string, unknown> }> = []

  for (const row of rows || []) {
    if (!row.token_expires_at) continue

    const expiresAt = new Date(row.token_expires_at)
    const msLeft = expiresAt.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))

    let status: 'expired' | 'expiring_soon' | null = null

    if (daysLeft <= 0) {
      status = 'expired'
    } else if (daysLeft <= EXPIRY_WARN_DAYS) {
      status = 'expiring_soon'
    }

    if (!status) continue

    const name =
      row.instagram_username
        ? `@${row.instagram_username}`
        : row.page_name || 'Conta Meta'

    items.push({
      id: row.id,
      name,
      status,
      daysLeft: daysLeft <= 0 ? null : daysLeft,
    })

    // Registrar primeira detecção do alerta no metadata (para log/auditoria)
    const meta = (row.metadata as Record<string, unknown>) || {}
    if (!meta.last_expiry_alert_at) {
      toAlert.push({
        id: row.id,
        metadata: { ...meta, last_expiry_alert_at: now.toISOString() },
      })
    }
  }

  // Persistir last_expiry_alert_at para integrações sem registro ainda
  if (toAlert.length > 0) {
    const serviceDb = createSupabaseServiceClient()
    await Promise.allSettled(
      toAlert.map(({ id, metadata }) =>
        serviceDb
          .from('meta_integrations')
          .update({ metadata, updated_at: now.toISOString() })
          .eq('id', id)
      )
    )
  }

  return NextResponse.json({ items })
}
