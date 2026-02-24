import * as XLSX from 'xlsx'
import { normalizeForSearch } from '@/lib/normalize-text'
import { normalizeCpf, normalizeDate } from '@/lib/validators/person'

export type ImportRowError = { row: number; message: string }

export type ParsedPersonRow = {
  row: number
  full_name: string
  sex: 'Masculino' | 'Feminino' | null
  church_profile: 'Membro' | 'Frequentador' | 'Visitante'
  church_name: string | null
  church_situation: 'Ativo' | 'Inativo'
  status_in_church: 'Ativo' | 'Inativo'
  is_pastor: boolean | null
  is_leader: boolean | null
  is_new_convert: boolean | null
  accepted_jesus: boolean | null
  accepted_jesus_at: string | null
  conversion_date: string | null
  email: string | null
  phone: string | null
  mobile_phone: string | null
  marital_status: 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | null
  is_baptized: boolean | null
  entry_date: string | null
  entry_by: 'Batismo' | 'Reconciliação' | 'Transferência' | 'Conversão' | 'Outro' | null
  birth_date: string | null
  marriage_date: string | null
  baptism_date: string | null
  cpf: string | null
  rg: string | null
  rg_issuing_agency: string | null
  rg_uf: string | null
  address_line: string | null
  address_number: string | null
  address_complement: string | null
  neighborhood: string | null
  cep: string | null
  city: string | null
  state: string | null
  education_level: string | null
  profession: string | null
  blood_type: string | null
  nationality: string | null
  birthplace: string | null
  origin_church: string | null
}

type RowRecord = Record<string, unknown>

const FIELD_LABELS: Record<string, string[]> = {
  full_name: ['Nome completo', 'Nome'],
  sex: ['Sexo', 'Gênero', 'Genero'],
  church_profile: ['Tipo', 'Perfil na igreja', 'Perfil'],
  church_name: ['Igreja'],
  church_situation: ['Status', 'Situação'],
  is_pastor: ['É pastor?', 'E pastor?', 'Pastor'],
  is_leader: ['Faz parte da liderança?', 'Faz parte da lideranca?', 'É líder?', 'E lider?'],
  is_new_convert: ['É recém-convertido?', 'E recem-convertido?', 'Recém-convertido', 'Recem-convertido'],
  accepted_jesus: ['Aceitou Jesus?'],
  accepted_jesus_at: ['Aceitou Jesus em'],
  conversion_date: ['Data que aceitou Jesus', 'Aceitou Jesus em', 'Data de conversão', 'Data de conversao'],
  email: ['E-Mail', 'Email', 'E-mail'],
  phone: ['Telefone'],
  mobile_phone: ['Celular'],
  marital_status: ['Estado Civil'],
  is_baptized: ['Batizado?'],
  entry_date: ['Data de entrada'],
  entry_by: ['Forma de entrada', 'Entrada por'],
  birth_date: ['Aniversário', 'Aniversario', 'Data de nascimento'],
  marriage_date: ['Data de Casamento'],
  baptism_date: ['Data de Batismo'],
  cpf: ['CPF'],
  rg: ['Documento de Identificação', 'Documento de Identificacao', 'RG'],
  rg_issuing_agency: ['Órgão Emissor', 'Orgao Emissor'],
  rg_uf: ['UF do RG'],
  address_line: ['Endereço', 'Endereco', 'Logradouro'],
  address_number: ['Número', 'Numero'],
  address_complement: ['Complemento'],
  neighborhood: ['Bairro'],
  cep: ['CEP'],
  city: ['Cidade'],
  state: ['UF', 'Estado'],
  education_level: ['Escolaridade'],
  profession: ['Ocupação', 'Ocupacao', 'Profissão', 'Profissao'],
  blood_type: ['Tipo sanguíneo', 'Tipo sanguineo'],
  nationality: ['Nacionalidade'],
  birthplace: ['Naturalidade'],
  origin_church: ['Igreja de origem'],
}

const YES_VALUES = new Set(['sim', 's', 'yes', 'y', 'true', '1'])
const NO_VALUES = new Set(['nao', 'não', 'n', 'no', 'false', '0'])

