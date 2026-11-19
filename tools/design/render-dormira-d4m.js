// إعلانات الشهري والعمل لدورميرا بهوية «الاتجاه الرابع»
// الاستخدام: node tools/design/render-dormira-d4m.js out-dir fonts-node_modules [MS,MR,SS,SR,BA,BB]
// الشهري: ترخيص الإعلان العقاري (548 غرفة وحمام · 572 غرفة وصالة) + فال. العمل: ترخيص السياحة + فال
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '../..');
const FONTS = path.join(__dirname, 'fonts');
const LIC = 'ترخيص وزارة السياحة 10008368 · رخصة فال 1200046434';
const WA = '050 307 0157';
const C = { navy: '#14303A', gold: '#B8925A', goldL: '#E2C394', ivory: '#F6F2EA', wa: '#25D366', ink2: '#47606A' };
const d64 = (f, m) => 'data:' + m + ';base64,' + fs.readFileSync(f).toString('base64');
const ph = n => d64(path.join(ROOT, 'assets/photos/dormira/enh', n + '.jpg'), 'image/jpeg');
const LOGO = d64(path.join(ROOT, 'public/img/brand-symbol.png'), 'image/png');
const NM = process.argv[3];
let FONT = '';
[['Alexandria', 'alexandria', [600, 700, 800]], ['Plex', 'ibm-plex-sans-arabic', [400, 500, 600]]].forEach(([fam, dir, ws]) => ws.forEach(w => ['arabic', 'latin'].forEach(sub => {
  const f = path.join(FONTS, dir + '-' + sub + '-' + w + '-normal.woff2');
  if (fs.existsSync(f)) FONT += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + d64(f, 'font/woff2') + ') format("woff2")}';
})));
if (NM) [['Readex', 'readex-pro', [400, 500]]].forEach(([fam, pkg, ws]) => ws.forEach(w => ['latin'].forEach(sub => {
  const f = path.join(NM, '@fontsource', pkg, 'files', pkg + '-' + sub + '-' + w + '-normal.woff2');
  if (fs.existsSync(f)) FONT += '@font-face{font-family:' + fam + ';font-weight:' + w + ';src:url(' + d64(f, 'font/woff2') + ') format("woff2")}';
})));

const waIco = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${C.wa}"/><path fill="#fff" transform="translate(3.6 3.6) scale(.7)" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.3.5-.4.5c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.2.5.1.6 0l.9-1c.2-.3.4-.2.6-.1l2 1c.3.1.5.2.5.3.1.2.1.7-.1 1.3z"/></svg>`;
const ico = {
  pin: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.gold}" stroke-width="1.8"><path d="M12 21s6.5-5.8 6.5-11.2a6.5 6.5 0 1 0-13 0C5.5 15.2 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/></svg>`,
  park: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.gold}" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M9.5 16.5v-9h3.6a2.7 2.7 0 0 1 0 5.4H9.5"/></svg>`,
  wifi: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.gold}" stroke-width="1.8" stroke-linecap="round"><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.8 15.6a4.8 4.8 0 0 1 6.4 0"/><circle cx="12" cy="19" r=".9" fill="${C.gold}"/></svg>`,
  desk: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.gold}" stroke-width="1.8"><path d="M4 18h16M6.5 18a5.5 5.5 0 0 1 11 0M12 9.5V7.5M9.5 7.5h5"/></svg>`
};
const page = (w, h, css, body) => `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>${FONT}
*{box-sizing:border-box;margin:0;padding:0}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:Plex,sans-serif;background:${C.navy};color:${C.navy};position:relative;-webkit-font-smoothing:antialiased}
.hl{font-family:Alexandria;font-weight:800;line-height:1.12;white-space:pre-line;letter-spacing:-.005em}
.wm{display:flex;flex-direction:column;align-items:flex-start;line-height:1}
.wm b{font-family:Readex,Plex;font-weight:500;font-size:26px;letter-spacing:.36em;direction:ltr}
.wm span{font-family:Alexandria;font-weight:600;font-size:18px;margin-top:7px;letter-spacing:.02em}
.btn{display:inline-flex;align-items:center;gap:14px;background:${C.ivory};color:${C.navy};border-radius:999px;padding:12px 30px 12px 14px;font-family:Alexandria;font-weight:700;box-shadow:0 8px 22px rgba(0,0,0,.22);border:1.5px solid ${C.goldL}}
.btn .n{direction:ltr;font-weight:800;color:${C.navy}}
.strip{display:flex;align-items:center;justify-content:space-between;background:${C.ivory};color:${C.ink2}}
.strip .tcs{display:flex;align-items:center;gap:10px;font-size:19px;font-weight:500;white-space:nowrap}
.strip img{width:36px;height:36px;object-fit:contain}
.strip .lic{font-size:17px;white-space:nowrap}
${css}</style></head><body>${body}</body></html>`;
const LICS = { room: 'ترخيص إعلان عقاري 7201230548 · رخصة فال 1200046434', suite: 'ترخيص إعلان عقاري 7201230572 · رخصة فال 1200046434', tour: LIC };
const strip = k => `<div class="tcs"><img src="${LOGO}">بإدارة ذا كابيتال سويتس</div><div class="lic">${LICS[k]}</div>`;


