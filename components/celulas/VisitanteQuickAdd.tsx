'use client'

import { useState } from 'react'
import { UserPlus, X, Phone } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface VisitanteQuickAddProps {
  onAdd: (visitor: { full_name: string; phone: string }) => void
}

export function VisitanteQuickAdd({ onAdd }: VisitanteQuickAddProps) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ full_name: name.trim(), phone: phone.trim() })
    setName('')
    setPhone('')
  }

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
        <UserPlus size={16} className="text-[#c62737]" />
        Adicionar Visitante
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome completo"
          className="px-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#c62737] outline-none"
        />
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="WhatsApp / Telefone"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-sm focus:border-[#c62737] outline-none"
          />
        </div>
      </div>
      <Button
        type="button"
        onClick={handleAdd}
        disabled={!name.trim()}
        className="w-full py-2 text-xs"
      >
        Incluir na lista
      </Button>
    </div>
  )
}
