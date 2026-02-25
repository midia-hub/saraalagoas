'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from './supabase'
import { siteConfig as defaultConfig } from '@/config/site'
import type { SiteConfig } from './types'

type SiteConfigContextValue = {
  config: SiteConfig
  loading: boolean
  refetch: () => Promise<void>
}

const SiteConfigContext = createContext<SiteConfigContextValue>({
  config: defaultConfig as SiteConfig,
  loading: true,
  refetch: async () => {},
})

const SITE_CONFIG_CACHE_KEY = 'site_config_main_cache_v1'
const SITE_CONFIG_CACHE_TTL_MS = 5 * 60 * 1000
let memoryCache: { config: SiteConfig; updatedAt: number } | null = null

export function SiteConfigProvider({ 
  children,
  initialConfig, 
}: { 
  children: React.ReactNode
  initialConfig?: SiteConfig
}) {
  const pathname = usePathname()
  const [config, setConfig] = useState<SiteConfig>(initialConfig || defaultConfig as SiteConfig)
  const [loading, setLoading] = useState(false)

  const applyCachedConfig = useCallback((): boolean => {
    // Se temos initialConfig do servidor e não estamos na home recarregando, pule fetch.
    if (initialConfig) return true
    
    const now = Date.now()

    if (memoryCache && now - memoryCache.updatedAt <= SITE_CONFIG_CACHE_TTL_MS) {
      setConfig(memoryCache.config)
      return true
    }

    if (typeof window === 'undefined') return false

    try {
      const raw = window.localStorage.getItem(SITE_CONFIG_CACHE_KEY)
      if (!raw) return false

      const parsed = JSON.parse(raw) as { config?: SiteConfig; updatedAt?: number }
      if (!parsed?.config || typeof parsed.updatedAt !== 'number') return false
      if (now - parsed.updatedAt > SITE_CONFIG_CACHE_TTL_MS) return false

      setConfig(parsed.config)
      memoryCache = { config: parsed.config, updatedAt: parsed.updatedAt }
      return true
    } catch {
      return false
    }
  }, [])

  const persistCache = useCallback((nextConfig: SiteConfig) => {
    const payload = { config: nextConfig, updatedAt: Date.now() }
    memoryCache = payload

    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(SITE_CONFIG_CACHE_KEY, JSON.stringify(payload))
    } catch {
      // Ignora falhas de storage para não impactar render.
    }
  }, [])

  const refetch = useCallback(async () => {
    // Se passamos initialConfig e não estamos mudando manualmente, nada a fazer
    if (initialConfig && pathname !== '/') {
       setLoading(false)
       return
    }

    const shouldFetch = pathname === '/'
    if (!shouldFetch && !initialConfig) {
      setLoading(false)
      return
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    const hasFreshCache = applyCachedConfig()
    if (!hasFreshCache) {
      setLoading(true)
    }

    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'main')
        .single()
      if (!error && data?.value && typeof data.value === 'object') {
        const merged = { ...defaultConfig, ...data.value } as SiteConfig
        setConfig(merged)
        persistCache(merged)
      }
      // Se 404: tabela site_config não existe — execute supabase-admin.sql no SQL Editor do Supabase
    } catch {
      // mantém default (ex.: tabela ainda não criada)
    } finally {
      setLoading(false)
    }
  }, [applyCachedConfig, pathname, persistCache])

  useEffect(() => {
    refetch()
  }, [refetch])

  return (
    <SiteConfigContext.Provider value={{ config, loading, refetch }}>
      {children}
    </SiteConfigContext.Provider>
  )
}

export function useSiteConfig() {
  const ctx = useContext(SiteConfigContext)
  if (!ctx) throw new Error('useSiteConfig must be used within SiteConfigProvider')
  return ctx
}
