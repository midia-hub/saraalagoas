'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

/**
 * Página de conclusão do OAuth em popup.
 * Se houver window.opener: envia postMessage e fecha o popup.
 * Caso contrário: exibe mensagem e link para voltar (ex.: usuário abriu em nova aba).
 */
export default function OAuthDonePage() {
  const searchParams = useSearchParams()
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    const connected = searchParams?.get('connected') === '1'
    const error = searchParams?.get('error')
    const errorDescription = searchParams?.get('error_description')
    const instagram = searchParams?.get('instagram') ?? ''
    const selectPage = searchParams?.get('select_page') === '1'

    const payload = {
      type: 'meta-oauth-done',
      connected: !!connected && !selectPage,
      selectPage: !!selectPage,
      error: error || null,
      errorDescription: errorDescription || null,
      instagram: instagram || null,
    }

    if (typeof window === 'undefined') return

    if (window.opener) {
      try {
        window.opener.postMessage(payload, window.location.origin)
      } catch {
        // ignore
      }
      setClosed(true)
      window.close()
      // Fallback se o navegador bloquear window.close()
      setTimeout(() => setClosed(false), 500)
    }
  }, [searchParams])

  const connected = searchParams?.get('connected') === '1'
  const error = searchParams?.get('error')
  const selectPage = searchParams?.get('select_page') === '1'
  const instagram = searchParams?.get('instagram') ?? ''

  if (typeof window !== 'undefined' && window.opener && closed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
        <Loader2 size={32} className="animate-spin text-slate-500 mb-4" />
        <p className="text-slate-600">Fechando janela...</p>
        <p className="text-sm text-slate-500 mt-2">Se a janela não fechar, feche-a manualmente.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-100">
      <div className="max-w-md w-full rounded-xl border border-slate-200 bg-white p-8 text-center">
        {error ? (
          <>
            <XCircle size={48} className="mx-auto text-red-500 mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Erro ao conectar</h1>
            <p className="text-slate-600 mb-6">
              {searchParams?.get('error_description') || 'Ocorreu um erro na autorização.'}
            </p>
          </>
        ) : connected && !selectPage ? (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Conectado!</h1>
            <p className="text-slate-600 mb-6">
              {instagram ? `Instagram: @${instagram}` : 'Conta Meta conectada com sucesso.'}
            </p>
          </>
        ) : (
          <>
            <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
            <h1 className="text-xl font-semibold text-slate-900 mb-2">Quase lá</h1>
            <p className="text-slate-600 mb-6">
              Selecione a página e o Instagram na janela que abriu.
            </p>
          </>
        )}
        <Link
          href="/admin/instancias"
          className="inline-flex items-center justify-center rounded-lg bg-[#c62737] px-5 py-2.5 text-white font-medium hover:bg-[#a01f2c] transition-colors"
        >
          Voltar para Instâncias
        </Link>
      </div>
    </div>
  )
}
