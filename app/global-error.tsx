'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[App] Erro global (root):', error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#fef2f2' }}>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              padding: '1.5rem',
              textAlign: 'center',
              border: '1px solid #fecaca',
              borderRadius: '0.75rem',
              backgroundColor: '#fff',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          >
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1.125rem', fontWeight: 600, color: '#991b1b' }}>
              O site encontrou um erro
            </h2>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#b91c1c' }}>
              Isso pode ser causado por uma extensão do navegador. Tente recarregar ou abrir em
              janela anônima.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#b91c1c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Tentar novamente
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: 'white',
                  color: '#b91c1c',
                  border: '1px solid #fca5a5',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                }}
              >
                Ir para a página inicial
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
