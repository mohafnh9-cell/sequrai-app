-- SequrAI Block 5: GitHub Security Automation Engine
begin;

alter table public.projects
  add column if not exists webhook_enabled boolean not null default true,
  add column if not exists github_webhook_id bigint,
  add column if not exists repository_health text
    check (repository_health is null or repository_health in ('excellent', 'good', 'needs_attention', 'critical'));

create table if not exists public.github_webhooks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  github_repository_id bigint not null,
  github_hook_id bigint,
  events text[] not null default '{push,pull_request}',
  secret_hash text,
  active boolean not null default true,
  last_delivery_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create table if not exists public.repository_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  github_delivery_id text,
  event_type text not null,
  action text,
  branch text,
  commit_sha text,
  base_commit_sha text,
  pull_request_number integer,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    check (status in ('received', 'processing', 'processed', 'ignored', 'failed')),
  error_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (github_delivery_id)
);

create table if not exists public.incremental_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  base_commit_sha text not null,
  head_commit_sha text not null,
  changed_files jsonb not null default '[]'::jsonb,
  critical_files_changed jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.pull_request_scans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  pull_request_number integer not null,
  pull_request_title text,
  base_branch text,
  head_branch text,
  base_commit_sha text,
  head_commit_sha text,
  security_score_before smallint,
  security_score_after smallint,
  score_delta smallint,
  check_status text check (check_status in ('passed', 'failed', 'warning', 'pending')),
  impact_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, pull_request_number, head_commit_sha)
);

create table if not exists public.repository_health (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null unique references public.projects(id) on delete cascade,
  health_status text not null
    check (health_status in ('excellent', 'good', 'needs_attention', 'critical')),
  security_score smallint check (security_score between 0 and 100),
  risk_score smallint check (risk_score between 0 and 100),
  open_findings_count integer not null default 0,
  critical_open_count integer not null default 0,
  score_trend smallint not null default 0,
  factors jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repository_activity (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  event_type text not null,
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.security_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  channel text not null default 'in_app'
    check (channel in ('in_app', 'email', 'slack', 'discord')),
  notification_type text not null,
  title text not null,
  body text not null,
  severity text not null default 'info'
    check (severity in ('info', 'warning', 'critical')),
  read_at timestamptz,
  delivered_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_repository_events_project_created
  on public.repository_events (project_id, created_at desc);
create index if not exists idx_repository_activity_org_occurred
  on public.repository_activity (organization_id, occurred_at desc);
create index if not exists idx_security_notifications_org_created
  on public.security_notifications (organization_id, created_at desc);
create index if not exists idx_incremental_scans_project
  on public.incremental_scans (project_id, created_at desc);

alter table public.github_webhooks enable row level security;
alter table public.repository_events enable row level security;
alter table public.incremental_scans enable row level security;
alter table public.pull_request_scans enable row level security;
alter table public.repository_health enable row level security;
alter table public.repository_activity enable row level security;
alter table public.security_notifications enable row level security;

drop policy if exists "Members read github webhooks" on public.github_webhooks;
create policy "Members read github webhooks" on public.github_webhooks for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = github_webhooks.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read repository events" on public.repository_events;
create policy "Members read repository events" on public.repository_events for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_events.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read incremental scans" on public.incremental_scans;
create policy "Members read incremental scans" on public.incremental_scans for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = incremental_scans.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read pull request scans" on public.pull_request_scans;
create policy "Members read pull request scans" on public.pull_request_scans for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = pull_request_scans.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read repository health" on public.repository_health;
create policy "Members read repository health" on public.repository_health for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_health.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read repository activity" on public.repository_activity;
create policy "Members read repository activity" on public.repository_activity for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_activity.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read security notifications" on public.security_notifications;
create policy "Members read security notifications" on public.security_notifications for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = security_notifications.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members update own notifications" on public.security_notifications;
create policy "Members update own notifications" on public.security_notifications for update using (
  user_id = auth.uid()
  or exists (
    select 1 from public.organization_members m
    where m.organization_id = security_notifications.organization_id and m.user_id = auth.uid()
  )
);

commit;
