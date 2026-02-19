import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/auth/self/create-person
 * Cria um cadastro em 'people' para o próprio usuário e faz o vínculo
 */
export async function POST(request: NextRequest) {
    try {
        const snapshot = await getAccessSnapshotFromRequest(request)
        if (!snapshot.userId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

        // Verificar se já tem vínculo
        const { data: profile } = await supabaseServer
            .from('profiles')
            .select('person_id, full_name, email')
            .eq('id', snapshot.userId)
            .single()

        if (profile?.person_id) {
            return NextResponse.json({ error: 'Você já possui um cadastro vinculado.' }, { status: 400 })
        }

        // Criar a pessoa
        const { data: person, error: createError } = await supabaseServer
            .from('people')
            .insert({
                full_name: profile?.full_name || snapshot.displayName || 'Usuário Admin',
                email: profile?.email || snapshot.email,
                church_profile: 'Membro', // Default
                church_situation: 'Ativo', // Default
            })
            .select()
            .single()

        if (createError || !person) {
            console.error('Erro ao criar pessoa:', createError)
            return NextResponse.json({ error: 'Erro ao criar cadastro de pessoa.' }, { status: 500 })
        }

        // Vincular ao profile
        await supabaseServer
            .from('profiles')
            .update({ person_id: person.id })
            .eq('id', snapshot.userId)

        return NextResponse.json({ success: true, person })
    } catch (err) {
        console.error('Erro em self/create-person:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
