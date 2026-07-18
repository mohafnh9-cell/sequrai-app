-- SequrAI Block 7.0.4: Production Verdict Autopilot setting (organization-wide)
begin;

alter table public.organizations
  add column if not exists verdict_autopilot_enabled boolean not null default true;

commit;
