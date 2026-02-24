import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

// Lista dos campos esperados para o modelo de importação de pessoas
const HEADERS = [
  'Nome completo',
  'Sexo',
  'Tipo',
  'Igreja',
  'Situação',
  'É pastor?',
  'Faz parte da liderança?',
  'É recém-convertido?',
  'Aceitou Jesus?',
  'Aceitou Jesus em',
  'Data que aceitou Jesus',
  'E-Mail',
  'Telefone',
  'Celular',
  'Estado Civil',
  'Batizado?',
  'Data de entrada',
  'Forma de entrada',
  'Aniversário',
  'Data de Casamento',
  'Data de Batismo',
  'CPF',
  'Documento de Identificação',
  'Órgão Emissor',
  'UF do RG',
  'Endereço',
  'Número',
  'Complemento',
  'Bairro',
  'CEP',
  'Cidade',
  'UF',
  'Escolaridade',
  'Ocupação',
  'Tipo sanguíneo',
  'Nacionalidade',
  'Naturalidade',
  'Igreja de origem',
]

import * as XLSX from 'xlsx'

export async function GET(request: NextRequest) {
  // Cria uma planilha em memória
  const ws = XLSX.utils.aoa_to_sheet([HEADERS])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Modelo')
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="modelo-importacao-pessoas.xlsx"',
    },
  })
}
