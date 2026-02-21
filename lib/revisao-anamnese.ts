export type YesNo = 'sim' | 'nao' | ''

export type QuestionAnswer = {
  answer: YesNo
  detail: string
  schedule?: string
  notes?: string
}

export type RevisaoAnamneseFormData = {
  name: string
  phone: string
  bloodType: string
  team: string
  leader: string
  preReviewCompleted: YesNo
  photoUrl: string
  observacoes: string
  questions: Record<string, QuestionAnswer>
}

export const ANAMNESE_QUESTION_DEFS = [
  { key: 'q1', title: '1) Toma algum remédio controlado?', detailLabel: 'Se sim, qual?', scheduleLabel: 'Horário de tomar' },
  { key: 'q2', title: '2) Tem alergia a algum medicamento ou alimento?', detailLabel: 'Se sim, qual?' },
  { key: 'q3', title: '3) Gestante?' },
  { key: 'q4', title: '4) Fez alguma cirurgia nos últimos 3 meses?', detailLabel: 'Se sim, onde?' },
  { key: 'q5', title: '5) Fumante?' },
  { key: 'q6', title: '6) Está fazendo algum tratamento médico?', detailLabel: 'Se sim, qual?' },
  { key: 'q7', title: '7) Tem hipertensão?' },
  { key: 'q8', title: '8) Possui algum problema cardíaco?' },
  { key: 'q9', title: '9) Tem epilepsia?' },
  { key: 'q10', title: '10) Possui alguma doença crônica?', detailLabel: 'Se sim, qual?' },
  { key: 'q11', title: '11) Já teve o Covid?', detailLabel: 'Se sim, quanto tempo faz?' },
  { key: 'q12', title: '12) Tem algum vício?', detailLabel: 'Se sim, fale um pouco sobre' },
  { key: 'q13', title: '13) Já frequentou candomblé, umbanda ou quimbanda?', detailLabel: 'Se sim, fale um pouco sobre' },
  { key: 'q14', title: '14) Já tomou passe ou fez pacto?', detailLabel: 'Se sim, fale um pouco sobre' },
] as const

export function createEmptyQuestions(): Record<string, QuestionAnswer> {
  return Object.fromEntries(
    ANAMNESE_QUESTION_DEFS.map((q) => [q.key, { answer: '', detail: '', schedule: '', notes: '' }])
  )
}

export function createDefaultAnamneseData(): RevisaoAnamneseFormData {
  return {
    name: '',
    phone: '',
    bloodType: '',
    team: '',
    leader: '',
    preReviewCompleted: '',
    photoUrl: '',
    observacoes: '',
    questions: createEmptyQuestions(),
  }
}

export function normalizeAnamneseData(input: unknown): RevisaoAnamneseFormData {
  const base = createDefaultAnamneseData()
  const data = (input && typeof input === 'object') ? input as Partial<RevisaoAnamneseFormData> : {}

  const incomingQuestions = data.questions && typeof data.questions === 'object'
    ? data.questions as Record<string, Partial<QuestionAnswer>>
    : {}

  const questions = createEmptyQuestions()
  for (const q of ANAMNESE_QUESTION_DEFS) {
    const current = incomingQuestions[q.key] ?? {}
    questions[q.key] = {
      answer: current.answer === 'sim' || current.answer === 'nao' ? current.answer : '',
      detail: typeof current.detail === 'string' ? current.detail : '',
      schedule: typeof current.schedule === 'string' ? current.schedule : '',
      notes: typeof current.notes === 'string' ? current.notes : '',
    }
  }

  return {
    ...base,
    name: typeof data.name === 'string' ? data.name : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    bloodType: typeof data.bloodType === 'string' ? data.bloodType : '',
    team: typeof data.team === 'string' ? data.team : '',
    leader: typeof data.leader === 'string' ? data.leader : '',
    preReviewCompleted: data.preReviewCompleted === 'sim' || data.preReviewCompleted === 'nao' ? data.preReviewCompleted : '',
    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : '',
    observacoes: typeof data.observacoes === 'string' ? data.observacoes : '',
    questions,
  }
}

export function validateRequiredAnamnese(data: RevisaoAnamneseFormData): string | null {
  if (!data.name.trim()) return 'Preencha o nome completo.'
  if (!data.phone.trim()) return 'Preencha o telefone.'
  if (!data.bloodType.trim()) return 'Preencha o tipo sanguíneo.'
  if (!data.team.trim()) return 'Preencha a equipe.'
  if (!data.leader.trim()) return 'Preencha o líder.'
  if (data.preReviewCompleted !== 'sim' && data.preReviewCompleted !== 'nao') {
    return 'Informe se concluiu o Pré Revisão.'
  }

  for (const q of ANAMNESE_QUESTION_DEFS) {
    const answer = data.questions[q.key]?.answer
    const detail = data.questions[q.key]?.detail ?? ''

    if (answer !== 'sim' && answer !== 'nao') {
      return `Responda: ${q.title}`
    }

    if ('detailLabel' in q && q.detailLabel && answer === 'sim' && !detail.trim()) {
      return `Preencha: ${q.detailLabel}`
    }
  }

  return null
}
