'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

export interface CustomerFormData {
  name: string
  phone: string
  email: string
  document: string
  notes: string
  can_buy_on_credit: boolean
  credit_limit: number
  active: boolean
}

interface CustomerFormModalProps {
  open: boolean
  initial?: Partial<CustomerFormData> | null
  onSave: (data: CustomerFormData) => Promise<void>
  onCancel: () => void
  loading?: boolean
}

const defaultForm: CustomerFormData = {
  name: '',
  phone: '',
  email: '',
  document: '',
  notes: '',
  can_buy_on_credit: false,
  credit_limit: 0,
  active: true,
}

export function CustomerFormModal({
  open,
  initial,
  onSave,
  onCancel,
  loading = false,
}: CustomerFormModalProps) {
  const [form, setForm] = useState<CustomerFormData>({
    ...defaultForm,
    ...initial,
  })

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave(form)
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-form-title"
    >
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={loading ? undefined : onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-auto">
        <h2 id="customer-form-title" className="text-lg font-semibold text-slate-800 mb-4">
          {initial ? 'Editar cliente' : 'Novo cliente'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone</label>
            <input
              type="text"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="(82) 99999-9999"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Documento (CPF/CNPJ)</label>
            <input
              type="text"
              value={form.document}
              onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="can_credit"
              checked={form.can_buy_on_credit}
              onChange={(e) => setForm((f) => ({ ...f, can_buy_on_credit: e.target.checked }))}
              className="rounded border-slate-300"
            />
            <label htmlFor="can_credit" className="text-sm font-medium text-slate-700">
              Pode comprar fiado
            </label>
          </div>
          {form.can_buy_on_credit && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Limite de crédito (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.credit_limit || ''}
                onChange={(e) => setForm((f) => ({ ...f, credit_limit: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
            />
          </div>
          {initial && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="rounded border-slate-300"
              />
              <label htmlFor="active" className="text-sm font-medium text-slate-700">
                Cliente ativo
              </label>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" loading={loading} disabled={!form.name.trim()}>
              {initial ? 'Salvar' : 'Criar cliente'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
