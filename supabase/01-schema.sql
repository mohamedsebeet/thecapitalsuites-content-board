-- لوحة النشر · ذا كابيتال سويتس
-- الصق الملف ده كله في Supabase → SQL Editor → Run (مرة واحدة)

create table if not exists public.members (
  email text primary key,
  role  text not null check (role in ('owner','team','viewer')),
  name  text,
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id text primary key,
  post_id text not null references public.posts(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists notes_post_idx on public.notes(post_id, at);

-- دور المستخدم الحالي حسب إيميله
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.members where lower(email) = lower(auth.jwt()->>'email')
$$;

-- أول مستخدم يسجّل دخول يصبح مدير المحتوى (مرة واحدة فقط، لما القائمة تكون فاضية)
create or replace function public.claim_owner() returns text
language plpgsql security definer set search_path = public as $$
declare e text := auth.jwt()->>'email';
begin
  if e is null then return null; end if;
  if exists (select 1 from public.members where role = 'owner') then
    return public.my_role();
  end if;
  insert into public.members(email, role, name) values (lower(e), 'owner', split_part(e,'@',1))
  on conflict (email) do update set role = 'owner';
  return 'owner';
end $$;

-- دمج حقول في بند (update)
create or replace function public.merge_post(p_id text, p_patch jsonb) returns void
language sql security invoker set search_path = public as $$
  update public.posts set data = data || p_patch, updated_at = now() where id = p_id
$$;

-- فريق التنفيذ يعدّل الحالة والروابط فقط
create or replace function public.guard_team_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare allowed text[] := array['status','designLink','pubLink','noteCount','lastNote','updatedBy','updatedAt'];
begin
  if public.my_role() = 'team' then
    if (new.data - allowed) is distinct from (old.data - allowed) or new.id <> old.id then
      raise exception 'team members can only change status and links' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_guard_team on public.posts;
create trigger posts_guard_team before update on public.posts
for each row execute function public.guard_team_update();

alter table public.members enable row level security;
alter table public.posts   enable row level security;
alter table public.notes   enable row level security;

drop policy if exists members_read  on public.members;
drop policy if exists members_write on public.members;
create policy members_read  on public.members for select using (public.my_role() is not null);
create policy members_write on public.members for all using (public.my_role() = 'owner') with check (public.my_role() = 'owner');

drop policy if exists posts_read   on public.posts;
drop policy if exists posts_insert on public.posts;
drop policy if exists posts_update on public.posts;
drop policy if exists posts_delete on public.posts;
create policy posts_read   on public.posts for select using (public.my_role() is not null);
create policy posts_insert on public.posts for insert with check (public.my_role() = 'owner');
create policy posts_update on public.posts for update using (public.my_role() in ('owner','team')) with check (public.my_role() in ('owner','team'));
create policy posts_delete on public.posts for delete using (public.my_role() = 'owner');

drop policy if exists notes_read   on public.notes;
drop policy if exists notes_insert on public.notes;
drop policy if exists notes_delete on public.notes;
create policy notes_read   on public.notes for select using (public.my_role() is not null);
create policy notes_insert on public.notes for insert with check (public.my_role() in ('owner','team'));
create policy notes_delete on public.notes for delete using (public.my_role() = 'owner');

grant execute on function public.my_role(), public.claim_owner(), public.merge_post(text, jsonb) to authenticated;

-- تحديث لحظي
do $$ begin
  begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.notes; exception when duplicate_object then null; end;
end $$;
