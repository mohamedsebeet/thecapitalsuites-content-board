// إعلانات الإقامة اليومية لدورميرا (نسخة 2): اتجاهين لكل منصة لاختبار A/B
// الاستخدام: node tools/design/render-dormira-daily.js out-dir
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const FONTS = path.join(__dirname, 'fonts');
const LIC = 'ترخيص وزارة السياحة 10008368 · رخصة فال 1200046434';
const WA = '050 307 0157';
const C = { ivory: '#F6F2EA', navy: '#14303A', navy2: '#3D5560', brass: '#B8925A', brassL: '#E2C394', line: '#E4DCCD', wa: '#25D366' };
const d64 = (f, m) => 'data:' + m + ';base64,' + fs.readFileSync(f).toString('base64');
const ph = n => d64(path.join(ROOT, 'assets/photos/dormira', n + '.jpg'), 'image/jpeg');
let FONT = '';
[['Alexandria', 'alexandria', [600, 700, 800]], ['Plex', 'ibm-plex-sans-arabic', [400, 500, 600]]].forEach(([fam, dir, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
  const f = path.join(FONTS, dir + '-' + sub + '-' + w + '-normal.woff2');
  if (fs.existsSync(f)) FONT += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + d64(f, 'font/woff2') + ') format("woff2")}';
})));

