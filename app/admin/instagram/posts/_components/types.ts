/** Item da fila legada (instagram_post_jobs) */
export type LegacyPostItem = {
  id: string
  status: 'queued' | 'running' | 'published' | 'failed'
  run_at: string | null
  published_at: string | null
  error_message: string | null
  result_payload: { mediaId?: string } | null
  created_at: string
  instagram_instances?: { id: string; name: string } | null
  instagram_post_drafts?: {
    id: string
    caption: string
    status: string
    galleries?: { id: string; title: string; type: string; date: string } | null
    gallery?: { id: string; title: string; type: string; date: string } | null
    instagram_post_assets?: Array<{ sort_order: number; final_url: string | null; source_url: string }> | null
  } | null
}

/** Postagem programada (scheduled_social_posts) */
export type ScheduledItem = {
  id: string
  album_id: string
  scheduled_at: string
  caption: string
  status: 'pending' | 'publishing' | 'published' | 'failed'
  published_at: string | null
  error_message: string | null
  created_at: string
  instance_ids?: string[]
  destinations?: { instagram?: boolean; facebook?: boolean }
  media_specs?: Array<{ id: string; cropMode?: string; altText?: string }>
  galleries?: { id: string; title: string; type: string; date: string } | null
}

/** Conta Meta para filtro */
export type MetaIntegrationOption = {
  value: string
  label: string
}

export type DateRangeKey = 'all' | '7d' | '30d' | 'month' | 'last_month'

export const DATE_RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: 'all', label: 'Todas as datas' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Mês atual' },
  { value: 'last_month', label: 'Mês passado' },
]

export const SCHEDULED_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Programadas' },
  { value: 'published', label: 'Publicadas' },
  { value: 'failed', label: 'Falhas' },
] as const
