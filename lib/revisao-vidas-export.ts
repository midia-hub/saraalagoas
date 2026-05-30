import type { ReviewFlowStatus, ReviewRegistrationEnriched } from '@/lib/consolidacao-types'
import {
  REVIEW_FLOW_STATUS_LABELS,
  REVIEW_REG_STATUS_LABELS,
} from '@/lib/consolidacao-types'

export type RevisaoInscritoExportRow = {
  nome: string
  telefone: string
  email: string
  evento: string
  equipe: string
  lider: string
  status: string
  preRevisao: string
  pagamento: string
  dataPagamento: string
  anamnese: string
  dataInscricao: string
}

const CSV_COLUMNS: Array<{ key: keyof RevisaoInscritoExportRow; label: string }> = [
  { key: 'nome', label: 'Nome' },
  { key: 'telefone', label: 'Telefone' },
  { key: 'email', label: 'E-mail' },
  { key: 'evento', label: 'Evento' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'lider', label: 'Líder' },
  { key: 'status', label: 'Status' },
  { key: 'preRevisao', label: 'Pré-Revisão' },
  { key: 'pagamento', label: 'Pagamento' },
  { key: 'dataPagamento', label: 'Data pagamento' },
  { key: 'anamnese', label: 'Anamnese' },
  { key: 'dataInscricao', label: 'Data inscrição' },
]

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('pt-BR')
}

function getPersonName(reg: ReviewRegistrationEnriched): string {
  const name = (reg.person?.full_name || (reg as { person_name?: string }).person_name || '').trim()
  return name && name !== '—' ? name : '—'
}

function getStatusLabel(reg: ReviewRegistrationEnriched): string {
  const flowStatus = reg.calculated_status || reg.status
  if (flowStatus && flowStatus in REVIEW_FLOW_STATUS_LABELS) {
    return REVIEW_FLOW_STATUS_LABELS[flowStatus as ReviewFlowStatus]
  }
  return REVIEW_REG_STATUS_LABELS[reg.status] ?? reg.status
}

function getPaymentLabel(reg: ReviewRegistrationEnriched): string {
  if (!reg.payment_status || reg.payment_status === 'pending') return 'Pendente'
  if (reg.payment_status === 'validated') return 'Validado'
  if (reg.payment_status === 'cancelled' || reg.payment_status === 'canceled') return 'Cancelado'
  return reg.payment_status
}

export function buildRevisaoInscritosExportRows(
  registrations: ReviewRegistrationEnriched[],
): RevisaoInscritoExportRow[] {
  return registrations.map((reg) => ({
    nome: getPersonName(reg),
    telefone: reg.person?.mobile_phone ?? '',
    email: reg.person?.email ?? '',
    evento: reg.event?.name ?? '',
    equipe: reg.team_name ?? '',
    lider: reg.leader?.full_name || reg.leader_name_text || '',
    status: getStatusLabel(reg),
    preRevisao: (reg as { pre_revisao_aplicado?: boolean }).pre_revisao_aplicado ? 'Sim' : 'Não',
    pagamento: getPaymentLabel(reg),
    dataPagamento: formatDate(reg.payment_date),
    anamnese: reg.anamnese_completed || reg.anamnese_completed_at ? 'Preenchida' : 'Pendente',
    dataInscricao: formatDateTime(reg.created_at),
  }))
}

