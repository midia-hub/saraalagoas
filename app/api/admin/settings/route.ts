/**
 * API Route: GET/PUT /api/admin/settings
 * Gerencia configurações do sistema (protegido por middleware)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error) {
      // Qualquer erro (tabela inexistente, RLS, etc.): retorna padrão para o admin não quebrar
      return NextResponse.json({ settings: { id: 1, home_route: '/' } })
    }

    return NextResponse.json({ settings: settings || { id: 1, home_route: '/' } })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ settings: { id: 1, home_route: '/' } })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    const body = await request.json()
    const { home_route } = body

    if (!home_route) {
      return NextResponse.json({ error: 'home_route is required' }, { status: 400 })
    }

    const { data: settings, error } = await supabase
      .from('settings')
      .upsert({ id: 1, home_route })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabela settings não existe. Execute supabase-galeria-migrations.sql no Supabase.' },
          { status: 503 }
        )
      }
      return NextResponse.json({ error: 'Failed to update settings', details: error }, { status: 500 })
    }

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Settings PUT error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
