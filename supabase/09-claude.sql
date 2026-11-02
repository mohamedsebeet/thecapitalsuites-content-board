-- Claude كمصمم: يرفع تصاميم المنشورات من الرابط المخصص (api/claude) بمفتاح الخدمة،
-- ومين له صلاحية الاعتماد يقدر يطلب «اتجاه تاني» ويختار واحد من الاختيارات (والباقي يتشال)
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)

create or replace function public.guard_post_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text; pk text; ok boolean; plats text[];
  o jsonb := old.data; n jsonb := new.data;
  meta text[]  := array['updatedBy','updatedAt','noteCount','lastNote'];
  sched text[] := array['targets','d','tm'];
  done text[]  := array['approved','scheduled','published'];
begin
  if public.my_role() = 'owner' or coalesce(auth.role(), '') = 'service_role' then return new; end if;
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
        ok := ok and (public.has_perm('designs.delete') or (public.has_perm('posts.approve') and n->>'status' = 'approved')); end if;
      if exists (select 1 from jsonb_array_elements(coalesce(n->'designs','[]'::jsonb)) e
                 where not coalesce(o->'designs','[]'::jsonb) @> jsonb_build_array(e)) then
        ok := ok and public.has_perm('designs.upload'); end if;
    elsif k = 'ask' then ok := public.has_perm('posts.approve');
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

-- الإشعارات: لما الرفع يكون من Claude يظهر اسمه بدل خانة فاضية
create or replace function public.log_activity(p_kind text, p_ref text, p_data jsonb) returns void
language plpgsql security definer set search_path = public, private as $$
declare
  me text := lower(auth.jwt()->>'email');
  who text;
  r public.activity;
  subs jsonb;
  url text;
begin
  select name into who from public.members where lower(email) = me;
  insert into public.activity (actor, kind, ref, data)
  values (me, p_kind, p_ref, coalesce(p_data, '{}'::jsonb) || jsonb_build_object('by', coalesce(who, nullif(split_part(coalesce(me, ''), '@', 1), ''), 'Claude')))
  returning * into r;
  delete from public.activity where at < now() - interval '60 days';
  begin
    select v into url from private.cfg where k = 'notify_url';
    select jsonb_agg(s.sub) into subs from public.push_subs s
      join public.members m on lower(m.email) = lower(s.email)
      where me is null or lower(s.email) <> me;
    if url is not null and subs is not null then
      perform net.http_post(
        url := url,
        body := jsonb_build_object('act', to_jsonb(r), 'subs', subs, 'vapid', jsonb_build_object(
          'subject', (select v from private.cfg where k = 'vapid_subject'),
          'pub', (select v from private.cfg where k = 'vapid_public'),
          'priv', (select v from private.cfg where k = 'vapid_private'))),
        headers := '{"Content-Type":"application/json"}'::jsonb);
    end if;
  exception when others then null; -- الإشعار ما يوقفش الحفظ أبداً
  end;
end $$;

select 'claude designer ready' as ok;
