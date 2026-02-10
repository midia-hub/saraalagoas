import { supabaseServer } from '@/lib/supabase-server'
import { unstable_cache } from 'next/cache'

const getConfiguredHomeRouteCached = unstable_cache(
  async (): Promise<string> => {
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
  },
  ['configured-home-route'],
  { revalidate: 60 }
)

export async function getConfiguredHomeRoute(): Promise<string> {
  try {
    return await getConfiguredHomeRouteCached()
  } catch {
    // fallback para home padrão
  }
  return '/'
}

