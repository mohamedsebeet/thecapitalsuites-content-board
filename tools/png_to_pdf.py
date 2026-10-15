#!/usr/bin/env python3
"""يقسم صورة صفحة طويلة لصفحات A4 ويحفظها PDF. التقسيم بيدوّر على سطر فاضي قريب عشان ما يقطعش في نص الكلام."""
import sys
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert('RGB')
W, H = im.size
ph = int(W * 297 / 210)
pages, y = [], 0
g = im.convert('L')
while y < H:
    end = min(y + ph, H)
    if end < H:
        best = end
        for cand in range(end, max(y + int(ph * 0.75), end - 400), -2):
            row = g.crop((0, cand, W, cand + 1)).getextrema()
            if row[1] - row[0] < 6:
                best = cand; break
        end = best
    page = Image.new('RGB', (W, ph), im.getpixel((2, min(y, H - 1))))
    page.paste(im.crop((0, y, W, end)), (0, 0))
    pages.append(page)
    y = end
pages[0].save(out, 'PDF', save_all=True, append_images=pages[1:], resolution=W / 8.27, quality=82)