function toText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function parseBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 0 ? false : value === 1 ? true : null
  const normalized = normalizeForSearch(toText(value))
  if (!normalized) return null
  if (YES_VALUES.has(normalized)) return true
  if (NO_VALUES.has(normalized)) return false
  return null
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (!parsed) return null
    const yyyy = String(parsed.y).padStart(4, '0')
    const mm = String(parsed.m).padStart(2, '0')
    const dd = String(parsed.d).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const yyyy = value.getFullYear()
    const mm = String(value.getMonth() + 1).padStart(2, '0')
    const dd = String(value.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  return normalizeDate(toText(value))
}

function mapSex(value: unknown): 'Masculino' | 'Feminino' | null {
  const v = normalizeForSearch(toText(value))
  if (!v) return null
  if (['m', 'masculino', 'homem'].includes(v)) return 'Masculino'
  if (['f', 'feminino', 'mulher'].includes(v)) return 'Feminino'
  return null
}

function mapChurchProfile(value: unknown): 'Membro' | 'Frequentador' | 'Visitante' {
  const v = normalizeForSearch(toText(value))
  if (['membro', 'member'].includes(v)) return 'Membro'
  if (['frequentador', 'frequenta'].includes(v)) return 'Frequentador'
  return 'Visitante'
}

function mapSituation(value: unknown): 'Ativo' | 'Inativo' {
  const v = normalizeForSearch(toText(value))
  return ['inativo', 'inactive'].includes(v) ? 'Inativo' : 'Ativo'
}

function mapMaritalStatus(value: unknown): 'Solteiro(a)' | 'Casado(a)' | 'Divorciado(a)' | 'Viúvo(a)' | null {
  const v = normalizeForSearch(toText(value))
  if (!v) return null
  if (['solteiro', 'solteira', 'solteiro(a)'].includes(v)) return 'Solteiro(a)'
  if (['casado', 'casada', 'casado(a)'].includes(v)) return 'Casado(a)'
  if (['divorciado', 'divorciada', 'divorciado(a)'].includes(v)) return 'Divorciado(a)'
  if (['viuvo', 'viuva', 'viuvo(a)', 'viuva(a)', 'viuvo(a)'].includes(v)) return 'Viúvo(a)'
  return null
}

function mapEntryBy(value: unknown): 'Batismo' | 'Reconciliação' | 'Transferência' | 'Conversão' | 'Outro' | null {
  const v = normalizeForSearch(toText(value))
  if (!v) return null
  if (['batismo'].includes(v)) return 'Batismo'
  if (['reconciliacao', 'reconciliação'].includes(v)) return 'Reconciliação'
  if (['transferencia', 'transferência'].includes(v)) return 'Transferência'
  if (['conversao', 'conversão'].includes(v)) return 'Conversão'
  return 'Outro'
}

function findHeaderMap(headers: string[]) {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeForSearch(header),
  }))

  const map: Record<string, string | null> = {}

  for (const [field, candidates] of Object.entries(FIELD_LABELS)) {
    const normalizedCandidates = candidates.map(normalizeForSearch)
    const found = normalizedHeaders.find((header) => normalizedCandidates.includes(header.normalized))
    map[field] = found?.original ?? null
  }

  return map
}

function getValueByHeader(row: RowRecord, header: string | null): unknown {
  if (!header) return null
  return row[header] ?? null
}

