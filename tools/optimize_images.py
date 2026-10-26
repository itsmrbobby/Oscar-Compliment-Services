#!/usr/bin/env python3
"""Shrinks big photos in the images/ folder so pages load fast.

Runs automatically on GitHub (see .github/workflows/optimize-images.yml) and can also be run by hand:
    python tools/optimize_images.py            # whole images/ folder
    python tools/optimize_images.py some/dir   # another folder

What it does to each .jpg / .jpeg / .png that is bigger than 100 KB or wider than the limit for its folder:
  - fixes phone rotation, removes hidden location data (EXIF), resizes if oversized, re-saves compressed;
  - only keeps the new file if it is really smaller;
  - marks the file as done, so it is never compressed twice (no quality loss on repeat runs).
Product and category pictures are limited to 900 px, everything else to 1400 px.
"""
import os, sys
from PIL import Image, ImageOps, PngImagePlugin

ROOT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'images')
MARK = 'osca-optimized'
BIG = 100 * 1024          # leave files smaller than this alone
TARGET = 110 * 1024       # aim for photos at or under this size
SKIP = {'og-share.jpg'}   # the link-preview picture is already tuned


def limit_for(rel):
    rel = rel.replace('\\', '/')
    return 900 if rel.startswith(('products/', 'categories/')) else 1400


def already_done(im):
    c = im.info.get('comment')
    if isinstance(c, bytes):
        c = c.decode('utf-8', 'ignore')
    return MARK in str(c or '') or MARK in str(im.info.get('osca', ''))


def optimise(path, rel):
    size = os.path.getsize(path)
    ext = os.path.splitext(path)[1].lower()
    with Image.open(path) as im:
        if already_done(im):
            return None
        w, h = im.size
        mx = limit_for(rel)
        if size <= BIG and max(w, h) <= mx:
            return None
        im = ImageOps.exif_transpose(im)
        if max(im.size) > mx:
            k = mx / max(im.size)
            im = im.resize((max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k))), Image.LANCZOS)
        tmp = path + '.tmp'
        if ext in ('.jpg', '.jpeg'):
            if im.mode not in ('RGB', 'L'):
                im = im.convert('RGB')
            best = None
            for q in (82, 78, 74, 70, 66):
                im.save(tmp, 'JPEG', quality=q, optimize=True, progressive=True, comment=MARK.encode())
                best = os.path.getsize(tmp)
                if best <= TARGET:
                    break
        elif ext == '.png':
            meta = PngImagePlugin.PngInfo(); meta.add_text('osca', MARK)
            im.save(tmp, 'PNG', optimize=True, pnginfo=meta)
            best = os.path.getsize(tmp)
        else:
            return None
    if best < size * 0.95:
        os.replace(tmp, path)
        return size, best
    os.remove(tmp)
    return None


def main():
    saved = changed = 0
    for dp, _, files in os.walk(ROOT):
        for f in sorted(files):
            if f.lower() in SKIP or not f.lower().endswith(('.jpg', '.jpeg', '.png')):
                continue
            p = os.path.join(dp, f); rel = os.path.relpath(p, ROOT)
            try:
                r = optimise(p, rel)
            except Exception as e:
                print('  skipped', rel, '-', e); continue
            if r:
                changed += 1; saved += r[0] - r[1]
                print(f'  {rel}: {r[0] // 1024} KB -> {r[1] // 1024} KB')
    print(f'Optimised {changed} image(s), saved {saved / 1024 / 1024:.1f} MB.')


main()
