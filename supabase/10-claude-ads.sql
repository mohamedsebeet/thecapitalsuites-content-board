-- Claude يرفع نسخ تصاميم الإعلانات (إعلانات جديدة أو نسخ جديدة لإعلانات موجودة) من الرابط المخصص
-- النسخة بتدخل «بانتظار المراجعة» زي أي نسخة من المصمم، والاعتماد يفضل لصاحب الصلاحية
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)

create or replace function public.guard_ad_versions() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  appr boolean := public.has_perm('posts.approve');
  up boolean := public.has_perm('designs.upload');
  rk text[] := array['status','reviewNote','reviewedBy','reviewedAt'];
  k text;
begin
  if coalesce(auth.role(), '') = 'service_role' then new.updated_at := now(); return new; end if;
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

select 'claude ad designs ready' as ok;
