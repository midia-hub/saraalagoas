// lib/consolidacao-types.ts
// Tipos compartilhados do módulo de Consolidação (acompanhamento, cultos, revisão de vidas)

export type FollowupStatus =
  | 'em_acompanhamento'
  | 'direcionado_revisao'
  | 'inscrito_revisao'
  | 'concluiu_revisao'
  | 'encerrado'

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  em_acompanhamento: 'Em Acompanhamento',
  direcionado_revisao: 'Direcionado p/ o Revisão de Vidas',
  inscrito_revisao: 'Inscrito no Revisão de Vidas',
  concluiu_revisao: 'Concluiu o Revisão de Vidas',
  encerrado: 'Encerrado',
}

export const FOLLOWUP_STATUS_COLORS: Record<FollowupStatus, string> = {
  em_acompanhamento: 'bg-blue-100 text-blue-700',
  direcionado_revisao: 'bg-yellow-100 text-yellow-700',
  inscrito_revisao: 'bg-purple-100 text-purple-700',
  concluiu_revisao: 'bg-green-100 text-green-700',
  encerrado: 'bg-gray-100 text-gray-500',
}

export type ReviewRegStatus = 'inscrito' | 'concluiu' | 'cancelado'

export const REVIEW_REG_STATUS_LABELS: Record<ReviewRegStatus, string> = {
  inscrito: 'Inscrito',
  concluiu: 'Concluiu',
  cancelado: 'Cancelado (recusou)',
}

export const REVIEW_REG_STATUS_COLORS: Record<ReviewRegStatus, string> = {
  inscrito: 'bg-blue-100 text-blue-700',
  concluiu: 'bg-green-100 text-green-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

// Novo tipo para os status do fluxo Revisão de Vidas (flow-based)
export type ReviewFlowStatus = 
  | 'inscrito'
  | 'aguardando_pre_revisao'
  | 'aguardando_pagamento'
  | 'aguardando_validacao'
  | 'aguardando_anamnese'
  | 'confirmado'
  | 'bloqueado'

export const REVIEW_FLOW_STATUS_LABELS: Record<ReviewFlowStatus, string> = {
  inscrito: 'Inscrito',
  aguardando_pre_revisao: 'Aguardando Pré-Revisão',
  aguardando_pagamento: 'Aguardando Pagamento',
  aguardando_validacao: 'Aguardando Validação',
  aguardando_anamnese: 'Aguardando Anamnese',
  confirmado: 'Confirmado',
  bloqueado: 'Bloqueado',
}

export const REVIEW_FLOW_STATUS_COLORS: Record<ReviewFlowStatus, string> = {
  inscrito: 'bg-slate-100 text-slate-600',
  aguardando_pre_revisao: 'bg-amber-100 text-amber-700',
  aguardando_pagamento: 'bg-amber-100 text-amber-700',
  aguardando_validacao: 'bg-amber-100 text-amber-700',
  aguardando_anamnese: 'bg-amber-100 text-amber-700',
  confirmado: 'bg-emerald-100 text-emerald-700',
  bloqueado: 'bg-rose-100 text-rose-700',
}

export type WorshipService = {
  id: string
  church_id: string
  name: string
  day_of_week: number // 0-6 (0=Dom)
  time_of_day: string // "19:30"
  is_arena: boolean
  arena_id?: string | null // Se is_arena = true, qual arena realiza este culto
  active: boolean
  created_at?: string
  updated_at?: string
}

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
}

export const DAY_OF_WEEK_SHORT: Record<number, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
}

export type ConsolidationFollowup = {
  id: string
  person_id: string
  conversion_id: string | null
  consolidator_person_id: string | null
  leader_person_id: string | null

  contacted: boolean
  contacted_at: string | null
  contacted_channel: string | null
  contacted_notes: string | null

  fono_visit_done: boolean
  fono_visit_date: string | null
  visit_done: boolean
  visit_date: string | null

  status: FollowupStatus
  next_review_event_id: string | null
  next_review_date: string | null

  notes: string | null

  created_at: string
  updated_at: string
}

/** Versão enriquecida do followup (retornada pela API de listagem) */
export type FollowupEnriched = ConsolidationFollowup & {
  person?: {
    id: string
    full_name: string
    mobile_phone: string | null
    email: string | null
  }
  conversion?: {
    id: string
    data_conversao: string | null
    conversion_type: string | null
    culto: string | null
    church_id: string | null
    cell_id: string | null
  }
  leader?: { id: string; full_name: string } | null
  consolidator?: { id: string; full_name: string } | null
  next_review_event?: { id: string; name: string; start_date: string } | null
  attendance_summary?: {
    total_last30: number
    last_dates: string[]
  }
}

export type ReviewEvent = {
  id: string
  church_id: string
  name: string
  start_date: string
  end_date: string | null
  active: boolean
  created_at?: string
  updated_at?: string
}

export type ReviewRegistration = {
  id: string
  event_id: string
  person_id: string
  leader_person_id: string | null
  anamnese_token: string | null
  anamnese_completed_at: string | null
  status: ReviewRegStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export type ReviewRegistrationEnriched = ReviewRegistration & {
  person?: { id: string; full_name: string; mobile_phone: string | null; email: string | null; avatar_url?: string | null }
  leader?: { id: string; full_name: string } | null
  event?: ReviewEvent
  team_name?: string | null
  anamnese_alert_count?: number
  anamnese_photo_url?: string | null
}

export const ATTENDED_CHANNELS: { value: string; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'presencial', label: 'Presencial' },
  { value: 'outro', label: 'Outro' },
]
