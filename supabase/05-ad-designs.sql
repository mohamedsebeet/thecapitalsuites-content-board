-- نسخ جديدة من تصاميم الإعلانات: المصمم يرفع، والمدير يراجع ويعتمد، وبعدها تتركّب على المنصة
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
--
-- كل صف = نسخة واحدة لإعلان واحد (ممكن فيها أكتر من ملف: فيد وستوري وصور كاروسيل)
-- ad_key: «meta:<رقم الإعلان>» أو «snap:<رقم الإعلان>»، أو «new:<رمز>» لإعلان جديد لسه مش على المنصة
-- data: { v, files:[{path,url,name,type,size}], note, by, at,
--         status: review | changes | approved | live, reviewNote, reviewedBy, reviewedAt,
--         title, platform, hood   ← للإعلانات الجديدة بس }

create table if not exists public.ad_versions (
  id text primary key,
  ad_key text not null,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ad_versions_key on public.ad_versions (ad_key, at desc);
alter table public.ad_versions enable row level security;

-- الحارس: الاعتماد وطلب التعديل و«اتركّبت» لصاحب صلاحية الاعتماد، والملفات والملاحظة للمصمم
create or replace function public.guard_ad_versions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  appr boolean := public.has_perm('posts.approve');
  up boolean := public.has_perm('designs.upload');
  rk text[] := array['status','reviewNote','reviewedBy','reviewedAt'];
  k text;
begin
  if tg_op = 'INSERT' then
    if not up then raise exception 'no permission to upload' using errcode = '42501'; end if;
    new.data := jsonb_set(new.data, '{status}', '"review"');
    new.data := new.data - 'reviewNote' - 'reviewedBy' - 'reviewedAt';
    return new;
  end if;
  if new.id <> old.id or new.ad_key <> old.ad_key then
    raise exception 'cannot move a version' using errcode = '42501'; end if;
  for k in select x from (select jsonb_object_keys(old.data) x union select jsonb_object_keys(new.data)) s loop
    if (old.data->k) is not distinct from (new.data->k) then continue; end if;
    if k = any(rk) then
      if not appr then raise exception 'no permission to review' using errcode = '42501'; end if;
    elsif not up then
      raise exception 'no permission to change %', k using errcode = '42501';
    elsif old.data->>'status' in ('approved','live') and not appr then
      raise exception 'version already approved' using errcode = '42501';
    end if;
  end loop;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists ad_versions_guard on public.ad_versions;
create trigger ad_versions_guard before insert or update on public.ad_versions
for each row execute function public.guard_ad_versions();

drop policy if exists ad_versions_read on public.ad_versions;
drop policy if exists ad_versions_insert on public.ad_versions;
drop policy if exists ad_versions_update on public.ad_versions;
drop policy if exists ad_versions_delete on public.ad_versions;
create policy ad_versions_read on public.ad_versions for select to authenticated
  using (public.my_role() is not null);
create policy ad_versions_insert on public.ad_versions for insert to authenticated
  with check (public.has_perm('designs.upload'));
create policy ad_versions_update on public.ad_versions for update to authenticated
  using (public.has_perm('designs.upload') or public.has_perm('posts.approve'))
  with check (public.has_perm('designs.upload') or public.has_perm('posts.approve'));
create policy ad_versions_delete on public.ad_versions for delete to authenticated
  using (public.has_perm('designs.delete') and (data->>'status' not in ('approved','live') or public.has_perm('posts.approve')));

grant select, insert, update, delete on public.ad_versions to authenticated;

select 'ad versions ready' as ok;
