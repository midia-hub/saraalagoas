'use client'

import { useState, useEffect } from 'react'
import { DollarSign, CheckCircle2, Clock, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { adminFetchJson } from '@/lib/admin-client'

interface PDSectionProps {
  value: number
  confirmed?: boolean
  approvalStatus?: 'approved' | 'pending' | 'rejected'
  confirmedBy?: string
  filledBy?: string
  filledAt?: string
  canConfirm: boolean
  onConfirm: () => Promise<void>
  onChange?: (val: number) => void
  readOnly?: boolean
  noCollection?: boolean
  onNoCollectionChange?: (value: boolean) => void
  isAdmin?: boolean
}

export function PDSection({
  value,
  confirmed,
  approvalStatus,
  confirmedBy,
  filledBy,
  filledAt,
  canConfirm,
  onConfirm,
  onChange,
  readOnly = false,
  noCollection = false,
  onNoCollectionChange,
  isAdmin = false
}: PDSectionProps) {
  const [deadlineDate, setDeadlineDate] = useState<string | null>(null)
  const [isPastDeadline, setIsPastDeadline] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [displayValue, setDisplayValue] = useState('')

  useEffect(() => {
    async function loadDeadline() {
      try {
        const data = await adminFetchJson<{ deadline_date: string | null }>('/api/admin/celulas/pd-config')
        setDeadlineDate(data.deadline_date || null)
        
        if (data.deadline_date) {
          const deadline = new Date(data.deadline_date + 'T23:59:59')
          const now = new Date()
          setIsPastDeadline(now > deadline)
        }
      } catch (err) {
        console.error('Erro ao carregar data de corte:', err)
      }
    }
    
    loadDeadline()
  }, [])

  // Atualizar displayValue quando value mudar (e não estiver editando)
  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(value.toFixed(2).replace('.', ','))
    }
  }, [value, isEditing])

  const status = approvalStatus || (confirmed ? 'approved' : 'pending')
  const isApproved = status === 'approved'

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <DollarSign className="text-amber-600" size={20} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Parceiro de Deus (PD)</h3>
            <p className="text-sm text-slate-500">Oferta arrecadada na célula</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
          isApproved
            ? 'bg-emerald-100 text-emerald-700'
            : status === 'rejected'
            ? 'bg-red-100 text-red-700'
            : 'bg-amber-100 text-amber-700'
        }`}>
          {isApproved ? (
            <>
              <CheckCircle2 size={14} /> Confirmado
            </>
          ) : status === 'rejected' ? (
            <>
              <Clock size={14} /> Rejeitado
            </>
          ) : (
            <>
              <Clock size={14} /> Pendente
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {!isAdmin && isPastDeadline && !isApproved && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <AlertCircle className="shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-semibold">Prazo expirado para preenchimento do PD</p>
              <p className="text-xs text-red-600">
                Data limite: {deadlineDate ? new Date(deadlineDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'Não definida'}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Valor Arrecadado (R$)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={displayValue}
              onFocus={(e) => {
                setIsEditing(true)
                // Seleciona todo o texto ao focar
                e.target.select()
              }}
              onChange={(e) => {
                setIsEditing(true)
                // Permite apenas números, vírgula e ponto
                let val = e.target.value.replace(/[^\d,\.]/g, '')
                // Garante apenas uma vírgula ou ponto
                const parts = val.split(/[,\.]/)
                if (parts.length > 2) {
                  val = parts[0] + ',' + parts.slice(1).join('')
                }
                // Limita casas decimais a 2
                if (parts.length === 2 && parts[1].length > 2) {
                  val = parts[0] + ',' + parts[1].substring(0, 2)
                }
                setDisplayValue(val.replace('.', ','))
              }}
              onBlur={(e) => {
                setIsEditing(false)
                // Converte para número e formata
                const cleanValue = e.target.value.replace(',', '.')
                const numValue = parseFloat(cleanValue) || 0
                onChange?.(numValue)
                setDisplayValue(numValue.toFixed(2).replace('.', ','))
              }}
              disabled={(!isAdmin && isApproved) || noCollection || (!isAdmin && isPastDeadline)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all text-lg font-semibold text-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
              placeholder="0,00"
            />
          </div>
          {!isApproved && onNoCollectionChange && (
            <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={noCollection}
                onChange={(e) => onNoCollectionChange(e.target.checked)}
                className="rounded border-slate-300"
                disabled={!isAdmin && isPastDeadline}
              />
              Nao houve arrecadacao nesta realizacao
            </label>
          )}
          {isAdmin && isApproved && (
            <p className="mt-2 text-xs text-purple-600 font-semibold">
              Administrador pode editar mesmo após aprovação
            </p>
          )}
          {isAdmin && isPastDeadline && !isApproved && (
            <p className="mt-2 text-xs text-purple-600 font-semibold">
              Administrador pode editar mesmo após o prazo
            </p>
          )}
        </div>

        {/* Informação sobre quem preencheu */}
        {filledBy && filledAt && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800">
            <Clock className="shrink-0" size={20} />
            <div className="text-xs">
              <p className="font-semibold">Preenchido por:</p>
              <p>{filledBy}</p>
              <p className="text-blue-600">
                {new Date(filledAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
          </div>
        )}

        {isApproved && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800">
            <ShieldCheck className="text-emerald-600 shrink-0" size={24} />
            <div className="text-sm">
              <p className="font-semibold">Confirmado por Secretário PD:</p>
              <p>{confirmedBy || 'Administrador'}</p>
            </div>
          </div>
        )}

        {status === 'pending' && !isApproved && value > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800">
            <Clock className="shrink-0" size={20} />
            <div className="text-sm">
              <p className="font-semibold">Aguardando confirmação</p>
              <p className="text-xs">O Secretário PD precisa aprovar este valor</p>
            </div>
          </div>
        )}

        {!isApproved && canConfirm && value > 0 && (
          <Button
            type="button"
            onClick={onConfirm}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
          >
            Confirmar Recebimento
          </Button>
        )}

        {!isApproved && !canConfirm && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-xs italic">
            A confirmação do PD deve ser feita por um usuário com permissão de <strong>Secretário PD</strong>.
          </div>
        )}
      </div>
    </div>
  )
}
