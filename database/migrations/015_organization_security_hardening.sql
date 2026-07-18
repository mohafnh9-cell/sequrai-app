-- SequrAI Hardening Sprint 1 — organization membership RLS + org creation RPC
-- Safe to run on populated production databases (policy + function changes only).
begin;

-- ─── Remove permissive membership / organization insert policies ─────────────

drop policy if exists "Users can create org memberships" on public.organization_members;
drop policy if exists "Authenticated users can create organizations" on public.organizations;

-- ─── Tighten membership visibility (same-org roster, tenant isolated) ────────

drop policy if exists "Members can view their org memberships" on public.organization_members;

create policy "Members can view org memberships"
  on public.organization_members for select
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
    )
  );

-- Membership changes are not allowed from the client.
-- Inserts happen only via create_organization_with_owner (SECURITY DEFINER).
-- Updates/deletes reserved for owners/admins (team settings).

drop policy if exists "Owners and admins can update member roles" on public.organization_members;
create policy "Owners and admins can update member roles"
  on public.organization_members for update
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.role in ('OWNER', 'ADMIN')
    )
  );

drop policy if exists "Owners and admins can remove members" on public.organization_members;
create policy "Owners and admins can remove members"
  on public.organization_members for delete
  using (
    exists (
      select 1
      from public.organization_members om
      where om.organization_id = organization_members.organization_id
        and om.user_id = auth.uid()
        and om.role in ('OWNER', 'ADMIN')
    )
  );

-- ─── Atomic organization creation (signup / onboarding) ──────────────────────

create or replace function public.create_organization_with_owner(
  organization_name text,
  organization_slug text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'Not authenticated';
  end if;

  if organization_name is null or length(trim(organization_name)) < 2 then
    raise exception 'Organization name must be at least 2 characters';
  end if;

  if organization_slug is null or length(trim(organization_slug)) < 2 then
    raise exception 'Organization slug must be at least 2 characters';
  end if;

  insert into public.organizations (name, slug)
  values (trim(organization_name), trim(organization_slug))
  returning id into new_org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org_id, caller, 'OWNER');

  return new_org_id;
end;
$$;

revoke all on function public.create_organization_with_owner(text, text) from public;
grant execute on function public.create_organization_with_owner(text, text) to authenticated;

commit;
