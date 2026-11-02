// يطلّع تصاميم ذا كابيتال سويتس من ملف وصف (JSON) بقوالب الهوية الثابتة
// الاستخدام: node tools/design/render.js spec.json out-dir
// spec: { post, license?, items: [ { opt:'A', template:'feed'|'story'|'carousel'|'quote', ... } ] }
// الصور من assets/photos (صور حقيقية للوحدات، بتتعرض زي ما هي من غير تعديل)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '../..');
const FONTS = path.join(__dirname, 'fonts');
const FAL = 'رخصة فال 1200046434';
const C = { cream: '#F4F1E8', ink: '#1F2326', ink2: '#5B6166', gold: '#B08A3A', goldL: '#D4AE67', line: '#E2DCCB' };

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function dataUrl(file, mime) { return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64'); }
function photo(rel) {
  if (!rel) return '';
  const f = path.isAbsolute(rel) ? rel : path.join(ROOT, 'assets/photos', rel);
  if (!fs.existsSync(f)) throw new Error('الصورة مش موجودة: ' + rel);
  return dataUrl(f, 'image/jpeg');
}
function fontCss() {
  const ff = [['Alexandria', 'alexandria', [600, 700, 800]], ['Plex', 'ibm-plex-sans-arabic', [400, 500, 600]]];
  let css = '';
  ff.forEach(([fam, dir, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
    const f = path.join(FONTS, dir + '-' + sub + '-' + w + '-normal.woff2');
    if (fs.existsSync(f)) css += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + dataUrl(f, 'font/woff2') + ') format("woff2")}';
  })));
  return css;
}
const LOGO = dataUrl(path.join(__dirname, 'logo.png'), 'image/png');

