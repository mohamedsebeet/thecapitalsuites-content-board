// خادم MCP لشات جي بي تي (إضافة/Connector): نفس صلاحيات رابط api/gpt (قراءة الطلبات والخطة ورفع التصاميم للمراجعة)
// المصادقة: /api/mcp/open (بدون مفتاح، يتقفل بـ GPT_OPEN=0)، أو هيدر X-GPT-Key أو Authorization: Bearer بنفس المفتاح GPT_ACCESS_KEY، أو (لو الإضافة ما بتدعمش هيدر) /api/mcp/<المفتاح>
const crypto = require('crypto');
const agent = require('../lib/agent')('gpt', 'GPT_ACCESS_KEY', 'x-gpt-key');

function call(method, url, key, body) {
  return new Promise(resolve => {
    const res = { code: 200, setHeader() {}, status(c) { this.code = c; return this; }, json(j) { resolve({ code: this.code, data: j }); }, end() { resolve({ code: this.code, data: null }); } };
    agent({ method, url, headers: { 'x-gpt-key': key }, body }, res).catch(e => resolve({ code: 500, data: { error: String(e.message || e) } }));
  });
}

const IMG = { type: 'array', description: 'الصور بالترتيب. كل صورة إما {url} رابط https للصورة، أو {data, mime_type, name} بالـ base64', items: { type: 'object', properties: { url: { type: 'string' }, download_link: { type: 'string' }, data: { type: 'string' }, mime_type: { type: 'string' }, name: { type: 'string' } } } };
const TOOLS = [
  { name: 'get_design_queue', description: 'المنشورات اللي محتاجة تصميم قريب، والتعديلات المطلوبة على تصاميم ChatGPT، وطلبات الاتجاه التاني', inputSchema: { type: 'object', properties: { days: { type: 'integer', default: 10, maximum: 60 } } }, annotations: { readOnlyHint: true } },
  { name: 'get_post', description: 'منشور واحد بالبريف والكابشن والتصاميم والملاحظات والرسومات', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } }, annotations: { readOnlyHint: true } },
  { name: 'get_content_plan', description: 'خطة المحتوى: المنشورات بين تاريخين (YYYY-MM-DD)', inputSchema: { type: 'object', required: ['from'], properties: { from: { type: 'string' }, to: { type: 'string' } } }, annotations: { readOnlyHint: true } },
  { name: 'list_ad_designs', description: 'تصاميم الإعلانات المرفوعة وحالتها', inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true } },
  { name: 'upload_post_design', description: 'رفع تصميم كنسخة جديدة على منشور وتحويله للمراجعة. ما ترفعش غير بعد موافقة محمد', inputSchema: { type: 'object', required: ['post', 'images'], properties: { post: { type: 'string', description: 'رقم المنشور' }, note: { type: 'string', description: 'سطر: إيه اللي عملته' }, opts: { type: 'array', items: { type: 'string' }, description: 'حرف الاختيار لكل صورة بالترتيب (A، B). شرايح الكاروسيل الواحد بنفس الحرف' }, images: IMG } } },
  { name: 'upload_ad_design', description: 'رفع تصميم إعلان للمراجعة في «تصاميم الإعلانات». ما ترفعش غير بعد موافقة محمد', inputSchema: { type: 'object', required: ['title', 'platform', 'images'], properties: { key: { type: 'string', description: 'new لإعلان جديد (الافتراضي) أو مفتاح إعلان موجود' }, title: { type: 'string' }, platform: { type: 'string', enum: ['meta', 'snap'] }, campaign: { type: 'string', description: 'الرمال أو القيروان أو الملز' }, text: { type: 'string' }, note: { type: 'string' }, images: IMG } } },
];

async function files(key, post, images, opts) {
  const out = [];
  for (let i = 0; i < Math.min((images || []).length, 20); i++) {
    const im = images[i] || {}; let f;
    if (im.data) {
      const r = await call('POST', '/api/gpt', key, { action: 'upload', post: String(post).replace(/[^\w:-]/g, '-'), name: im.name || ('image-' + (i + 1) + '.png'), type: im.mime_type || 'image/png', b64: String(im.data).replace(/^data:[^,]+,/, '') });
      if (r.code !== 200) throw new Error('upload ' + JSON.stringify(r.data)); f = r.data;
    } else {
      f = { ref: { download_link: im.url || im.download_link, name: im.name, mime_type: im.mime_type } };
    }
    f.opt = opts && opts[i] ? opts[i] : null; out.push(f);
  }
  return out;
}

