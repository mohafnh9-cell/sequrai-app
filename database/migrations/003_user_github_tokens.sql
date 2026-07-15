-- Server-side GitHub OAuth token storage for repository scans.
-- Tokens are written only by the service-role client after explicit GitHub auth.
begin;

create table if not exists public.user_github_tokens (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  access_token text not null,
  refresh_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_github_tokens enable row level security;

drop trigger if exists set_user_github_tokens_updated_at on public.user_github_tokens;
create trigger set_user_github_tokens_updated_at
  before update on public.user_github_tokens
  for each row execute procedure public.set_updated_at();

commit;
