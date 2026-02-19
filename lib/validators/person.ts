import { z } from 'zod'
import {
  CHURCH_PROFILE_VALUES,
  CHURCH_SITUATION_VALUES,
  CHURCH_ROLE_VALUES,
  SEX_VALUES,
  MARITAL_STATUS_VALUES,
  ENTRY_BY_VALUES,
  STATUS_IN_CHURCH_VALUES,
  EDUCATION_LEVEL_VALUES,
  BLOOD_TYPE_VALUES,
} from '@/lib/types/person'

/** Remove caracteres não numéricos (CPF) */
export function normalizeCpf(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  return digits.length >= 11 ? digits.slice(0, 11) : (digits || null)
}

/** Telefone: tentar E.164 (DDI 55 + DDD + número). Retorna como está se não conseguir normalizar. */
export function normalizePhone(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null
  const digits = value.replace(/\D/g, '')
  if (digits.length === 0) return null
  if (digits.length <= 10) {
    const ddd = digits.slice(0, 2)
    const num = digits.slice(2)
    return `55${ddd}${num}`.slice(0, 13)
  }
  if (digits.startsWith('55') && digits.length >= 12) return digits.slice(0, 13)
  return `55${digits}`.slice(0, 13)
}

/** Data: entrada DD/MM/AAAA ou ISO → retorna ISO YYYY-MM-DD para o banco */
export function normalizeDate(value: string | null | undefined): string | null {
  if (value == null || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed)
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`
  const brMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(trimmed)
  if (brMatch) {
    const [, d, m, y] = brMatch
    const day = d!.padStart(2, '0')
    const month = m!.padStart(2, '0')
    return `${y}-${month}-${day}`
  }
  return null
}

/** Formatar data ISO para exibição DD/MM/AAAA */
export function formatDateDisplay(isoDate: string | null | undefined): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('T')[0].split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

const optionalString = z.string().trim().nullable().optional()
const optionalDate = z.string().nullable().optional()
const optionalBoolean = z.boolean().nullable().optional()
const optionalUuid = z.string().uuid().nullable().optional()

/** Schema base sem refinements — .partial() no Zod v4 só pode ser usado em schemas sem refinements */
const personBaseSchema = z.object({
  leader_person_id: optionalUuid,
  spouse_person_id: optionalUuid,
  full_name: z.string().min(1, 'Nome é obrigatório').trim(),
  church_profile: z.enum(CHURCH_PROFILE_VALUES as unknown as [string, ...string[]]),
  church_situation: z.enum(CHURCH_SITUATION_VALUES as unknown as [string, ...string[]]),

  church_role: z.enum(CHURCH_ROLE_VALUES as unknown as [string, ...string[]]).nullable().optional(),

  sex: z.enum(SEX_VALUES as unknown as [string, ...string[]], { message: 'Sexo é obrigatório' }),
  birth_date: optionalDate,
  marital_status: z.enum(MARITAL_STATUS_VALUES as unknown as [string, ...string[]]).nullable().optional(),
  marriage_date: optionalDate,
  rg: optionalString,
  cpf: optionalString,
  special_needs: optionalString,

  cep: optionalString,
  city: optionalString,
  state: optionalString,
  neighborhood: optionalString,
  address_line: optionalString,
  address_number: optionalString,
  address_complement: optionalString,
  email: z.string().email().nullable().optional().or(z.literal('')),
  mobile_phone: optionalString,
  phone: optionalString,

  entry_by: z.enum(ENTRY_BY_VALUES as unknown as [string, ...string[]]).nullable().optional(),
  entry_date: optionalDate,
  status_in_church: z.enum(STATUS_IN_CHURCH_VALUES as unknown as [string, ...string[]]).nullable().optional(),
  conversion_date: optionalDate,
  is_baptized: optionalBoolean,
  baptism_date: optionalDate,
  is_leader: optionalBoolean,
  is_pastor: optionalBoolean,

  education_level: z.enum(EDUCATION_LEVEL_VALUES as unknown as [string, ...string[]]).nullable().optional(),
  profession: optionalString,
  nationality: optionalString,
  birthplace: optionalString,
  interviewed_by: optionalString,
  registered_by: optionalString,
  blood_type: z.enum(BLOOD_TYPE_VALUES as unknown as [string, ...string[]]).nullable().optional(),
})

export const personCreateSchema = personBaseSchema
  .refine(
    (data) => {
      if (data.marital_status !== 'Casado(a)' || !data.marriage_date) return true
      return !!data.marriage_date
    },
    { message: 'Data de casamento só é permitida para Casado(a)', path: ['marriage_date'] }
  )
  .refine(
    (data) => {
      if (!data.is_baptized || !data.baptism_date) return true
      return !!data.baptism_date
    },
    { message: 'Data de batismo é obrigatória quando batizado', path: ['baptism_date'] }
  )

/** Schema de atualização: base parcial (sem refinements) para compatibilidade com Zod v4 */
export const personUpdateSchema = personBaseSchema.partial().extend({
  full_name: z.string().min(1).trim().optional(),
  church_profile: z.enum(CHURCH_PROFILE_VALUES as unknown as [string, ...string[]]).optional(),
  church_situation: z.enum(CHURCH_SITUATION_VALUES as unknown as [string, ...string[]]).optional(),
})

/** Payload do formulário de conversão → upsert pessoa */
export const personUpsertFromConversionSchema = z.object({
  full_name: z.string().min(1, 'Nome é obrigatório').trim(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  mobile_phone: optionalString,
  birth_date: optionalDate,
  cep: optionalString,
  city: optionalString,
  state: optionalString,
  neighborhood: optionalString,
  address_line: optionalString,
  conversion_date: optionalDate,
})

export type PersonCreateInput = z.infer<typeof personCreateSchema>
export type PersonUpdateInput = z.infer<typeof personUpdateSchema>
export type PersonUpsertFromConversionInput = z.infer<typeof personUpsertFromConversionSchema>
