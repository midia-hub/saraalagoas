import { NextRequest, NextResponse } from 'next/server'
import { ensureDrivePath } from '@/lib/drive'
import { slugify } from '@/lib/slug'
import { supabaseServer } from '@/lib/supabase-server'
import { getSiteConfig } from '@/lib/site-config-server'
import { requireAccess } from '@/lib/admin-api'

export async function POST(request: NextRequest) {
  try {
    const access = await requireAccess(request, { pageKey: 'upload', action: 'create' })
    if (!access.ok) return access.response

    const body = await request.json().catch(() => ({}))
    const type = String(body.type || '').toLowerCase()
    const date = String(body.date || '')
    const description = String(body.description || '')

    if (type !== 'culto' && type !== 'evento') {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
    }
    if (!date) return NextResponse.json({ error: 'Data obrigatória.' }, { status: 400 })

    let title = ''
    let slug = ''

    if (type === 'culto') {
      const serviceId = String(body.serviceId || '')
      if (!serviceId) {
        return NextResponse.json({ error: 'Selecione o culto.' }, { status: 400 })
      }
      const config = await getSiteConfig()
      const service = config.services?.find((s) => s.id === serviceId)
      if (!service) return NextResponse.json({ error: 'Culto não encontrado.' }, { status: 404 })
      title = service.name
      slug = slugify(service.name)
    } else {
      const eventName = String(body.eventName || '').trim()
      if (!eventName) return NextResponse.json({ error: 'Informe o nome do evento.' }, { status: 400 })
      title = eventName
      slug = slugify(eventName)
    }

    const year = date.slice(0, 4)
    const folderId = await ensureDrivePath([year, type, slug, date])

    if (!supabaseServer) {
      return NextResponse.json({ error: 'Supabase não configurado. Verifique as variáveis de ambiente.' }, { status: 500 })
    }

    const { data: existing } = await supabaseServer
      .from('galleries')
      .select('id')
      .eq('type', type)
      .eq('slug', slug)
      .eq('date', date)
      .maybeSingle()

    if (existing?.id) {
      return NextResponse.json({
        galleryId: existing.id,
        folderId,
        galleryRoute: `/galeria/${type}/${slug}/${date}`,
      })
    }

    const { data: created, error: createError } = await supabaseServer
      .from('galleries')
      .insert({
        type,
        title,
        slug,
        date,
        description: description || null,
        drive_folder_id: folderId,
      })
      .select('id')
      .single()

    if (createError || !created?.id) {
      return NextResponse.json({ error: createError?.message || 'Falha ao criar galeria.' }, { status: 500 })
    }

    return NextResponse.json({
      galleryId: created.id,
      folderId,
      galleryRoute: `/galeria/${type}/${slug}/${date}`,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Falha ao preparar galeria.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
