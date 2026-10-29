// يطلّع نسخة PDF من كل ملف في public/files (العروض بمقاس الشريحة، والملفات A4)
// التشغيل: NODE_PATH=<مجلد فيه playwright و @fontsource/*> node tools/build_pdfs.js <مجلد node_modules للخطوط>
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const NM = process.argv[2];
const ROOT = path.resolve(__dirname, '..', 'public', 'files');
const OUT = path.join(ROOT, 'pdf');
const JOBS = [
  ['decks/media-nov.html', 'الميديا-بلان-نوفمبر.pdf', 'deck'],
  ['decks/weekly4.html', 'تقرير-الحملات-الأسبوع-الرابع.pdf', 'deck'],
  ['decks/weeks-compare.html', 'مقارنة-الأسابيع-الأربعة.pdf', 'deck'],
  ['decks/weekly3.html', 'تقرير-الحملات-الأسبوع-الثالث.pdf', 'deck'],
  ['decks/weekly2.html', 'تقرير-الحملات-الأسبوع-الثاني.pdf', 'deck'],
  ['decks/weekly.html', 'تقرير-الحملات-أسبوع-الإطلاق.pdf', 'deck'],
  ['decks/brand.html', 'استراتيجية-المحتوى-والبراند.pdf', 'deck'],
  ['decks/cal30.html', 'تقويم-أول-30-يوماً-عرض.pdf', 'deck'],
  ['shamel.html', 'الملف-الشامل.pdf', 'doc'],
  ['campaigns.html', 'مخطط-تنفيذ-الحملات.pdf', 'doc'],
  ['media-plan.html', 'الميديا-بلان.pdf', 'doc'],
  ['budget.html', 'اعتماد-ميزانية-الحملات.pdf', 'doc'],
  ['cal30.html', 'تقويم-المحتوى-أول-30-يوماً.pdf', 'doc'],
];
const FAM = { 'Alexandria': 'alexandria', 'IBM Plex Sans Arabic': 'ibm-plex-sans-arabic', 'IBM Plex Mono': 'ibm-plex-mono', 'Reem Kufi': 'reem-kufi' };
function fontCss(url) {
  const fams = [...decodeURIComponent(url).matchAll(/family=([^:&]+)/g)].map(m => m[1].replace(/\+/g, ' '));
  let css = '';
  for (const f of fams) {
    const pkg = FAM[f]; if (!pkg) continue;
    const dir = path.join(NM, '@fontsource', pkg);
    for (const w of [300, 400, 500, 600, 700, 800]) {
      const p = path.join(dir, w + '.css'); if (!fs.existsSync(p)) continue;
      css += fs.readFileSync(p, 'utf8').replace(/url\(\.\/files\//g, 'url(https://fonts.local/' + pkg + '/files/');
    }
  }
  return css;
}
(async () => {
  const b = await chromium.launch();
  const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null; // مثال: ONLY=shamel.html,cal30.html
  for (const [src, out, kind] of JOBS) {
    if (ONLY && ONLY.indexOf(src) < 0) continue;
    const p = await b.newPage({ viewport: kind === 'deck' ? { width: 1920, height: 1080 } : { width: 1200, height: 1600 }, deviceScaleFactor: 1.5 });
    await p.route('**/*', r => {
      const u = new URL(r.request().url());
      if (u.hostname === 'fonts.googleapis.com') return r.fulfill({ contentType: 'text/css', body: fontCss(r.request().url()) });
      if (u.hostname === 'fonts.local') return r.fulfill({ path: path.join(NM, '@fontsource', decodeURIComponent(u.pathname.slice(1))) });
      if (u.protocol === 'file:') return r.continue();
      return r.abort();
    });
    await p.goto('file://' + path.join(ROOT, src), { waitUntil: 'load' });
    await p.evaluate(() => document.fonts.ready);
    if (kind === 'deck') {
      await p.addStyleTag({ content: '@page{size:1920px 1080px;margin:0}html,body{background:#fff!important;padding:0!important;margin:0!important}.deck{max-width:none!important;gap:0!important;display:block!important}.frame{width:1920px!important;height:1080px!important;aspect-ratio:auto!important;border-radius:0!important;box-shadow:none!important;break-after:page;page-break-after:always}.n{display:none!important}' });
      await p.evaluate(() => { document.querySelectorAll('.frame').forEach(f => { f.firstElementChild.style.transform = 'none'; }); });
      await p.pdf({ path: path.join(OUT, out), width: '1920px', height: '1080px', printBackground: true, pageRanges: '' });
    } else {
      const PREP = {
        'shamel.html': ['.side,.tabs-m,.skip{display:none!important}.app{display:block!important}.panel{max-width:none!important}.panel~.panel{break-before:page}', () => document.querySelectorAll('.panel').forEach(e => { e.hidden = false; })],
        'campaigns.html': ['#tabs{display:none!important}[id^="v-"]~[id^="v-"]{break-before:page}', () => document.querySelectorAll('[id^="v-"]').forEach(e => { e.hidden = false; e.removeAttribute('hidden'); })],
      }[src];
      if (PREP) { await p.addStyleTag({ content: PREP[0] + '*{position:static}[style*="sticky"],.side{position:static!important}' }); await p.evaluate(PREP[1]); await p.waitForTimeout(300); }
      // صورة كاملة للصفحة بنفس شكلها على الشاشة، وبعدين تتقسم لصفحات A4 (tools/png_to_pdf.py)
      await p.emulateMedia({ media: 'screen' });
      const png = path.join(OUT, out.replace(/\.pdf$/, '.png'));
      await p.screenshot({ path: png, fullPage: true });
      require('child_process').execFileSync('python3', [path.join(__dirname, 'png_to_pdf.py'), png, path.join(OUT, out)]);
      fs.unlinkSync(png);
    }
    console.log(out, (fs.statSync(path.join(OUT, out)).size / 1024 | 0) + 'KB');
    await p.close();
  }
  await b.close();
})();
