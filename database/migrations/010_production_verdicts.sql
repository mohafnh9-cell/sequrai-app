-- Block 6.1: Production Verdict Engine persistence
begin;

create table if not exists public.production_verdicts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  version text not null default '1.0.0',
  status text not null check (
    status in (
      'ready_to_ship',
      'almost_ready',
      'needs_improvement',
      'not_ready',
      'insufficient_data',
      'analysis_failed'
    )
  ),
  score smallint check (score is null or score between 0 and 100),
  previous_score smallint check (previous_score is null or previous_score between 0 and 100),
  score_delta smallint,
  projected_score smallint check (projected_score is null or projected_score between 0 and 100),
  blockers_count integer not null default 0,
  critical_blockers_count integer not null default 0,
  high_blockers_count integer not null default 0,
  estimated_fix_minutes integer not null default 0,
  confidence text not null default 'medium' check (confidence in ('high', 'medium', 'low')),
  executive_summary text not null default '',
  introduced_blockers integer not null default 0,
  resolved_blockers integer not null default 0,
  verdict jsonb not null,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint production_verdicts_tenant_fk
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

create index if not exists idx_production_verdicts_project_generated
  on public.production_verdicts (project_id, generated_at desc);

create index if not exists idx_production_verdicts_repo
  on public.production_verdicts (repository_id, generated_at desc);

alter table public.repository_scan_state
  add column if not exists current_verdict_id uuid references public.production_verdicts(id) on delete set null;

alter table public.production_verdicts enable row level security;

drop policy if exists "Members read production verdicts" on public.production_verdicts;
create policy "Members read production verdicts" on public.production_verdicts for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = production_verdicts.organization_id
      and m.user_id = auth.uid()
  )
);

-- Service role writes via admin client; members cannot insert/update verdict rows directly.

commit;
