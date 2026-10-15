#!/usr/bin/env python3
"""يجمع ملفات مشروع ذا كابيتال سويتس في public/files/ (يُشغّل محلياً مرة عند تحديث ملف)."""
import json, os, re, shutil, sys, zipfile, html
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'public' / 'files'
SRC = Path(sys.argv[1])  # مجلد المصادر (انظر README)

def extract(zp, dest):
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zp) as z:
        for info in z.infolist():
            n = info.filename
            if not info.flag_bits & 0x800:
                try: n = n.encode('cp437').decode('utf-8')
                except Exception: pass
            t = dest / n
            if n.endswith('/'): t.mkdir(parents=True, exist_ok=True); continue
            t.parent.mkdir(parents=True, exist_ok=True); t.write_bytes(z.read(info))
    return dest

def copy_doc(src, name):
    (OUT / name).write_bytes(Path(src).read_bytes())

def webp(src, dst, maxw=1600, q=80):
    im = Image.open(src)
    if im.mode not in ('RGB', 'RGBA'):
        im = im.convert('RGB')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, 'WEBP', quality=q, method=6)
    return im.width, im.height

PAGE_CSS = """
:root{--bg:#F3F2EE;--surface:#fff;--ink:#16202A;--ink-2:#4B5560;--line:#D9D8D1;--gold:#8C6A1E}
@media (prefers-color-scheme:dark){:root{--bg:#10161C;--surface:#172029;--ink:#ECE9E1;--ink-2:#B5BCC3;--line:#2A3540;--gold:#D4AE67}}
*{box-sizing:border-box}html,body{direction:rtl}body{margin:0;background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;line-height:1.7}
.wrap{max-width:1180px;margin:0 auto;padding:28px 16px 64px}
h1{font-family:'Alexandria',Tahoma,sans-serif;font-size:clamp(24px,3.4vw,34px);margin:0 0 4px}
h2{font-family:'Alexandria',Tahoma,sans-serif;font-size:20px;margin:34px 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.sub{color:var(--ink-2);margin:0 0 8px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:14px}
.grid.tall{grid-template-columns:repeat(auto-fill,minmax(170px,1fr))}
figure{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:10px;overflow:hidden}
figure a{display:block}
figure img,figure video{display:block;width:100%;height:auto;background:#000}
figcaption{padding:8px 10px;font-size:13.5px;color:var(--ink-2)}
.row{display:flex;gap:10px;overflow-x:auto;padding-bottom:6px}
.row figure{flex:0 0 220px}
a.dl{display:inline-block;margin-top:6px;color:var(--gold);font-weight:600}
"""
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Alexandria:wght@500;700&family=IBM+Plex+Sans+Arabic:wght@400;500;600&display=swap">'

def page(title, sub, body):
    return f"""<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{html.escape(title)}</title>{FONTS}<style>{PAGE_CSS}</style></head><body><div class="wrap"><h1>{html.escape(title)}</h1><p class="sub">{sub}</p>{body}</div></body></html>"""

def fig(src, cap, w, h):
    return f'<figure><a href="{src}" target="_blank" rel="noopener"><img src="{src}" alt="{html.escape(cap)}" loading="lazy" width="{w}" height="{h}"></a><figcaption>{html.escape(cap)}</figcaption></figure>'

def nice(stem):
    return re.sub(r'^\d+-', '', stem).replace('-', ' ')

# ---------- decks ----------
DECK_CSS = """
*{box-sizing:border-box}html,body{margin:0;background:#1d2228}
body{padding:24px 16px 48px;font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif}
.deck{max-width:1200px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.frame{position:relative;width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;box-shadow:0 6px 24px rgba(0,0,0,.35);background:#fff}
.frame>section{position:absolute;top:0;left:0;width:1920px;height:1080px;transform-origin:0 0;overflow:hidden;direction:ltr}
.frame>section *{margin:0}
.frame>section aside{display:none}
.frame>section ul,.frame>section ol{padding-inline-start:1.2em}
.n{color:#9aa4ac;font-size:13px;text-align:center;margin-top:-10px}
"""
DECK_JS = """
function fit(){document.querySelectorAll('.frame').forEach(function(f){var s=f.firstElementChild;s.style.transform='scale('+(f.clientWidth/1920)+')'})}
addEventListener('resize',fit);fit();document.fonts&&document.fonts.ready.then(fit);
"""

def build_deck(folder, name):
    d = json.loads((folder / 'project' / 'deck.json').read_text())
    links = ''.join(f'<link rel="stylesheet" href="{html.escape(f["href"])}">' for f in d.get('faces', {}).values() if f.get('href'))
    parts = []
    for i, sid in enumerate(d['order'], 1):
        sec = (folder / 'project' / 'slides' / f'{sid}.html').read_text()
        sec = re.sub(r'<section ', '<section dir="ltr" ', sec, count=1)
        parts.append(f'<div class="frame">{sec}</div><div class="n">{i} / {len(d["order"])}</div>')
    out = f"""<!doctype html><html lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>{html.escape(d['title'])}</title>{links}<style>{DECK_CSS}</style></head><body><div class="deck">{''.join(parts)}</div><script>{DECK_JS}</script></body></html>"""
    (OUT / 'decks').mkdir(parents=True, exist_ok=True)
    (OUT / 'decks' / name).write_text(out)
    return d['title'], len(d['order'])

