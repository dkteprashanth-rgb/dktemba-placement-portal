-- DKTE Placement Portal v2 schema. Run in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.approved_prns (
  id uuid primary key default gen_random_uuid(),
  prn text not null unique,
  dob_hash text, -- bcrypt hash only; never store DOB in plaintext
  is_registered boolean not null default false,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  registered_at timestamptz,
  created_at timestamptz not null default now()
);

-- Generates PRNs 25PMB001 through 25PMB140. Safe to rerun.
insert into public.approved_prns(prn)
select '25PMB' || lpad(n::text,3,'0')
from generate_series(1,140) as n
on conflict (prn) do nothing;

create table if not exists public.student_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  approved_prn_id uuid not null unique references public.approved_prns(id),
  prn text not null unique,
  full_name text not null,
  mobile text not null,
  email text not null,
  address text not null,
  graduation_stream text not null,
  tenth_percentage numeric(5,2) not null check(tenth_percentage between 0 and 100),
  twelfth_percentage numeric(5,2) not null check(twelfth_percentage between 0 and 100),
  graduation_value numeric(6,2) not null check(graduation_value >= 0),
  graduation_type text not null check(graduation_type in ('percentage','cgpa')),
  mba_fy_cgpa numeric(4,2) not null check(mba_fy_cgpa between 0 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  opening_title text not null,
  salary_range text,
  location text,
  description text,
  deadline date,
  status text not null default 'draft' check(status in ('draft','published','closed')),
  created_at timestamptz not null default now()
);
create table if not exists public.job_positions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  position_title text not null
);
create table if not exists public.job_streams (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  stream_name text not null
);
create table if not exists public.eligibility_criteria (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  qualification text not null check(qualification in ('10th','12th','graduation','mba_fy')),
  marks_type text not null check(marks_type in ('percentage','cgpa')),
  minimum_value numeric(6,2) not null check(minimum_value >= 0)
);
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  student_id uuid not null references public.student_profiles(id) on delete cascade,
  position_id uuid not null references public.job_positions(id),
  status text not null default 'submitted' check(status in ('submitted','under_review','shortlisted','rejected','selected')),
  eligibility_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(job_id,student_id)
);
create table if not exists public.portal_settings (
  key text primary key,
  value text not null default ''
);

-- DOB verification. Store bcrypt hashes generated in a trusted admin process.
create or replace function public.verify_prn_dob(p_prn text,p_dob text)
returns boolean language sql security definer set search_path=public,extensions as $$
  select exists(select 1 from public.approved_prns where prn=upper(trim(p_prn)) and dob_hash is not null and crypt(p_dob,dob_hash)=dob_hash and is_registered=false);
$$;
revoke all on function public.verify_prn_dob(text,text) from public,anon,authenticated;
grant execute on function public.verify_prn_dob(text,text) to service_role;

-- Called only by the register-student Edge Function using service_role.
create or replace function public.claim_student_prn(p_prn text,p_auth_user_id uuid,p_profile jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  update public.approved_prns set is_registered=true,auth_user_id=p_auth_user_id,registered_at=now()
  where prn=upper(trim(p_prn)) and is_registered=false returning id into v_id;
  if v_id is null then raise exception 'PRN is already registered or not approved'; end if;
  insert into public.student_profiles(auth_user_id,approved_prn_id,prn,full_name,mobile,email,address,graduation_stream,tenth_percentage,twelfth_percentage,graduation_value,graduation_type,mba_fy_cgpa)
  values(p_auth_user_id,v_id,upper(trim(p_prn)),p_profile->>'full_name',p_profile->>'mobile',p_profile->>'email',p_profile->>'address',p_profile->>'graduation_stream',(p_profile->>'tenth')::numeric,(p_profile->>'twelfth')::numeric,(p_profile->>'graduation')::numeric,p_profile->>'graduation_type',(p_profile->>'mba_fy')::numeric);
  return v_id;
end; $$;
revoke all on function public.claim_student_prn(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.claim_student_prn(text,uuid,jsonb) to service_role;

-- Row-level security
alter table public.approved_prns enable row level security;
alter table public.student_profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.jobs enable row level security;
alter table public.job_positions enable row level security;
alter table public.job_streams enable row level security;
alter table public.eligibility_criteria enable row level security;
alter table public.applications enable row level security;
alter table public.portal_settings enable row level security;

create or replace function public.is_placement_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.admin_users where auth_user_id=auth.uid()); $$;

create policy "students read own profile" on public.student_profiles for select to authenticated using(auth_user_id=auth.uid() or public.is_placement_admin());
create policy "admins manage profiles" on public.student_profiles for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "registered students read published jobs" on public.jobs for select to authenticated using(status='published' or public.is_placement_admin());
create policy "admins manage jobs" on public.jobs for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "students read positions for visible jobs" on public.job_positions for select to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and (j.status='published' or public.is_placement_admin())));
create policy "admins manage positions" on public.job_positions for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "students read streams for visible jobs" on public.job_streams for select to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and (j.status='published' or public.is_placement_admin())));
create policy "admins manage job streams" on public.job_streams for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "students read criteria for visible jobs" on public.eligibility_criteria for select to authenticated using(exists(select 1 from public.jobs j where j.id=job_id and (j.status='published' or public.is_placement_admin())));
create policy "admins manage criteria" on public.eligibility_criteria for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "students read own applications" on public.applications for select to authenticated using(student_id in(select id from public.student_profiles where auth_user_id=auth.uid()) or public.is_placement_admin());
create policy "admins manage applications" on public.applications for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "admins read settings" on public.portal_settings for select to authenticated using(public.is_placement_admin());
create policy "admins manage settings" on public.portal_settings for all to authenticated using(public.is_placement_admin()) with check(public.is_placement_admin());
create policy "admins read admin list" on public.admin_users for select to authenticated using(auth_user_id=auth.uid());

-- NOTE: no client policies are granted for approved_prns. Only service_role Edge Functions may access it.
revoke all on function public.is_placement_admin() from public,anon;
grant execute on function public.is_placement_admin() to authenticated;
create policy "public can read placement contact settings" on public.portal_settings for select to anon,authenticated using(key in ('tpo_mba','coordinator_one','coordinator_two'));
