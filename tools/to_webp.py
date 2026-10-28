#!/usr/bin/env python3
"""Turns the photos directly inside images/ into WebP (about 30% smaller) and points the web pages at them.

Runs automatically on GitHub after "Optimise images", and by hand:  python tools/to_webp.py
- Only pictures directly in images/ are converted (products/ and categories/ are left alone).
- og-share.jpg is skipped: WhatsApp/Facebook link previews need a JPEG.
- A picture is only replaced if the WebP is really smaller. Safe to run again and again.
"""
import os, re, glob
from PIL import Image

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
IMG = os.path.join(BASE, 'images')
SKIP = {'og-share.jpg'}
done = set()
for p in sorted(glob.glob(os.path.join(IMG, '*'))):
    name = os.path.basename(p); stem, ext = os.path.splitext(name)
    if ext.lower() not in ('.jpg', '.jpeg', '.png') or name in SKIP:
        continue
    out = os.path.join(IMG, stem + '.webp')
    with Image.open(p) as im:
        im.load(); im.save(out, 'WEBP', quality=78, method=6)
    if os.path.getsize(out) < os.path.getsize(p):
        os.remove(p); done.add(stem); print('webp', name)
    else:
        os.remove(out); print('kept', name)

if done:
    pat = re.compile(r'images/([A-Za-z0-9_\-]+)\.(?:jpe?g|png)')
    for h in glob.glob(os.path.join(BASE, '*.html')):
        s = open(h, encoding='utf-8').read()
        n = pat.sub(lambda m: 'images/%s.webp' % m.group(1) if m.group(1) in done else m.group(0), s)
        if n != s:
            open(h, 'w', encoding='utf-8').write(n)
