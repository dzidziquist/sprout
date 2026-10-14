# Slices design/asset-concepts/plant-buddies-sheet.png into assets/buddies (run from repo root after: mkdir raw).
# Order per species is happy, thirsty, snoozing (ZZ has an extra pot; its snoozing one is index 3).
import sys, json
from collections import deque
from PIL import Image
import numpy as np

src = sys.argv[1]
im = np.array(Image.open(src).convert('RGBA')).astype(np.int32)
im[:, :, 3] = np.where(im[:, :, 3] < 16, 0, im[:, :, 3])
A = im[:, :, 3] > 100
rgb = im[:, :, :3] / 255.0
mx = rgb.max(2); mn = rgb.min(2)
sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
# hue in degrees
r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
d = np.maximum(mx - mn, 1e-6)
hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
colorful = A & (sat > 0.35) & (mx > 0.35)
green = colorful & (hue > 65) & (hue < 170)
potlike = colorful & ~green   # yellow / coral / blue / grape / pink pots

def components(mask):
    """4-connected components; returns label array and sizes."""
    h, w = mask.shape
    lab = np.zeros((h, w), np.int32); n = 0; sizes = [0]
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not lab[y, x]:
                n += 1; q = deque([(y, x)]); lab[y, x] = n; s = 0
                while q:
                    cy, cx = q.popleft(); s += 1
                    for ny, nx in ((cy+1,cx),(cy-1,cx),(cy,cx+1),(cy,cx-1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not lab[ny, nx]:
                            lab[ny, nx] = n; q.append((ny, nx))
                sizes.append(s)
    return lab, sizes

bands = [(7, 195), (201, 395), (398, 578), (581, 765), (790, 966)]
species = [
    ['monstera', 'pothos', 'fig', 'calathea'],
    ['snake', 'hoya', 'peace-lily', 'zz'],
    ['string-of-pearls', 'pink-princess', 'aloe', 'spider'],
    ['rubber', 'bird-of-paradise', 'basil', 'mint'],
    ['tomato', 'pepper', 'spring-onion', 'cutting'],
]
cells = [(0, 384), (384, 768), (768, 1152), (1152, 1536)]
report = {}
for ri, (y0, y1) in enumerate(bands):
    for ci, (x0, x1) in enumerate(cells):
        name = species[ri][ci]
        sub = (slice(y0, y1), slice(x0, x1))
        a = A[sub]; pl = potlike[sub]; colr = colorful[sub]
        # pot rows: rows where potlike pixels are dense
        prow = pl.sum(1)
        pot_rows = np.where(prow > 12)[0]
        pt, pb = pot_rows.min(), pot_rows.max()
        # pot columns: runs of potlike within pot rows
        prof = pl[max(pt, pb-14):pb+1].sum(0)
        runs = []; s = None
        for x, v in enumerate(prof):
            if v > 3 and s is None: s = x
            if v <= 3 and s is not None:
                if x - s > 24: runs.append((s, x))
                s = None
        if s is not None and len(prof) - s > 24: runs.append((s, len(prof)))
        # label removal: dark low-sat pixels below the pots with no colour nearby
        mask = a.copy()
        dark = a & ~colr
        below = np.zeros_like(a); below[pb+2:, :] = True
        col_dil = colr.copy()
        for _ in range(4):
            col_dil = col_dil | np.roll(col_dil, 1, 0) | np.roll(col_dil, -1, 0) | np.roll(col_dil, 1, 1) | np.roll(col_dil, -1, 1)
        mask &= ~(dark & below & ~col_dil)
        merged = []
        for rr in runs:
            if merged and rr[0] - merged[-1][1] < 14: merged[-1] = (merged[-1][0], rr[1])
            else: merged.append(rr)
        runs = merged
        if len(runs) != 3 and not (name == 'zz' and len(runs) == 4):
            w = (x1 - x0) / 3
            runs = [(int(i * w + w * 0.3), int(i * w + w * 0.7)) for i in range(3)]
            if pt is None or pb - pt < 10: pass
        report[name] = {'pots': len(runs), 'runs': runs, 'pot_rows': (int(pt), int(pb))}
        centers = [(p + q) / 2 for p, q in runs]
        edges = [0] + [int((centers[i] + centers[i+1]) / 2) for i in range(len(centers)-1)] + [x1 - x0]
        for i in range(len(runs)):
            cx0, cx1 = edges[i], edges[i+1]
            m = mask[:, cx0:cx1]
            lab, sizes = components(m)
            # main = component containing the pot centre
            pcx = int(centers[i]) - cx0; pcy = int((pt + pb) / 2)
            main = lab[pcy, pcx] or int(np.argmax(sizes))
            keep = lab == main
            # also keep small detached bits (drops, flowers, pearls) that don't touch the crop's side edges
            for k in range(1, len(sizes)):
                if k == main: continue
                ys, xs = np.where(lab == k)
                if xs.min() > 0 and xs.max() < m.shape[1] - 1 and sizes[k] < sizes[main] * 0.25:
                    keep |= lab == k
            crop = im[y0:y1, x0+cx0:x0+cx1].copy()
            crop[:, :, 3] = np.where(keep, crop[:, :, 3], 0)
            ys, xs = np.where(crop[:, :, 3] > 40)
            crop = crop[ys.min():ys.max()+1, xs.min():xs.max()+1]
            img = Image.fromarray(crop.astype(np.uint8), 'RGBA')
            side = max(img.size) + 8
            sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
            sq.paste(img, ((side - img.width) // 2, side - img.height - 4), img)
            sq.save(f'raw/{name}-{i}.png')
print(json.dumps({k: v['pots'] for k, v in report.items()}))