const chipsHtml = c => c.map(([i, t]) => `<div>${ico[i]}${t}</div>`).join('');
const btn = (t, s, dark) => `<span class="btn"${dark ? ` style="background:${C.navy};color:#fff;border-color:${C.navy}"` : ''}>${waIco(s)}${t} <span class="n"${dark ? ' style="color:#fff"' : ''}>${WA}</span></span>`;

// فيد: لوح كحلي بمنحنى + ختم دائري + شرائح مميزات
const panel = o => page(1080, 1350, `
.ph{position:absolute;top:380px;left:0;right:0;bottom:96px}.ph img{width:100%;height:100%;object-fit:cover;object-position:${o.pos || '50% 55%'}}
.ph:after{content:"";position:absolute;inset:auto 0 0 0;height:280px;background:linear-gradient(transparent,rgba(12,30,36,.8))}
.pan{position:absolute;top:0;left:0;width:1080px;height:560px}
.wm{position:absolute;top:58px;left:64px;color:#fff}.wm span{color:${C.goldL}}
.ttl{position:absolute;top:92px;right:70px;color:#fff;text-align:right}
.ttl h1{font-size:${o.size || 100}px}
.ttl p{margin-top:28px;font-size:30px;color:${C.goldL};font-weight:500;display:flex;align-items:center;gap:10px}
.seal{position:absolute;top:322px;left:84px;width:236px;height:236px;border-radius:50%;background:${C.ivory};display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;box-shadow:0 14px 34px rgba(0,0,0,.25)}
.seal:before{content:"";position:absolute;inset:9px;border-radius:50%;border:1.5px solid ${C.gold}}
.seal small{font-family:Alexandria;font-weight:600;font-size:24px;color:${C.gold};margin-bottom:6px}
.seal b{font-family:Alexandria;font-weight:800;font-size:${o.sealSize || 92}px;line-height:1;color:${C.navy};white-space:pre-line}
.seal span{font-family:Alexandria;font-weight:600;font-size:21px;color:${C.navy};margin-top:4px}
.chips{position:absolute;bottom:236px;right:50px;left:50px;display:flex;justify-content:center;flex-wrap:wrap;gap:12px}
.chips div{display:flex;align-items:center;gap:8px;background:rgba(246,242,234,.95);border-radius:12px;padding:9px 16px;font-size:23px;font-weight:600;color:${C.navy}}
.cta{position:absolute;bottom:130px;left:0;right:0;display:flex;justify-content:center}.cta .btn{font-size:33px}
.strip{position:absolute;bottom:0;left:0;right:0;height:96px;padding:0 54px}`,
`<div class="ph"><img src="${ph(o.photo)}"></div>
<svg class="pan" viewBox="0 0 1080 560" preserveAspectRatio="none">
 <path d="M0 0H1080V430C870 520 640 540 430 500 260 468 120 446 0 470Z" fill="${C.navy}"/>
 <path d="M0 486C120 462 260 484 430 516 640 556 870 536 1080 446" fill="none" stroke="${C.gold}" stroke-width="2"/>
 <g fill="none" stroke="${C.gold}" stroke-width="1.6" opacity=".55"><circle cx="1080" cy="0" r="210"/><circle cx="1080" cy="0" r="250"/></g></svg>
<div class="wm"><b>DORMIRA</b><span>دورميرا</span></div>
<div class="ttl"><h1 class="hl">${o.title}</h1><p>${ico.pin}${o.sub}</p></div>
<div class="seal"><small>${o.seal[0]}</small><b>${o.seal[1]}</b><span>${o.seal[2]}</span></div>
<div class="chips">${chipsHtml(o.chips)}</div>
<div class="cta">${btn(o.cta, 54)}</div>
<div class="strip">${strip(o.lic)}</div>`);

