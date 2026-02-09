/**
 * API Route: PUT/DELETE /api/admin/services/[id]
 * Atualiza e deleta cultos (protegido por middleware)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/slug'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { id: serviceId } = await params
    const body = await request.json()
    const { name, active } = body

    if (!name && active === undefined) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const updateData: { name?: string; slug?: string; active?: boolean } = {}

    if (name) {
      updateData.name = name
      updateData.slug = slugify(name)

      // Verificar se o novo slug já existe em outro registro
      const { data: existing } = await supabase
        .from('worship_services')
        .select('id, slug')
        .eq('slug', updateData.slug)
        .neq('id', serviceId)
        .single()

      if (existing) {
        return NextResponse.json(
          { error: 'A service with this name already exists' },
          { status: 409 }
        )
      }
    }

    if (active !== undefined) {
      updateData.active = active
    }

    const { data: service, error } = await supabase
      .from('worship_services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update service', details: error }, { status: 500 })
    }

    return NextResponse.json({ service })
  } catch (error) {
    console.error('Service PUT error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    // Verificar se existem galerias usando este culto
    const { data: galleries, error: galleriesError } = await supabase
      .from('galleries')
      .select('id')
      .eq('type', 'culto')
      .eq('title', serviceId)
      .limit(1)

    if (galleriesError) {
      console.error('Error checking galleries:', galleriesError)
    }

    if (galleries && galleries.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete service with existing galleries' },
        { status: 409 }
      )
    }

    const { error } = await supabase
      .from('worship_services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete service', details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Service DELETE error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete service',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
