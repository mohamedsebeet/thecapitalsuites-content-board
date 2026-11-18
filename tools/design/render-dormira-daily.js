// إعلانات الإقامة اليومية لدورميرا (نسخة 3): هوية «القوس» المستوحاة من بهو الفندق
// اتجاهين لكل منصة لاختبار A/B، وشعار ذا كابيتال سويتس على كل تصميم
// الاستخدام: node tools/design/render-dormira-daily.js out-dir [fonts-node_modules]
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const LIC = 'ترخيص وزارة السياحة 10008368 · رخصة فال 1200046434';
const WA = '050 307 0157';
const C = { ivory: '#F5F0E6', navy: '#12303A', navy2: '#3D5560', gold: '#B38B4D', goldL: '#E2C394', line: '#E2D8C6', wa: '#1FB959' };
const d64 = (f, m) => 'data:' + m + ';base64,' + fs.readFileSync(f).toString('base64');
const ph = n => d64(path.join(ROOT, 'assets/photos/dormira/enh', n + '.jpg'), 'image/jpeg');
const LOGO = d64(path.join(ROOT, 'public/img/brand-symbol.png'), 'image/png');

// الخطوط: المسيري للعناوين، ريدكس للنص والأرقام. (fontsource من مجلد node_modules)
const NM = process.argv[3] || path.join(__dirname, 'node_modules');
let FONT = '';
[['Messiri', 'el-messiri', [600, 700]], ['Readex', 'readex-pro', [400, 500, 600, 700]]].forEach(([fam, pkg, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
  const f = path.join(NM, '@fontsource', pkg, 'files', pkg + '-' + sub + '-' + w + '-normal.woff2');
  if (fs.existsSync(f)) FONT += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + d64(f, 'font/woff2') + ') format("woff2")}';
})));

const waIcon = (s, c) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${c || '#fff'}" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>`;
// زخرفة: نجمة ثمانية صغيرة بين خطين
const orn = (c, w) => `<div style="display:flex;align-items:center;gap:14px;width:${w || 260}px"><i style="flex:1;height:1.5px;background:${c}"></i><svg width="18" height="18" viewBox="0 0 24 24"><path fill="${c}" d="M12 1l2.6 6.4L21 4.9l-2.5 6.5L23 12l-6.4 2.6L19.1 21l-6.5-2.5L12 23l-2.6-6.4L3 19.1l2.5-6.5L1 12l6.4-2.6L4.9 3l6.5 2.5z"/></svg><i style="flex:1;height:1.5px;background:${c}"></i></div>`;

