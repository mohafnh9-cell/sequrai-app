-- Block 5.5: Production Readiness Score v1
begin;

create table if not exists public.production_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  overall_score smallint check (overall_score between 0 and 100),
  dimensions jsonb not null default '{}'::jsonb,
  blockers_count integer not null default 0,
  improvements_count integer not null default 0,
  estimated_minutes integer,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_production_readiness_project
  on public.production_readiness_scores (project_id, calculated_at desc);

alter table public.production_readiness_scores enable row level security;

drop policy if exists "Members read production readiness" on public.production_readiness_scores;
create policy "Members read production readiness" on public.production_readiness_scores for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = production_readiness_scores.organization_id
      and m.user_id = auth.uid()
  )
);

commit;
