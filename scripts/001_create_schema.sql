-- GuardTrack AI - Initial schema
-- Tables: profiles, sites, guards, attendance
-- Plus RLS policies and a signup trigger that auto-creates a profile (and guard row when applicable)

-- =========================================================
-- profiles: one row per auth user, stores role + display info
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  role text not null default 'guard' check (role in ('guard', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- =========================================================
-- sites: physical locations a guard can be assigned to
-- qr_code_value is what is encoded in the QR poster at the site
-- =========================================================
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  address text,
  qr_code_value text not null unique default gen_random_uuid()::text,
  created_at timestamptz not null default now()
);

alter table public.sites enable row level security;

-- =========================================================
-- guards: guard-specific data, keyed off auth.users
-- =========================================================
create table if not exists public.guards (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  site_id uuid references public.sites(id) on delete set null,
  base_salary numeric not null default 0,
  created_at timestamptz not null default now()
);

alter table public.guards enable row level security;

-- =========================================================
-- attendance: one row per guard per day
-- unique(guard_id, date) enforces "only one attendance per day"
-- =========================================================
create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  guard_id uuid not null references public.guards(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  date date not null default current_date,
  marked_at timestamptz not null default now(),
  status text not null default 'present' check (status in ('present', 'absent')),
  unique (guard_id, date)
);

alter table public.attendance enable row level security;

-- =========================================================
-- Helper: is_admin(uid) - bypasses RLS via security definer
-- =========================================================
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = uid and role = 'admin'
  );
$$;

-- =========================================================
-- RLS policies
-- =========================================================

-- profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (auth.uid() = id or public.is_admin(auth.uid()));

-- sites: everyone authenticated can read; only admins can write
drop policy if exists "sites_select" on public.sites;
create policy "sites_select" on public.sites
  for select using (auth.role() = 'authenticated');

drop policy if exists "sites_insert_admin" on public.sites;
create policy "sites_insert_admin" on public.sites
  for insert with check (public.is_admin(auth.uid()));

drop policy if exists "sites_update_admin" on public.sites;
create policy "sites_update_admin" on public.sites
  for update using (public.is_admin(auth.uid()));

drop policy if exists "sites_delete_admin" on public.sites;
create policy "sites_delete_admin" on public.sites
  for delete using (public.is_admin(auth.uid()));

-- guards
drop policy if exists "guards_select" on public.guards;
create policy "guards_select" on public.guards
  for select using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "guards_insert" on public.guards;
create policy "guards_insert" on public.guards
  for insert with check (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "guards_update" on public.guards;
create policy "guards_update" on public.guards
  for update using (auth.uid() = id or public.is_admin(auth.uid()));

drop policy if exists "guards_delete_admin" on public.guards;
create policy "guards_delete_admin" on public.guards
  for delete using (public.is_admin(auth.uid()));

-- attendance: guards can view + insert their own; admins can do anything
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select" on public.attendance
  for select using (auth.uid() = guard_id or public.is_admin(auth.uid()));

drop policy if exists "attendance_insert_self" on public.attendance;
create policy "attendance_insert_self" on public.attendance
  for insert with check (auth.uid() = guard_id);

drop policy if exists "attendance_update_admin" on public.attendance;
create policy "attendance_update_admin" on public.attendance
  for update using (public.is_admin(auth.uid()));

drop policy if exists "attendance_delete_admin" on public.attendance;
create policy "attendance_delete_admin" on public.attendance
  for delete using (public.is_admin(auth.uid()));

-- =========================================================
-- Trigger: auto-create a profile (and guard) on signup
-- Reads role + name from raw_user_meta_data set during signUp()
-- =========================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_phone text;
begin
  v_role := coalesce(new.raw_user_meta_data ->> 'role', 'guard');
  v_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_phone := new.raw_user_meta_data ->> 'phone';

  insert into public.profiles (id, full_name, phone, role)
  values (new.id, v_name, v_phone, v_role)
  on conflict (id) do nothing;

  if v_role = 'guard' then
    insert into public.guards (id, full_name, phone, email, base_salary)
    values (new.id, v_name, v_phone, new.email, 0)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
