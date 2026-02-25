import { NextRequest, NextResponse } from 'next/server'
import { requireAccess } from '@/lib/admin-api'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const SELECT = `
  id, token, ministry, month, year, label, status, created_at,
  church:churches(id, name)
`

/** GET /api/admin/escalas  – lista links de disponibilidade */
export async function GET(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'view' })
  if (!access.ok) return access.response

  const supabase = createSupabaseAdminClient(request)
  const { data, error } = await supabase
    .from('escalas_links')
    .select(SELECT)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Erro ao listar escalas' }, { status: 500 })
  return NextResponse.json({ items: data ?? [] })
}

/** POST /api/admin/escalas  – cria link + gera slots automaticamente */
export async function POST(request: NextRequest) {
  const access = await requireAccess(request, { pageKey: 'escalas', action: 'create' })
  if (!access.ok) return access.response

  const body = await request.json().catch(() => ({}))
  const { ministry, church_id, month, year, label, custom_events = [], funcoes = [], preview_slots } = body

  if (!ministry) return NextResponse.json({ error: 'Ministério é obrigatório' }, { status: 400 })
  if (!church_id) return NextResponse.json({ error: 'Igreja é obrigatória' }, { status: 400 })
  if (!month || !year) return NextResponse.json({ error: 'Mês e ano são obrigatórios' }, { status: 400 })

  const supabase = createSupabaseAdminClient(request)

  // Cria o link
  const linkPayload = {
    ministry,
    church_id: church_id,
    month: Number(month),
    year: Number(year),
    label: label?.trim() || null,
    created_by: (access.snapshot.userId && access.snapshot.userId.length === 36) ? access.snapshot.userId : null,
  }

  const { data: link, error: linkErr } = await supabase
    .from('escalas_links')
    .insert(linkPayload)
    .select('id, token')
    .single()

  if (linkErr || !link) {
    console.error('❌ [escalas:POST] Erro ao criar escalas_links:', linkErr)
    return NextResponse.json({ 
      error: 'Erro ao criar escala no banco de dados', 
      details: linkErr?.message || 'Erro desconhecido',
      hint: linkErr?.hint,
      payload: linkPayload
    }, { status: 500 })
  }

  // Normaliza funções passadas (remove vazios)
  const funcoesArr: string[] = Array.isArray(funcoes) ? funcoes.filter((f: string) => typeof f === 'string' && f.trim()) : []

  // Expande para datas reais do mês
  const slots: { link_id: string; type: string; label: string; date: string; time_of_day: string; source_id: string | null; sort_order: number; funcoes: string[] }[] = []
  let order = 0

  // Se o frontend enviou as datas pré-selecionadas (podendo ter removido algumas), usamos elas.
  // Caso contrário, geramos automaticamente como antes.
  if (Array.isArray(preview_slots)) {
    for (const s of preview_slots) {
      slots.push({
        link_id: link.id,
        type: s.type,
        label: s.label,
        date: s.date,
        time_of_day: (s.time_of_day || '19:00').slice(0, 5),
        source_id: null,
        sort_order: order++,
        funcoes: funcoesArr,
      })
    }
  } else {
    // Gera slots a partir dos cultos da igreja
    const { data: services } = await supabase
      .from('worship_services')
      .select('id, name, day_of_week, time_of_day, is_arena, arena_id, church_id')
      .eq('church_id', church_id)
      .eq('active', true)

    // Gera slots a partir das arenas da igreja
    const ARENA_DAY_MAP: Record<string, number> = {
      sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
    }
    const { data: arenas } = await supabase
      .from('arenas')
      .select('id, name, day_of_week, time_of_day')
      .eq('church_id', church_id)

    const daysInMonth = new Date(year, month, 0).getDate()

    for (let day = 1; day <= daysInMonth; day++) {
      // Usamos meio-dia para evitar problemas de timezone
      const d = new Date(year, month - 1, day, 12, 0, 0)
      const weekday = d.getDay() // 0=Sun
      const dateStr = d.toISOString().slice(0, 10)

      // Cultos
      for (const svc of services ?? []) {
        if (Number(svc.day_of_week) === weekday) {
          // Se o nome contiver "Arena", assume o tipo arena automaticamente
          const isArenaByName = svc.name.toLowerCase().includes('arena')
          const type = (svc.is_arena || isArenaByName) ? 'arena' : 'culto'

          slots.push({
            link_id: link.id,
            type,
            label: svc.name,
            date: dateStr,
            time_of_day: svc.time_of_day?.slice(0, 5) || '19:00',
            source_id: svc.id,
            sort_order: order++,
            funcoes: funcoesArr,
          })
        }
      }

      // Arenas que não estão no worship_services
      for (const arena of arenas ?? []) {
        const arenaDayInt = ARENA_DAY_MAP[arena.day_of_week] ?? -1
        if (arenaDayInt === weekday) {
          const time = arena.time_of_day?.slice(0, 5) || '19:00'
          
          // Evita duplicar se já tem worship_service para essa arena
          const alreadyPresentSvc = (slots).some(
            (s) => (s.source_id === arena.id || s.label.toLowerCase() === arena.name.toLowerCase()) && 
                   s.date === dateStr && 
                   s.time_of_day === time
          )

          if (!alreadyPresentSvc) {
            slots.push({
              link_id: link.id,
              type: 'arena',
              label: arena.name,
              funcoes: funcoesArr,
              date: dateStr,
              time_of_day: time,
              source_id: arena.id,
              sort_order: order++,
            })
          }
        }
      }
    }
  }

  // Eventos customizados
  for (const ev of custom_events) {
    if (!ev.label || !ev.date) continue
    slots.push({
      link_id: link.id,
      type: 'evento',
      label: ev.label.trim(),
      date: ev.date,
      time_of_day: ev.time_of_day ?? '19:00',
      source_id: null,
      sort_order: order++,
      funcoes: ev.funcoes ?? funcoesArr,
    })
  }

  if (slots.length > 0) {
    const { error: slotsErr } = await supabase.from('escalas_slots').insert(slots)
    if (slotsErr) {
      console.error('❌ Erro ao inserir slots da escala:', slotsErr)
      // Opcional: deletar o link criado para não deixar órfão? 
      // Por enquanto vamos retornar erro para o usuário saber que falhou.
      return NextResponse.json({ 
        error: 'Erro ao gerar detalhamento das datas da escala', 
        details: slotsErr.message 
      }, { status: 500 })
    }
  }

  return NextResponse.json({ link }, { status: 201 })
}
