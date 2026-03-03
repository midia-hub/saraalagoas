'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Music2 } from 'lucide-react'

/**
 * Página intermediária pós-OAuth do TikTok.
 * O popup fecha e posta mensagem para a janela pai (instancias/page.tsx).
 */
export default function TikTokOAuthDonePage() {
  const searchParams = useSearchParams()
  const connected    = searchParams?.get('connected') === '1'
  const display_name = searchParams?.get('display_name') ? decodeURIComponent(searchParams.get('display_name')!) : ''
  const handle       = searchParams?.get('handle')       ? decodeURIComponent(searchParams.get('handle')!)       : ''
  const errorParam   = searchParams?.get('error') === '1'
  const errorDesc    = searchParams?.get('error_description')
    ? decodeURIComponent(searchParams.get('error_description')!)
    : 'Não foi possível conectar a conta TikTok.'

  useEffect(() => {
    if (window.opener) {
      window.opener.postMessage(
        connected
          ? { type: 'tiktok-oauth-done', connected: true, display_name, handle }
          : { type: 'tiktok-oauth-done', connected: false, error: errorDesc },
        window.location.origin
      )
      window.close()
    }
  }, [connected, display_name, handle, errorDesc])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {connected ? (
          <>
            <div className="flex justify-center mb-4 text-black">
              <CheckCircle className="text-emerald-500" size={48} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Conta TikTok conectada!</h1>
            {display_name && <p className="text-slate-600 text-sm font-medium">{display_name}</p>}
            {handle       && <p className="text-slate-500 text-xs mt-0.5">@{handle}</p>}
            <p className="mt-4 text-xs text-slate-400">Fechando automaticamente...</p>
          </>
        ) : (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="text-red-500" size={48} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 mb-1">Erro na conexão</h1>
            <p className="text-slate-600 text-sm mt-1">{errorDesc}</p>
            <button
              className="mt-6 w-full rounded-xl bg-[#c62737] py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              onClick={() => window.close()}
            >
              Fechar
            </button>
          </>
        )}
        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
           <Music2 size={14} className="text-black" />
           TikTok for Business
        </div>
      </div>
    </div>
  )
}
