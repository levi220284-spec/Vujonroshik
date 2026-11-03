-- Flat Meal Manager: one-time Supabase setup.
-- Before running: change CHANGE_THIS_PASSWORD (last section) to your own manager password.
-- Everyone can READ the data. Nobody can WRITE except through save_state(), which checks the password.

create extension if not exists pgcrypto with schema extensions;

-- 1. The data (the whole app state is one JSON document in one row)
create table if not exists public.app_state (
  id         int primary key default 1 check (id = 1),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. The password (stored only as a salted hash, never as plain text)
create table if not exists public.app_secret (
  id            int primary key default 1 check (id = 1),
  password_hash text not null
);

-- 3. Lock both tables down with Row Level Security
alter table public.app_state  enable row level security;
alter table public.app_secret enable row level security;

drop policy if exists "anyone can read state" on public.app_state;
create policy "anyone can read state" on public.app_state for select to anon, authenticated using (true);
-- No insert/update/delete policies exist, so direct writes are refused.
-- app_secret has no policies at all, so nobody can read it directly.

revoke all on public.app_state  from anon, authenticated;
revoke all on public.app_secret from anon, authenticated;
grant select on public.app_state to anon, authenticated;

-- 4. Password check
create or replace function public.check_password(p_password text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select exists (
    select 1 from public.app_secret
    where password_hash = extensions.crypt(p_password, password_hash)
  );
$$;

-- 5. The only way to write: password must be correct
create or replace function public.save_state(p_password text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not exists (
    select 1 from public.app_secret
    where password_hash = extensions.crypt(p_password, password_hash)
  ) then
    raise exception 'wrong_password' using errcode = '28000';
  end if;

  insert into public.app_state (id, data, updated_at)
  values (1, p_data, now())
  on conflict (id) do update set data = excluded.data, updated_at = now();
end;
$$;

revoke all on function public.check_password(text)      from public;
revoke all on function public.save_state(text, jsonb)   from public;
grant execute on function public.check_password(text)    to anon, authenticated;
grant execute on function public.save_state(text, jsonb) to anon, authenticated;

-- 6. Set your manager password (change the text between the quotes, then run)
insert into public.app_secret (id, password_hash)
values (1, extensions.crypt('CHANGE_THIS_PASSWORD', extensions.gen_salt('bf')))
on conflict (id) do update set password_hash = excluded.password_hash;
