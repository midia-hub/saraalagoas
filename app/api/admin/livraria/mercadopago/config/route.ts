import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'

/** GET - Verifica se Mercado Pago está configurado para loja/caixa (não expõe valores). */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_pdv', action: 'view' })
  if (!access.ok) return access.response
  const collectorId = process.env.MERCADOPAGO_COLLECTOR_ID?.trim()
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
  return NextResponse.json({
    collector_id_configured: !!collectorId,
    access_token_configured: !!accessToken,
  })
}
