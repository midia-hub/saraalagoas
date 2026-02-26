import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/**
 * GET /api/admin/kids-checkin/[id]/guardians
 * Retorna a lista de adultos (Pai/Mãe/Responsável) vinculados
 * à criança de um determinado check-in.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireAccess(request, { pageKey: 'pessoas', action: 'view' })
  if (!access.ok) return access.response

  const { id: checkinId } = await params
  const supabase = createSupabaseAdminClient(request)

  // 1. Busca o child_id do check-in
  const { data: checkin, error: cError } = await supabase
    .from('kids_checkin')
    .select('child_id, guardian_id, guardian_name')
    .eq('id', checkinId)
    .single()

  if (cError || !checkin) {
    return NextResponse.json({ error: 'Check-in não encontrado.' }, { status: 404 })
  }

  // 2. Busca adultos vinculados à criança
  const { data: links, error: lError } = await supabase
    .from('people_kids_links')
    .select('adult_id, relationship_type, adult:people!adult_id(id, full_name, mobile_phone, phone)')
    .eq('child_id', checkin.child_id)

  if (lError) {
    return NextResponse.json({ error: lError.message }, { status: 500 })
  }

  const guardians = (links ?? []).map((l: any) => {
    const adult = Array.isArray(l.adult) ? l.adult[0] : l.adult
    return {
      id: adult?.id ?? l.adult_id,
      full_name: adult?.full_name ?? '',
      relationship_type: l.relationship_type ?? 'Responsável',
    }
  })

  // Garante que o responsável registrado no check-in apareça caso não esteja nos links
  if (
    checkin.guardian_id &&
    checkin.guardian_name &&
    !guardians.find((g) => g.id === checkin.guardian_id)
  ) {
    guardians.unshift({
      id: checkin.guardian_id,
      full_name: checkin.guardian_name,
      relationship_type: 'Responsável',
    })
  }

  return NextResponse.json({ guardians })
}
