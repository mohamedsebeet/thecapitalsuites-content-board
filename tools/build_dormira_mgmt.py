# يبني نسخة الإدارة المختصرة من ملف المحتوى الإعلاني لدورميرا
# الاستخدام: python3 tools/build_dormira_mgmt.py
import re, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'public/files/content-dormira.html')).read()
head = src[:src.index('<body>')].replace('<title>ملف المحتوى الإعلاني · حملة فندق دورميرا</title>', '<title>إعلانات حملة فندق دورميرا · نسخة الإدارة</title>')
body = src[src.index('<body>'):]

# كروت الإعلانات: الرمز والعنوان والشكل والنص اللي هيشوفه العميل
cards = {}
for m in re.finditer(r'<div class="ac"><div class="ah"><span class="code">(\w\d)</span><span class="tt">([^<]+)</span><span class="fm">([^<]+)</span>(.*?)</div><dl>(.*?)</dl></div>', body):
    code, title, fmt, extra, dl = m.groups()
    rows = dict(re.findall(r'<dt>([^<]+)</dt><dd>(.*?)</dd>', dl))
    text = rows.get('النص الأساسي') or rows.get('على الصورة') or rows.get('الكلام') or ''
    text = text.replace('سؤال كبير: ', '').replace(' ثم: ', ' · ').replace('، والختام: ', ' · ')
    cond = re.search(r'<span class="cond">([^<]+)</span>', extra)
    cards[code] = dict(title=title, fmt=fmt, text=text, cond=cond.group(1) if cond else '')

def mock_pages():
    a = body.index('<div class="pg"><h2><span class="n">03</span>')
    b = body.index('<div class="pg"><h2><span class="n">06</span>')
    return body[a:b]

GROUPS = [('ميتا · الإقامة الشهرية', ['M1', 'M2', 'M3', 'M4']), ('ميتا · الأعمال', ['B1', 'B2']),
          ('سناب شات · الإقامة الشهرية', ['S1', 'S2', 'S3']), ('الإقامة اليومية', ['D1', 'D2'])]
rows = ''
for g, codes in GROUPS:
    rows += f'<tr class="grp-r"><td colspan="2">{g}</td></tr>'
    for c in codes:
        d = cards[c]
        tag = f' <span class="cond">{d["cond"]}</span>' if d['cond'] else ''
        rows += f'<tr><td class="cd"><span class="code">{c}</span></td><td><b class="t">{d["title"]}</b> <span class="fm">{d["fmt"]}</span>{tag}<p>{d["text"]}</p></td></tr>'

CSS = '''<style>
.tx td{vertical-align:top;padding:12px 16px}.tx td.cd{width:60px;padding-top:15px}
.tx b.t{font-family:var(--f-disp);font-size:19px}.tx .fm,.tx .cond{font-size:13px;margin-right:6px}
.tx p{margin:4px 0 0;font-size:16px;line-height:1.65;color:var(--ink-2)}
.tx tr.grp-r td{background:var(--paper-2,#F3F1EC);font-weight:600;font-size:16px;padding:8px 16px}
</style>
'''
p1 = body[body.index('<div class="pg">'):body.index('<h2><span class="n">02</span>')]
p1 = p1.replace('<h1>ملف المحتوى الإعلاني<br>حملة فندق دورميرا</h1>', '<h1>إعلانات حملة<br>فندق دورميرا</h1>')
p1 = re.sub(r'<div class="date">[^<]+</div>', '<div class="date">التاريخ: 17 نوفمبر 2026</div>', p1)
p1 = re.sub(r'<span>DOR_\w+<small>([^<]+)</small></span>', r'<span>\1</span>', p1)
p1 = p1.replace('<th>المجموعة الإعلانية</th>', '<th>المنصة</th>')
p1 = p1.replace('<div class="card"><small>القناة</small><b>واتساب حجوزات دورميرا</b></div>', '<div class="card"><small>القناة</small><b>واتساب حجوزات دورميرا مباشرة</b></div>')
p1 += '''<div class="box"><b>قبل نشر الإعلانات نحتاج تأكيد إدارة الفندق على:</b> الأسعار الشهرية وسعر الليلة · المميزات المذكورة في الإعلانات (المطبخ الصغير، الواي فاي، المواقف المجانية، الاستقبال على مدار الساعة) · إمكانية السكن بالشهر بدون عقد سنوي (إعلان M4).</div></div>
'''
mocks = mock_pages()
daily = '''<h2><span class="n">00</span>سعر الإقامة اليومية</h2>
<table><tr><th>المصدر (ليلة 22–23 نوفمبر، شخصان)</th><th class="nh">السعر لليلة (ريال)</th></tr>
<tr><td>Booking.com · غرفة ديلوكس</td><td class="num">350</td></tr>
<tr><td>موقع الفندق الرسمي</td><td class="num">420</td></tr></table>
<p class="note">سعر الحجز المباشر أعلى من Booking، والمفروض يكون مثله أو أقل. وفنادق قريبة في العقيق معروضة بين 223 و291 ريال لنفس الليلة، لذلك تركّز إعلانات اليومي على قرب الفندق من البوليفارد والمركز المالي.</p>'''
p1 = p1.replace('<div class="box"><b>قبل نشر', daily + '\n<div class="box"><b>قبل نشر')
p4 = '<div class="pg"><h2><span class="n">00</span>نصوص الإعلانات</h2><p class="sub">النص الذي يظهر للعميل مع كل إعلان على ميتا، والمكتوب على التصميم في سناب.</p><table class="tx">' + rows + '</table></div>\n'

html = head.replace('</head>', CSS + '</head>') + '<body>\n' + p1 + mocks + p4 + '</body>\n</html>\n'
k = [0]
def renum(_):
    k[0] += 1
    return f'<span class="n">{k[0]:02d}</span>'
html = re.sub(r'<span class="n">\d\d</span>', renum, html)
open(os.path.join(ROOT, 'public/files/content-dormira-mgmt.html'), 'w').write(html)
print('ok', len(cards), 'cards')
