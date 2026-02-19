import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { getLeadershipTree } from '@/lib/people-access'

export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { searchParams } = new URL(request.url)
  const rootPersonIdFromQuery = (searchParams.get('rootPersonId') || '').trim()

  let rootPersonId = rootPersonIdFromQuery
  if (!access.snapshot.isAdmin) {
    rootPersonId = access.snapshot.personId || ''
  }

  if (!rootPersonId) {
    return NextResponse.json({ error: 'Pessoa base não encontrada.' }, { status: 400 })
  }

  try {
    const tree = await getLeadershipTree(rootPersonId)
    return NextResponse.json({ rootPersonId, tree })
  } catch (error) {
    console.error('Erro ao carregar estrutura de liderança:', error)
    const message = error instanceof Error ? error.message : 'Erro ao carregar estrutura de liderança.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
