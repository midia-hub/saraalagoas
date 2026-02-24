'use client'

import { useState, useEffect, useCallback } from 'react'
import { UserCircle, Search, UserPlus, Upload } from 'lucide-react'
import { PageAccessGuard } from '@/app/admin/PageAccessGuard'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { PeopleTable } from '@/components/admin/people/PeopleTable'
import { PeopleImportModal } from '@/components/admin/people/PeopleImportModal'
import { fetchPeople } from '@/lib/people'
import { useAdminAccess } from '@/lib/admin-access-context'
import type { Person } from '@/lib/types/person'
import Link from 'next/link'

export default function PessoasPage() {
  const access = useAdminAccess()
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [churchProfile, setChurchProfile] = useState('')
  const [churchSituation, setChurchSituation] = useState('')
  const [churchRole, setChurchRole] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await fetchPeople({
        q: q || undefined,
        church_profile: churchProfile || undefined,
        church_situation: churchSituation || undefined,
        church_role: churchRole || undefined,
      })
      setPeople(list)
    } catch (e) {
      setPeople([])
      setError(e instanceof Error ? e.message : 'Erro ao carregar pessoas.')
    } finally {
      setLoading(false)
    }
  }, [q, churchProfile, churchSituation, churchRole])

  useEffect(() => {
    load()
  }, [load])

  return (
    <PageAccessGuard pageKey="pessoas">
      <div className="p-6 md:p-8">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#c62737]/10 flex items-center justify-center">
              <UserCircle className="text-[#c62737]" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pessoas</h1>
              <p className="text-slate-500">Cadastro central de pessoas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {access.isAdmin && (
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all"
              >
                <Upload size={18} />
                Importar XLSX
              </button>
            )}
            <Link
              href="/admin/pessoas/novo"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#c62737] text-white font-semibold hover:bg-[#a62030] transition-all shadow-lg shadow-[#c62737]/20 active:scale-[0.98]"
            >
              <UserPlus size={20} />
              Cadastrar Pessoa
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="search"
                  id="people-search"
                  name="people-search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Nome, telefone, e-mail ou CPF..."
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-[#c62737] focus:ring-2 focus:ring-[#c62737]/20 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Perfil</label>
              <CustomSelect value={churchProfile} onChange={setChurchProfile} placeholder="Todos" options={[{ value: 'Membro', label: 'Membro' }, { value: 'Frequentador', label: 'Frequentador' }, { value: 'Visitante', label: 'Visitante' }]} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Situação</label>
              <CustomSelect value={churchSituation} onChange={setChurchSituation} placeholder="Todos" options={[{ value: 'Ativo', label: 'Ativo' }, { value: 'Inativo', label: 'Inativo' }]} />
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Função</label>
            <div className="max-w-xs">
              <CustomSelect
                value={churchRole}
                onChange={setChurchRole}
                placeholder="Todas"
                options={[
                  { value: 'Nenhum', label: 'Nenhum' }, { value: 'Obreiro', label: 'Obreiro' }, { value: 'Voluntário', label: 'Voluntário' },
                  { value: 'Diácono', label: 'Diácono' }, { value: 'Cooperador', label: 'Cooperador' }, { value: 'Missionário', label: 'Missionário' }, { value: 'Pastor', label: 'Pastor' }, { value: 'Bispo', label: 'Bispo' },
                ]}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        <PeopleTable people={people} loading={loading} />

        {importModalOpen && (
          <PeopleImportModal
            onClose={() => setImportModalOpen(false)}
            onImported={() => {
              load()
            }}
          />
        )}
      </div>
    </PageAccessGuard>
  )
}
