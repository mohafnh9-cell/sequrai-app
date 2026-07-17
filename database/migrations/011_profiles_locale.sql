-- Block 6.4.1: user locale preference
begin;

alter table public.profiles
  add column if not exists locale text not null default 'en'
    check (locale in ('en', 'es'));

commit;
