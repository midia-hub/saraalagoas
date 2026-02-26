import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { supabaseServer } from '@/lib/supabase-server'

// Chaves válidas e seus rótulos
export const IA_CONFIG_KEYS = ['system_prompt', 'album_instructions', 'standard_instructions'] as const
export type IaConfigKey = typeof IA_CONFIG_KEYS[number]

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/admin/ia-config
// Retorna { system_prompt, album_instructions, standard_instructions }
// ──────────────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'view' })
  if (!access.ok) return access.response

  const { data, error } = await supabaseServer
    .from('ia_config')
    .select('key, value')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const config: Record<string, string> = {}
  for (const row of data ?? []) {
    config[row.key as string] = row.value as string
  }

  return NextResponse.json(config)
}

// ──────────────────────────────────────────────────────────────────────────────
// PUT /api/admin/ia-config
// Body: { system_prompt?, album_instructions?, standard_instructions? }
// ──────────────────────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'instagram', action: 'edit' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))

  const updates: { key: string; value: string; updated_at: string }[] = []
  for (const key of IA_CONFIG_KEYS) {
    if (typeof body[key] === 'string') {
      updates.push({ key, value: body[key].trim(), updated_at: new Date().toISOString() })
    }
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'Nenhuma chave válida enviada.' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('ia_config')
    .upsert(updates, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
