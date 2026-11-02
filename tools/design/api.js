// يكلم رابط Claude في غرفة التشغيل (api/claude) بالمفتاح السري من متغير البيئة CLAUDE_DESIGN_KEY
// node tools/design/api.js queue [days]
// node tools/design/api.js upload <post-id> "<ملاحظة للمراجعة>" A:file1.png A:file2.png B:file3.png ...
//   (الحرف قبل : هو رقم الاختيار؛ الملفات اللي ليها نفس الحرف بتكوّن تصميم واحد زي شرايح الكاروسيل)
const fs = require('fs'), path = require('path');
const BASE = (process.env.BOARD_URL || 'https://thecapitalsuites-content-board.vercel.app').replace(/\/$/, '') + '/api/claude';
const KEY = process.env.CLAUDE_DESIGN_KEY;
if (!KEY) { console.error('ناقص CLAUDE_DESIGN_KEY في متغيرات البيئة'); process.exit(2); }
const H = { 'x-claude-key': KEY, 'Content-Type': 'application/json' };
async function j(r) { const t = await r.text(); let d; try { d = JSON.parse(t); } catch (e) { d = { raw: t.slice(0, 300) }; } if (!r.ok) throw new Error(r.status + ' ' + JSON.stringify(d)); return d; }

(async () => {
  const [cmd, ...a] = process.argv.slice(2);
  if (cmd === 'queue') { console.log(JSON.stringify(await j(await fetch(BASE + '?days=' + (a[0] || 10), { headers: H })), null, 1)); return; }
  if (cmd === 'upload') {
    const [post, note, ...files] = a; const done = [];
    for (const spec of files) {
      const m = spec.match(/^([A-Za-z0-9])?:?(.+)$/), opt = spec.includes(':') ? m[1] : null, f = spec.includes(':') ? m[2] : spec;
      const b64 = fs.readFileSync(f).toString('base64'), type = /\.jpe?g$/i.test(f) ? 'image/jpeg' : 'image/png';
      const r = await j(await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ action: 'upload', post, name: path.basename(f), type, b64 }) }));
      r.opt = opt; done.push(r); console.error('اترفع: ' + path.basename(f));
    }
    console.log(JSON.stringify(await j(await fetch(BASE, { method: 'POST', headers: H, body: JSON.stringify({ action: 'post-design', post, note, files: done }) }))));
    return;
  }
  console.error('الأوامر: queue [days] | upload <post> "<note>" [A:]file ...'); process.exit(1);
})().catch(e => { console.error(e.message); process.exit(1); });
