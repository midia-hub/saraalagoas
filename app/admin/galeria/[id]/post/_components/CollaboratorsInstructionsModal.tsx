'use client'

import { Users, Check, ExternalLink, Copy, CheckCircle } from 'lucide-react'
import { useState } from 'react'

type CollaboratorsInstructionsModalProps = {
  open: boolean
  collaborators: string[]
  postUrl?: string
  onClose: () => void
}

export function CollaboratorsInstructionsModal({
  open,
  collaborators,
  postUrl,
  onClose,
}: CollaboratorsInstructionsModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  if (!open || collaborators.length === 0) return null

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="p-3 bg-white rounded-xl shadow-sm">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">
              Post Publicado com Sucesso! 🎉
            </h2>
            <p className="text-sm text-slate-600 mt-0.5">
              Agora adicione os colaboradores manualmente no Instagram
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Colaboradores para adicionar */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Colaboradores para convidar:
            </h3>
            <div className="space-y-2">
              {collaborators.map((username, index) => (
                <div
                  key={username}
                  className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-mono font-medium text-slate-900">
                      @{username}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(username, index)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-md transition-colors"
                  >
                    {copiedIndex === index ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instruções passo a passo */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-3">
              📋 Como adicionar colaboradores no Instagram:
            </h3>
            <div className="space-y-3">
              {[
                {
                  step: 1,
                  text: postUrl
                    ? 'Clique no botão abaixo para abrir o post no Instagram'
                    : 'Abra o Instagram e encontre o post que você acabou de publicar',
                },
                {
                  step: 2,
                  text: 'Toque nos três pontos (⋯) no canto superior direito do post',
                },
                {
                  step: 3,
                  text: 'Selecione "Editar"',
                },
                {
                  step: 4,
                  text: 'Toque em "Marcar pessoas"',
                },
                {
                  step: 5,
                  text: 'Toque em "Convidar colaborador"',
                },
                {
                  step: 6,
                  text: 'Digite ou cole os usernames listados acima (um de cada vez)',
                },
                {
                  step: 7,
                  text: 'Toque em "Concluído" para enviar os convites',
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                    {item.step}
                  </div>
                  <p className="text-sm text-slate-700 pt-0.5">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
            <div className="flex items-start gap-2">
              <Check className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="text-sm text-purple-900">
                <p className="font-semibold mb-1">💡 Dica importante:</p>
                <ul className="space-y-1 list-disc list-inside pl-1">
                  <li>Os colaboradores receberão uma notificação do convite</li>
                  <li>Eles precisam aceitar para aparecer como colaboradores</li>
                  <li>O post aparecerá nos feeds de todos os colaboradores que aceitarem</li>
                  <li>O engajamento (curtidas, comentários) é somado entre todos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 space-y-3">
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-3 text-sm font-medium text-white hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir Post no Instagram
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Entendi, vou adicionar depois
          </button>
        </div>
      </div>
    </div>
  )
}
