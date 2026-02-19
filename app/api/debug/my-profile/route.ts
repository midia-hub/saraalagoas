import { NextRequest, NextResponse } from 'next/server'
import { getAccessSnapshotFromRequest } from '@/lib/rbac'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
    try {
        const snapshot = await getAccessSnapshotFromRequest(request)
        if (!snapshot.userId) return NextResponse.json({ error: 'No user' })

        const { data: profile } = await supabaseServer
            .from('profiles')
            .select('*')
            .eq('id', snapshot.userId)
            .maybeSingle()

        return NextResponse.json({ snapshot, profile })
    } catch (err: any) {
        return NextResponse.json({ error: err.message })
    }
}
