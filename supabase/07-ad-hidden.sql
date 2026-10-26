-- حذف تصميم إعلان من صفحة «تصاميم الإعلانات»
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
-- الإعلان على ميتا أو سناب نفسه ما بيتأثرش: ده بيشيله من الصفحة بس، وممكن يرجع من «المحذوفة».

create table if not exists public.ad_hidden (
  ad_key text primary key,
  by text,
  at timestamptz not null default now()
);
alter table public.ad_hidden enable row level security;
drop policy if exists ad_hidden_read on public.ad_hidden;
drop policy if exists ad_hidden_write on public.ad_hidden;
drop policy if exists ad_hidden_delete on public.ad_hidden;
create policy ad_hidden_read on public.ad_hidden for select to authenticated using (public.my_role() is not null);
create policy ad_hidden_write on public.ad_hidden for insert to authenticated with check (public.has_perm('designs.delete'));
create policy ad_hidden_delete on public.ad_hidden for delete to authenticated using (public.has_perm('designs.delete'));
grant select, insert, delete on public.ad_hidden to authenticated;

select 'ad hidden ready' as ok;
