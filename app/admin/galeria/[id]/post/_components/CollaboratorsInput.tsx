'use client'

import { useState } from 'react'
import { Users, X, AlertCircle, Plus } from 'lucide-react'

type CollaboratorsInputProps = {
  collaborators: string[]
  onChange: (collaborators: string[]) => void
  disabled?: boolean
}

export function CollaboratorsInput({ collaborators, onChange, disabled }: CollaboratorsInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    const username = inputValue.trim().replace(/^@/, '') // Remove @ inicial se tiver
    
    if (!username) {
      setError('Digite um username')
      return
    }

    // Validação básica de username do Instagram
    if (!/^[a-zA-Z0-9._]{1,30}$/.test(username)) {
      setError('Username inválido. Use apenas letras, números, pontos e underscores (máx 30 caracteres)')
      return
    }

    if (collaborators.includes(username)) {
      setError('Este colaborador já foi adicionado')
      return
    }

    if (collaborators.length >= 5) {
      setError('O Instagram permite no máximo 5 colaboradores por post')
      return
    }

    onChange([...collaborators, username])
    setInputValue('')
    setError(null)
  }

  const handleRemove = (username: string) => {
    onChange(collaborators.filter((c) => c !== username))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">@</span>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                  setInputValue(e.target.value)
                  setError(null)
                }}
                onKeyPress={handleKeyPress}
                placeholder="username"
                disabled={disabled || collaborators.length >= 5}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pl-7 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              disabled={disabled || !inputValue.trim() || collaborators.length >= 5}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
          
          {error && (
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de colaboradores adicionados */}
      {collaborators.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-slate-700">
            Colaboradores adicionados ({collaborators.length}/5)
          </p>
          <div className="flex flex-wrap gap-2">
            {collaborators.map((username) => (
              <div
                key={username}
                className="flex items-center gap-2 rounded-full bg-blue-100 border border-blue-200 pl-3 pr-2 py-1.5"
              >
                <Users className="w-3 h-3 text-blue-700" />
                <span className="text-sm font-medium text-blue-900">@{username}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(username)}
                  disabled={disabled}
                  className="rounded-full p-0.5 hover:bg-blue-200 disabled:opacity-50"
                  title="Remover colaborador"
                >
                  <X className="w-3 h-3 text-blue-700" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aviso importante */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-semibold mb-1">⚠️ Atenção: Convite manual necessário</p>
            <p>
              A API do Instagram não permite enviar convites de colaboração automaticamente. 
              Após publicar o post, você precisará:
            </p>
            <ol className="list-decimal list-inside mt-1 space-y-0.5 pl-1">
              <li>Abrir o post no Instagram</li>
              <li>Tocar nos três pontos (⋯)</li>
              <li>Selecionar "Marcar pessoas"</li>
              <li>Tocar em "Convidar colaborador"</li>
              <li>Adicionar os usernames listados acima</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
