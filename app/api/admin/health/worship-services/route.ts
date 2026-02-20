import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdminClient(request)
    
    // Test 1: Check if we have admin access
    const adminTest = await supabase
      .from('worship_services')
      .select('count', { count: 'exact' })

    if (adminTest.error) {
      return NextResponse.json({
        status: 'error',
        message: 'Falha ao listar cultos',
        error: {
          code: adminTest.error.code,
          message: adminTest.error.message,
          details: adminTest.error.details,
        },
        suggestion: 'Verifique se SUPABASE_SERVICE_ROLE_KEY está configurado no .env.local'
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Conexão com banco de dados funcionando',
      count: adminTest.count,
      data: adminTest.data
    })
  } catch (err) {
    return NextResponse.json({
      status: 'error',
      message: 'Erro ao conectar ao banco',
      error: err instanceof Error ? err.message : 'Erro desconhecido',
      suggestion: 'Verifique as variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY'
    }, { status: 500 })
  }
}
