import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/** GET - modelos de mensagem (público, para página de sucesso) */
export async function GET() {
  try {
    const supabase = createSupabaseServiceClient()
    const { data, error } = await supabase
      .from('conversion_message_templates')
      .select('type, content')
    if (error) {
      console.error('GET public conversion-messages:', error)
      return NextResponse.json({ error: 'Erro ao carregar mensagens' }, { status: 500 })
    }
    const rows = (data ?? []) as { type: string; content: string }[]
    const accepted = rows.find((r) => r.type === 'accepted')?.content ?? ''
    const reconciled = rows.find((r) => r.type === 'reconciled')?.content ?? ''
    return NextResponse.json({ accepted, reconciled })
  } catch (err) {
    console.error('GET public conversion-messages:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
