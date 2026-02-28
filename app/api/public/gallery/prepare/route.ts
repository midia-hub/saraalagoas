import { NextRequest, NextResponse } from 'next/server'
import { ensureDrivePath } from '@/lib/drive'
import { slugify } from '@/lib/slug'
import { supabaseServer } from '@/lib/supabase-server'
import { getSiteConfig } from '@/lib/site-config-server'

/**
 * POST /api/public/gallery/prepare
 * Cria (ou reutiliza) um álbum no Drive + Supabase sem exigir login.
 * Álbuns criados aqui ficam ocultos da galeria pública por padrão.
 * O admin libera em /admin/galeria quando quiser.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const type = String(body.type || '').toLowerCase()
    const date = String(body.date || '')
    const description = String(body.description || '')
    const uploaderName = String(body.uploaderName || '').trim()

    if (type !== 'culto' && type !== 'evento') {
      return NextResponse.json({ error: 'Tipo inválido.' }, { status: 400 })
    }
    if (!date) return NextResponse.json({ error: 'Data obrigatória.' }, { status: 400 })

    let title = ''
    let slug = ''

    if (type === 'culto') {
      const serviceId = String(body.serviceId || '')
      if (!serviceId) return NextResponse.json({ error: 'Selecione o culto.' }, { status: 400 })
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
      return NextResponse.json({ error: 'Serviço indisponível. Tente novamente.' }, { status: 500 })
    }

    // Reutiliza álbum existente se houver (mesmo type + slug + date)
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
        galleryRoute: `/galeria/${type}/${slug}/${date}`,
      })
    }

    const descriptionFinal = [
      description || null,
      uploaderName ? `Enviado por: ${uploaderName}` : null,
    ]
      .filter(Boolean)
      .join(' — ') || null

    const { data: created, error: createError } = await supabaseServer
      .from('galleries')
      .insert({
        type,
        title,
        slug,
        date,
        description: descriptionFinal,
        drive_folder_id: folderId,
        hidden_from_public: true,
      })
      .select('id')
      .single()

    if (createError || !created?.id) {
      return NextResponse.json({ error: createError?.message || 'Falha ao criar álbum.' }, { status: 500 })
    }

    return NextResponse.json({
      galleryId: created.id,
      galleryRoute: `/galeria/${type}/${slug}/${date}`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro inesperado.'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
