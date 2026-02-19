import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/auth/self/link-person
 * Vincula o usuário logado a um ID de pessoa (people.id)
 */
export async function POST(request: NextRequest) {
    try {
        const snapshot = await getAccessSnapshotFromRequest(request)
        if (!snapshot.userId) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const { personId } = await request.json().catch(() => ({}))
        if (!personId) {
            return NextResponse.json({ error: 'ID da pessoa é obrigatório' }, { status: 400 })
        }

        // Verificar se a pessoa existe
        const { data: person, error: personError } = await supabaseServer
            .from('people')
            .select('id, full_name')
            .eq('id', personId)
            .maybeSingle()

        if (personError || !person) {
            return NextResponse.json({ error: 'Pessoa não encontrada' }, { status: 404 })
        }

        // Atualizar o profile do usuário
        const { error: updateError } = await supabaseServer
            .from('profiles')
            .update({ person_id: personId })
            .eq('id', snapshot.userId)

        if (updateError) {
            console.error('Erro ao vincular pessoa:', updateError)
            return NextResponse.json({ error: 'Não foi possível realizar o vínculo' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            person: { id: person.id, name: person.full_name }
        })
    } catch (err) {
        console.error('Erro em self/link-person:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
