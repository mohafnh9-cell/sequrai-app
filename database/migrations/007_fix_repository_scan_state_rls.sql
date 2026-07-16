-- Fix: upsert on repository_scan_state requires UPDATE policy (004 only had INSERT).
begin;

drop policy if exists "Members update scan state" on public.repository_scan_state;
create policy "Members update scan state" on public.repository_scan_state for update using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = repository_scan_state.organization_id
      and m.user_id = auth.uid()
  )
) with check (
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