// فيد: صورة فوق، بطاقة مفتاح مايلة، ولوح عاجي
const card = o => page(1080, 1350, `
body{background:${C.ivory}}
.ph{position:absolute;top:0;left:0;right:0;height:760px}.ph img{width:100%;height:100%;object-fit:cover;object-position:${o.pos || '50% 50%'}}
.ph:before{content:"";position:absolute;inset:0 0 auto 0;height:220px;background:linear-gradient(rgba(12,30,36,.55),transparent);z-index:1}
.wave{position:absolute;top:560px;left:0;width:1080px;height:220px}
.top{position:absolute;top:56px;left:64px;z-index:2;color:#fff}.top .wm span{color:${C.goldL}}
.kc{position:absolute;top:520px;left:86px;width:400px;height:252px;background:${C.navy};border-radius:26px;padding:28px 32px;color:#fff;transform:rotate(-7deg);box-shadow:0 22px 44px rgba(12,30,36,.35);overflow:hidden;z-index:3}
.kc:before{content:"";position:absolute;right:-60px;top:-60px;width:220px;height:220px;border-radius:50%;border:1.5px solid rgba(226,195,148,.5)}
.kc .wm b{font-size:20px}.kc .wm span{font-size:15px;color:${C.goldL}}
.kc-t{display:flex;justify-content:space-between;align-items:flex-start;direction:ltr}
.chip{width:58px;height:44px;border-radius:9px;background:linear-gradient(135deg,${C.goldL},${C.gold});display:block}
.kc-b{position:absolute;bottom:34px;right:32px;text-align:right}
.kc-b small{font-size:18px;color:${C.goldL};font-weight:500}.kc-b b{display:block;font-family:Alexandria;font-weight:800;font-size:${o.kcSize || 58}px;line-height:1.05}.kc-b span{display:block;margin-top:8px;font-family:Alexandria;font-weight:600;font-size:22px}
.stripe{position:absolute;left:0;right:0;bottom:16px;height:4px;background:${C.gold};opacity:.7}
.tx{position:absolute;top:780px;right:70px;text-align:right}
.tx h1{font-size:${o.size || 84}px;color:${C.navy}}
.pr{margin-top:18px;font-family:Alexandria;font-weight:700;font-size:34px;color:${C.gold}}
.feat{position:absolute;top:1060px;right:70px;left:70px;display:flex;gap:26px;font-size:24px;color:${C.ink2};border-top:1.5px solid #E2D8C6;padding-top:18px}
.feat span{display:flex;align-items:center;gap:8px}
.cta{position:absolute;bottom:118px;right:70px}.cta .btn{font-size:32px}
.strip{position:absolute;bottom:0;left:0;right:0;height:96px;padding:0 54px;border-top:1.5px solid #E2D8C6}`,
`<div class="ph"><img src="${ph(o.photo)}"></div>
<svg class="wave" viewBox="0 0 1080 220" preserveAspectRatio="none"><path d="M0 120C200 40 420 30 620 80 800 126 950 150 1080 110V220H0Z" fill="${C.ivory}"/><path d="M0 104C200 24 420 14 620 64 800 110 950 134 1080 94" fill="none" stroke="${C.gold}" stroke-width="2"/></svg>
<div class="top"><div class="wm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div></div>
<div class="kc"><div class="kc-t"><div class="wm"><b>DORMIRA</b><span>دورميرا</span></div><i class="chip"></i></div>
 <div class="kc-b"><small>${o.kc[0]}</small><b>${o.kc[1]}</b><span>${o.kc[2]}</span></div><i class="stripe"></i></div>
<div class="tx"><h1 class="hl">${o.title}</h1><p class="pr">${o.sub}</p></div>
<div class="feat">${o.feat.map(([i, t]) => `<span>${ico[i]}${t}</span>`).join('')}</div>
<div class="cta">${btn(o.cta, 52, true)}</div>
<div class="strip">${strip(o.lic)}</div>`);

