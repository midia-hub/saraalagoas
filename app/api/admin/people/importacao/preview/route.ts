import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-api'
import { parsePeopleWorkbook } from '@/lib/people-import'

export async function POST(request: NextRequest) {
  const access = await requireAdmin(request)
  if (!access.ok) return access.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'Envie um arquivo XLSX em file.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = parsePeopleWorkbook(buffer)

    if (parsed.missingRequiredFields.length > 0) {
      return NextResponse.json(
        {
          valid: false,
          errors: [
            ...parsed.errors,
            {
              row: 1,
              message: `Colunas obrigatórias ausentes: ${parsed.missingRequiredFields.join(', ')}`,
            },
          ],
          matchedFields: parsed.matchedFields,
          headers: parsed.headers,
          preview: [],
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      valid: parsed.errors.length === 0,
      errors: parsed.errors,
      matchedFields: parsed.matchedFields,
      headers: parsed.headers,
      totalRows: parsed.rows.length,
      preview: parsed.rows.slice(0, 20),
    })
  } catch (error) {
    console.error('POST /api/admin/people/importacao/preview:', error)
    return NextResponse.json(
      { error: 'Erro ao ler arquivo XLSX. Verifique o formato e tente novamente.' },
      { status: 500 }
    )
  }
}
