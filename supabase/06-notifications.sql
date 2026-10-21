-- الإشعارات: سجل لكل تغيير مهم + إشعار على الموبايل والكمبيوتر حتى لو الموقع مقفول
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
-- قبل التشغيل: حط المفتاح الخاص بدل __VAPID_PRIVATE__ (موجود عند مدير المحتوى، ومش بيتحفظ في الكود)
--
-- كل تغيير (تصميم جديد، تغيير حالة، نشر، تعديل، ملاحظة، نسخة إعلان، اعتماد) بيتسجل في activity،
-- وبيتبعت لكل أعضاء الفريق اللي فعّلوا الإشعارات على أجهزتهم، ما عدا اللي عمل التغيير نفسه.

create extension if not exists pg_net;

-- 1) إعدادات خاصة (مش ظاهرة لأي مستخدم)
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.cfg (k text primary key, v text not null);
insert into private.cfg (k, v) values
  ('notify_url', 'https://thecapitalsuites-content-board.vercel.app/api/notify'),
  ('vapid_subject', 'https://thecapitalsuites-content-board.vercel.app'),
  ('vapid_public', 'BFQm6RyQtbIhIvO4a3ymzke5bRRZDqkZiF8YQVjcJJL3SOR9Jt2ezB257M7ZFY8zTNr7lUIdHCkI6q5RuYnJhOw'),
  ('vapid_private', '__VAPID_PRIVATE__')
on conflict (k) do update set v = excluded.v;

-- 2) سجل النشاط
create table if not exists public.activity (
  id bigserial primary key,
  at timestamptz not null default now(),
  actor text,
  kind text not null,
  ref text,
  data jsonb not null default '{}'::jsonb
);
create index if not exists activity_at on public.activity (at desc);
alter table public.activity enable row level security;
drop policy if exists activity_read on public.activity;
create policy activity_read on public.activity for select to authenticated using (public.my_role() is not null);
grant select on public.activity to authenticated;

-- 3) أجهزة الإشعارات (كل عضو يضيف ويشيل أجهزته هو بس)
create table if not exists public.push_subs (
  endpoint text primary key,
  email text not null,
  sub jsonb not null,
  ua text,
  at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
drop policy if exists push_own on public.push_subs;
create policy push_own on public.push_subs for all to authenticated
  using (lower(email) = lower(auth.jwt()->>'email'))
  with check (lower(email) = lower(auth.jwt()->>'email') and public.my_role() is not null);
grant select, insert, update, delete on public.push_subs to authenticated;

-- 4) تسجيل حدث وإرساله
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
  values (me, p_kind, p_ref, coalesce(p_data, '{}'::jsonb) || jsonb_build_object('by', coalesce(who, split_part(coalesce(me, ''), '@', 1))))
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
revoke execute on function public.log_activity(text, text, jsonb) from public, anon, authenticated;

-- 5) المنشورات
create or replace function public.act_posts() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  o jsonb; n jsonb := new.data; added int := 0; pl text[]; f text[];
  base jsonb := jsonb_build_object('t', new.data->>'t', 'p', new.data->>'p', 'setup', new.data->>'kind' = 'setup');
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('post.new', new.id, base || jsonb_build_object('d', n->>'d'));
    return null;
  end if;
  o := old.data;
  select count(*) into added from jsonb_array_elements(coalesce(n->'designs', '[]'::jsonb)) e
    where not coalesce(o->'designs', '[]'::jsonb) @> jsonb_build_array(e);
  if added > 0 then
    perform public.log_activity('post.design', new.id, base || jsonb_build_object('n', added, 'to', n->>'status'));
  elsif (o->>'status') is distinct from (n->>'status') then
    perform public.log_activity('post.status', new.id, base || jsonb_build_object('from', o->>'status', 'to', n->>'status'));
  else
    select array_agg(k) into pl from jsonb_object_keys(coalesce(n->'pub', '{}'::jsonb)) k
      where coalesce((n->'pub'->k->>'done')::boolean, false) and not coalesce((o->'pub'->k->>'done')::boolean, false);
    if pl is not null then
      perform public.log_activity('post.pub', new.id, base || jsonb_build_object('pl', to_jsonb(pl)));
    else
      select array_agg(k) into f from unnest(array['t','c','d','tm','b','f','n','targets','dd','cta']) k
        where (o->k) is distinct from (n->k);
      if f is not null then
        perform public.log_activity('post.edit', new.id, base || jsonb_build_object('f', to_jsonb(f)));
      end if;
    end if;
  end if;
  return null;
end $$;
drop trigger if exists posts_activity on public.posts;
create trigger posts_activity after insert or update on public.posts
for each row execute function public.act_posts();

-- 6) الملاحظات (ملاحظات النظام التلقائية مش بتتبعت لأنها مكررة مع تغيير الحالة)
create or replace function public.act_notes() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce((new.data->>'sys')::boolean, false) then return null; end if;
  perform public.log_activity('note', new.post_id, jsonb_build_object(
    't', (select data->>'t' from public.posts where id = new.post_id), 'x', left(new.data->>'text', 160)));
  return null;
end $$;
drop trigger if exists notes_activity on public.notes;
create trigger notes_activity after insert on public.notes
for each row execute function public.act_notes();

-- 7) تصاميم الإعلانات
create or replace function public.act_ads() returns trigger
language plpgsql security definer set search_path = public as $$
declare base jsonb := jsonb_build_object('title', coalesce(new.data->>'adTitle', new.data->>'title', 'إعلان'), 'v', new.data->'v');
begin
  if tg_op = 'INSERT' then
    perform public.log_activity('ad.new', new.ad_key, base || jsonb_build_object('note', left(new.data->>'note', 160), 'files', jsonb_array_length(coalesce(new.data->'files', '[]'::jsonb))));
  elsif (old.data->>'status') is distinct from (new.data->>'status') then
    perform public.log_activity('ad.status', new.ad_key, base || jsonb_build_object('to', new.data->>'status', 'note', left(new.data->>'reviewNote', 160)));
  end if;
  return null;
end $$;
drop trigger if exists ad_versions_activity on public.ad_versions;
create trigger ad_versions_activity after insert or update on public.ad_versions
for each row execute function public.act_ads();

-- 8) تحديث فوري في الصفحات المفتوحة
do $$ begin
  alter publication supabase_realtime add table public.activity;
exception when others then null; end $$;

select 'notifications ready' as ok;
