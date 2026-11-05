// رابط Claude المخصص: يقرا طلبات التصميم ويرفع تصاميم المنشورات للمراجعة
// محمي بمفتاح سري (CLAUDE_DESIGN_KEY) ويكلم Supabase بمفتاح الخدمة (SUPABASE_SERVICE_ROLE_KEY)،
// والاتنين بيتحطوا في إعدادات Vercel بس، ومش موجودين في الكود.
const crypto = require('crypto');

const DONE = { approved: 1, scheduled: 1, published: 1 };
function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
function body(req) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  return b || {};
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const KEY = process.env.CLAUDE_DESIGN_KEY, SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const URL_ = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  if (!KEY || !SRV || !URL_) return res.status(503).json({ error: 'not configured', need: ['CLAUDE_DESIGN_KEY', 'SUPABASE_SERVICE_ROLE_KEY'].filter(k => !process.env[k]) });
  if (!same(req.headers['x-claude-key'], KEY)) return res.status(401).json({ error: 'key' });

  const H = { apikey: SRV, Authorization: 'Bearer ' + SRV, 'Content-Type': 'application/json' };
  const rest = (path, opt) => fetch(URL_ + '/rest/v1/' + path, Object.assign({ headers: H }, opt || {})).then(async r => {
    const t = await r.text(); if (!r.ok) throw new Error(r.status + ' ' + t.slice(0, 300)); return t ? JSON.parse(t) : null;
  });
  const now = new Date().toISOString();

  try {
    // قائمة الشغل: المنشورات اللي محتاجة تصميم قريب، والتعديلات، والاتجاهات التانية المطلوبة
    if (req.method === 'GET' && /[?&]q=ads\b/.test(req.url || '')) {
      const rows = await rest('ad_versions?select=id,ad_key,at,data&order=at.desc&limit=500');
      return res.status(200).json({ ads: rows.filter(r => (r.data || {}).kind !== 'request').map(r => ({ id: r.id, key: r.ad_key, at: r.at, v: r.data.v, title: r.data.title || r.data.adTitle || '', campaign: r.data.campaign || '', platform: r.data.platform || '', status: r.data.status, by: r.data.by })) });
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
        const mine = ds.some(d => (d.v || 1) === topV && d.by === 'claude');
        let why = '';
        if (p.ask && p.ask.kind === 'alt') why = 'alt';
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

    // رفع ملف واحد (PNG/JPG) لمخزن التصاميم
    if (b.action === 'upload') {
      if (!/^[\w:-]+$/.test(String(b.post || ''))) return res.status(400).json({ error: 'post' });
      const type = /^image\/(png|jpeg|webp)$/.test(b.type) ? b.type : 'image/png';
      const buf = Buffer.from(String(b.b64 || ''), 'base64');
      if (!buf.length || buf.length > 4 * 1024 * 1024) return res.status(400).json({ error: 'size' });
      const ext = type === 'image/jpeg' ? 'jpg' : type.split('/')[1];
      const path = 'claude/' + String(b.post).replace(/:/g, '-') + '/' + Date.now() + '-' + crypto.randomBytes(6).toString('hex') + '.' + ext;
      const up = await fetch(URL_ + '/storage/v1/object/designs/' + path, {
        method: 'POST', headers: { apikey: SRV, Authorization: 'Bearer ' + SRV, 'Content-Type': type, 'Cache-Control': '31536000', 'x-upsert': 'false' }, body: buf
      });
      if (!up.ok) return res.status(502).json({ error: 'storage', detail: (await up.text()).slice(0, 300) });
      return res.status(200).json({ path, url: URL_ + '/storage/v1/object/public/designs/' + path, name: String(b.name || path.split('/').pop()), type, size: buf.length });
    }

    // تسجيل نسخة جديدة على المنشور (ملف أو أكتر) وتحويله للمراجعة
    if (b.action === 'post-design') {
      const rows = await rest('posts?select=id,data&id=eq.' + encodeURIComponent(b.post || ''));
      if (!rows.length) return res.status(404).json({ error: 'post' });
      const p = rows[0].data || {}, ds = p.designs || [];
      const v = ds.length ? Math.max.apply(null, ds.map(d => d.v || 1)) + 1 : 1;
      const files = (b.files || []).filter(f => f && /^https:\/\//.test(f.url)).slice(0, 20)
        .map(f => ({ path: f.path, url: f.url, name: f.name, type: f.type, size: f.size, at: now, by: 'claude', v, opt: f.opt || null }));
      if (!files.length) return res.status(400).json({ error: 'files' });
      const patch = Object.assign({}, p, { designs: ds.concat(files), updatedBy: 'claude', updatedAt: now });
      delete patch.ask;
      if (!DONE[p.status]) patch.status = 'review';
      const text = 'Claude · النسخة ' + v + (b.note ? ': ' + String(b.note).slice(0, 600) : '');
      patch.noteCount = (p.noteCount || 0) + 1; patch.lastNote = text.slice(0, 140);
      await rest('posts?id=eq.' + encodeURIComponent(b.post), { method: 'PATCH', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ data: patch, updated_at: now }) });
      await rest('notes', { method: 'POST', headers: Object.assign({ Prefer: 'return=minimal' }, H), body: JSON.stringify({ id: 'n' + Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), post_id: b.post, data: { by: 'claude', at: now, text } }) });
      return res.status(200).json({ ok: true, v, files: files.length });
    }

    // نسخة تصميم إعلان: إعلان جديد (key = new:...) أو نسخة جديدة لإعلان موجود على المنصة
    if (b.action === 'ad-version') {
      let key = String(b.key || '');
      if (key === 'new') key = 'new:' + crypto.randomBytes(5).toString('hex');
      if (!/^(new|meta|snap):[\w./-]+$/.test(key)) return res.status(400).json({ error: 'key' });
      const files = (b.files || []).filter(f => f && /^https:\/\//.test(f.url)).slice(0, 20)
        .map(f => ({ path: f.path, url: f.url, name: f.name, type: f.type, size: f.size, at: now, by: 'claude' }));
      if (!files.length) return res.status(400).json({ error: 'files' });
      const prev = await rest('ad_versions?select=data&ad_key=eq.' + encodeURIComponent(key));
      const v = prev.reduce((m, r) => Math.max(m, (r.data || {}).v || 0), 0) + 1;
      const data = { v, files, text: String(b.text || '').slice(0, 2000), note: String(b.note || '').slice(0, 600), by: 'claude', at: now, status: 'review', adTitle: String(b.title || '') };
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