const page = (w, h, bg, css, body) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${FONT}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Readex,sans-serif;background:${bg};color:${C.navy};position:relative;-webkit-font-smoothing:antialiased}
.ttl{font-family:Messiri;font-weight:700;line-height:1.18;white-space:pre-line}
.dm{display:flex;flex-direction:column;align-items:center;line-height:1}
.dm b{font-family:Readex;font-weight:500;font-size:25px;letter-spacing:.42em;direction:ltr;margin-left:-.42em}
.dm span{font-family:Messiri;font-weight:600;font-size:19px;margin-top:5px}
.arch{border-radius:999px 999px 26px 26px;overflow:hidden;position:relative}
.arch img{width:100%;height:100%;object-fit:cover;display:block}
.archline{position:absolute;border:2px solid ${C.gold};border-radius:999px 999px 30px 30px}
.wa{display:flex;align-items:center;justify-content:center;gap:16px;background:${C.wa};color:#fff;border-radius:999px;font-weight:600;box-shadow:0 10px 24px rgba(31,185,89,.28)}
.wa .n{direction:ltr;font-weight:700;letter-spacing:.03em}
.ft{display:flex;align-items:center;justify-content:space-between;gap:20px}
.tcs{display:flex;align-items:center;gap:12px;font-size:20px;white-space:nowrap}
.tcs img{width:40px;height:40px;object-fit:contain}
.lic{font-size:17.5px;white-space:nowrap}
${css}</style></head><body>${body}</body></html>`;
const foot = dark => `<div class="ft"><div class="tcs" style="color:${dark ? '#D5DEE1' : C.navy2}"><img src="${LOGO}">بإدارة ذا كابيتال سويتس</div><div class="lic" style="color:${dark ? '#9FB3BA' : C.navy2}">${LIC}</div></div>`;
const waBtn = (h, fs) => `<div class="wa" style="height:${h}px;font-size:${fs}px">${waIcon(fs + 10)}احجز واتساب <span class="n">${WA}</span></div>`;

// A · ميتا: صورة الغرفة في قوس، وختم السعر على طرف القوس
const D1A = () => page(1080, 1350, C.ivory, `
.dm{position:absolute;top:52px;right:0;left:0}.dm span{color:${C.gold}}
.arch{position:absolute;top:150px;right:150px;width:780px;height:700px}
.archline{top:132px;right:132px;width:816px;height:736px}
.seal{position:absolute;top:640px;left:92px;width:250px;height:250px;border-radius:50%;background:${C.navy};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;border:6px solid ${C.ivory};box-shadow:0 0 0 2px ${C.gold}}
.seal small{font-size:26px;color:${C.goldL}}.seal b{font-family:Messiri;font-weight:700;font-size:104px;line-height:1}.seal span{font-size:24px}
.tx{position:absolute;top:892px;right:80px;left:80px;text-align:center}
.tx h1{font-size:94px}
.tx p{margin-top:12px;font-size:29px;color:${C.gold};font-weight:500}
.btn{position:absolute;bottom:118px;right:80px;left:80px}
.f{position:absolute;bottom:40px;right:80px;left:80px}`,
`<div class="dm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div>
<div class="archline"></div><div class="arch"><img src="${ph('2ded3fad')}" style="object-position:58% 50%"></div>
<div class="seal"><small>من</small><b>350</b><span>ريال لليلة</span></div>
<div class="tx"><h1 class="ttl">ليلتك في العقيق</h1><p>4 دقايق من البوليفارد · مواقف مجانية · استقبال 24 ساعة</p></div>
<div class="btn">${waBtn(100, 34)}</div><div class="f">${foot(false)}</div>`);

// B · ميتا: كحلي، بهو الفندق في قوس طويل، والرقم «4» بطل التصميم
const D1B = () => page(1080, 1350, C.navy, `
.arch{position:absolute;top:70px;left:70px;width:440px;height:900px}
.archline{top:52px;left:52px;width:476px;height:936px}
.r{position:absolute;top:90px;right:70px;width:470px;color:#fff}
.dm{align-items:flex-start}.dm b{margin-left:0}.dm span{color:${C.goldL}}
.big{display:flex;align-items:baseline;gap:14px;margin-top:150px}
.big b{font-family:Messiri;font-weight:700;font-size:300px;line-height:.8;color:${C.goldL}}
.big span{font-family:Messiri;font-weight:700;font-size:58px}
.r h1{font-size:62px;margin-top:26px}
.pr{display:inline-flex;align-items:baseline;gap:10px;margin-top:30px;border:2px solid ${C.gold};border-radius:16px;padding:12px 22px;font-size:28px}
.pr b{font-family:Messiri;font-size:54px;color:${C.goldL}}
.ft2{margin-top:28px;font-size:25px;color:#C6D3D7;line-height:1.7}
.btn{position:absolute;bottom:118px;right:70px;left:70px}
.f{position:absolute;bottom:40px;right:70px;left:70px}`,
`<div class="archline"></div><div class="arch"><img src="${ph('bc9f41ae')}" style="object-position:50% 40%"></div>
<div class="r"><div class="dm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div>
<div class="big"><b>4</b><span>دقايق</span></div><h1 class="ttl">من بوليفارد الرياض</h1>
<div class="pr">ليلتك من <b>350</b> ريال</div><p class="ft2">مواقف مجانية · واي فاي مجاني<br>استقبال على مدار الساعة</p></div>
<div class="btn">${waBtn(100, 34)}</div><div class="f">${foot(true)}</div>`);

// A · سناب: البهو كامل وسؤال يوقف السحب
const D2A = () => page(1080, 1920, C.navy, `
.bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;object-position:50% 38%}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(9,24,30,.92) 0%,rgba(9,24,30,.6) 22%,rgba(9,24,30,0) 40%,rgba(9,24,30,.15) 52%,rgba(9,24,30,.95) 72%)}
.top{position:absolute;top:165px;right:80px;left:80px;color:#fff;text-align:center;display:flex;flex-direction:column;align-items:center}
.top .dm span{color:${C.goldL}}
.q{font-size:124px;margin-top:40px;color:#fff}.q em{font-style:normal;color:${C.goldL}}
.bot{position:absolute;bottom:282px;right:80px;left:80px;color:#fff;display:flex;flex-direction:column;align-items:center;text-align:center}
.a{font-size:76px;margin-top:22px}
.pr{margin-top:22px;font-size:32px;color:#D7E1E4}.pr b{font-family:Messiri;font-size:60px;color:${C.goldL}}
.wa{margin-top:34px;width:100%}
.f{margin-top:28px;width:100%}`,
`<div class="bg"><img src="${ph('bc9f41ae')}"></div><div class="sh"></div>
<div class="top"><div class="dm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div><h1 class="ttl q">طالع البوليفارد\n<em>الليلة؟</em></h1></div>
<div class="bot">${orn(C.goldL, 300)}<p class="ttl a">نومتك على بعد 4 دقايق</p><p class="pr">ليلتك من <b>350</b> ريال</p>${waBtn(112, 38)}<div class="f">${foot(true)}</div></div>`);

// B · سناب: السعر بطل التصميم، والغرفة في قوس
const D2B = () => page(1080, 1920, C.ivory, `
.dm{position:absolute;top:165px;right:0;left:0}.dm span{color:${C.gold}}
.price{position:absolute;top:280px;right:0;left:0;display:flex;justify-content:center;align-items:baseline;gap:18px}
.price b{font-family:Messiri;font-weight:700;font-size:240px;line-height:1;color:${C.navy}}
.price span{font-family:Messiri;font-weight:700;font-size:52px;color:${C.gold}}
.arch{position:absolute;top:580px;right:150px;width:780px;height:620px}
.archline{top:562px;right:132px;width:816px;height:656px}
.tx{position:absolute;top:1236px;right:80px;left:80px;text-align:center;display:flex;flex-direction:column;align-items:center}
.tx h1{font-size:84px}
.tx p{margin-top:8px;font-size:30px;color:${C.navy2}}
.btn{position:absolute;bottom:352px;right:80px;left:80px}
.f{position:absolute;bottom:262px;right:80px;left:80px}`,
`<div class="dm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div>
<div class="price"><b>350</b><span>ريال لليلة</span></div>
<div class="archline"></div><div class="arch"><img src="${ph('e8d04bb8')}" style="object-position:62% 50%"></div>
<div class="tx"><h1 class="ttl">غرفتك في العقيق</h1><p>4 دقايق من البوليفارد · مواقف مجانية</p></div>
<div class="btn">${waBtn(108, 36)}</div><div class="f">${foot(false)}</div>`);

(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  for (const [n, f, w, h] of [['DOR-D1A-feed', D1A, 1080, 1350], ['DOR-D1B-feed', D1B, 1080, 1350], ['DOR-D2A-story', D2A, 1080, 1920], ['DOR-D2B-story', D2B, 1080, 1920]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(f(), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, n + '.png') }); await p.close(); console.log(n);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
