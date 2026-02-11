/**
 * Cliente Supabase para o app Next.js (Admin e leitura de config).
 * Use variáveis NEXT_PUBLIC_SUPABASE_* no .env.local
 *
 * Usa singleton global para evitar "Multiple GoTrueClient instances" quando
 * o módulo é carregado em mais de um chunk no browser.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined

const GLOBAL_KEY = '__midia_igreja_supabase_client__'

function getSupabaseClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    const g = window as unknown as Record<string, SupabaseClient | null | undefined>
    if (g[GLOBAL_KEY] !== undefined) return g[GLOBAL_KEY] ?? null
    const client =
      supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null
    g[GLOBAL_KEY] = client
    return client
  }
  return supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null
}

export const supabase: SupabaseClient | null = getSupabaseClient()

export function isSupabaseConfigured(): boolean {
  return supabase !== null
}
