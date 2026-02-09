/**
 * API Route: GET/POST /api/admin/services
 * Lista e cria cultos (protegido por middleware)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/slug'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: services, error } = await supabase
      .from('worship_services')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      // Qualquer erro (tabela inexistente, RLS, etc.): retorna lista vazia para o admin não quebrar
      return NextResponse.json({ services: [] })
    }

    return NextResponse.json({ services: services || [] })
  } catch (error) {
    console.error('Services GET error:', error)
    return NextResponse.json({ services: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const body = await request.json()
    const { name, active = true } = body

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 })
    }

    const slug = slugify(name)

    // Verificar se o slug já existe (ignora erro se tabela não existir)
    const { data: existing } = await supabase
      .from('worship_services')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Já existe um culto com esse nome.' }, { status: 409 })
    }

    const { data: service, error } = await supabase
      .from('worship_services')
      .insert({ name, slug, active })
      .select()
      .single()

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { error: 'Tabela worship_services não existe. Execute supabase-galeria-migrations.sql no Supabase.' },
          { status: 503 }
        )
      }
      const msg = error.message || 'Erro ao criar culto'
      return NextResponse.json({ error: msg }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (error) {
    console.error('Services POST error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
