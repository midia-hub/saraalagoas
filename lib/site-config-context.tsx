'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
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

export function SiteConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig as SiteConfig)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'main')
        .single()
      if (!error && data?.value && typeof data.value === 'object') {
        setConfig({ ...defaultConfig, ...data.value } as SiteConfig)
      }
      // Se 404: tabela site_config não existe — execute supabase-admin.sql no SQL Editor do Supabase
    } catch {
      // mantém default (ex.: tabela ainda não criada)
    } finally {
      setLoading(false)
    }
  }, [])

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
