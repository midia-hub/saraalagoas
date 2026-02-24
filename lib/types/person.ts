/**
 * Tipos para o cadastro central de Pessoas (people)
 */

export const CHURCH_PROFILE_VALUES = ['Membro', 'Frequentador', 'Visitante'] as const
export const CHURCH_SITUATION_VALUES = ['Ativo', 'Inativo'] as const
export const CHURCH_ROLE_VALUES = ['Nenhum', 'Obreiro', 'Voluntário', 'Diácono', 'Cooperador', 'Missionário', 'Pastor', 'Bispo'] as const
export const SEX_VALUES = ['Masculino', 'Feminino'] as const
export const MARITAL_STATUS_VALUES = ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)'] as const
export const ENTRY_BY_VALUES = ['Batismo', 'Reconciliação', 'Transferência', 'Conversão', 'Outro'] as const
export const STATUS_IN_CHURCH_VALUES = ['Ativo', 'Inativo'] as const
export const EDUCATION_LEVEL_VALUES = [
  'Analfabeto', 'Fundamental Incompleto', 'Fundamental Completo',
  'Médio Incompleto', 'Médio Completo', 'Superior Incompleto', 'Superior Completo',
  'Pós-graduação', 'Mestrado', 'Doutorado', 'Não informado'
] as const
export const BLOOD_TYPE_VALUES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Não informado'] as const

export type ChurchProfile = (typeof CHURCH_PROFILE_VALUES)[number]
export type ChurchSituation = (typeof CHURCH_SITUATION_VALUES)[number]
export type ChurchRole = (typeof CHURCH_ROLE_VALUES)[number]
export type Sex = (typeof SEX_VALUES)[number]
export type MaritalStatus = (typeof MARITAL_STATUS_VALUES)[number]
export type EntryBy = (typeof ENTRY_BY_VALUES)[number]
export type StatusInChurch = (typeof STATUS_IN_CHURCH_VALUES)[number]
export type EducationLevel = (typeof EDUCATION_LEVEL_VALUES)[number]
export type BloodType = (typeof BLOOD_TYPE_VALUES)[number]

export interface Person {
  id: string
  created_at: string
  updated_at: string
  metadata: Record<string, unknown>
  leader_person_id: string | null
  spouse_person_id: string | null

  full_name: string
  church_name: string | null
  church_profile: ChurchProfile
  church_situation: ChurchSituation

  church_role: ChurchRole | null

  sex: Sex | null
  birth_date: string | null
  marital_status: MaritalStatus | null
  marriage_date: string | null
  rg: string | null
  rg_issuing_agency: string | null
  rg_uf: string | null
  cpf: string | null
  special_needs: string | null

  cep: string | null
  city: string | null
  state: string | null
  neighborhood: string | null
  address_line: string | null
  address_number: string | null
  address_complement: string | null
  email: string | null
  mobile_phone: string | null
  phone: string | null

  entry_by: EntryBy | null
  entry_date: string | null
  status_in_church: StatusInChurch | null
  is_new_convert: boolean | null
  accepted_jesus: boolean | null
  accepted_jesus_at: string | null
  conversion_date: string | null
  is_baptized: boolean | null
  baptism_date: string | null
  is_leader: boolean | null
  is_pastor: boolean | null

  education_level: EducationLevel | null
  profession: string | null
  nationality: string | null
  birthplace: string | null
  origin_church: string | null
  interviewed_by: string | null
  registered_by: string | null
  blood_type: BloodType | null
  avatar_url?: string | null
}

export type PersonCreate = Omit<Person, 'id' | 'created_at' | 'updated_at'> & {
  id?: string
  created_at?: string
  updated_at?: string
}

export type PersonUpdate = Partial<Omit<Person, 'id' | 'created_at'>> & { updated_at?: string }

/** Payload mínimo para upsert a partir do formulário de conversão */
export interface PersonUpsertFromConversion {
  full_name: string
  email?: string | null
  mobile_phone?: string | null
  birth_date?: string | null
  cep?: string | null
  city?: string | null
  state?: string | null
  neighborhood?: string | null
  address_line?: string | null
  address_number?: string | null
  address_complement?: string | null
  conversion_date?: string | null
}