// أيقونات خطية بسيطة
const I = {
  pin: c => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.6"/></svg>`,
  car: c => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/></svg>`,
  wifi: c => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"><path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1" fill="${c}"/></svg>`,
  bell: c => `<svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2"><path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 9V7M9 7h6"/></svg>`,
  wa: (c, s) => `<svg width="${s || 40}" height="${s || 40}" viewBox="0 0 24 24"><path fill="${c}" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>`
};
const head = (w, h, bg, css) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${FONT}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Plex,sans-serif;background:${bg};color:${C.navy};position:relative;-webkit-font-smoothing:antialiased}
.disp{font-family:Alexandria;font-weight:800;line-height:1.1;letter-spacing:-.01em;white-space:pre-line}
.mark{display:flex;flex-direction:column;align-items:center;gap:3px;line-height:1}
.mark b{font-family:Alexandria;font-weight:700;font-size:24px;letter-spacing:.34em;direction:ltr;margin-left:-.34em}
.mark span{font-family:Alexandria;font-weight:600;font-size:17px}
.wa{display:flex;align-items:center;justify-content:center;gap:14px;background:${C.wa};color:#fff;border-radius:999px;font-family:Alexandria;font-weight:700}
.wa .n{direction:ltr;font-weight:800;letter-spacing:.02em}
.lic{font-size:19px}
${css}</style></head><body>`;
const END = '</body></html>';

// D1-A · فيد ميتا: صورة الغرفة + كارت السعر + المميزات + زر واتساب بالرقم
const D1A = () => head(1080, 1350, C.navy, `
.ph{position:absolute;inset:0 0 auto 0;height:800px}.ph img{width:100%;height:100%;object-fit:cover}
.ph:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,26,32,.55),rgba(10,26,32,0) 30%,rgba(10,26,32,0) 70%,${C.navy})}
.top{position:absolute;top:50px;right:60px;left:60px;display:flex;justify-content:space-between;align-items:center;color:#fff}
.top .mark span{color:${C.brassL}}
.tag{background:rgba(255,255,255,.14);backdrop-filter:blur(6px);border:1.5px solid rgba(255,255,255,.4);border-radius:999px;padding:8px 22px;font-family:Alexandria;font-weight:700;font-size:24px}
.price{position:absolute;top:400px;left:60px;width:300px;height:300px;border-radius:50%;background:${C.brass};color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 18px 40px rgba(0,0,0,.35);transform:rotate(-8deg)}
.price small{font-family:Alexandria;font-weight:700;font-size:30px}.price b{font-family:Alexandria;font-weight:800;font-size:118px;line-height:1}.price span{font-family:Alexandria;font-weight:700;font-size:28px}
.body{position:absolute;top:760px;right:60px;left:60px;color:#fff}
h1{font-size:96px}
.chips{display:flex;flex-wrap:wrap;gap:14px;margin-top:30px}
.chips div{display:flex;align-items:center;gap:10px;border:1.5px solid #35525C;background:#1B3B45;border-radius:14px;padding:10px 18px;font-size:27px;font-weight:500}
.wa{position:absolute;bottom:88px;right:60px;left:60px;height:108px;font-size:38px}
.lic{position:absolute;bottom:34px;right:60px;color:#9FB3BA}`) + `
<div class="ph"><img src="${ph('4f44cd67')}"></div>
<div class="top"><div class="mark"><b>DORMIRA</b><span>دورميرا</span></div><span class="tag">حي العقيق · الرياض</span></div>
<div class="price"><small>من</small><b>350</b><span>ريال / الليلة</span></div>
<div class="body"><h1 class="disp">ليلتك في العقيق</h1>
<div class="chips"><div>${I.pin(C.brassL)}4 دقايق من البوليفارد</div><div>${I.car(C.brassL)}مواقف مجانية</div><div>${I.wifi(C.brassL)}واي فاي مجاني</div><div>${I.bell(C.brassL)}استقبال 24 ساعة</div></div></div>
<div class="wa">${I.wa('#fff', 46)}احجز واتساب <span class="n">${WA}</span></div>
<div class="lic">${LIC}</div>` + END;

// D1-B · فيد ميتا: فكرة «تذكرة ليلة»
const D1B = () => head(1080, 1350, C.ivory, `
.mark{position:absolute;top:56px;right:70px}.mark span{color:${C.brass}}
.hd{position:absolute;top:52px;left:70px;font-family:Alexandria;font-weight:700;font-size:26px;color:${C.brass}}
.tk{position:absolute;top:150px;right:60px;left:60px;bottom:200px;background:#fff;border-radius:34px;box-shadow:0 24px 60px rgba(20,48,58,.16);overflow:hidden}
.tk .ph{height:520px}.tk .ph img{width:100%;height:100%;object-fit:cover}
.cut{position:relative;height:0;border-top:3px dashed ${C.line};margin:0 40px}
.cut:before,.cut:after{content:"";position:absolute;top:-30px;width:60px;height:60px;border-radius:50%;background:${C.ivory}}.cut:before{right:-72px}.cut:after{left:-72px}
.in{padding:30px 54px 0}
.lbl{font-family:Alexandria;font-weight:700;font-size:24px;color:${C.brass};letter-spacing:.02em}
h1{font-size:84px;margin-top:8px}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:40px;border-top:2px solid ${C.line};padding-top:24px}
.grid small{display:block;font-size:22px;color:${C.navy2}}.grid b{font-family:Alexandria;font-weight:800;font-size:38px}
.grid b em{font-style:normal;font-size:24px;font-weight:700}
.wa{position:absolute;bottom:88px;right:60px;left:60px;height:96px;font-size:36px}
.lic{position:absolute;bottom:32px;right:70px;color:${C.navy2}}`) + `
<div class="mark"><b>DORMIRA</b><span>دورميرا</span></div><div class="hd">تذكرة ليلة · الرياض</div>
<div class="tk"><div class="ph"><img src="${ph('b4cde551')}" style="object-position:center 40%"></div><div class="cut"></div>
<div class="in"><p class="lbl">الوجهة: حي العقيق</p><h1 class="disp">ليلة قريبة\nمن البوليفارد</h1>
<div class="grid"><div><small>البوليفارد</small><b>4 <em>دقايق</em></b></div><div><small>المواقف</small><b>مجانية</b></div><div><small>تبدأ من</small><b>350 <em>ريال</em></b></div></div></div></div>
<div class="wa">${I.wa('#fff', 44)}احجز واتساب <span class="n">${WA}</span></div>
<div class="lic">${LIC}</div>` + END;

// D2-A · ستوري سناب: سؤال يوقف السحب
const D2A = () => head(1080, 1920, C.navy, `
.bg{position:absolute;inset:0}.bg img{width:100%;height:100%;object-fit:cover;object-position:center 35%}
.sh{position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,26,32,.9) 0%,rgba(10,26,32,.55) 24%,rgba(10,26,32,.05) 42%,rgba(10,26,32,.25) 55%,rgba(10,26,32,.96) 74%)}
.top{position:absolute;top:170px;right:80px;left:80px;color:#fff}
.top .mark{align-items:flex-start;margin-bottom:34px}.top .mark span{color:${C.brassL}}
.q{font-size:112px;color:#fff}
.q em{font-style:normal;color:${C.brassL}}
.bot{position:absolute;bottom:290px;right:80px;left:80px;color:#fff}
.a{font-size:70px}
.row{display:flex;align-items:center;gap:18px;margin-top:30px}
.pr{background:#fff;color:${C.navy};border-radius:18px;padding:12px 26px;font-family:Alexandria;font-weight:700;font-size:30px}.pr b{font-size:54px;color:${C.brass}}
.pk{font-size:30px;color:#D3DEE2}
.wa{margin-top:38px;height:112px;font-size:40px}
.lic{position:absolute;bottom:262px;right:80px;color:#AFC0C7;font-size:21px}`) + `
<div class="bg"><img src="${ph('bc9f41ae')}"></div><div class="sh"></div>
<div class="top"><div class="mark"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div><h1 class="disp q">طالع البوليفارد\n<em>الليلة؟</em></h1></div>
<div class="bot"><p class="disp a">نومتك على بعد\n4 دقايق</p>
<div class="row"><span class="pr">من <b>350</b> ريال</span><span class="pk">مواقف مجانية · استقبال 24 ساعة</span></div>
<div class="wa">${I.wa('#fff', 48)}احجز واتساب <span class="n">${WA}</span></div></div>
<div class="lic">${LIC}</div>` + END;

// D2-B · ستوري سناب: السعر أولاً
const D2B = () => head(1080, 1920, C.ivory, `
.top{position:absolute;top:170px;right:80px;left:80px;display:flex;justify-content:space-between;align-items:center}
.top .mark span{color:${C.brass}}.tag{font-family:Alexandria;font-weight:700;font-size:26px;color:${C.brass};border:2px solid ${C.brass};border-radius:999px;padding:6px 20px}
.big{position:absolute;top:290px;right:80px;left:80px;display:flex;align-items:flex-end;gap:20px}
.big b{font-family:Alexandria;font-weight:800;font-size:250px;line-height:.85;color:${C.navy}}
.big div{font-family:Alexandria;font-weight:700;font-size:44px;line-height:1.2;color:${C.brass};padding-bottom:18px}
.fr{position:absolute;top:620px;right:80px;left:80px;height:600px;border-radius:34px;overflow:hidden;box-shadow:0 24px 50px rgba(20,48,58,.2)}
.fr img{width:100%;height:100%;object-fit:cover}
.b{position:absolute;top:1255px;right:80px;left:80px}
h1{font-size:80px}
ul{list-style:none;display:flex;gap:28px;margin-top:22px;font-size:30px;color:${C.navy2}}
li{display:flex;align-items:center;gap:8px}li:before{content:"";width:14px;height:14px;border-radius:50%;background:${C.brass}}
.wa{position:absolute;bottom:330px;right:80px;left:80px;height:112px;font-size:40px}
.lic{position:absolute;bottom:270px;right:80px;color:${C.navy2};font-size:21px}`) + `
<div class="top"><div class="mark"><b>DORMIRA</b><span>دورميرا</span></div><span class="tag">ليلة في الرياض</span></div>
<div class="big"><b>350</b><div>ريال\nلليلة</div></div>
<div class="fr"><img src="${ph('772c6e45')}"></div>
<div class="b"><h1 class="disp">غرفتك في العقيق</h1><ul><li>4 دقايق من البوليفارد</li><li>مواقف مجانية</li></ul></div>
<div class="wa">${I.wa('#fff', 48)}احجز واتساب <span class="n">${WA}</span></div>
<div class="lic">${LIC}</div>` + END;

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
