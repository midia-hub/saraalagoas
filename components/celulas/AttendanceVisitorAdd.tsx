'use client'

import { useState, useCallback } from 'react'
import { UserPlus } from 'lucide-react'
import { fetchPeopleLookup, type PeopleLookupItem } from '@/lib/people'
import { Button } from '@/components/ui/Button'

interface AttendanceVisitorAddProps {
  onAddVisitor: (visitor: { full_name: string; phone?: string }) => void
  onAddPerson: (personId: string) => void
}

export function AttendanceVisitorAdd({ onAddVisitor, onAddPerson }: AttendanceVisitorAddProps) {
  const [input, setInput] = useState('')
  const [phone, setPhone] = useState('')
  const [searchResults, setSearchResults] = useState<PeopleLookupItem[]>([])
  const [searching, setSearching] = useState(false)
  const [showInput, setShowInput] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setInput(q)
    if (q.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await fetchPeopleLookup(q)
      setSearchResults(results)
    } catch (err) {
      console.error(err)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleSelectPerson = (personId: string) => {
    onAddPerson(personId)
    setInput('')
    setPhone('')
    setSearchResults([])
    setShowInput(false)
  }

  const handleAddAsVisitor = () => {
    if (!input.trim()) return
    onAddVisitor({ full_name: input.trim(), phone: phone.trim() || undefined })
    setInput('')
    setPhone('')
    setSearchResults([])
    setShowInput(false)
  }

  if (!showInput) {
    return (
      <tr className="border-t-2 border-slate-200 bg-slate-50/50 hover:bg-slate-50">
        <td colSpan={1} className="px-6 py-4 sticky left-0 bg-slate-50/50 z-10 border-r border-slate-200">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowInput(true)}
            className="gap-1 text-xs"
          >
            <UserPlus size={14} /> Adicionar
          </Button>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-t-2 border-slate-200 bg-blue-50 hover:bg-blue-50">
      <td colSpan={1} className="px-6 py-4 sticky left-0 bg-blue-50 z-10 border-r border-slate-200">
        <div className="space-y-3">
          <div>
            <input
              type="text"
              placeholder="Digite o nome para buscar ou adicionar..."
              value={input}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setShowInput(false)
              }}
              autoFocus
              className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <input
              type="tel"
              placeholder="WhatsApp / Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          {searching && (
            <div className="text-xs text-slate-500">Buscando...</div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <div className="space-y-1 max-h-40 overflow-y-auto">
                <p className="text-xs font-semibold text-slate-600 px-1">Pessoas cadastradas:</p>
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    onClick={() => handleSelectPerson(person.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white border border-blue-100 text-sm transition-colors"
                  >
                    {person.full_name}
                  </button>
                ))}
              </div>
              <Button size="sm" onClick={handleAddAsVisitor} className="w-full" disabled={!input.trim()}>
                Ou adicionar "{input.trim()}" como Visitante
              </Button>
            </div>
          )}

          {!searching && input.trim().length > 0 && searchResults.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Nenhuma pessoa encontrada</p>
              <Button size="sm" onClick={handleAddAsVisitor} className="w-full">
                Adicionar como Visitante
              </Button>
            </div>
          )}

          <Button size="sm" variant="ghost" onClick={() => setShowInput(false)} className="w-full">
            Cancelar
          </Button>
        </div>
      </td>
    </tr>
  )
}
