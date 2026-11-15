// منطق مشترك لروابط الوكلاء (Claude وشات جي بي تي): يقرا طلبات التصميم ويرفع التصاميم للمراجعة.
// كل وكيل ليه مفتاح سري خاص بيه في إعدادات Vercel، والتصاميم بتتسجل باسمه.
const crypto = require('crypto');

const DONE = { approved: 1, scheduled: 1, published: 1 };
function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// يحفظ ملف صورة في مخزن التصاميم ويرجّع بياناته
async function putFile(URL_, SRV, AGENT, post, name, type, buf) {
  type = /^image\/(png|jpeg|webp)$/.test(type) ? type : 'image/png';
  if (!buf.length || buf.length > 8 * 1024 * 1024) throw new Error('size');
  const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
  const path = AGENT + '/' + String(post).replace(/[^\w-]/g, '-') + '/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.' + ext;
  const up = await fetch(URL_ + '/storage/v1/object/designs/' + path, {
    method: 'POST', headers: { apikey: SRV, Authorization: 'Bearer ' + SRV, 'Content-Type': type, 'Cache-Control': '31536000', 'x-upsert': 'false' }, body: buf
  });
  if (!up.ok) throw new Error('storage ' + (await up.text()).slice(0, 200));
  return { path, url: URL_ + '/storage/v1/object/public/designs/' + path, name: String(name || path.split('/').pop()).slice(0, 120), type, size: buf.length };
}
// ملفات شات جي بي تي بتيجي كروابط تحميل مؤقتة (openaiFileIdRefs)، فنحمّلها ونحفظها عندنا
async function fromRefs(URL_, SRV, AGENT, post, refs, opts) {
  const out = [];
  for (let i = 0; i < Math.min(refs.length, 20); i++) {
    const r = refs[i] || {}; const link = typeof r === 'string' ? r : r.download_link;
    if (!/^https:\/\//.test(link || '')) continue;
    const g = await fetch(link); if (!g.ok) throw new Error('download ' + g.status);
    const type = (r.mime_type || g.headers.get('content-type') || 'image/png').split(';')[0];
    const f = await putFile(URL_, SRV, AGENT, post, r.name, type, Buffer.from(await g.arrayBuffer()));
    f.opt = (opts && opts[i]) ? String(opts[i]).slice(0, 2) : null; out.push(f);
  }
  return out;
}
function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b || {};
}