// ستوري: لوح كحلي بالسؤال، الصورة بين منحنيين، والجواب على العاجي
const storyQ = o => page(1080, 1920, `
body{background:${C.ivory}}
.top{position:absolute;top:0;left:0;right:0;height:640px;background:${C.navy}}
.wm{position:absolute;top:170px;left:72px;color:#fff}.wm span{color:${C.goldL}}
.q{position:absolute;top:250px;right:72px;color:#fff;text-align:right}.q h1{font-size:${o.size || 122}px}.q h1 em{font-style:normal;color:${C.goldL}}
.arcs{position:absolute;top:0;left:0}
.ph{position:absolute;top:560px;left:0;right:0;height:760px}.ph img{width:100%;height:100%;object-fit:cover;object-position:${o.pos || '50% 50%'}}
.w1{position:absolute;top:556px;left:0;width:1080px;height:150px}.w2{position:absolute;top:1200px;left:0;width:1080px;height:150px}
.bot{position:absolute;top:1330px;right:72px;left:72px;text-align:right}
.bot h2{font-size:${o.size2 || 74}px;color:${C.navy}}
.row{display:flex;gap:22px;margin-top:22px;font-size:27px;color:${C.ink2};font-weight:500}
.row span{display:flex;align-items:center;gap:8px}
.cta{margin-top:30px;display:flex}.cta .btn{font-size:36px}
.strip{position:absolute;bottom:262px;left:72px;right:72px;background:transparent;padding:0}`,
`<div class="top"></div>
<svg class="arcs" width="1080" height="640"><g fill="none" stroke="${C.gold}" stroke-width="1.6" opacity=".5"><circle cx="0" cy="640" r="300"/><circle cx="0" cy="640" r="345"/></g></svg>
<div class="wm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div>
<div class="q"><h1 class="hl">${o.title}</h1></div>
<div class="ph"><img src="${ph(o.photo)}"></div>
<svg class="w1" viewBox="0 0 1080 150" preserveAspectRatio="none"><path d="M0 0H1080V60C860 130 640 140 420 100 250 70 110 60 0 84Z" fill="${C.navy}"/><path d="M0 100C110 76 250 86 420 116 640 156 860 146 1080 76" fill="none" stroke="${C.gold}" stroke-width="2"/></svg>
<svg class="w2" viewBox="0 0 1080 150" preserveAspectRatio="none"><path d="M0 90C220 20 460 10 680 50 850 82 980 96 1080 80V150H0Z" fill="${C.ivory}"/><path d="M0 74C220 4 460 -6 680 34 850 66 980 80 1080 64" fill="none" stroke="${C.gold}" stroke-width="2"/></svg>
<div class="bot"><h2 class="hl">${o.ans}</h2>
<div class="row">${o.feat.map(([i, t]) => `<span>${ico[i]}${t}</span>`).join('')}</div>
<div class="cta">${btn(o.cta, 56, true)}</div></div>
<div class="strip">${strip(o.lic)}</div>`);

// ستوري: عنوان ضخم، والصورة في نصف قوس، وقاعدة كحلية
const storyArch = o => page(1080, 1920, `
body{background:${C.ivory}}
.wm{position:absolute;top:170px;right:0;left:0;align-items:center;color:${C.navy}}.wm span{color:${C.gold}}
.arcs{position:absolute;top:0;left:0}
.hero{position:absolute;top:262px;left:0;right:0;text-align:center;color:${C.navy}}
.hero small{display:block;font-family:Alexandria;font-weight:700;font-size:44px;color:${C.gold}}
.hero b{display:block;font-family:Alexandria;font-weight:800;font-size:${o.heroSize || 150}px;line-height:1.02;white-space:pre-line;margin-top:6px}
.hero span{display:inline-block;font-family:Alexandria;font-weight:700;font-size:42px;margin-top:14px;border-top:2px solid ${C.gold};padding-top:10px}
.ph{position:absolute;top:820px;left:70px;right:70px;height:480px;border-radius:470px 470px 0 0;overflow:hidden}.ph img{width:100%;height:100%;object-fit:cover;object-position:${o.pos || '50% 55%'}}
.phl{position:absolute;top:802px;left:52px;right:52px;height:498px;border-radius:490px 490px 0 0;border:1.6px solid ${C.gold};border-bottom:0}
.base{position:absolute;top:1300px;left:0;right:0;height:380px;background:${C.navy};padding:28px 72px 0;color:#fff}
.base h2{font-size:58px}.base .f{font-size:25px;color:${C.goldL};margin-top:16px}
.cta .btn{font-size:34px;padding:10px 26px 10px 12px}
.strip{position:absolute;bottom:276px;left:72px;right:72px;background:transparent;padding:0;color:#C8D4D8}`,
`<svg class="arcs" width="1080" height="900"><g fill="none" stroke="${C.gold}" stroke-width="1.5" opacity=".45"><circle cx="1080" cy="120" r="230"/><circle cx="1080" cy="120" r="275"/></g></svg>
<div class="wm"><b>DORMIRA</b><span>دورميرا · حي العقيق</span></div>
<div class="hero"><small>${o.hero[0]}</small><b>${o.hero[1]}</b><span>${o.hero[2]}</span></div>
<div class="phl"></div><div class="ph"><img src="${ph(o.photo)}"></div>
<div class="base"><h2 class="hl">${o.ans}</h2><p class="f">${o.f}</p>
<div class="cta" style="margin-top:30px">${btn(o.cta, 50)}</div></div>
<div class="strip">${strip(o.lic)}</div>`);

