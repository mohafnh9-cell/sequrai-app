-- Run this in Supabase SQL Editor if scans fail with column/table errors.
-- It removes legacy Prisma-era scan tables and recreates the Scan Engine v1 schema.
begin;

drop table if exists public.scan_findings cascade;
drop table if exists public.repository_scan_state cascade;
drop table if exists public.security_rules cascade;
drop table if exists public.scans cascade;
drop table if exists public.vulnerabilities cascade;

alter table public.projects
  add column if not exists github_repository_id bigint,
  add column if not exists github_default_branch text,
  add column if not exists github_last_commit_sha text,
  add column if not exists github_is_private boolean,
  add column if not exists github_connected_at timestamptz,
  add column if not exists security_score smallint check (security_score between 0 and 100),
  add column if not exists last_scan_at timestamptz;

create unique index if not exists idx_projects_id_organization
  on public.projects (id, organization_id);

create table public.scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.projects(id) on delete cascade,
  triggered_by_user_id uuid not null references public.profiles(id) on delete restrict,
  trigger_type text not null default 'manual'
    check (trigger_type in ('manual', 'webhook', 'scheduled', 'mcp')),
  status text not null default 'queued'
    check (status in (
      'queued', 'fetching_repository', 'indexing', 'scanning',
      'calculating_score', 'completed', 'failed', 'cancelled'
    )),
  scan_type text not null default 'full'
    check (scan_type in ('full', 'incremental', 'file')),
  branch text,
  commit_sha text,
  files_discovered integer not null default 0 check (files_discovered >= 0),
  files_analyzed integer not null default 0 check (files_analyzed >= 0),
  findings_count integer not null default 0 check (findings_count >= 0),
  critical_count integer not null default 0 check (critical_count >= 0),
  high_count integer not null default 0 check (high_count >= 0),
  medium_count integer not null default 0 check (medium_count >= 0),
  low_count integer not null default 0 check (low_count >= 0),
  info_count integer not null default 0 check (info_count >= 0),
  security_score smallint check (security_score between 0 and 100),
  progress smallint not null default 0 check (progress between 0 and 100),
  progress_message text,
  detected_stack jsonb not null default '{}'::jsonb
    check (jsonb_typeof(detected_stack) = 'object'),
  score_breakdown jsonb not null default '{}'::jsonb
    check (jsonb_typeof(score_breakdown) = 'object'),
  omissions jsonb not null default '[]'::jsonb
    check (jsonb_typeof(omissions) = 'array'),
  metrics jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metrics) = 'object'),
  summary text,
  started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  error_code text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scans_repository_is_project check (repository_id = project_id),
  constraint scans_project_tenant_fk
    foreign key (project_id, organization_id)
    references public.projects (id, organization_id) on delete cascade,
  unique (id, organization_id, project_id, repository_id)
);

create table public.scan_findings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  repository_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  rule_id text not null,
  fingerprint text not null,
  title text not null,
  description text not null,
  category text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  confidence text not null check (confidence in ('high', 'medium', 'low')),
  file_path text not null,
  start_line integer not null check (start_line > 0),
  end_line integer check (end_line is null or end_line >= start_line),
  code_snippet text,
  evidence text,
  impact text,
  recommendation text not null,
  status text not null default 'open'
    check (status in ('open', 'fixed', 'ignored', 'false_positive')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findings_repository_is_project check (repository_id = project_id),
  constraint findings_scan_tenant_fk
    foreign key (scan_id, organization_id, project_id, repository_id)
    references public.scans (id, organization_id, project_id, repository_id)
    on delete cascade,
  unique (scan_id, fingerprint)
);

create table public.security_rules (
  id uuid primary key default gen_random_uuid(),
  rule_id text not null unique,
  name text not null,
  description text not null,
  category text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  enabled boolean not null default true,
  framework text,
  language text,
  version text not null default '1.0.0',
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.repository_scan_state (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null unique references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  active_scan_id uuid references public.scans(id) on delete set null,
  last_scan_id uuid references public.scans(id) on delete set null,
  last_commit_sha text,
  last_full_scan_at timestamptz,
  last_security_score smallint check (last_security_score between 0 and 100),
  open_findings_count integer not null default 0 check (open_findings_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint repository_state_tenant_fk
    foreign key (repository_id, organization_id)
    references public.projects (id, organization_id) on delete cascade
);

create unique index idx_scans_one_active_full_per_repository
  on public.scans (repository_id)
  where scan_type = 'full'
    and status in ('queued', 'fetching_repository', 'indexing', 'scanning', 'calculating_score');

alter table public.scans enable row level security;
alter table public.scan_findings enable row level security;
alter table public.security_rules enable row level security;
alter table public.repository_scan_state enable row level security;

create policy "Members read scans" on public.scans for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = scans.organization_id and m.user_id = auth.uid()
  )
);

create policy "Members create own scans" on public.scans for insert with check (
  triggered_by_user_id = auth.uid()
  and exists (
    select 1 from public.organization_members m
    where m.organization_id = scans.organization_id and m.user_id = auth.uid()
  )
  and exists (
    select 1 from public.projects p
    where p.id = scans.project_id
      and p.id = scans.repository_id
      and p.organization_id = scans.organization_id
  )
);

create policy "Members read findings" on public.scan_findings for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = scan_findings.organization_id and m.user_id = auth.uid()
  )
);

create policy "Authenticated users read enabled rules" on public.security_rules for select
  using (auth.uid() is not null and enabled);

create policy "Members read scan state" on public.repository_scan_state for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_scan_state.organization_id
      and m.user_id = auth.uid()
  )
);

create policy "Members create scan state" on public.repository_scan_state for insert with check (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_scan_state.organization_id
      and m.user_id = auth.uid()
  )
  and exists (
    select 1 from public.projects p
    where p.id = repository_scan_state.repository_id
      and p.organization_id = repository_scan_state.organization_id
  )
);

commit;
