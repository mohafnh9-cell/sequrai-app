-- Block 7: MCP API keys for Cursor / Claude Code integration
begin;

create table if not exists public.mcp_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'Cursor MCP',
  key_prefix text not null,
  key_hash text not null unique,
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mcp_api_keys_org on public.mcp_api_keys (organization_id, created_at desc);
create index if not exists idx_mcp_api_keys_hash on public.mcp_api_keys (key_hash) where revoked_at is null;

alter table public.mcp_api_keys enable row level security;

drop policy if exists "Members manage org mcp keys" on public.mcp_api_keys;
create policy "Members manage org mcp keys" on public.mcp_api_keys for all using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = mcp_api_keys.organization_id
      and m.user_id = auth.uid()
  )
);

commit;