const ALL = {
  MS: ['DOR-D4-MonthlySuite', () => panel({ lic: 'suite', photo: '37109cb2', pos: '50% 60%', title: 'جناحك الشهري\nفي العقيق', sub: 'حي العقيق · الرياض', seal: ['جناح', 'غرفة\nوصالة', 'بالشهر'], sealSize: 44, chips: [['desk', 'غرفة نوم وصالة'], ['desk', 'مطبخ صغير'], ['wifi', 'واي فاي مجاني'], ['park', 'مواقف مجانية']], cta: 'راسلنا واتساب' }), 1080, 1350],
  MR: ['DOR-D4-MonthlyRoom', () => card({ lic: 'room', photo: '4f44cd67', pos: '50% 55%', kc: ['بطاقة غرفتك', 'بالشهر', 'بدون عقد سنوي'], kcSize: 54, title: 'غرفتك الشهرية\nفي العقيق', sub: 'غرفة وحمام خاص · جاهزة من أول يوم', feat: [['park', 'مواقف مجانية'], ['wifi', 'واي فاي مجاني'], ['desk', 'استقبال 24 ساعة']], cta: 'راسلنا واتساب' }), 1080, 1350],
  SS: ['DOR-D4-SnapSuite', () => storyArch({ lic: 'suite', photo: '5b4bf76c', pos: '50% 60%', hero: ['جناح بالشهر', 'غرفة\nوصالة', 'في حي العقيق'], heroSize: 150, ans: 'مطبخ صغير داخل جناحك', f: 'واي فاي مجاني · مواقف مجانية · استقبال 24 ساعة', cta: 'راسلنا واتساب' }), 1080, 1920],
  SR: ['DOR-D4-SnapRoom', () => storyQ({ lic: 'room', photo: '0a556dfa', pos: '40% 55%', title: 'تدوّر سكن\n<em>بالشهر؟</em>', ans: 'غرفتك جاهزة من أول يوم', feat: [['desk', 'غرفة وحمام خاص'], ['pin', 'بدون عقد سنوي']], cta: 'راسلنا واتساب' }), 1080, 1920],
  BA: ['DOR-D4-BizA', () => panel({ lic: 'tour', photo: '981e8a7d', pos: '35% 55%', title: 'رحلة عمل\nللرياض؟', sub: 'قريب من المركز المالي', seal: ['من', '3', 'ليالٍ لأسبوعين'], chips: [['desk', 'مكتب للابتوب'], ['wifi', 'واي فاي مجاني'], ['park', 'مواقف مجانية'], ['desk', 'استقبال 24 ساعة']], cta: 'احجز واتساب' }), 1080, 1350],
  BB: ['DOR-D4-BizB', () => card({ lic: 'tour', photo: '2f945a2c', pos: '50% 45%', kc: ['إقامة عمل', 'العقيق', 'قريب من المركز المالي'], kcSize: 52, title: 'أقم قريب\nمن شغلك', sub: 'من 3 ليالٍ إلى أسبوعين', feat: [['desk', 'مكتب للابتوب'], ['wifi', 'واي فاي مجاني'], ['park', 'مواقف مجانية']], cta: 'احجز واتساب' }), 1080, 1350]
};
(async () => {
  const out = process.argv[2]; fs.mkdirSync(out, { recursive: true });
  const want = (process.argv[4] || Object.keys(ALL).join(',')).split(',');
  const b = await chromium.launch();
  for (const k of want) {
    const [n, f, w, h] = ALL[k];
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(f(), { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, n + '.png') }); await p.close(); console.log(n);
  }
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
