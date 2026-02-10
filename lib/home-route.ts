import { supabaseServer } from '@/lib/supabase-server'

export async function getConfiguredHomeRoute(): Promise<string> {
  try {
    const { data } = await supabaseServer
      .from('settings')
      .select('home_route')
      .eq('id', 1)
      .single()
    const route = data?.home_route
    if (typeof route === 'string' && route.startsWith('/')) return route
  } catch {
    // fallback para home padrão
  }
  return '/'
}

