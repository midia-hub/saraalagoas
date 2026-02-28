create table if not exists background_jobs (
  id uuid primary key,
  kind text not null,
  status text not null check (status in ('queued', 'running', 'completed', 'failed')),
  metadata jsonb,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  expires_at timestamptz not null default (now() + interval '6 hours')
);

create index if not exists idx_background_jobs_kind on background_jobs (kind);
create index if not exists idx_background_jobs_status on background_jobs (status);
create index if not exists idx_background_jobs_expires_at on background_jobs (expires_at);
