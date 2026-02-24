'use client'

import { useEffect, useState } from 'react'

type HomeLoadGuardProps = {
  children: React.ReactNode
}

function HomeLoadingFallback() {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8fafc 0%, #f1f5f9 100%)' }} role="status" aria-label="Carregando página inicial">
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: '#fff', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ width: 180, height: 44, borderRadius: 10, background: '#e2e8f0' }} />
          <div style={{ width: 42, height: 42, borderRadius: 9999, background: '#e2e8f0' }} />
        </div>
      </div>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px' }}>
        <div style={{ height: '64vh', minHeight: 420, borderRadius: 24, background: '#cbd5e1', marginTop: 14, marginBottom: 28 }} />
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} style={{ height: 210, borderRadius: 20, background: '#e2e8f0' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HomeLoadGuard({ children }: HomeLoadGuardProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let isCancelled = false
    let unlocked = false

    const unlock = () => {
      if (isCancelled || unlocked) return
      unlocked = true
      window.requestAnimationFrame(() => {
        if (!isCancelled) setReady(true)
      })
    }

    const fontsReady = (() => {
      if (typeof document === 'undefined' || !('fonts' in document)) return Promise.resolve()
      return (document as Document & { fonts: FontFaceSet }).fonts.ready.then(() => undefined).catch(() => undefined)
    })()

    const withTimeout = Promise.race([
      fontsReady,
      new Promise<void>((resolve) => window.setTimeout(resolve, 1200)),
    ])

    const onWindowLoad = () => {
      void withTimeout.finally(unlock)
    }

    if (document.readyState === 'complete') {
      void withTimeout.finally(unlock)
    } else {
      window.addEventListener('load', onWindowLoad, { once: true })
    }

    const fallbackTimer = window.setTimeout(unlock, 2200)

    return () => {
      isCancelled = true
      window.clearTimeout(fallbackTimer)
      window.removeEventListener('load', onWindowLoad)
    }
  }, [])

  if (!ready) {
    return <HomeLoadingFallback />
  }

  return <div className="home-content-ready">{children}</div>
}