function escapeCsvValue(value: string): string {
  const normalized = value.replace(/\r?\n/g, ' ').trim()
  if (/[",;\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'lista'
}

export function buildRevisaoInscritosExportFilename(
  eventName: string | undefined,
  extension: 'csv' | 'pdf',
): string {
  const date = new Date().toISOString().slice(0, 10)
  const eventPart = eventName ? slugify(eventName) : 'todos-eventos'
  return `revisao-vidas-inscritos-${eventPart}-${date}.${extension}`
}

export function downloadRevisaoInscritosCsv(
  rows: RevisaoInscritoExportRow[],
  filename: string,
): void {
  const header = CSV_COLUMNS.map((column) => escapeCsvValue(column.label)).join(';')
  const body = rows
    .map((row) => CSV_COLUMNS.map((column) => escapeCsvValue(row[column.key] ?? '')).join(';'))
    .join('\n')

  const blob = new Blob(['\uFEFF' + header + '\n' + body], {
    type: 'text/csv;charset=utf-8;',
  })

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

const PDF_COLUMNS: Array<{ key: keyof RevisaoInscritoExportRow; label: string; width: number }> = [
  { key: 'nome', label: 'Nome', width: 42 },
  { key: 'telefone', label: 'Telefone', width: 24 },
  { key: 'evento', label: 'Evento', width: 30 },
  { key: 'equipe', label: 'Equipe', width: 22 },
  { key: 'lider', label: 'Líder', width: 28 },
  { key: 'status', label: 'Status', width: 28 },
  { key: 'pagamento', label: 'Pagamento', width: 20 },
  { key: 'anamnese', label: 'Anamnese', width: 20 },
  { key: 'dataInscricao', label: 'Inscrição', width: 28 },
]

function truncateText(text: string, maxLength: number): string {
  const value = text.trim()
  if (value.length <= maxLength) return value
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`
}

export async function downloadRevisaoInscritosPdf(
  rows: RevisaoInscritoExportRow[],
  meta: { eventName?: string; search?: string },
  filename: string,
): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 10
  const marginTop = 12
  const marginBottom = 10
  const rowHeight = 6
  const headerHeight = 7

  const tableWidth = PDF_COLUMNS.reduce((sum, column) => sum + column.width, 0)
  const scale = Math.min(1, (pageWidth - marginX * 2) / tableWidth)
  const scaledColumns = PDF_COLUMNS.map((column) => ({
    ...column,
    width: column.width * scale,
  }))

  let y = marginTop

  function addPageHeader(isContinuation = false) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(isContinuation ? 11 : 14)
    doc.setTextColor(15, 23, 42)
    doc.text(
      isContinuation ? 'Inscritos — Revisão de Vidas (continuação)' : 'Inscritos — Revisão de Vidas',
      marginX,
      y,
    )
    y += isContinuation ? 6 : 7

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(71, 85, 105)

    const eventLabel = meta.eventName ? `Evento: ${meta.eventName}` : 'Evento: Todos'
    const searchLabel = meta.search?.trim() ? ` · Busca: "${meta.search.trim()}"` : ''
    const generatedAt = `Gerado em ${new Date().toLocaleString('pt-BR')} · ${rows.length} inscrição(ões)`
    doc.text(`${eventLabel}${searchLabel}`, marginX, y)
    y += 4.5
    doc.text(generatedAt, marginX, y)
    y += 6
  }

  function drawTableHeader() {
    doc.setFillColor(241, 245, 249)
    doc.setDrawColor(226, 232, 240)
    doc.rect(marginX, y, scaledColumns.reduce((sum, column) => sum + column.width, 0), headerHeight, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(51, 65, 85)

    let x = marginX
    for (const column of scaledColumns) {
      doc.text(column.label, x + 1.5, y + 4.8)
      x += column.width
    }

    y += headerHeight
  }

  function ensureSpace(requiredHeight: number) {
    if (y + requiredHeight <= pageHeight - marginBottom) return

    doc.addPage()
    y = marginTop
    addPageHeader(true)
    drawTableHeader()
  }

  addPageHeader(false)
  drawTableHeader()

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.2)
  doc.setTextColor(30, 41, 59)

  rows.forEach((row, index) => {
    ensureSpace(rowHeight)

    if (index % 2 === 0) {
      doc.setFillColor(248, 250, 252)
      doc.rect(
        marginX,
        y,
        scaledColumns.reduce((sum, column) => sum + column.width, 0),
        rowHeight,
        'F',
      )
    }

    let x = marginX
    for (const column of scaledColumns) {
      const raw = row[column.key] ?? ''
      const maxChars = Math.max(8, Math.floor(column.width / 1.8))
      doc.text(truncateText(raw, maxChars), x + 1.5, y + 4.2)
      x += column.width
    }

    y += rowHeight
  })

  doc.save(filename)
}
