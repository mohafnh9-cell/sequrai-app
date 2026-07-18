-- SequrAI Block 7.0.1: Git push detection (repository sync status)
begin;

create table if not exists public.repository_sync_status (
  project_id uuid primary key references public.projects(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  github_repository_id bigint,
  connection_status text not null default 'connected'
    check (connection_status in ('connected', 'connection_issue', 'disconnected')),
  branch text,
  commit_sha text,
  commit_message text,
  pushed_at timestamptz,
  detected_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_repository_sync_status_org
  on public.repository_sync_status (organization_id);

alter table public.repository_sync_status enable row level security;

drop policy if exists "Members read repository sync status" on public.repository_sync_status;
create policy "Members read repository sync status" on public.repository_sync_status for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_sync_status.organization_id and m.user_id = auth.uid()
  )
);

commit;
