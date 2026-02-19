import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { createSupabaseServiceClient } from '@/lib/supabase-server'

/**
 * POST /api/admin/storage/upload-avatar
 * Sobe uma imagem para o bucket 'avatars' usando Service Role (ignora RLS)
 */
export async function POST(request: NextRequest) {
    try {
        const snapshot = await getAccessSnapshotFromRequest(request)
        if (!snapshot.userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File
        const userId = formData.get('userId') as string

        if (!file || !userId) {
            return NextResponse.json({ error: 'Arquivo ou ID de usuário ausente' }, { status: 400 })
        }

        // Segurança: usuário só pode subir para seu próprio ID (ou ser Admin)
        if (snapshot.userId !== userId && !snapshot.isAdmin) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
        }

        const supabase = createSupabaseServiceClient()
        const fileExt = file.name.split('.').pop()
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const buffer = Buffer.from(await file.arrayBuffer())

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, buffer, {
                contentType: file.type,
                upsert: true
            })

        if (uploadError) {
            console.error('Erro no storage (service role):', uploadError)
            return NextResponse.json({ error: uploadError.message }, { status: 500 })
        }

        const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)

        return NextResponse.json({ success: true, publicUrl })
    } catch (err: any) {
        console.error('Erro no upload-avatar API:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
