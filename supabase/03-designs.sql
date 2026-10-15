-- رفع التصاميم من اللوحة: مخزن ملفات + السماح للمصمم بإضافة التصاميم على المنشور
-- يُشغّل مرة واحدة في Supabase → SQL Editor

-- 1) المصمم (team) يقدر يعدّل قائمة التصاميم المرفوعة كمان
create or replace function public.guard_team_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare allowed text[] := array['status','designLink','designs','pubLink','noteCount','lastNote','updatedBy','updatedAt'];
begin
  if public.my_role() = 'team' then
    if (new.data - allowed) is distinct from (old.data - allowed) or new.id <> old.id then
      raise exception 'team members can only change status, designs and links' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- 2) مخزن التصاميم (روابط الملفات عشوائية وطويلة، والرفع والحذف لأعضاء الفريق فقط)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('designs', 'designs', true, 52428800,
        array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/quicktime','application/pdf'])
on conflict (id) do update set public = true,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists designs_read   on storage.objects;
drop policy if exists designs_insert on storage.objects;
drop policy if exists designs_update on storage.objects;
drop policy if exists designs_delete on storage.objects;
create policy designs_read   on storage.objects for select to authenticated
  using (bucket_id = 'designs' and public.my_role() is not null);
create policy designs_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'designs' and public.my_role() in ('owner','team'));
create policy designs_update on storage.objects for update to authenticated
  using (bucket_id = 'designs' and public.my_role() in ('owner','team'));
create policy designs_delete on storage.objects for delete to authenticated
  using (bucket_id = 'designs' and public.my_role() in ('owner','team'));

-- 3) نتائج المبيعات الأسبوعية (المحادثات الفعلية والمعاينات والحجوزات) يدخلها مدير المحتوى
create table if not exists public.kpis (
  id text primary key,            -- مثال: 2026-10-01 (بداية الأسبوع)
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.kpis enable row level security;
drop policy if exists kpis_read  on public.kpis;
drop policy if exists kpis_write on public.kpis;
create policy kpis_read  on public.kpis for select using (public.my_role() is not null);
create policy kpis_write on public.kpis for all using (public.my_role() = 'owner') with check (public.my_role() = 'owner');
grant select, insert, update, delete on public.kpis to authenticated;
revoke all on public.kpis from anon;

select 'designs + kpis ready' as ok;
