-- SequrAI Block 7.0.2: Manual vs Automatic Production Reviews
begin;

alter table public.scans
  add column if not exists review_type text not null default 'manual'
    check (review_type in ('manual', 'automatic'));

create unique index if not exists idx_scans_automatic_review_commit
  on public.scans (repository_id, commit_sha)
  where review_type = 'automatic'
    and status = 'completed'
    and commit_sha is not null;

create index if not exists idx_scans_automatic_reviews_project
  on public.scans (repository_id, created_at desc)
  where review_type = 'automatic';

commit;
