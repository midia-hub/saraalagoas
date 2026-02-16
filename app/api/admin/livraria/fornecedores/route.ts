import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

/** GET - lista fornecedores para dropdowns */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'livraria_produtos', action: 'view' })
  if (!access.ok) return access.response
  try {
    const supabase = createSupabaseAdminClient(request)
    const { data, error } = await supabase
      .from('bookstore_suppliers')
      .select('id, name, document, phone, email')
      .order('name')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET livraria/fornecedores:', err)
    return NextResponse.json({ error: 'Erro ao carregar fornecedores' }, { status: 500 })
  }
}
