// معاينات «شكل الإعلان على الموبايل» لحملة دورميرا: فيد إنستغرام/فيسبوك وستوري سناب
// الاستخدام: node tools/design/mockups-dormira.js
// المدخلات: tools/design/outbox/dormira (التصاميم + manifest.json)، والمخرجات: public/files/img/dormira/
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(__dirname, 'outbox/dormira');
const OUT = path.join(ROOT, 'public/files/img/dormira');
const FONTS = path.join(__dirname, 'fonts');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataUrl = (f, m) => 'data:' + m + ';base64,' + fs.readFileSync(f).toString('base64');
let css = '';
[['Plex', 'ibm-plex-sans-arabic', [400, 500, 600]], ['Alexandria', 'alexandria', [700]]].forEach(([fam, dir, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
  const f = path.join(FONTS, dir + '-' + sub + '-' + w + '-normal.woff2');
  if (fs.existsSync(f)) css += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + dataUrl(f, 'font/woff2') + ') format("woff2")}';
})));

const W = 390;
const shell = (inner, h, bg) => `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><style>${css}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W + 28}px;height:${h + 28}px;background:transparent}
body{font-family:Plex,-apple-system,sans-serif}
.ph{position:absolute;inset:0;border-radius:46px;background:#111;padding:14px}
.sc{position:relative;width:${W}px;height:${h}px;border-radius:34px;overflow:hidden;background:${bg}}
.st{height:34px;display:flex;justify-content:space-between;align-items:center;padding:0 26px;font-size:13px;font-weight:600;direction:ltr}
</style></head><body><div class="ph"><div class="sc">${inner}</div></div></body></html>`;

const ICON = {
  heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M12 20s-7-4.4-9.3-8.6C1 8 3 4.5 6.5 4.5c2 0 3.5 1.2 4.5 2.6 1-1.4 2.5-2.6 4.5-2.6C19 4.5 21 8 19.3 11.4 17 15.6 12 20 12 20z"/></svg>',
  com: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M20 12a8 8 0 1 1-3.3-6.5L20 4.5l-1 3.5A8 8 0 0 1 20 12z"/></svg>',
  send: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/></svg>',
  save: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2"><path d="M6 3h12v18l-6-4-6 4z"/></svg>'
};

function igFeed(img, caption, cta, slides) {
  const ih = Math.round(W * 1350 / 1080);
  const dots = slides ? `<div style="display:flex;gap:4px;justify-content:center;margin-top:-2px">${Array.from({ length: slides }, (_, i) => `<i style="width:6px;height:6px;border-radius:50%;background:${i ? '#c8c8c8' : '#0095F6'}"></i>`).join('')}</div>` : '';
  const inner = `<div class="st"><span>9:41</span><span>●●● ▮</span></div>
  <div style="display:flex;align-items:center;gap:10px;padding:8px 12px">
    <div style="width:34px;height:34px;border-radius:50%;background:#14303A;color:#D9B98A;display:grid;place-items:center;font-family:Alexandria;font-weight:700;font-size:15px">D</div>
    <div style="flex:1;line-height:1.25"><b style="font-size:14px">dormira</b><div style="font-size:12px;color:#555">إعلان مموّل</div></div><span style="font-size:20px;color:#333">···</span></div>
  <div style="position:relative;height:${ih}px;background:#eee"><img src="${img}" style="width:100%;height:100%;object-fit:cover">
</div>
  <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;background:#F2F2F2;font-size:14px;font-weight:600"><span>${esc(cta)}</span><span style="font-size:18px">‹</span></div>
  <div style="display:flex;align-items:center;gap:14px;padding:10px 14px 4px">${ICON.heart}${ICON.com}${ICON.send}<span style="flex:1">${dots}</span>${ICON.save}</div>
  <p style="padding:4px 14px;font-size:13.5px;line-height:1.5;color:#111;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden"><b>dormira</b> ${esc(caption)}</p>`;
  return shell(inner, 34 + 50 + ih + 44 + 44 + 70, '#fff');
}

function snap(img, headline) {
  const h = Math.round(W * 1920 / 1080);
  const inner = `<img src="${img}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">
  <div style="position:absolute;top:0;left:0;right:0;height:120px;background:linear-gradient(rgba(0,0,0,.45),transparent)"></div>
  <div style="position:absolute;top:12px;left:12px;right:12px;height:3px;border-radius:2px;background:rgba(255,255,255,.4)"><i style="display:block;width:35%;height:100%;background:#fff;border-radius:2px"></i></div>
  <div style="position:absolute;top:20px;right:14px;left:14px;display:flex;align-items:center;gap:8px;color:#fff">
    <div style="width:28px;height:28px;border-radius:50%;background:#14303A;border:2px solid #fff;color:#D9B98A;display:grid;place-items:center;font-family:Alexandria;font-weight:700;font-size:14px">D</div>
    <div style="line-height:1.25;text-shadow:0 1px 2px rgba(0,0,0,.4)"><b style="font-size:12.5px">دورميرا</b><div style="font-size:11px;opacity:.9">${esc(headline)}</div></div>
    <span style="margin-right:auto;font-size:11px;background:rgba(0,0,0,.35);padding:2px 8px;border-radius:8px">إعلان</span></div>
  <div style="position:absolute;bottom:18px;right:50%;transform:translateX(50%);background:#fff;color:#111;font-weight:600;font-size:14px;border-radius:999px;padding:9px 22px;display:flex;gap:8px;align-items:center;white-space:nowrap">
    <i style="width:12px;height:12px;border-radius:50%;background:#25D366"></i>راسلنا واتساب</div>`;
  return shell(inner, h, '#000');
}

(async () => {
  const m = JSON.parse(fs.readFileSync(path.join(SRC, 'manifest.json'), 'utf8'));
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  for (const ad of m.ads) {
    const code = (ad.text.match(/\(([A-Z]\d)\)/) || [])[1];
    const img = dataUrl(path.join(SRC, ad.files[0]), 'image/png');
    const lines = ad.text.split('\n');
    const caption = lines[0];
    const head = ((lines.find(l => l.startsWith('عنوان سناب:')) || '').split(':')[1] || '').trim();
    const html = ad.platform === 'snap' ? snap(img, head) : igFeed(img, caption, /حجز|احجز/.test(caption) && /ليلة|عمل/.test(caption) ? 'احجز عبر واتساب' : 'إرسال رسالة عبر واتساب', ad.files.length > 1 ? ad.files.length : 0);
    const p = await b.newPage({ deviceScaleFactor: 2, viewport: { width: 400, height: 400 } });
    await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    const box = await p.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]);
    await p.setViewportSize({ width: box[0], height: box[1] });
    const f = path.join(OUT, 'mock-' + code + '.jpg');
    await p.evaluate(() => { document.documentElement.style.background = '#fff'; });
    await p.screenshot({ path: f, type: 'jpeg', quality: 80 }); await p.close();
    // كاروسيل: الشرائح كلها صغيرة جنب بعض
    if (ad.files.length > 1) {
      const p2 = await b.newPage({ viewport: { width: 1100, height: 300 } });
      await p2.setContent(`<body style="margin:0;display:flex;gap:12px;direction:rtl">${ad.files.map(x => `<img src="${dataUrl(path.join(SRC, x), 'image/png')}" style="width:208px;height:260px;object-fit:cover;border-radius:10px">`).join('')}</body>`);
      await p2.screenshot({ path: path.join(OUT, 'strip-' + code + '.jpg'), type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width: 208 * ad.files.length + 12 * (ad.files.length - 1), height: 260 } }); await p2.close();
    }
    console.log(code, ad.platform);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
