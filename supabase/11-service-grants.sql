-- صلاحيات مفتاح الخدمة على الجداول اللي رابط Claude بيقرا ويكتب فيها (api/claude)
-- يُشغّل مرة واحدة في Supabase → SQL Editor → Run (آمن لو اتشغّل أكتر من مرة)
grant usage on schema public to service_role;
grant select, insert, update, delete on public.posts, public.notes, public.ad_versions to service_role;
select 'service grants ready' as ok;
