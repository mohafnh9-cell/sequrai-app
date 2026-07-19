-- SequrAI Block 7.0.5: record the callback URL a GitHub webhook was
-- registered with, so drift against the currently deployed URL (e.g. a hook
-- created against http://localhost:3000 while running the dev server) can
-- be detected instead of silently reporting stale: false forever.
begin;

alter table public.github_webhooks
  add column if not exists callback_url text;

commit;
