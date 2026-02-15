import { adminFetchJson } from '@/lib/admin-client'
import type { Person, PersonCreate, PersonUpdate } from '@/lib/types/person'

export async function fetchPeople(params: {
  q?: string
  church_profile?: string
  church_situation?: string
  church_role?: string
}): Promise<Person[]> {
  const sp = new URLSearchParams()
  if (params.q) sp.set('q', params.q)
  if (params.church_profile) sp.set('church_profile', params.church_profile)
  if (params.church_situation) sp.set('church_situation', params.church_situation)
  if (params.church_role) sp.set('church_role', params.church_role)
  const url = `/api/admin/people${sp.toString() ? `?${sp.toString()}` : ''}`
  const data = await adminFetchJson<{ people: Person[] }>(url)
  return data.people ?? []
}

export async function fetchPerson(id: string): Promise<Person | null> {
  try {
    const data = await adminFetchJson<{ person: Person }>(`/api/admin/people/${id}`)
    return data.person ?? null
  } catch {
    return null
  }
}

export async function createPerson(payload: PersonCreate): Promise<Person> {
  const data = await adminFetchJson<{ person: Person }>('/api/admin/people', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data.person
}

export async function updatePerson(id: string, payload: PersonUpdate): Promise<Person> {
  const data = await adminFetchJson<{ person: Person }>(`/api/admin/people/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
  return data.person
}

export async function deletePerson(id: string): Promise<void> {
  await adminFetchJson(`/api/admin/people/${id}`, { method: 'DELETE' })
}

export type ConversionType = 'accepted' | 'reconciled'

export async function upsertPersonAndConversion(payload: {
  nome: string
  email?: string
  telefone: string
  dataNascimento?: string
  endereco?: string
  /** Bairro (enviado separado para people.neighborhood) */
  bairro?: string
  cidade?: string
  estado?: string
  cep?: string
  dataConversao: string
  culto?: string
  quemIndicou?: string
  observacoes?: string
  /** Líder/Consolidador: ID da pessoa selecionada (prioridade sobre consolidator_name_text) */
  consolidator_person_id?: string
  /** Líder/Consolidador: texto livre quando não há seleção */
  consolidator_name_text?: string
  /** Célula: ID da célula selecionada */
  cell_id?: string
  /** Célula: nome livre quando não há seleção */
  cell_name_text?: string
  /** Igreja: ID da igreja selecionada */
  church_id?: string
  /** Equipe: ID da equipe selecionada */
  team_id?: string
  /** Gênero: M = masculino, F = feminino (obrigatório para mensagem) */
  gender?: 'M' | 'F'
  conversion_type?: ConversionType
  instagram?: string
}): Promise<{ person: Person; conversion: Record<string, unknown> }> {
  return adminFetchJson<{ person: Person; conversion: Record<string, unknown> }>(
    '/api/admin/consolidacao/upsert-person-and-conversion',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  )
}
