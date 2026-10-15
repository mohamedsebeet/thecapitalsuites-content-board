-- صلاحيات تفصيلية لكل عضو في لوحة النشر وغرفة التشغيل
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
--
-- كل عضو له «دور جاهز» (مدير، مشرف، كاتب، مصمم، مسؤول نشر، اعتماد، اطلاع)،
-- ومدير المحتوى يقدر يخصص صلاحياته واحدة واحدة، ويحدد المنصات اللي ينشر عليها.
-- الصلاحيات بتتطبق في قاعدة البيانات نفسها، مش في الواجهة بس.

-- 1) أعمدة الصلاحيات المخصصة والمنصات
alter table public.members add column if not exists perms jsonb;      -- null = صلاحيات الدور الجاهز
alter table public.members add column if not exists platforms text[]; -- null = كل المنصات
alter table public.members drop constraint if exists members_role_check;
alter table public.members add constraint members_role_check
  check (role in ('owner','manager','writer','designer','publisher','reviewer','team','viewer'));

-- 2) صلاحيات كل دور جاهز
create or replace function public.role_perms(r text) returns text[]
language sql immutable as $$
  select case r
    when 'owner' then array['view.campaigns','view.plans','view.decks','view.publish',
      'posts.create','posts.edit','posts.delete','posts.status','posts.approve',
      'designs.upload','designs.delete','notes.write',
      'publish.schedule','publish.mark','kpis.edit','team.manage']
    when 'manager' then array['view.campaigns','view.plans','view.decks','view.publish',
      'posts.create','posts.edit','posts.delete','posts.status','posts.approve',
      'designs.upload','designs.delete','notes.write',
      'publish.schedule','publish.mark','kpis.edit']
    when 'writer' then array['view.publish','posts.create','posts.edit','posts.status','notes.write']
    when 'designer' then array['posts.status','designs.upload','designs.delete','notes.write']
    when 'team' then array['posts.status','designs.upload','designs.delete','notes.write']
    when 'publisher' then array['view.publish','publish.mark','notes.write']
    when 'reviewer' then array['view.campaigns','view.plans','view.decks','view.publish','posts.approve','notes.write']
    when 'viewer' then array['view.campaigns','view.plans','view.decks','view.publish']
    else array[]::text[] end
$$;

create or replace function public.my_member() returns public.members
language sql stable security definer set search_path = public as $$
  select * from public.members where lower(email) = lower(auth.jwt()->>'email')
$$;

create or replace function public.my_perms() returns text[]
language sql stable security definer set search_path = public as $$
  select case
    when m.email is null then array[]::text[]
    when m.role = 'owner' then public.role_perms('owner')
    when m.perms is not null then array(select jsonb_array_elements_text(m.perms))
    else public.role_perms(m.role) end
  from (select (public.my_member()).*) m
$$;

create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p = any(public.my_perms()), false)
$$;

create or replace function public.my_platforms() returns text[]
language sql stable security definer set search_path = public as $$
  select case when m.role = 'owner' then null else m.platforms end from (select (public.my_member()).*) m
$$;

create or replace function public.my_access() returns jsonb
language sql stable security definer set search_path = public as $$
  select case when m.email is null then null else jsonb_build_object(
    'role', m.role, 'perms', to_jsonb(public.my_perms()), 'platforms', to_jsonb(public.my_platforms()),
    'custom', m.perms is not null and m.role <> 'owner') end
  from (select (public.my_member()).*) m
$$;

-- 3) حارس تعديل المنشورات: كل حقل له صلاحية
create or replace function public.guard_post_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text; pk text; ok boolean; plats text[];
  o jsonb := old.data; n jsonb := new.data;
  meta text[]  := array['updatedBy','updatedAt','noteCount','lastNote'];
  sched text[] := array['targets','d','tm'];
  done text[]  := array['approved','scheduled','published'];
