// يرجّع بيانات الحملات لأعضاء الفريق المسجلين فقط (يتأكد من الدخول عن طريق Supabase)
const data = require('../data/campaigns.json');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'private, no-store');
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const auth = req.headers.authorization || '';
  if (!url || !key) return res.status(500).json({ error: 'config' });
  if (!/^Bearer \S+/.test(auth)) return res.status(401).json({ error: 'login' });
  try {
    const r = await fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/my_role', {
      method: 'POST',
      headers: { apikey: key, Authorization: auth, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const role = r.ok ? await r.json() : null;
    if (!role) return res.status(403).json({ error: 'not a member' });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(502).json({ error: 'auth check failed' });
  }
};
