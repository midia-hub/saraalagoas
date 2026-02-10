import { NextRequest, NextResponse } from 'next/server'
import { requireAccessAny } from '@/lib/admin-api'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  // Quem pode ver galeria ou Instagram pode acessar o painel de publicações
  const access = await requireAccessAny(request, [
    { pageKey: 'instagram', action: 'view' },
    { pageKey: 'galeria', action: 'view' },
  ])
  if (!access.ok) return access.response
  const db = createSupabaseServerClient(request)

  try {
    // Query principal: jobs com instâncias e drafts (sem aninhar gallery/assets para evitar erro de relação)
    const { data: jobsData, error: jobsError } = await db
      .from('instagram_post_jobs')
      .select(
        `
        id,
        status,
        run_at,
        published_at,
        error_message,
        result_payload,
        created_at,
        draft_id,
        instance_id,
        instagram_instances (
          id,
          name
        ),
        instagram_post_drafts (
          id,
          caption,
          status,
          gallery_id
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(200)

    if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 })
    const jobs = jobsData || []

    // Buscar galerias e assets em lotes se houver drafts
    const galleryIds = Array.from(
      new Set(
        jobs
          .map((j) => (j.instagram_post_drafts as { gallery_id?: string } | null)?.gallery_id)
          .filter(Boolean) as string[]
      )
    )
    const draftIds = Array.from(
      new Set(jobs.map((j) => (j.instagram_post_drafts as { id?: string } | null)?.id).filter(Boolean) as string[])
    )

    let galleriesMap: Record<string, { id: string; title: string; type: string; date: string }> = {}
    let assetsByDraft: Record<string, Array<{ sort_order: number; final_url: string | null; source_url: string }>> = {}

    if (galleryIds.length > 0) {
      const { data: galleriesData } = await db
        .from('galleries')
        .select('id, title, type, date')
        .in('id', galleryIds)
      if (Array.isArray(galleriesData)) {
        for (const g of galleriesData) {
          if (g?.id) galleriesMap[g.id] = { id: g.id, title: g.title ?? '', type: g.type ?? '', date: g.date ?? '' }
        }
      }
    }

    if (draftIds.length > 0) {
      const { data: assetsData } = await db
        .from('instagram_post_assets')
        .select('draft_id, sort_order, final_url, source_url')
        .in('draft_id', draftIds)
        .order('sort_order', { ascending: true })
      if (Array.isArray(assetsData)) {
        for (const a of assetsData) {
          const did = (a as { draft_id?: string }).draft_id
          if (!did) continue
          if (!assetsByDraft[did]) assetsByDraft[did] = []
          assetsByDraft[did].push({
            sort_order: (a as { sort_order?: number }).sort_order ?? 0,
            final_url: (a as { final_url?: string | null }).final_url ?? null,
            source_url: (a as { source_url?: string }).source_url ?? '',
          })
        }
      }
    }

    // Montar resposta no formato esperado pelo frontend
    const result = jobs.map((job) => {
      const draft = job.instagram_post_drafts as { id?: string; caption?: string; status?: string; gallery_id?: string } | null
      const galleryId = draft?.gallery_id
      const draftId = draft?.id
      return {
        ...job,
        instagram_post_drafts: draft
          ? {
              id: draft.id,
              caption: draft.caption,
              status: draft.status,
              galleries: galleryId ? galleriesMap[galleryId] ?? null : null,
              instagram_post_assets: draftId ? assetsByDraft[draftId] ?? null : null,
            }
          : null,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro ao listar publicações.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
