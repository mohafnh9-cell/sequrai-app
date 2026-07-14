-- ============================================================
-- SequrAI — Initial Schema Migration
-- Run this in the Supabase SQL Editor after creating your project
-- ============================================================

-- ─── Extensions ─────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────
-- Mirrors auth.users. Auto-populated via trigger on signup.

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── ORGANIZATIONS ───────────────────────────────────────────

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  plan        text not null default 'FREE' check (plan in ('FREE', 'BUILDER', 'STUDIO', 'AGENCY')),
  logo_url    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- ─── ORGANIZATION MEMBERS ────────────────────────────────────

create table if not exists public.organization_members (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             text not null default 'MEMBER' check (role in ('OWNER', 'ADMIN', 'MEMBER')),
  created_at       timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

-- Members can see their own org memberships
create policy "Members can view their org memberships"
  on public.organization_members for select
  using (auth.uid() = user_id);

-- Members can view the organizations they belong to
create policy "Members can view their organizations"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
    )
  );

-- Only owners/admins can update orgs
create policy "Owners can update their organizations"
  on public.organizations for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = organizations.id
        and user_id = auth.uid()
        and role in ('OWNER', 'ADMIN')
    )
  );

-- Authenticated users can create organizations
create policy "Authenticated users can create organizations"
  on public.organizations for insert
  with check (auth.uid() is not null);

-- Authenticated users can create memberships (needed for org creation flow)
create policy "Users can create org memberships"
  on public.organization_members for insert
  with check (auth.uid() is not null);

-- ─── PROJECTS ────────────────────────────────────────────────

create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  name             text not null,
  description      text,
  github_repo      text,
  production_url   text,
  framework        text check (
    framework is null or
    framework in ('NEXTJS', 'REACT', 'VUE', 'SVELTE', 'NUXT', 'REMIX', 'ASTRO', 'OTHER')
  ),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.projects enable row level security;

create policy "Members can view their org projects"
  on public.projects for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and user_id = auth.uid()
    )
  );

create policy "Members can create projects"
  on public.projects for insert
  with check (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and user_id = auth.uid()
    )
  );

create policy "Members can update their org projects"
  on public.projects for update
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and user_id = auth.uid()
    )
  );

create policy "Owners and admins can delete projects"
  on public.projects for delete
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = projects.organization_id
        and user_id = auth.uid()
        and role in ('OWNER', 'ADMIN')
    )
  );

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────

create table if not exists public.subscriptions (
  id                        uuid primary key default gen_random_uuid(),
  organization_id           uuid unique not null references public.organizations(id) on delete cascade,
  stripe_customer_id        text,
  stripe_subscription_id    text,
  plan                      text not null default 'FREE' check (plan in ('FREE', 'BUILDER', 'STUDIO', 'AGENCY')),
  status                    text not null default 'active'
                              check (status in ('active', 'trialing', 'past_due', 'canceled', 'unpaid')),
  current_period_end        timestamptz,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Members can view their org subscription"
  on public.subscriptions for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_id = subscriptions.organization_id
        and user_id = auth.uid()
    )
  );

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.set_updated_at();

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.set_updated_at();

create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute procedure public.set_updated_at();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- ─── INDEXES ────────────────────────────────────────────────

create index if not exists idx_organization_members_user_id
  on public.organization_members (user_id);

create index if not exists idx_organization_members_org_id
  on public.organization_members (organization_id);

create index if not exists idx_projects_org_id
  on public.projects (organization_id);

create index if not exists idx_projects_created_at
  on public.projects (created_at desc);
