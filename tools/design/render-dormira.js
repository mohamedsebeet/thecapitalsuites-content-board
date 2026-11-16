// تصاميم إعلانات فندق دورميرا (هوية مختلفة عن ذا كابيتال سويتس)
// الاستخدام: node tools/design/render-dormira.js spec.json out-dir
// الصور من assets/photos/dormira (صور الفندق المنشورة على مواقع الحجز، بتتعرض زي ما هي)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const FONTS = path.join(__dirname, 'fonts');
const LIC = 'ترخيص وزارة السياحة 10008368 · رخصة فال 1200046434';
const C = { ivory: '#F6F2EA', navy: '#14303A', navy2: '#3D5560', brass: '#B8925A', brassL: '#D9B98A', line: '#E4DCCD' };

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dataUrl = (f, m) => 'data:' + m + ';base64,' + fs.readFileSync(f).toString('base64');
function photo(n) {
  const f = path.join(ROOT, 'assets/photos/dormira', n + '.jpg');
  if (!fs.existsSync(f)) throw new Error('الصورة مش موجودة: ' + n);
  return dataUrl(f, 'image/jpeg');
}
function fontCss() {
  let css = '';
  [['Alexandria', 'alexandria', [600, 700, 800]], ['Plex', 'ibm-plex-sans-arabic', [400, 500, 600]]].forEach(([fam, dir, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
    const f = path.join(FONTS, dir + '-' + sub + '-' + w + '-normal.woff2');
    if (fs.existsSync(f)) css += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + dataUrl(f, 'font/woff2') + ') format("woff2")}';
  })));
  return css;
}
const BASE = (w, h, bg, extra) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Plex,Tahoma,sans-serif;color:${C.navy};background:${bg};-webkit-font-smoothing:antialiased;position:relative}
h1,h2{white-space:pre-line;font-family:Alexandria,Plex,sans-serif;font-weight:800;line-height:1.14;letter-spacing:-.01em}
.mark{display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1}
.mark b{font-family:Alexandria;font-weight:700;font-size:26px;letter-spacing:.34em;direction:ltr;margin-left:-.34em}
.mark span{font-family:Alexandria;font-weight:600;font-size:18px;color:${C.brass}}
.mark.lt b{color:#fff}.mark.lt span{color:${C.brassL}}
.kick{font-family:Alexandria;font-weight:700;font-size:24px;color:${C.brass};border:2px solid ${C.brass};border-radius:999px;padding:6px 20px}
.kick.lt{color:${C.brassL};border-color:${C.brassL}}
.cta{white-space:nowrap;flex:none;display:inline-flex;align-items:center;gap:14px;background:${C.brass};color:#fff;font-family:Alexandria;font-weight:700;font-size:30px;padding:16px 36px;border-radius:999px}
.cta i{width:22px;height:22px;border-radius:50%;background:#25D366;border:3px solid #fff}
.lic{font-size:19px;color:${C.navy2}}
.lic.lt{color:#AFC0C7}
.sub{white-space:pre-line;font-size:31px;line-height:1.55;color:${C.navy2}}
${extra || ''}</style></head><body>`;
const END = '</body></html>';
const mark = lt => `<div class="mark${lt ? ' lt' : ''}"><b>DORMIRA</b><span>دورميرا</span></div>`;
const cta = t => t ? `<span class="cta"><i></i>${esc(t)}</span>` : '';
const pinMap = (dark, big) => `<svg width="100%" height="${big ? 300 : 120}" viewBox="0 0 900 120"><path d="M140 70 C 330 10, 560 120, 760 55" fill="none" stroke="${dark ? C.brassL : C.navy}" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>
<circle cx="760" cy="55" r="22" fill="${C.brass}"/><circle cx="760" cy="55" r="8" fill="#fff"/><circle cx="140" cy="70" r="22" fill="${dark ? '#fff' : C.navy}"/><circle cx="140" cy="70" r="8" fill="${dark ? C.navy : '#fff'}"/></svg>
<div style="display:flex;justify-content:space-between;font-family:Alexandria;font-weight:700;font-size:${big ? 40 : 28}px;margin-top:${big ? 20 : 4}px;padding:0 ${big ? 40 : 70}px;color:${dark ? '#fff' : C.navy}"><span>دورميرا</span><span>المركز المالي</span></div>`;

// فيد 4:5
function feed(it) {
  const dark = !!it.dark;
  return BASE(1080, 1350, dark ? C.navy : C.ivory, `
  .wrap{position:absolute;inset:0;padding:60px 70px 46px;display:flex;flex-direction:column;gap:28px}
  .top{display:flex;justify-content:space-between;align-items:center}
  .ph{flex:1;min-height:0;border-radius:26px;overflow:hidden}
  .ph img{width:100%;height:100%;object-fit:cover;object-position:${it.focus || 'center'}}
  h1{font-size:${it.size || 74}px;color:${dark ? '#fff' : C.navy}}
  .row{display:flex;justify-content:space-between;align-items:flex-end;gap:24px}
  .foot{border-top:2px solid ${dark ? '#2C4752' : C.line};padding-top:16px}`) + `
  <div class="wrap"><div class="top">${mark(dark)}${it.kicker ? `<span class="kick${dark ? ' lt' : ''}">${esc(it.kicker)}</span>` : ''}</div>
  ${it.dark && it.titleTop ? `<h1>${esc(it.title)}</h1>` : ''}
  <div class="ph"><img src="${photo(it.photo)}"></div>
  ${it.map ? `<div>${pinMap(dark)}</div>` : ''}
  <div class="row"><div>${it.dark && it.titleTop ? '' : `<h1>${esc(it.title)}</h1>`}${it.sub ? `<p class="sub" style="margin-top:12px${dark ? ';color:#C9D5DA' : ''}">${esc(it.sub)}</p>` : ''}</div>${cta(it.cta)}</div>
  <div class="foot"><span class="lic${dark ? ' lt' : ''}">${LIC}</span></div></div>` + END;
}

// ستوري 9:16: الصورة كاملة لو طولية، أو في إطار فوق لو عرضية
function story(it) {
  const framed = !!it.frame;
  const list = (it.list || []).length ? `<ul>${it.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  return BASE(1080, 1920, C.navy, `
  .bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;object-position:${it.focus || 'center'}}
  .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,26,32,.85) 0%,rgba(10,26,32,.35) 16%,rgba(10,26,32,0) 28%,rgba(10,26,32,0) 40%,rgba(10,26,32,.94) 72%)}
  .top{position:absolute;top:170px;right:80px;left:80px;display:flex;justify-content:space-between;align-items:center}
  .fr{position:absolute;top:300px;right:80px;left:80px;height:${it.frameH || 700}px;border-radius:30px;overflow:hidden;border:3px solid ${C.brass}}
  .fr img{width:100%;height:100%;object-fit:cover;object-position:${it.focus || 'center'}}
  .txt{position:absolute;bottom:320px;right:80px;left:80px;color:#fff}
  h1{font-size:${it.size || 100}px;color:#fff}
  .s2{font-size:38px;line-height:1.5;color:${C.brassL};margin-top:22px;font-family:Alexandria;font-weight:600}
  ul{list-style:none;margin-top:28px;display:grid;gap:14px}
  li{font-size:38px;color:#fff;padding-right:46px;position:relative}
  li:before{content:"";position:absolute;right:0;top:16px;width:22px;height:22px;border-radius:50%;border:4px solid ${C.brassL}}
  .end{font-family:Alexandria;font-weight:700;font-size:44px;color:${C.brassL};margin-top:26px}
  .txt .cta{margin-top:40px;font-size:36px;padding:20px 44px}
  .lic{position:absolute;bottom:262px;right:80px;left:80px;font-size:22px}`) +
  (framed ? `<div class="fr"><img src="${photo(it.photo)}"></div>` : `<div class="bg"><img src="${photo(it.photo)}"></div><div class="sh"></div>`) + `
  <div class="top">${mark(true)}${it.kicker ? `<span class="kick lt">${esc(it.kicker)}</span>` : ''}</div>
  <div class="txt"><h1>${esc(it.title)}</h1>${it.sub ? `<p class="s2">${esc(it.sub)}</p>` : ''}${list}${it.end ? `<p class="end">${esc(it.end)}</p>` : ''}${cta(it.cta)}</div>
  <div class="lic lt">${LIC}</div>` + END;
}

// شريحة كاروسيل 4:5
function slide(it, s, i, n) {
  const dark = s.kind === 'cover' || s.kind === 'end';
  const bar = `<div class="bar">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
  const head = `<div class="top">${mark(dark)}<span class="num${dark ? ' lt' : ''}">${i + 1} / ${n}</span></div>`;
  let body;
  if (s.kind === 'cover') body = `<div class="bg"><img src="${photo(s.photo)}" style="object-position:${s.focus || 'center'}"></div><div class="sh"></div>${head}
    <div class="ctxt"><h1 style="font-size:${s.size || 90}px;color:#fff">${esc(s.title)}</h1>${s.sub ? `<p class="sub" style="color:#D9E2E5;margin-top:14px">${esc(s.sub)}</p>` : ''}<p class="sw">اسحب للتفاصيل</p></div>`;
  else if (s.kind === 'photo') body = `<div class="wrap">${head}<div class="ph"><img src="${photo(s.photo)}" style="object-position:${s.focus || 'center'}"></div>
    <div>${s.label ? `<p class="lab">${esc(s.label)}</p>` : ''}<h2 style="font-size:${s.size || 62}px">${esc(s.title)}</h2></div>${bar}</div>`;
  else if (s.kind === 'map') body = `<div class="wrap">${head}<div class="mp">${pinMap(false, true)}</div>
    <div>${s.label ? `<p class="lab">${esc(s.label)}</p>` : ''}<h2 style="font-size:${s.size || 70}px">${esc(s.title)}</h2>${s.sub ? `<p class="sub" style="margin-top:14px">${esc(s.sub)}</p>` : ''}</div>${bar}</div>`;
  else body = `<div class="end">${mark(true).replace('class="mark lt"', 'class="mark lt big"')}<h2 style="font-size:${s.size || 72}px;color:#fff;margin-top:auto">${esc(s.title)}</h2>${s.sub ? `<p class="sub" style="color:#C9D5DA;margin-top:16px">${esc(s.sub)}</p>` : ''}
    <div style="margin-top:46px">${cta(s.cta)}</div><p class="lic lt" style="margin-top:auto">${LIC}</p></div>`;
  return BASE(1080, 1350, dark ? C.navy : C.ivory, `
  .bg{position:absolute;inset:0}.bg img,.ph img{width:100%;height:100%;object-fit:cover}
  .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,26,32,.85) 0%,rgba(10,26,32,.3) 15%,rgba(10,26,32,0) 28%,rgba(10,26,32,0) 42%,rgba(10,26,32,.92) 82%)}
  .top{position:absolute;top:60px;right:70px;left:70px;display:flex;justify-content:space-between;align-items:center;z-index:2}
  .num{font-family:Alexandria;font-weight:700;font-size:24px;color:${C.brass};direction:ltr}.num.lt{color:${C.brassL}}
  .ctxt{position:absolute;bottom:90px;right:70px;left:70px}
  .sw{font-family:Alexandria;font-weight:600;font-size:26px;color:${C.brassL};margin-top:30px}
  .wrap{position:absolute;inset:0;padding:180px 70px 60px;display:flex;flex-direction:column;gap:30px}
  .ph{flex:1;min-height:0;border-radius:26px;overflow:hidden}
  .mp{flex:1;display:flex;flex-direction:column;justify-content:center;background:#fff;border:2px solid ${C.line};border-radius:26px;padding:40px 30px}
  .lab{font-family:Alexandria;font-weight:700;font-size:26px;color:${C.brass};margin-bottom:10px}
  .bar{display:flex;gap:10px}.bar i{flex:1;height:6px;border-radius:3px;background:${C.line}}.bar i.on{background:${C.brass}}
  .end{position:absolute;inset:0;padding:130px 70px 56px;display:flex;flex-direction:column;align-items:center;text-align:center}
  .mark.big b{font-size:52px}.mark.big span{font-size:32px;margin-top:8px}`) + body + END;
}

(async () => {
  const [specFile, outDir] = process.argv.slice(2);
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const shot = async (html, w, h, name) => {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(outDir, name), type: 'png' }); await p.close(); console.log(name);
  };
  for (const it of spec.items) {
    if (it.template === 'feed') await shot(feed(it), 1080, 1350, it.name + '.png');
    else if (it.template === 'story') await shot(story(it), 1080, 1920, it.name + '.png');
    else if (it.template === 'carousel') for (let i = 0; i < it.slides.length; i++)
      await shot(slide(it, it.slides[i], i, it.slides.length), 1080, 1350, it.name + '-' + String(i + 1).padStart(2, '0') + '.png');
  }
  await browser.close();
})().catch(e => { console.error(e.message); process.exit(1); });
