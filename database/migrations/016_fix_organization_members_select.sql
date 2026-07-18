-- Fix onboarding: members must read their own membership row (migration 015 regressed this).
begin;

drop policy if exists "Members can view org memberships" on public.organization_members;
drop policy if exists "Members view memberships" on public.organization_members;

create policy "Members can view org memberships"
  on public.organization_members for select
  using (auth.uid() = user_id);

drop policy if exists "Users create memberships" on public.organization_members;

commit;