const BASE = (w, h, extra) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${fontCss()}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Plex,Tahoma,sans-serif;color:${C.ink};background:${C.cream};-webkit-font-smoothing:antialiased}
h1,h2,.d{font-family:Alexandria,Plex,Tahoma,sans-serif;font-weight:800;letter-spacing:-.01em;line-height:1.12}
.logo{display:flex;flex-direction:column;align-items:center;gap:6px}
.logo img{width:64px;height:68px}
.logo b{font-family:Alexandria;font-weight:600;font-size:17px;line-height:1}
.logo small{font-family:Plex;font-size:14px;color:${C.ink2};direction:ltr}
.kick{font-family:Alexandria;font-weight:700;font-size:26px;color:${C.gold}}
.lic{font-size:17px;color:${C.ink2};direction:rtl}
${extra || ''}</style></head><body>`;
const END = '</body></html>';
const logo = (dark) => `<div class="logo"${dark ? ' style="color:#fff"' : ''}><img src="${LOGO}" alt=""><b>ذا كابيتال سويتس</b><small${dark ? ' style="color:#C9CFD4"' : ''}>The Capital Suites</small></div>`;
const lic = (spec, it) => esc([it.license || spec.license || '', FAL].filter(Boolean).join(' · '));

// تصميم فيد 4:5: صورة كبيرة + عنوان + سطر
function feed(spec, it) {
  return BASE(1080, 1350, `
  .wrap{position:absolute;inset:0;padding:64px 72px 56px;display:flex;flex-direction:column;gap:30px}
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .ph{flex:1;border-radius:22px;overflow:hidden;background:#ddd}
  .ph img{width:100%;height:100%;object-fit:cover;object-position:${it.focus || 'center'}}
  h1{font-size:${it.size || 76}px}
  .sub{font-size:30px;line-height:1.55;color:${C.ink2};margin-top:14px}
  .foot{display:flex;justify-content:space-between;align-items:center;border-top:2px solid ${C.line};padding-top:18px}
  .tag{font-family:Alexandria;font-weight:700;font-size:22px}`) + `
  <div class="wrap"><div class="top">${logo()}<span class="kick">${esc(it.kicker || '')}</span></div>
  <div class="ph"><img src="${photo(it.photo)}"></div>
  <div><h1>${esc(it.title)}</h1>${it.sub ? `<p class="sub">${esc(it.sub)}</p>` : ''}</div>
  <div class="foot"><span class="tag">${esc(it.tag || 'ذا كابيتال سويتس')}</span><span class="lic">${lic(spec, it)}</span></div></div>` + END;
}

// ستوري 9:16: الصورة كاملة + تدرّج غامق + عنوان + زرار
function story(spec, it) {
  return BASE(1080, 1920, `
  .bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;object-position:${it.focus || 'center'}}
  .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,22,24,.55) 0%,rgba(20,22,24,0) 22%,rgba(20,22,24,0) 42%,rgba(20,22,24,.92) 78%)}
  .top{position:absolute;top:96px;right:72px;left:72px;display:flex;justify-content:space-between;align-items:flex-start}
  .txt{position:absolute;bottom:250px;right:72px;left:72px;color:#fff}
  h1{font-size:${it.size || 96}px;color:#fff}
  .sub{font-size:36px;line-height:1.5;color:#E8E4DA;margin-top:22px}
  .cta{display:inline-block;margin-top:40px;background:${C.goldL};color:${C.ink};font-family:Alexandria;font-weight:700;font-size:34px;padding:20px 44px;border-radius:999px}
  .lic{position:absolute;bottom:150px;right:72px;left:72px;color:#C9CFD4;font-size:22px}`) + `
  <div class="bg"><img src="${photo(it.photo)}"></div><div class="sh"></div>
  <div class="top">${logo(true)}<span class="kick" style="color:${C.goldL}">${esc(it.kicker || '')}</span></div>
  <div class="txt"><h1>${esc(it.title)}</h1>${it.sub ? `<p class="sub">${esc(it.sub)}</p>` : ''}${it.cta ? `<span class="cta">${esc(it.cta)}</span>` : ''}</div>
  <div class="lic">${lic(spec, it)}</div>` + END;
}

// شريحة كاروسيل 4:5 (غلاف / صورة / نص / ختام) مع شريط التقدم
function slide(spec, it, s, i, n) {
  const dark = s.kind === 'cover' || s.kind === 'end';
  const bar = `<div class="bar">${Array.from({ length: n }, (_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>`;
  const head = `<div class="top">${logo(dark)}<span class="kick"${dark ? ` style="color:${C.goldL}"` : ''} dir="${s.kicker ? 'rtl' : 'ltr'}">${esc(s.kicker || (i + 1) + ' / ' + n)}</span></div>`;
  let body = '';
  if (s.kind === 'cover') body = `<div class="bg"><img src="${photo(s.photo)}" style="object-position:${s.focus || 'center'}"></div><div class="sh"></div>${head}
    <div class="ctxt"><h1 style="font-size:${s.size || 92}px;color:#fff">${esc(s.title)}</h1>${s.sub ? `<p class="sub" style="color:#E8E4DA">${esc(s.sub)}</p>` : ''}<p class="sw">اسحب للتفاصيل</p></div>`;
  else if (s.kind === 'photo') body = `<div class="wrap">${head}<div class="ph"><img src="${photo(s.photo)}" style="object-position:${s.focus || 'center'}"></div>
    <div>${s.label ? `<p class="lab">${esc(s.label)}</p>` : ''}<h2 style="font-size:${s.size || 64}px">${esc(s.title)}</h2>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}</div>${bar}</div>`;
  else if (s.kind === 'text') body = `<div class="wrap">${head}<div class="tx">${s.big ? `<p class="big">${esc(s.big)}</p>` : ''}<h2 style="font-size:${s.size || 72}px">${esc(s.title)}</h2>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}
    ${(s.list || []).length ? `<ul>${s.list.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>${bar}</div>`;
  else body = `<div class="end">${logo(true)}<h2 style="font-size:${s.size || 70}px;color:#fff;margin-top:60px">${esc(s.title)}</h2>${s.sub ? `<p class="sub" style="color:#C9CFD4">${esc(s.sub)}</p>` : ''}
    ${s.cta ? `<span class="cta">${esc(s.cta)}</span>` : ''}<p class="lic" style="color:#9AA1A6;margin-top:auto">${lic(spec, it)}</p></div>`;
  return BASE(1080, 1350, `
  body{background:${dark ? C.ink : C.cream}}
  .bg{position:absolute;inset:0}.bg img,.ph img{width:100%;height:100%;object-fit:cover}
  .sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(20,22,24,.5) 0%,rgba(20,22,24,0) 25%,rgba(20,22,24,0) 40%,rgba(20,22,24,.9) 80%)}
  .top{position:absolute;top:64px;right:72px;left:72px;display:flex;justify-content:space-between;align-items:flex-start;z-index:2}
  .ctxt{position:absolute;bottom:90px;right:72px;left:72px}
  .sw{font-family:Alexandria;font-weight:600;font-size:26px;color:${C.goldL};margin-top:34px}
  .wrap{position:absolute;inset:0;padding:200px 72px 64px;display:flex;flex-direction:column;gap:30px}
  .wrap .top{top:64px}
  .ph{flex:1;border-radius:22px;overflow:hidden}
  .lab{font-family:Alexandria;font-weight:700;font-size:26px;color:${C.gold};margin-bottom:10px}
  .sub{font-size:30px;line-height:1.55;color:${C.ink2};margin-top:16px}
  .tx{flex:1;display:flex;flex-direction:column;justify-content:center}
  .big{font-family:Alexandria;font-weight:800;font-size:200px;line-height:1;color:${C.gold}}
  ul{list-style:none;margin-top:30px;display:grid;gap:18px}
  li{font-size:32px;padding-right:46px;position:relative;border-bottom:2px solid ${C.line};padding-bottom:16px}
  li:before{content:"";position:absolute;right:0;top:12px;width:22px;height:22px;border:3px solid ${C.gold};border-radius:50%}
  .bar{display:flex;gap:10px}.bar i{flex:1;height:6px;border-radius:3px;background:${C.line}}.bar i.on{background:${C.gold}}
  .end{position:absolute;inset:0;padding:120px 72px 64px;display:flex;flex-direction:column;align-items:center;text-align:center}
  .end .logo img{width:120px;height:127px}.end .logo b{font-size:30px}.end .logo small{font-size:22px}
  .cta{display:inline-block;margin-top:50px;background:${C.goldL};color:${C.ink};font-family:Alexandria;font-weight:700;font-size:34px;padding:20px 44px;border-radius:999px}`) + body + END;
}

// اقتباس للمؤسس أو فكرة قصيرة
function quote(spec, it) {
  return BASE(1080, 1350, `
  body{background:${C.ink};color:#fff}
  .wrap{position:absolute;inset:0;padding:64px 72px;display:flex;flex-direction:column}
  .top{display:flex;justify-content:space-between;align-items:flex-start}
  .q{flex:1;display:flex;flex-direction:column;justify-content:center}
  .mark{font-family:Alexandria;font-size:220px;line-height:.6;color:${C.goldL};height:120px}
  h1{font-size:${it.size || 68}px;line-height:1.3;color:#fff}
  .who{margin-top:44px;font-family:Alexandria;font-weight:700;font-size:30px;color:${C.goldL}}
  .role{font-size:24px;color:#C9CFD4;margin-top:6px}
  .foot{border-top:2px solid #3A4045;padding-top:18px;display:flex;justify-content:space-between;color:#9AA1A6;font-size:18px}`) + `
  <div class="wrap"><div class="top">${logo(true)}<span class="kick" style="color:${C.goldL}">${esc(it.kicker || '')}</span></div>
  <div class="q"><div class="mark">”</div><h1>${esc(it.title)}</h1>${it.who ? `<p class="who">${esc(it.who)}</p>` : ''}${it.role ? `<p class="role">${esc(it.role)}</p>` : ''}</div>
  <div class="foot"><span>${esc(it.tag || 'ذا كابيتال سويتس')}</span><span>${esc(it.license || '')}</span></div></div>` + END;
}

async function main() {
  const [specFile, outDir] = process.argv.slice(2);
  if (!specFile || !outDir) { console.error('node tools/design/render.js spec.json out-dir'); process.exit(1); }
  const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch(), out = [];
  const shot = async (html, w, h, name) => {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.setContent(html, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    const f = path.join(outDir, name); await p.screenshot({ path: f, type: 'png' }); await p.close(); out.push(f);
  };
  for (const it of spec.items) {
    const tag = (spec.post || 'design') + (it.opt ? '-' + it.opt : '');
    if (it.template === 'feed') await shot(feed(spec, it), 1080, 1350, tag + '-feed.png');
    else if (it.template === 'story') await shot(story(spec, it), 1080, 1920, tag + '-story.png');
    else if (it.template === 'quote') await shot(quote(spec, it), 1080, 1350, tag + '-quote.png');
    else if (it.template === 'carousel') for (let i = 0; i < it.slides.length; i++) await shot(slide(spec, it, it.slides[i], i, it.slides.length), 1080, 1350, tag + '-' + String(i + 1).padStart(2, '0') + '.png');
    else throw new Error('قالب مش معروف: ' + it.template);
  }
  await browser.close();
  console.log(out.join('\n'));
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
