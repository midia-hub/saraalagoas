import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/** GET - lista igrejas (público, sem autenticação) */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('churches')
      .select('id, name')
      .order('name')
    if (error) {
      console.error('GET public churches:', error)
      return NextResponse.json({ error: 'Erro ao carregar igrejas' }, { status: 500 })
    }
    return NextResponse.json({ items: data ?? [] })
  } catch (err) {
    console.error('GET public churches:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
