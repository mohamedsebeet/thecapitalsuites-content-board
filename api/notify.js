// يستقبل حدث من قاعدة البيانات ويبعته إشعار لأجهزة الفريق (Web Push)
// المفاتيح والاشتراكات جاية من Supabase نفسها، فالدالة دي مش بتحتاج أي إعدادات على Vercel
const webpush = require('web-push');
const fmt = require('../lib/activity-text.js');
const OK_HOST = /(^|\.)(fcm\.googleapis\.com|push\.services\.mozilla\.com|push\.apple\.com|notify\.windows\.com|windows\.com)$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  const v = b && b.vapid, subs = (b && Array.isArray(b.subs)) ? b.subs : [];
  if (!v || !v.pub || !v.priv || !b.act) return res.status(400).json({ error: 'bad request' });
  try { webpush.setVapidDetails(v.subject || 'https://thecapitalsuites-content-board.vercel.app', v.pub, v.priv); }
  catch (e) { return res.status(400).json({ error: 'vapid' }); }
  const t = fmt(b.act);
  const payload = JSON.stringify({ title: t.title, body: t.body, url: t.url, tag: b.act.kind + ':' + (b.act.ref || ''), id: b.act.id });
  const list = subs.filter(s => { try { return s && s.endpoint && OK_HOST.test(new URL(s.endpoint).hostname); } catch (e) { return false; } }).slice(0, 200);
  const out = await Promise.allSettled(list.map(s => webpush.sendNotification(s, payload, { TTL: 86400, urgency: 'normal' })));
  return res.status(200).json({ sent: out.filter(x => x.status === 'fulfilled').length, failed: out.filter(x => x.status === 'rejected').length });
};
