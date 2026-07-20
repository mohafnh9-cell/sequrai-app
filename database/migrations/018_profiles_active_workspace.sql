-- Workspace Switcher: persist the user's active organization (presented as Workspace in UI)
begin;

alter table public.profiles
  add column if not exists active_organization_id uuid
    references public.organizations(id) on delete set null;

create index if not exists profiles_active_organization_id_idx
  on public.profiles (active_organization_id);

commit;
