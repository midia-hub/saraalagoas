'use client'

import { useEffect } from 'react'

const FALLBACK_ID = 'app-fallback'

export function AppFallback() {
  useEffect(() => {
    const t = setTimeout(() => {
      const el = document.getElementById(FALLBACK_ID)
      if (el && typeof (window as Window & { __APP_MOUNTED__?: boolean }).__APP_MOUNTED__ === 'undefined') {
        el.style.display = 'block'
      }
    }, 6000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div
      id={FALLBACK_ID}
      aria-live="polite"
      style={{
        display: 'none',
        padding: '2rem',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '2rem auto',
        fontFamily: 'system-ui, sans-serif',
        border: '1px solid #fecaca',
        borderRadius: '0.75rem',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
      }}
    >
      <p style={{ marginBottom: '0.5rem', fontWeight: 600 }}>O site está demorando para carregar</p>
      <p style={{ margin: 0, fontSize: '0.875rem' }}>
        Se o site não carregou em alguns segundos, tente abrir em janela anônima ou desative extensões do navegador.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          backgroundColor: '#b91c1c',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
          fontSize: '0.875rem',
        }}
      >
        Recarregar
      </button>
    </div>
  )
}
