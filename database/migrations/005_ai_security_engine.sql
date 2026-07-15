-- SequrAI Block 4: AI Security Engine persistence
begin;

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null unique references public.scans(id) on delete cascade,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed')),
  security_score smallint check (security_score between 0 and 100),
  risk_score smallint check (risk_score between 0 and 100),
  priority_level text check (priority_level in ('low', 'medium', 'high', 'very_high', 'critical')),
  executive_summary text,
  coach_tip text,
  model text,
  prompt_version text not null default '1.0.0',
  tokens_used integer not null default 0 check (tokens_used >= 0),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_priorities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  report_id uuid not null references public.ai_reports(id) on delete cascade,
  rank integer not null check (rank > 0),
  title text not null,
  description text not null,
  finding_ids uuid[] not null default '{}',
  pattern_group text,
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  security_impact text check (security_impact in ('low', 'medium', 'high', 'critical')),
  created_at timestamptz not null default now(),
  unique (report_id, rank)
);

create table if not exists public.ai_fixes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  finding_id uuid not null references public.scan_findings(id) on delete cascade,
  status text not null default 'completed'
    check (status in ('queued', 'generating', 'completed', 'failed')),
  explanation_simple text,
  explanation_technical text,
  risk text,
  impact text,
  exploitation_probability text,
  fix_explanation text,
  code_suggestion text,
  diff_patch text,
  cursor_prompt text,
  claude_prompt text,
  implementation_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(implementation_steps) = 'array'),
  validation_checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(validation_checklist) = 'array'),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  security_improvement text check (security_improvement in ('low', 'medium', 'high', 'critical')),
  model text,
  prompt_version text not null default '1.0.0',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (finding_id, prompt_version)
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  report_id uuid references public.ai_reports(id) on delete cascade,
  category text not null,
  title text not null,
  description text not null,
  rationale text not null,
  stack_tags jsonb not null default '[]'::jsonb check (jsonb_typeof(stack_tags) = 'array'),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  estimated_minutes integer check (estimated_minutes is null or estimated_minutes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.security_insights (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete cascade,
  report_id uuid references public.ai_reports(id) on delete cascade,
  insight_type text not null,
  title text not null,
  body text not null,
  metric_value numeric,
  metric_delta numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.security_patterns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  pattern_key text not null,
  pattern_label text not null,
  occurrence_count integer not null default 1 check (occurrence_count > 0),
  severity text not null default 'medium'
    check (severity in ('critical', 'high', 'medium', 'low', 'info')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (organization_id, project_id, pattern_key)
);

create table if not exists public.security_learning (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete cascade,
  learning_type text not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.security_timeline (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid references public.scans(id) on delete set null,
  event_type text not null,
  security_score smallint check (security_score between 0 and 100),
  risk_score smallint check (risk_score between 0 and 100),
  title text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.project_risk_scores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  scan_id uuid not null references public.scans(id) on delete cascade,
  security_score smallint not null check (security_score between 0 and 100),
  risk_score smallint not null check (risk_score between 0 and 100),
  priority_level text not null
    check (priority_level in ('low', 'medium', 'high', 'very_high', 'critical')),
  factors jsonb not null default '{}'::jsonb check (jsonb_typeof(factors) = 'object'),
  calculated_at timestamptz not null default now(),
  unique (scan_id)
);

create index if not exists idx_ai_reports_org_created on public.ai_reports (organization_id, created_at desc);
create index if not exists idx_ai_priorities_report_rank on public.ai_priorities (report_id, rank);
create index if not exists idx_ai_fixes_scan on public.ai_fixes (scan_id);
create index if not exists idx_ai_recommendations_project on public.ai_recommendations (project_id, created_at desc);
create index if not exists idx_security_insights_org on public.security_insights (organization_id, created_at desc);
create index if not exists idx_security_timeline_project on public.security_timeline (project_id, occurred_at desc);
create index if not exists idx_project_risk_scores_project on public.project_risk_scores (project_id, calculated_at desc);

alter table public.ai_reports enable row level security;
alter table public.ai_priorities enable row level security;
alter table public.ai_fixes enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.security_insights enable row level security;
alter table public.security_patterns enable row level security;
alter table public.security_learning enable row level security;
alter table public.security_timeline enable row level security;
alter table public.project_risk_scores enable row level security;

drop policy if exists "Members read ai reports" on public.ai_reports;
create policy "Members read ai reports" on public.ai_reports for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = ai_reports.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read ai priorities" on public.ai_priorities;
create policy "Members read ai priorities" on public.ai_priorities for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = ai_priorities.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read ai fixes" on public.ai_fixes;
create policy "Members read ai fixes" on public.ai_fixes for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = ai_fixes.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read ai recommendations" on public.ai_recommendations;
create policy "Members read ai recommendations" on public.ai_recommendations for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = ai_recommendations.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read security insights" on public.security_insights;
create policy "Members read security insights" on public.security_insights for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = security_insights.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read security patterns" on public.security_patterns;
create policy "Members read security patterns" on public.security_patterns for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = security_patterns.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read security learning" on public.security_learning;
create policy "Members read security learning" on public.security_learning for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = security_learning.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read security timeline" on public.security_timeline;
create policy "Members read security timeline" on public.security_timeline for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = security_timeline.organization_id and m.user_id = auth.uid()
  )
);

drop policy if exists "Members read project risk scores" on public.project_risk_scores;
create policy "Members read project risk scores" on public.project_risk_scores for select using (
  exists (
    select 1 from public.organization_members m
    where m.organization_id = project_risk_scores.organization_id and m.user_id = auth.uid()
  )
);

commit;
