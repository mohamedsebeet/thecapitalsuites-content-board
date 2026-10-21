// يرجّع بيانات الحملات لأعضاء الفريق المسجلين فقط (يتأكد من الدخول عن طريق Supabase)
const data = require('../data/campaigns.json');
let ORIG = {}; try { ORIG = require('../data/ad-originals.json'); } catch (e) { }

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const auth = req.headers.authorization || '';
  if (!url || !key) return res.status(500).json({ error: 'config' });
  if (!/^Bearer \S+/.test(auth)) return res.status(401).json({ error: 'login' });
  try {
    const base = url.replace(/\/$/, '') + '/rest/v1/rpc/';
    const call = (fn, body) => fetch(base + fn, {
      method: 'POST',
      headers: { apikey: key, Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
    // ?view=designs: تصاميم الإعلانات بس (من غير صرف ولا نتايج) للمصمم ومين يعتمد
    if (/[?&]view=designs\b/.test(req.url || '')) {
      let ok2 = false;
      for (const p of ['view.campaigns', 'designs.upload', 'posts.approve']) {
        const x = await call('has_perm', { p });
        if (x.ok && await x.json()) { ok2 = true; break; }
      }
      if (!ok2) return res.status(403).json({ error: 'no access' });
      const ads = [];
      (data.campaigns || []).forEach(c => (c.ads || []).forEach(a => ads.push({
        key: c.platform + ':' + (a.id || (c.id + '/' + a.name)), platform: c.platform, name: a.name, title: a.title, hood: a.hood,
        format: a.format, img: a.img || [], orig: (a.img || []).map(u => ORIG[u] || null), on: a.status === 'ACTIVE' && c.status === 'ACTIVE'
      })));
      return res.status(200).json({ updatedAt: data.updatedAt, ads });
    }
    // صلاحية «الحملات والصرف»، ولو ملف الصلاحيات لسه ما اتشغّلش نكتفي بإنه عضو
    let r = await call('has_perm', { p: 'view.campaigns' });
    let ok = r.ok ? await r.json() : null;
    if (!r.ok && r.status === 404) { r = await call('my_role'); ok = r.ok ? !!(await r.json()) : false; }
    if (!ok) return res.status(403).json({ error: 'no access' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'auth check failed' });
  }
};
