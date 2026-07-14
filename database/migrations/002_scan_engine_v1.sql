-- SequrAI Scan Engine v1. Canonical persistence is Supabase/PostgreSQL.
-- Idempotent for an installation where this migration has not been superseded.
begin;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

create table if not exists public.scans (
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

create table if not exists public.scan_findings (
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

create table if not exists public.security_rules (
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

create table if not exists public.repository_scan_state (
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

create unique index if not exists idx_scans_one_active_full_per_repository
  on public.scans (repository_id)
  where scan_type = 'full'
    and status in ('queued', 'fetching_repository', 'indexing', 'scanning', 'calculating_score');
create index if not exists idx_scans_repository_created
  on public.scans (repository_id, created_at desc);
create index if not exists idx_scans_organization_created
  on public.scans (organization_id, created_at desc);
create index if not exists idx_scan_findings_scan_severity
  on public.scan_findings (scan_id, severity);
create index if not exists idx_scan_findings_repository_status
  on public.scan_findings (repository_id, status, created_at desc);
create index if not exists idx_scan_findings_filtering
  on public.scan_findings (scan_id, category, confidence, rule_id);
create index if not exists idx_scan_findings_fingerprint
  on public.scan_findings (repository_id, fingerprint);
create index if not exists idx_projects_github_repository_id
  on public.projects (github_repository_id)
  where github_repository_id is not null;

drop trigger if exists set_scans_updated_at on public.scans;
create trigger set_scans_updated_at before update on public.scans
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_scan_findings_updated_at on public.scan_findings;
create trigger set_scan_findings_updated_at before update on public.scan_findings
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_security_rules_updated_at on public.security_rules;
create trigger set_security_rules_updated_at before update on public.security_rules
  for each row execute procedure public.set_updated_at();
drop trigger if exists set_repository_scan_state_updated_at on public.repository_scan_state;
create trigger set_repository_scan_state_updated_at before update on public.repository_scan_state
  for each row execute procedure public.set_updated_at();

alter table public.scans enable row level security;
alter table public.scan_findings enable row level security;
alter table public.security_rules enable row level security;
alter table public.repository_scan_state enable row level security;

-- Lifecycle writes and findings persistence are server-only through the
-- service-role client after explicit authorization.
drop policy if exists "Requesters update scans" on public.scans;
drop policy if exists "Scan requesters can update scans" on public.scans;
drop policy if exists "Requesters create findings" on public.scan_findings;
drop policy if exists "Scan requesters can create findings" on public.scan_findings;
drop policy if exists "Members update scan state" on public.repository_scan_state;
drop policy if exists "Organization members can update scan state" on public.repository_scan_state;

drop policy if exists "Members read scans" on public.scans;
create policy "Members read scans" on public.scans for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = scans.organization_id and m.user_id = auth.uid()
  )
);
drop policy if exists "Members create own scans" on public.scans;
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
drop policy if exists "Members read findings" on public.scan_findings;
create policy "Members read findings" on public.scan_findings for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = scan_findings.organization_id and m.user_id = auth.uid()
  )
);
drop policy if exists "Authenticated users read enabled rules" on public.security_rules;
create policy "Authenticated users read enabled rules" on public.security_rules for select
  using (auth.uid() is not null and enabled);

drop policy if exists "Members read scan state" on public.repository_scan_state;
create policy "Members read scan state" on public.repository_scan_state for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_scan_state.organization_id
      and m.user_id = auth.uid()
  )
);
drop policy if exists "Members create scan state" on public.repository_scan_state;
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
  and (
    active_scan_id is null or exists (
      select 1 from public.scans s
      where s.id = active_scan_id
        and s.repository_id = repository_scan_state.repository_id
        and s.organization_id = repository_scan_state.organization_id
    )
  )
  and (
    last_scan_id is null or exists (
      select 1 from public.scans s
      where s.id = last_scan_id
        and s.repository_id = repository_scan_state.repository_id
        and s.organization_id = repository_scan_state.organization_id
    )
  )
);
commit;
