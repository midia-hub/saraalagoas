// Forçar rendering dinâmico para /admin/celulas (evita erro de window is not defined com Leaflet)
import React from 'react'

export const dynamic = 'force-dynamic'

export default function CelulasLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
