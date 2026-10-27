-- ملاحظات مرسومة على تصاميم المنشورات والريلز (صفحة «تصاميم المحتوى» واللوحة المبسطة)
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
-- اللي عنده صلاحية الاعتماد (posts.approve) يقدر يضيف ويحذف الملاحظات المرسومة (حقل marks)،
-- حتى لو مش عنده صلاحية تعديل المحتوى. مدير المحتوى (owner) مش محتاج الملف ده.

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
    elsif k = 'marks' then ok := public.has_perm('posts.approve') or public.has_perm('posts.edit');
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

select 'post marks ready' as ok;