export function parsePeopleWorkbook(fileBuffer: Buffer): {
  rows: ParsedPersonRow[]
  errors: ImportRowError[]
  matchedFields: Array<{ field: string; sourceHeader: string; required: boolean }>
  missingRequiredFields: string[]
  headers: string[]
} {
  const workbook = XLSX.read(fileBuffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rawRows = XLSX.utils.sheet_to_json<RowRecord>(sheet, { defval: '' })
  const headers = sheet
    ? ((XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as unknown[]) ?? []).map((item) => toText(item))
    : []

  const headerMap = findHeaderMap(headers)
  const errors: ImportRowError[] = []
  const rows: ParsedPersonRow[] = []

  const requiredFields = ['full_name']
  const missingRequiredFields = requiredFields.filter((field) => !headerMap[field])

  const matchedFields = Object.entries(headerMap)
    .filter(([, sourceHeader]) => !!sourceHeader)
    .map(([field, sourceHeader]) => ({ field, sourceHeader: sourceHeader as string, required: requiredFields.includes(field) }))

  rawRows.forEach((raw, index) => {
    const row = index + 2
    const fullName = toText(getValueByHeader(raw, headerMap.full_name))

    if (!fullName) {
      errors.push({ row, message: 'Nome completo é obrigatório.' })
      return
    }

    const churchSituation = mapSituation(getValueByHeader(raw, headerMap.church_situation))

    rows.push({
      row,
      full_name: fullName,
      sex: mapSex(getValueByHeader(raw, headerMap.sex)),
      church_profile: mapChurchProfile(getValueByHeader(raw, headerMap.church_profile)),
      church_name: toText(getValueByHeader(raw, headerMap.church_name)) || null,
      church_situation: churchSituation,
      status_in_church: churchSituation,
      is_pastor: parseBoolean(getValueByHeader(raw, headerMap.is_pastor)),
      is_leader: parseBoolean(getValueByHeader(raw, headerMap.is_leader)),
      is_new_convert: parseBoolean(getValueByHeader(raw, headerMap.is_new_convert)),
      accepted_jesus: parseBoolean(getValueByHeader(raw, headerMap.accepted_jesus)),
      accepted_jesus_at: toText(getValueByHeader(raw, headerMap.accepted_jesus_at)) || null,
      conversion_date: parseDate(getValueByHeader(raw, headerMap.conversion_date)),
      email: toText(getValueByHeader(raw, headerMap.email)).toLowerCase() || null,
      phone: toText(getValueByHeader(raw, headerMap.phone)) || null,
      mobile_phone: toText(getValueByHeader(raw, headerMap.mobile_phone)) || null,
      marital_status: mapMaritalStatus(getValueByHeader(raw, headerMap.marital_status)),
      is_baptized: parseBoolean(getValueByHeader(raw, headerMap.is_baptized)),
      entry_date: parseDate(getValueByHeader(raw, headerMap.entry_date)),
      entry_by: mapEntryBy(getValueByHeader(raw, headerMap.entry_by)),
      birth_date: parseDate(getValueByHeader(raw, headerMap.birth_date)),
      marriage_date: parseDate(getValueByHeader(raw, headerMap.marriage_date)),
      baptism_date: parseDate(getValueByHeader(raw, headerMap.baptism_date)),
      cpf: normalizeCpf(toText(getValueByHeader(raw, headerMap.cpf))) || null,
      rg: toText(getValueByHeader(raw, headerMap.rg)) || null,
      rg_issuing_agency: toText(getValueByHeader(raw, headerMap.rg_issuing_agency)) || null,
      rg_uf: toText(getValueByHeader(raw, headerMap.rg_uf)).toUpperCase() || null,
      address_line: toText(getValueByHeader(raw, headerMap.address_line)) || null,
      address_number: toText(getValueByHeader(raw, headerMap.address_number)) || null,
      address_complement: toText(getValueByHeader(raw, headerMap.address_complement)) || null,
      neighborhood: toText(getValueByHeader(raw, headerMap.neighborhood)) || null,
      cep: toText(getValueByHeader(raw, headerMap.cep)) || null,
      city: toText(getValueByHeader(raw, headerMap.city)) || null,
      state: toText(getValueByHeader(raw, headerMap.state)).toUpperCase() || null,
      education_level: toText(getValueByHeader(raw, headerMap.education_level)) || null,
      profession: toText(getValueByHeader(raw, headerMap.profession)) || null,
      blood_type: toText(getValueByHeader(raw, headerMap.blood_type)).toUpperCase() || null,
      nationality: toText(getValueByHeader(raw, headerMap.nationality)) || null,
      birthplace: toText(getValueByHeader(raw, headerMap.birthplace)) || null,
      origin_church: toText(getValueByHeader(raw, headerMap.origin_church)) || null,
    })
  })

  return { rows, errors, matchedFields, missingRequiredFields, headers }
}
