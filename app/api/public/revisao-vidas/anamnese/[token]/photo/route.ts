import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const MAX_FILE_SIZE = 8 * 1024 * 1024

function sanitizeFileName(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  try {
    const token = (params.token ?? '').trim()
    if (!token) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Envie apenas imagem.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Imagem acima de 8MB.' }, { status: 400 })
    }

    const supabase = createSupabaseAdminClient(request)

    const { data: registration, error: regError } = await supabase
      .from('revisao_vidas_registrations')
      .select('id')
      .eq('anamnese_token', token)
      .maybeSingle()

    if (regError || !registration) {
      return NextResponse.json({ error: 'Link inválido ou expirado.' }, { status: 404 })
    }

    const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const filePath = `revisao-vidas/anamnese/${registration.id}/${Date.now()}-${sanitizeFileName(file.name || `foto.${extension}`)}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadError) {
      console.error('UPLOAD public revisao anamnese photo:', uploadError)
      return NextResponse.json({ error: 'Erro ao enviar foto.' }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath)
    return NextResponse.json({ ok: true, photoUrl: publicData.publicUrl })
  } catch (error) {
    console.error('POST public revisao anamnese photo:', error)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