begin
  if public.my_role() = 'owner' then return new; end if;
  if new.id <> old.id then raise exception 'cannot change id' using errcode = '42501'; end if;
  for k in select x from (select jsonb_object_keys(o) x union select jsonb_object_keys(n)) s loop
    if (o->k) is not distinct from (n->k) or k = any(meta) then continue; end if;
    if k = 'status' then
      if n->>'status' in ('approved','changes') then ok := public.has_perm('posts.approve');
      elsif n->>'status' in ('scheduled','published') then
        ok := public.has_perm('posts.approve') or (public.has_perm('publish.mark') and o->>'status' = any(done));
      elsif o->>'status' = any(done) then ok := public.has_perm('posts.approve');
      else ok := public.has_perm('posts.status') or public.has_perm('posts.approve'); end if;
    elsif k = 'designs' then
      ok := true;
      if exists (select 1 from jsonb_array_elements(coalesce(o->'designs','[]'::jsonb)) e
                 where not coalesce(n->'designs','[]'::jsonb) @> jsonb_build_array(e)) then
        ok := ok and public.has_perm('designs.delete'); end if;
      if exists (select 1 from jsonb_array_elements(coalesce(n->'designs','[]'::jsonb)) e
                 where not coalesce(o->'designs','[]'::jsonb) @> jsonb_build_array(e)) then
        ok := ok and public.has_perm('designs.upload'); end if;
    elsif k = 'designLink' then ok := public.has_perm('designs.upload');
    elsif k = 'pubLink' then ok := public.has_perm('publish.mark');
    elsif k = 'pub' then
      ok := public.has_perm('publish.mark');
      plats := public.my_platforms();
      if ok and plats is not null then
        for pk in select x from (select jsonb_object_keys(coalesce(o->'pub','{}'::jsonb)) x
                                 union select jsonb_object_keys(coalesce(n->'pub','{}'::jsonb))) s loop
          if (o->'pub'->pk) is distinct from (n->'pub'->pk) and not (pk = any(plats)) then ok := false; end if;
        end loop;
      end if;
    elsif k = any(sched) then ok := public.has_perm('posts.edit') or public.has_perm('publish.schedule');
    else ok := public.has_perm('posts.edit');
    end if;
    if not ok then
      raise exception 'no permission to change %', k using errcode = '42501';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists posts_guard_team on public.posts;
drop trigger if exists posts_guard on public.posts;
create trigger posts_guard before update on public.posts
for each row execute function public.guard_post_update();

-- 4) حارس الفريق: اللي عنده «إدارة الفريق» ما يقدر يلمس مدير المحتوى ولا يعدّل صلاحياته هو
create or replace function public.guard_members() returns trigger
language plpgsql security definer set search_path = public as $$
declare me text := lower(auth.jwt()->>'email');
begin
  -- من محرر SQL، أو أول تسجيل لمدير المحتوى قبل ما يكون فيه مدير
  if me is null or not exists (select 1 from public.members where role = 'owner') then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if public.my_role() = 'owner' then
    if tg_op <> 'INSERT' and lower(old.email) = me and (tg_op = 'DELETE' or new.role <> 'owner') then
      raise exception 'owner cannot remove own access' using errcode = '42501'; end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op <> 'INSERT' and (old.role = 'owner' or lower(old.email) = me) then
    if tg_op = 'UPDATE' and lower(old.email) = me and new.role = old.role
       and new.perms is not distinct from old.perms and new.platforms is not distinct from old.platforms then
      return new; -- تعديل اسمه بس
    end if;
    raise exception 'cannot change this member' using errcode = '42501';
  end if;
  if tg_op <> 'DELETE' and new.role = 'owner' then
    raise exception 'only the owner can add owners' using errcode = '42501'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists members_guard on public.members;
create trigger members_guard before insert or update or delete on public.members
for each row execute function public.guard_members();

-- 5) السياسات
drop policy if exists members_write on public.members;
drop policy if exists members_self_name on public.members;
create policy members_write on public.members for all
  using (public.has_perm('team.manage')) with check (public.has_perm('team.manage'));
create policy members_self_name on public.members for update
  using (lower(email) = lower(auth.jwt()->>'email')) with check (lower(email) = lower(auth.jwt()->>'email'));

drop policy if exists posts_insert on public.posts;
drop policy if exists posts_update on public.posts;
drop policy if exists posts_delete on public.posts;
create policy posts_insert on public.posts for insert with check (public.has_perm('posts.create'));
create policy posts_update on public.posts for update using (public.my_role() is not null) with check (public.my_role() is not null);
create policy posts_delete on public.posts for delete using (public.has_perm('posts.delete'));

drop policy if exists notes_insert on public.notes;
drop policy if exists notes_delete on public.notes;
create policy notes_insert on public.notes for insert with check (
  public.has_perm('notes.write') or (coalesce((data->>'sys')::boolean, false) and public.my_perms() &&
    array['posts.create','posts.edit','posts.status','posts.approve','designs.upload','designs.delete','publish.mark','publish.schedule']));
create policy notes_delete on public.notes for delete using (public.has_perm('posts.delete'));

drop policy if exists kpis_write on public.kpis;
create policy kpis_write on public.kpis for all using (public.has_perm('kpis.edit')) with check (public.has_perm('kpis.edit'));

drop policy if exists designs_insert on storage.objects;
drop policy if exists designs_update on storage.objects;
drop policy if exists designs_delete on storage.objects;
create policy designs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'designs' and public.has_perm('designs.upload'));
create policy designs_update on storage.objects for update to authenticated
  using (bucket_id = 'designs' and public.has_perm('designs.upload'));
create policy designs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'designs' and public.has_perm('designs.delete'));

grant execute on function public.role_perms(text), public.my_perms(), public.has_perm(text),
  public.my_platforms(), public.my_access() to authenticated;
revoke execute on function public.my_member() from public, anon;
grant execute on function public.my_member() to authenticated;

-- الأعضاء الحاليين بدور «فريق التنفيذ» يبقوا «مصمم»
update public.members set role = 'designer' where role = 'team';

select 'permissions ready' as ok;
