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

        const body = await request.json().catch(() => ({})) as {
            personId?: string | null
            full_name?: string | null
            email?: string | null
        }

        // Verificar se já tem vínculo
        const { data: profile } = await supabaseServer
            .from('profiles')
            .select('person_id, full_name, email')
            .eq('id', snapshot.userId)
            .single()

        if (profile?.person_id) {
            const { data: existingPerson } = await supabaseServer
                .from('people')
                .select('id, full_name, email, church_profile, church_situation')
                .eq('id', profile.person_id)
                .maybeSingle()
            return NextResponse.json({ success: true, person: existingPerson ?? { id: profile.person_id }, linked: true })
        }

        const personIdFromBody = typeof body.personId === 'string' && body.personId.trim() ? body.personId.trim() : null

        if (personIdFromBody) {
            const { data: personById } = await supabaseServer
                .from('people')
                .select('id, full_name, email, church_profile, church_situation')
                .eq('id', personIdFromBody)
                .maybeSingle()

            if (!personById) {
                return NextResponse.json({ error: 'Pessoa informada não encontrada.' }, { status: 404 })
            }

            const { error: linkError } = await supabaseServer
                .from('profiles')
                .update({ person_id: personById.id, updated_at: new Date().toISOString() })
                .eq('id', snapshot.userId)

            if (linkError) {
                return NextResponse.json({ error: 'Erro ao vincular cadastro de pessoa.' }, { status: 500 })
            }

            return NextResponse.json({ success: true, person: personById, linked: true })
        }

        const finalEmail = (body.email ?? profile?.email ?? snapshot.email ?? '').trim()

        if (finalEmail) {
            const { data: peopleByEmail } = await supabaseServer
                .from('people')
                .select('id, full_name, email, church_profile, church_situation')
                .ilike('email', finalEmail)
                .limit(1)

            const personByEmail = peopleByEmail?.[0]
            if (personByEmail?.id) {
                const { error: linkError } = await supabaseServer
                    .from('profiles')
                    .update({ person_id: personByEmail.id, updated_at: new Date().toISOString() })
                    .eq('id', snapshot.userId)

                if (linkError) {
                    return NextResponse.json({ error: 'Erro ao vincular pessoa existente.' }, { status: 500 })
                }

                return NextResponse.json({ success: true, person: personByEmail, linked: true })
            }
        }

        // Detecta perfil de acesso do convite (metadata do usuário)
        const userProfile = snapshot?.user_metadata?.profile || snapshot?.profile || null
        // Criar a pessoa
        const { data: person, error: createError } = await supabaseServer
            .from('people')
            .insert({
                full_name: body.full_name?.trim() || profile?.full_name || snapshot.displayName || 'Usuário Admin',
                email: finalEmail || null,
                church_profile: 'Membro', // Default
                church_situation: 'Ativo', // Default
                user_profile: userProfile || null,
            })
            .select('id, full_name, email, church_profile, church_situation, user_profile')
            .single()

        if (createError || !person) {
            console.error('Erro ao criar pessoa:', createError)
            return NextResponse.json({ error: 'Erro ao criar cadastro de pessoa.' }, { status: 500 })
        }

        // Vincular ao profile
        const { error: linkError } = await supabaseServer
            .from('profiles')
            .update({ person_id: person.id, updated_at: new Date().toISOString() })
            .eq('id', snapshot.userId)

        if (linkError) {
            return NextResponse.json({ error: 'Pessoa criada, mas não foi possível vincular ao usuário.' }, { status: 500 })
        }

        return NextResponse.json({ success: true, person })
    } catch (err) {
        console.error('Erro em self/create-person:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