async function runTool(name, a, key) {
  a = a || {};
  if (name === 'get_design_queue') return call('GET', '/api/gpt?op=queue&days=' + (+a.days || 10), key);
  if (name === 'get_post') return call('GET', '/api/gpt?op=post&id=' + encodeURIComponent(a.id || ''), key);
  if (name === 'get_content_plan') return call('GET', '/api/gpt?op=plan&from=' + encodeURIComponent(a.from || '') + (a.to ? '&to=' + encodeURIComponent(a.to) : ''), key);
  if (name === 'list_ad_designs') return call('GET', '/api/gpt?op=ads', key);
  if (name === 'upload_post_design' || name === 'upload_ad_design') {
    const fs = await files(key, name === 'upload_post_design' ? a.post : 'ads', a.images, a.opts);
    const up = fs.filter(f => !f.ref), refs = fs.filter(f => f.ref);
    const body = name === 'upload_post_design'
      ? { action: 'post-design', post: a.post, note: a.note || '' }
      : { action: 'ad-version', key: a.key || 'new', title: a.title, platform: a.platform, campaign: a.campaign || '', text: a.text || '', note: a.note || '' };
    if (refs.length && !up.length) { body.openaiFileIdRefs = refs.map(f => f.ref); body.opts = refs.map(f => f.opt); }
    else if (up.length && !refs.length) body.files = up;
    else throw new Error('ابعت كل الصور بنفس الطريقة: روابط أو base64');
    return call('POST', '/api/gpt', key, body);
  }
  return { code: 400, data: { error: 'unknown tool' } };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET') return res.status(405).json({ error: 'POST only (MCP streamable HTTP, JSON)' });
  if (req.method !== 'POST') return res.status(405).end();
  const KEY = process.env.GPT_ACCESS_KEY;
  const U = req.url || '', inUrl = (U.match(/[?&]k=([^&]+)/) || U.match(/^\/api\/mcp\/([^/?]+)/) || [])[1];
  const given = req.headers['x-gpt-key'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || (inUrl ? decodeURIComponent(inUrl) : '');
  // رابط مفتوح من غير مفتاح (/api/mcp/open) عشان ChatGPT يتربط بدون إعداد. يتقفل بمتغير GPT_OPEN=0 في Vercel.
  // صلاحياته نفس الرابط العادي: قراءة الخطة والطلبات، ورفع تصاميم «للمراجعة» بس (الاعتماد والنشر من غرفة التشغيل).
  const open = inUrl === 'open' && process.env.GPT_OPEN !== '0';
  const ok = open || (KEY && given && Buffer.from(given).length === Buffer.from(KEY).length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(KEY)));
  let m = req.body; if (typeof m === 'string') { try { m = JSON.parse(m); } catch (e) { m = null; } }
  if (!m) return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
  const one = async msg => {
    const id = msg.id === undefined ? null : msg.id, reply = r => ({ jsonrpc: '2.0', id, result: r }), err = (c, t) => ({ jsonrpc: '2.0', id, error: { code: c, message: t } });
    if (msg.id === undefined) return null; // إشعارات
    if (msg.method === 'initialize') return reply({ protocolVersion: (msg.params && msg.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'capital-ops-room', version: '1.0.0' }, instructions: 'غرفة التشغيل لذا كابيتال سويتس: اقرا طلبات التصميم وخطة المحتوى، وارفع التصاميم للمراجعة بعد موافقة محمد فقط.' });
    if (msg.method === 'ping') return reply({});
    if (!ok) return err(-32001, 'unauthorized: X-GPT-Key or Bearer token required');
    if (msg.method === 'tools/list') return reply({ tools: TOOLS });
    if (msg.method === 'tools/call') {
      try {
        const r = await runTool(msg.params && msg.params.name, msg.params && msg.params.arguments, KEY);
        return reply({ content: [{ type: 'text', text: JSON.stringify(r.data) }], isError: r.code >= 400 });
      } catch (e) { return reply({ content: [{ type: 'text', text: 'error: ' + String(e.message || e) }], isError: true }); }
    }
    return err(-32601, 'method not found');
  };
  if (!ok && !(Array.isArray(m) ? m : [m]).every(x => x.method === 'initialize' || x.id === undefined || x.method === 'ping')) res.setHeader('WWW-Authenticate', 'Bearer');
  if (Array.isArray(m)) { const out = (await Promise.all(m.map(one))).filter(Boolean); return out.length ? res.status(200).json(out) : res.status(202).end(); }
  const out = await one(m);
  return out ? res.status(200).json(out) : res.status(202).end();
};
