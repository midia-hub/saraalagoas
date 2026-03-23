import { supabaseServer } from '@/lib/supabase-server'
import { fetchInstagramRecentMedia, type InstagramMediaItem } from '@/lib/meta-fetch-posts'

export type InstagramRefConta = {
  integrationId: string
  nome: string
  posts: Array<{
    data: string
    tipo: string
    legenda: string
    curtidas: number
    comentarios: number
    alcance?: number
    permalink?: string
  }>
}

export type InstagramReferenciasResult = {
  contas: InstagramRefConta[]
  aviso?: string
}

const MAX_POSTS_POR_CONTA = 12

/**
 * Busca posts recentes das integrações Instagram escolhidas como referência.
 * Só funciona para contas já conectadas à plataforma (token Meta).
 */
export async function fetchInstagramReferencias(
  integrationIds: string[],
  daysAgo = 21,
): Promise<InstagramReferenciasResult> {
  const ids = [...new Set(integrationIds)].filter(Boolean)
  if (ids.length === 0) return { contas: [] }

  const { data: integrations, error } = await supabaseServer
    .from('meta_integrations')
    .select('id, page_name, instagram_username, instagram_business_account_id, page_access_token, is_active')
    .in('id', ids)
    .eq('is_active', true)
    .not('instagram_business_account_id', 'is', null)
    .not('page_access_token', 'is', null)

  if (error || !integrations?.length) {
    return {
      contas: [],
      aviso: 'Nenhuma das contas selecionadas está disponível com Instagram conectado.',
    }
  }

  const contas: InstagramRefConta[] = []

  for (const ig of integrations) {
    try {
      const posts = await fetchInstagramRecentMedia({
        igUserId:        ig.instagram_business_account_id as string,
        pageAccessToken: ig.page_access_token as string,
        accountName:     ig.instagram_username || ig.page_name || undefined,
        integrationId:   ig.id,
        daysAgo:         Math.min(60, Math.max(7, daysAgo)),
        withInsights:    true,
      })

      const slice = posts.slice(0, MAX_POSTS_POR_CONTA)
      contas.push({
        integrationId: ig.id,
        nome:            ig.instagram_username || ig.page_name || 'Conta',
        posts:           slice.map((p: InstagramMediaItem) => ({
          data:        p.timestamp?.slice(0, 10) ?? '',
          tipo:        p.media_type || '—',
          legenda:     (p.caption ?? '').slice(0, 500),
          curtidas:    p.like_count ?? 0,
          comentarios: p.comments_count ?? 0,
          alcance:     p.insights?.reach,
          permalink:   p.permalink,
        })),
      })
    } catch { /* skip conta */ }
  }

  return { contas }
}

export function resumoReferenciasParaPrompt(data: InstagramReferenciasResult): string {
  if (data.contas.length === 0) {
    return data.aviso
      ? `REFERÊNCIA INSTAGRAM: ${data.aviso}`
      : ''
  }
  const lines: string[] = [
    'CONTAS INSTAGRAM DE REFERÊNCIA (amostra de posts via API — use para entender estilo, formatos e tom):',
  ]
  for (const c of data.contas) {
    lines.push(`\n@${c.nome} (${c.posts.length} posts no recorte):`)
    for (const post of c.posts.slice(0, 8)) {
      lines.push(
        `  • [${post.data}] ${post.tipo} | ${post.curtidas} curtidas — ${post.legenda.slice(0, 180)}${post.legenda.length > 180 ? '…' : ''}`,
      )
    }
  }
  return lines.join('\n')
}