module.exports = (AGENT, KEY_ENV, HEADER) => async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const KEY = process.env[KEY_ENV], SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const URL_ = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!KEY || !SRV || !URL_) return res.status(503).json({ error: 'not configured', need: [KEY_ENV, 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !process.env[k]) });
  if (!same(req.headers[HEADER], KEY)) return res.status(401).json({ error: 'key' });

  const H = { apikey: SRV, Authorization: 'Bearer ' + SRV, 'Content-Type': 'application/json' };
  const rest = (path, opt) => fetch(URL_ + '/rest/v1/' + path, Object.assign({ headers: H }, opt || {})).then(async r => {
    const t = await r.text(); if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : null;
  });
  const now = new Date().toISOString();

  const U = req.url || '';
  const OP = ((U.match(/[?&]op=([\w-]+)/) || U.match(/^\/api\/\w+\/([\w-]+)/) || [])[1]) || '';
  try {
    // قائمة الشغل: المنشورات اللي محتاجة تصميم قريب، والتعديلات، والاتجاهات التانية المطلوبة
    if (req.method === 'GET' && (OP === 'ads' || /[?&]q=ads\b/.test(U))) {
      const rows = await rest('ad_versions?select=id,ad_key,at,data&order=at.desc&limit=500');
      return res.status(200).json({ ads: rows.filter(r => (r.data || {}).kind !== 'request').map(r => ({ id: r.id, key: r.ad_key, at: r.at, v: r.data.v, title: r.data.title || r.data.adTitle || '', campaign: r.data.campaign || '', platform: r.data.platform || '', status: r.data.status, by: r.data.by })) });
    }
    // منشور واحد بكل تفاصيله وملاحظاته
    const qid = U.match(/[?&](?:post|id)=([^&]+)/);
    if (req.method === 'GET' && qid) {
      const id = decodeURIComponent(qid[1]);
      const rows = await rest('posts?select=id,data&id=eq.' + encodeURIComponent(id));
      if (!rows.length) return res.status(404).json({ error: 'post' });
      const p = rows[0].data || {};
      const ns = await rest('notes?select=data,at&post_id=eq.' + encodeURIComponent(id) + '&order=at.desc&limit=20');
      return res.status(200).json({ id, d: p.d, p: p.p, f: p.f, t: p.t, brief: p.b, caption: p.c, cta: p.cta, status: p.status, ask: p.ask || null,
        designs: (p.designs || []).map(d => ({ v: d.v || 1, url: d.url, name: d.name, by: d.by, opt: d.opt || null, marks: d.marks || [] })),
        notes: (ns || []).map(n => ({ at: n.at, text: (n.data || {}).text, by: (n.data || {}).by })) });
    }
    // خطة المحتوى: المنشورات في فترة (من/إلى)
    const qfrom = U.match(/[?&]from=(\d{4}-\d{2}-\d{2})/), qto = U.match(/[?&]to=(\d{4}-\d{2}-\d{2})/);
    if (req.method === 'GET' && qfrom) {
      const to = qto ? qto[1] : '9999-12-31';
      const rows = await rest('posts?select=id,data');
      const out = rows.map(r => Object.assign({ id: r.id }, r.data || {})).filter(p => p.kind !== 'setup' && p.d >= qfrom[1] && p.d <= to)
        .sort((a, b) => (a.d < b.d ? -1 : 1)).slice(0, 200)
        .map(p => ({ id: p.id, d: p.d, p: p.p, f: p.f, t: p.t, brief: p.b, caption: p.c, status: p.status, designs: (p.designs || []).length }));
      return res.status(200).json({ from: qfrom[1], to, items: out });
    }
    if (req.method === 'GET') {
      const days = Math.min(+(req.query && req.query.days) || 10, 60);
      const until = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
      const today = now.slice(0, 10);
      const rows = await rest('posts?select=id,data');
      const out = [];
      for (const r of rows) {
        const p = r.data || {}; if (p.kind === 'setup') continue;
        const ds = (p.designs || []), topV = ds.length ? Math.max.apply(null, ds.map(d => d.v || 1)) : 0;
        const mine = ds.some(d => (d.v || 1) === topV && d.by === AGENT);
        let why = '';
        if (p.ask && p.ask.kind === 'alt' && mine) why = 'alt';
        else if (p.status === 'changes' && mine) why = 'changes';
        else if (!ds.length && !DONE[p.status] && p.status !== 'review' && p.d >= today && p.d <= until) why = 'new';
        if (!why) continue;
        const item = { id: r.id, why, d: p.d, p: p.p, f: p.f, t: p.t, brief: p.b, caption: p.c, cta: p.cta, status: p.status, ask: p.ask || null, lastNote: p.lastNote || '' };
        if (ds.length) {
          const top = Math.max.apply(null, ds.map(d => d.v || 1));
          item.lastVersion = { v: top, files: ds.filter(d => (d.v || 1) === top).map(d => ({ url: d.url, name: d.name, marks: d.marks || [] })) };
          item.nextV = top + 1;
        } else item.nextV = 1;
        if (why !== 'new') {
          const ns = await rest('notes?select=data,at&post_id=eq.' + encodeURIComponent(r.id) + '&order=at.desc&limit=6');
          item.notes = (ns || []).map(n => ({ at: n.at, text: (n.data || {}).text, by: (n.data || {}).by }));
        }
        out.push(item);
      }
      out.sort((a, b) => ({ changes: 0, alt: 1, new: 2 }[a.why] - { changes: 0, alt: 1, new: 2 }[b.why]) || (a.d < b.d ? -1 : 1));
      return res.status(200).json({ at: now, days, items: out });
    }

    if (req.method !== 'POST') return res.status(405).end();
    const b = body(req);
    if (!b.action && OP) b.action = OP;

    // رفع ملف واحد (PNG/JPG) لمخزن التصاميم
    if (b.action === 'upload') {
      if (!/^[\w:-]+$/.test(String(b.post || ''))) return res.status(400).json({ error: 'post' });
      const buf = Buffer.from(String(b.b64 || ''), 'base64');
      if (!buf.length || buf.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'size' });
      return res.status(200).json(await putFile(URL_, SRV, AGENT, b.post, b.name, b.type, buf));
    }

    // تسجيل نسخة جديدة على المنشور (ملف أو أكتر) وتحويله للمراجعة
    if (b.action === 'post-design') {
      if (Array.isArray(b.openaiFileIdRefs) && b.openaiFileIdRefs.length) b.files = await fromRefs(URL_, SRV, AGENT, b.post || 'post', b.openaiFileIdRefs, b.opts);
      const rows = await rest('posts?select=id,data&id=eq.' + encodeURIComponent(b.post || ''));
      if (!rows.length) return res.status(404).json({ error: 'post' });
      const p = rows[0].data || {}, ds = p.designs || [];
      const v = ds.length ? Math.max.apply(null, ds.map(d => d.v || 1)) + 1 : 1;
      const files = (b.files || []).filter(f => f && /^https:\/\//.test(f.url)).slice(0, 20)
        .map(f => ({ path: f.path, url: f.url, name: f.name, type: f.type, size: f.size, at: now, by: AGENT, v, opt: f.opt || null }));
      if (!files.length) return res.status(400).json({ error: 'files' });
      const patch = Object.assign({}, p, { designs: ds.concat(files), updatedBy: AGENT, updatedAt: now });
      delete patch.ask;
      if (!DONE[p.status]) patch.status = 'review';
      const text = (AGENT === 'gpt' ? 'ChatGPT' : 'Claude') + ' · النسخة ' + v + (b.note ? ': ' + String(b.note).slice(0, 600) : '');
      patch.noteCount = (p.noteCount || 0) + 1; patch.lastNote = text.slice(0, 140);
      await rest('posts?id=eq.' + encodeURIComponent(b.post), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ data: patch, updated_at: now }) });
      await rest('notes', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ id: 'n' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), post_id: b.post, data: { by: AGENT, at: now, text } }) });
      return res.status(200).json({ ok: true, v, files: files.length });
    }

    // نسخة تصميم إعلان: إعلان جديد (key = new:...) أو نسخة جديدة لإعلان موجود على المنصة
    if (b.action === 'ad-version') {
      if (Array.isArray(b.openaiFileIdRefs) && b.openaiFileIdRefs.length) b.files = await fromRefs(URL_, SRV, AGENT, 'ads', b.openaiFileIdRefs, null);
      let key = String(b.key || '');
      if (key === 'new') key = 'new:' + crypto.randomBytes(5).toString('hex');
      if (!/^(new|meta|snap):[\w./-]+$/.test(key)) return res.status(400).json({ error: 'key' });
      const files = (b.files || []).filter(f => f && /^https:\/\//.test(f.url)).slice(0, 20)
        .map(f => ({ path: f.path, url: f.url, name: f.name, type: f.type, size: f.size, at: now, by: AGENT }));
      if (!files.length) return res.status(400).json({ error: 'files' });
      const prev = await rest('ad_versions?select=data&ad_key=eq.' + encodeURIComponent(key));
      const v = prev.reduce((m, r) => Math.max(m, (r.data || {}).v || 0), 0) + 1;
      const data = { v, files, text: String(b.text || '').slice(0, 2000), note: String(b.note || '').slice(0, 600), by: AGENT, at: now, status: 'review', adTitle: String(b.title || '') };
      if (key.startsWith('new:')) Object.assign(data, { title: String(b.title || 'إعلان جديد'), platform: b.platform === 'snap' ? 'snap' : 'meta', campaign: String(b.campaign || ''), hood: String(b.campaign || '') });
      const id = 'v' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
      await rest('ad_versions', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ id, ad_key: key, data }) });
      return res.status(200).json({ ok: true, id, key, v });
    }

    return res.status(400).json({ error: 'action' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e).slice(0, 300) });
  }
};
