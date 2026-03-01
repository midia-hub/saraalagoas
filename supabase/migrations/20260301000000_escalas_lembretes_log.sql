-- =====================================================
-- ESCALAS: LOG DE LEMBRETES (Idempotência e Rastreio)
-- =====================================================
-- Registra cada envio de lembrete de escala por voluntário + slot + kind,
-- garantindo que o mesmo lembrete não seja reenviado (idempotência).
-- Permite retry após 30 min em caso de falha.

create table if not exists public.escalas_lembretes_log (
  id            uuid        primary key default gen_random_uuid(),
  -- escalas_slots.id — identifica o culto/arena/evento específico
  evento_id     uuid        not null,
  -- data local do evento (redundante, mas facilita queries/filtros)
  evento_data   date        not null,
  -- voluntário escalado
  person_id     uuid        not null references public.people(id) on delete cascade,
  phone         text        not null,
  -- D3 = lembrete 3 dias antes | D1 = 1 dia antes | D0 = dia do evento
  template_kind text        not null check (template_kind in ('D3', 'D1', 'D0')),
  -- UUID do template enviado (MESSAGE_ID_ESCALA_LEMBRETE_3/1/DIA)
  message_id    text,
  -- 'sent' | 'failed' | 'skipped'
  status        text        not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  status_code   int,
  error         text,
  sent_at       timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ── Índice único: garante idempotência por (slot, data, pessoa, kind) ────────
-- O evento_id já é único por slot, mas incluímos evento_data para facilitar
-- exclusão/filtragem por data sem precisar fazer join com escalas_slots.
create unique index if not exists uidx_escalas_lembretes_log_dedup
  on public.escalas_lembretes_log (evento_id, evento_data, person_id, template_kind);

-- ── Índices de suporte ────────────────────────────────────────────────────────
create index if not exists idx_escalas_lembretes_log_evento_id
  on public.escalas_lembretes_log (evento_id);

create index if not exists idx_escalas_lembretes_log_person_id
  on public.escalas_lembretes_log (person_id);

create index if not exists idx_escalas_lembretes_log_evento_data
  on public.escalas_lembretes_log (evento_data desc);

create index if not exists idx_escalas_lembretes_log_sent_at
  on public.escalas_lembretes_log (sent_at desc);

create index if not exists idx_escalas_lembretes_log_status
  on public.escalas_lembretes_log (status);

-- ── RLS: somente service_role (cron e admin) acessa ──────────────────────────
alter table public.escalas_lembretes_log enable row level security;

-- Admins autenticados podem visualizar (SELECT)
create policy "Admin pode visualizar lembretes_log"
  on public.escalas_lembretes_log
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin', 'secretario')
    )
  );

-- Service role bypassa RLS automaticamente (cron e admin routes usam service key)