# ---------- galleries ----------
def build_ads(zp, vzp):
    base = OUT / 'ads'
    shutil.rmtree(base, ignore_errors=True)
    tmp = Path('/tmp/_ads'); shutil.rmtree(tmp, ignore_errors=True)
    extract(zp, tmp)
    root = next(tmp.iterdir())
    body = ''
    groups = [('01-تصاميم-ثابتة/فيد-4x5', 'تصاميم الفيد 4:5', 'grid', 'feed'),
              ('01-تصاميم-ثابتة/ستوري-9x16', 'تصاميم الستوري 9:16', 'grid tall', 'story')]
    for rel, title, cls, slug in groups:
        items = sorted((root / rel).glob('*.jpg'))
        figs = []
        for p in items:
            dst = base / slug / (p.stem + '.webp')
            w, h = webp(p, dst, maxw=1080)
            figs.append(fig(f'ads/{slug}/{p.stem}.webp', nice(p.stem), w, h))
        body += f'<h2>{title} · {len(items)}</h2><div class="{cls}">{"".join(figs)}</div>'
    body += '<h2>الكاروسيل</h2>'
    for car in sorted((root / '02-كاروسيل').iterdir()):
        figs = []
        for p in sorted(car.glob('*.jpg')):
            dst = base / 'carousel' / car.name / (p.stem + '.webp')
            w, h = webp(p, dst, maxw=1080)
            figs.append(fig(f'ads/carousel/{car.name}/{p.stem}.webp', f'{p.stem}', w, h))
        body += f'<p class="sub"><b>{html.escape(nice(car.name))}</b></p><div class="row">{"".join(figs)}</div>'
    vids = []
    (base / 'video').mkdir(parents=True, exist_ok=True)
    vt = extract(vzp, Path('/tmp/_vid'))
    for vp in sorted(vt.rglob('*.mp4')):
            fn = vp.name
            shutil.copy(vp, base / 'video' / fn)
            vids.append(f'<figure><video src="ads/video/{fn}" controls preload="metadata" playsinline></video><figcaption>{html.escape(nice(Path(fn).stem).replace("V", "فيديو ", 1))}</figcaption></figure>')
    body += f'<h2>الفيديوهات · {len(vids)}</h2><div class="grid tall">{"".join(vids)}</div>'
    (OUT / 'ads.html').write_text(page('إعلانات الحملة الحالية', 'الرمال والملز · ميتا وسناب شات · النسخ المعتمدة المرفوعة على الحملات. اضغط أي تصميم لفتحه بالحجم الكامل.', body))

def build_week1(zp):
    base = OUT / 'week1'
    shutil.rmtree(base, ignore_errors=True)
    tmp = Path('/tmp/_w1'); shutil.rmtree(tmp, ignore_errors=True)
    extract(zp, tmp)
    root = next(tmp.iterdir())
    days = {}
    for p in sorted(root.glob('*.png')):
        key = p.stem.split('-')[0] + '-' + p.stem.split('-')[1]
        days.setdefault(key, []).append(p)
    body = ''
    for key, items in days.items():
        figs = []
        for p in items:
            dst = base / (p.stem + '.webp')
            w, h = webp(p, dst, maxw=1350)
            figs.append(fig(f'week1/{p.stem}.webp', nice('-'.join(p.stem.split('-')[2:])), w, h))
        label = key.split('-')[1]
        body += f'<h2>{html.escape(label)}</h2><div class="grid">{"".join(figs)}</div>'
    pdf = root / '00-النصوص-والتعليمات.pdf'
    if pdf.exists():
        shutil.copy(pdf, base / 'week1-texts.pdf')
        body = '<p><a class="dl" href="week1/week1-texts.pdf" target="_blank" rel="noopener">ملف النصوص والتعليمات (PDF)</a></p>' + body
    (OUT / 'week1.html').write_text(page('محتوى الأسبوع الأول', 'تصاميم أول أسبوع نشر (15 إلى 21 أكتوبر) كما سُلّمت للمصمم، مع ملف النصوص والتعليمات.', body))

def build_where(pngs):
    base = OUT / 'where'
    shutil.rmtree(base, ignore_errors=True)
    figs = []
    for i, (p, cap) in enumerate(pngs, 1):
        w, h = webp(p, base / f'{i}.webp', maxw=1080, q=86)
        figs.append(fig(f'where/{i}.webp', cap, w, h))
    (OUT / 'where.html').write_text(page('منشور «وين نشغّل»', 'المنشور الثالث في صف التعريف: ثلاث اتجاهات للتصميم.', f'<div class="grid">{"".join(figs)}</div>'))

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    m = json.loads((SRC / 'manifest.json').read_text())
    for name, src in m['docs'].items():
        copy_doc(SRC / src, name)
    for name, folder in m['decks'].items():
        print('deck', build_deck(SRC / folder, name))
    build_ads(SRC / m['ads_zip'], SRC / m['videos_zip'])
    build_week1(SRC / m['week1_zip'])
    build_where([(SRC / p, c) for p, c in m['where']])
    print('done')
