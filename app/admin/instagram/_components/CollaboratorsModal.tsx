'use client'

import { useEffect, useState } from 'react'
import { X, Users, Loader2, CheckCircle, Clock } from 'lucide-react'
import { adminFetchJson } from '@/lib/admin-client'

type Collaborator = {
  id: string
  username: string
  invite_status: 'Accepted' | 'Pending'
}

type CollaboratorsModalProps = {
  mediaId: string
  integrationId: string
  onClose: () => void
}

export function CollaboratorsModal({ mediaId, integrationId, onClose }: CollaboratorsModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCollaborators()
  }, [mediaId, integrationId])

  async function loadCollaborators() {
    setLoading(true)
    setError(null)

    try {
      const data = await adminFetchJson<{ ok: boolean; collaborators: Collaborator[] }>(
        `/api/meta/collaboration?action=list_collaborators&integrationId=${integrationId}&mediaId=${mediaId}`
      )
      setCollaborators(data?.collaborators || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar colaboradores.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Users className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-slate-900">Colaboradores</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800">{error}</p>
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-600">Este post não tem colaboradores.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {collaborators.map((collaborator) => (
                <div
                  key={collaborator.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {collaborator.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">
                        @{collaborator.username}
                      </p>
                      <p className="text-sm text-slate-500">
                        ID: {collaborator.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {collaborator.invite_status === 'Accepted' ? (
                      <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Aceito
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                        <Clock className="w-4 h-4" />
                        Pendente
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          <div className="text-sm text-slate-600">
            <strong>Dica:</strong> Colaboradores aparecem quando o post é compartilhado entre contas.
            O engajamento é somado para todos os colaboradores.
          </div>
        </div>
      </div>
    </div>
  )
}
