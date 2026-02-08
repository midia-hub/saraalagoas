/**
 * Cliente Supabase para uso no frontend.
 * Usa variáveis de ambiente VITE_SUPABASE_* (nunca expor service_role key aqui).
 * Se .env não estiver configurado, supabase fica null e a UI pode avisar o usuário.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Cliente Supabase singleton, ou null se .env não estiver configurado */
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/** Retorna true se o Supabase está configurado e pode ser usado */
export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}
