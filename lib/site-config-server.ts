/**
 * Config do site no servidor (API routes). Lê site_config no Supabase e mescla com default.
 */

import { supabaseServer } from '@/lib/supabase-server'
import { siteConfig as defaultConfig } from '@/config/site'
import type { SiteConfig } from '@/lib/types'

export async function getSiteConfig(): Promise<SiteConfig> {
  if (!supabaseServer) return defaultConfig as SiteConfig
  try {
    const { data } = await supabaseServer
      .from('site_config')
      .select('value')
      .eq('key', 'main')
      .single()
    if (data?.value && typeof data.value === 'object') {
      const merged = { ...defaultConfig, ...data.value } as SiteConfig
      // Garantir que cultos existam (evitar lista vazia se o DB sobrescreveu)
      const storedServices = (data.value as Record<string, unknown>).services
      if (!Array.isArray(storedServices) || storedServices.length === 0) {
        merged.services = defaultConfig.services as SiteConfig['services']
      }
      
      // Garantir que layout exista
      const storedLayout = (data.value as Record<string, unknown>).layout
      if (!Array.isArray(storedLayout) || storedLayout.length === 0) {
        merged.layout = (defaultConfig as any).layout || []
      }
      
      // Manter hiddenSections
      const storedHidden = (data.value as Record<string, unknown>).hiddenSections
      if (Array.isArray(storedHidden)) {
        merged.hiddenSections = storedHidden as string[]
      } else {
        merged.hiddenSections = []
      }
      
      return merged
    }
  } catch {
    // fallback
  }
  return defaultConfig as SiteConfig
}
