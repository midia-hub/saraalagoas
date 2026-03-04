/**
 * lib/rekognition-limits.ts
 *
 * Gerenciamento de limites do AWS Rekognition — Free Tier (12 meses):
 *   • 1.000 chamadas/mês para APIs do Grupo 1 (IndexFaces + SearchFacesByImage)
 *   • 1.000 vetores faciais armazenados por mês
 *
 * Referência: https://aws.amazon.com/rekognition/pricing/
 */

import { supabaseServer } from '@/lib/supabase-server'

// ─── Constantes ──────────────────────────────────────────────────────────────

export const REKOGNITION_LIMITS = {
  /** Chamadas mensais ao Grupo 1 (IndexFaces + SearchFacesByImage) — free tier */
  FREE_TIER_API_CALLS_PER_MONTH: 1_000,

  /** Vetores faciais armazenados — free tier */
  FREE_TIER_STORED_FACES: 1_000,

  /** Percentual de uso que dispara aviso */
  WARN_THRESHOLD_PERCENT: 80,

  /** Máximo de fotos de referência por pessoa (1 IndexFaces cada) */
  MAX_PHOTOS_PER_PERSON: 5,

  /** Máximo de fotos analisadas por scan manual (para evitar timeout) */
  MAX_SCAN_PHOTOS_PER_CALL: 100,
} as const

export type RekognitionApiCall = 'IndexFaces' | 'SearchFacesByImage'

// ─── Helpers de data ─────────────────────────────────────────────────────────

function currentYearMonth(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

// ─── Leitura de uso ───────────────────────────────────────────────────────────

export interface MonthlyUsage {
  IndexFaces: number
  SearchFacesByImage: number
  total: number
  remaining: number
  percentUsed: number
  yearMonth: string
  nearLimit: boolean
  overLimit: boolean
}

export async function getMonthlyUsage(yearMonth?: string): Promise<MonthlyUsage> {
  const ym = yearMonth ?? currentYearMonth()

  const { data } = await supabaseServer
    .from('rekognition_usage_log')
    .select('api_call, count')
    .eq('year_month', ym)

  const rows = data ?? []
  const indexFaces = rows.find((r) => r.api_call === 'IndexFaces')?.count ?? 0
  const searchFaces = rows.find((r) => r.api_call === 'SearchFacesByImage')?.count ?? 0
  const total = indexFaces + searchFaces
  const limit = REKOGNITION_LIMITS.FREE_TIER_API_CALLS_PER_MONTH
  const remaining = Math.max(0, limit - total)
  const percentUsed = Math.round((total / limit) * 100)

  return {
    IndexFaces: indexFaces,
    SearchFacesByImage: searchFaces,
    total,
    remaining,
    percentUsed,
    yearMonth: ym,
    nearLimit: percentUsed >= REKOGNITION_LIMITS.WARN_THRESHOLD_PERCENT,
    overLimit: total >= limit,
  }
}

// ─── Verificação antes de chamar a API ───────────────────────────────────────

export interface UsageCheckResult {
  allowed: boolean
  remaining: number
  usage: MonthlyUsage
  /** Preenchido quando allowed = false */
  errorMessage?: string
}

export async function checkApiQuota(
  apiCall: RekognitionApiCall,
  callCount = 1
): Promise<UsageCheckResult> {
  const usage = await getMonthlyUsage()

  if (usage.overLimit) {
    return {
      allowed: false,
      remaining: 0,
      usage,
      errorMessage:
        `Cota mensal do AWS Rekognition esgotada (${usage.total}/${REKOGNITION_LIMITS.FREE_TIER_API_CALLS_PER_MONTH} chamadas usadas em ${usage.yearMonth}). ` +
        `Aguarde o próximo mês ou faça upgrade do plano.`,
    }
  }

  if (usage.remaining < callCount) {
    return {
      allowed: false,
      remaining: usage.remaining,
      usage,
      errorMessage:
        `Cota insuficiente: restam ${usage.remaining} chamadas mas a operação requer ${callCount}. ` +
        `(${usage.total}/${REKOGNITION_LIMITS.FREE_TIER_API_CALLS_PER_MONTH} usadas em ${usage.yearMonth})`,
    }
  }

  return { allowed: true, remaining: usage.remaining, usage }
}

// ─── Incremento de uso ────────────────────────────────────────────────────────

export async function incrementUsage(
  apiCall: RekognitionApiCall,
  count = 1
): Promise<void> {
  const ym = currentYearMonth()

  const { error } = await supabaseServer.rpc('rekognition_increment_usage', {
    p_year_month: ym,
    p_api_call: apiCall,
    p_count: count,
  })

  if (error) {
    // Fallback manual (upsert direto) se a RPC não estiver disponível
    const { data: existing } = await supabaseServer
      .from('rekognition_usage_log')
      .select('id, count')
      .eq('year_month', ym)
      .eq('api_call', apiCall)
      .single()

    if (existing) {
      await supabaseServer
        .from('rekognition_usage_log')
        .update({ count: existing.count + count, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await supabaseServer
        .from('rekognition_usage_log')
        .insert({ year_month: ym, api_call: apiCall, count })
    }
  }
}

// ─── Verificação de faces armazenadas ────────────────────────────────────────

export interface StorageCheckResult {
  allowed: boolean
  current: number
  limit: number
  errorMessage?: string
}

export async function checkStorageQuota(additionalFaces = 1): Promise<StorageCheckResult> {
  const { count } = await supabaseServer
    .from('rekognition_people_photos')
    .select('id', { count: 'exact', head: true })

  const current = count ?? 0
  const limit = REKOGNITION_LIMITS.FREE_TIER_STORED_FACES

  if (current + additionalFaces > limit) {
    return {
      allowed: false,
      current,
      limit,
      errorMessage:
        `Limite de vetores faciais armazenados atingido (${current}/${limit}). ` +
        `Remova fotos de referência ou faça upgrade do plano.`,
    }
  }

  return { allowed: true, current, limit }
}
