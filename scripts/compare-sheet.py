#!/usr/bin/env python3
"""
Builds the /lab checkpoint sheets: each board view next to the matching lab
render, plus a sheet of the extra lab views. Usage:

    python3 scripts/compare-sheet.py [--renders screenshots/lab] [--out screenshots/checkpoint]
"""
import argparse
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOARD = os.path.join(ROOT, 'reference', 'harmoniq-concept.png')
# Board crops (x0, y0, x1, y1) in the 1254 px board.
CROPS = {
    'hero': (230, 110, 1254, 590),
    'front': (30, 600, 560, 870),
    'side': (600, 620, 1230, 870),
    'contacts': (30, 925, 790, 1225),
}
LABELS = {
    'hero': 'Hero ¾',
    'front': 'Front (board view = inner face)',
    'side': 'Side profile',
    'contacts': 'Contacts close-up',
}
PAPER = (242, 240, 236)
INK = (22, 22, 23)
STONE = (139, 135, 129)


def font(size, weight='Regular'):
    for path in (
        f'/usr/share/fonts/opentype/inter/Inter-{weight}.otf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ):
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    return ImageFont.load_default()


def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)


def board_vs_lab(renders, out):
    board = Image.open(BOARD).convert('RGB')
    cell_w, cell_h = 900, 560
    pad, head = 40, 120
    rows = list(CROPS)
    W = pad * 3 + cell_w * 2
    H = head + len(rows) * (cell_h + 70) + pad
    sheet = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 34), 'HARMONIQ · MODEL LAB CHECKPOINT', font=font(20, 'Medium'), fill=INK)
    d.text((pad, 66), 'Left: concept board (reference).  Right: real-time procedural model, /lab preset.', font=font(18), fill=STONE)
    y = head
    for key in rows:
        d.text((pad, y), LABELS[key].upper(), font=font(16, 'Medium'), fill=STONE)
        y += 34
        ref = fit(board.crop(CROPS[key]), cell_w, cell_h)
        lab_path = os.path.join(renders, f'{key}.png')
        lab = fit(Image.open(lab_path).convert('RGB'), cell_w, cell_h)
        sheet.paste(ref, (pad + (cell_w - ref.width) // 2, y + (cell_h - ref.height) // 2))
        sheet.paste(lab, (pad * 2 + cell_w + (cell_w - lab.width) // 2, y + (cell_h - lab.height) // 2))
        y += cell_h + 36
    sheet.save(out, quality=90)


def extras(renders, out, items):
    cell_w, cell_h = 720, 450
    pad, head = 40, 110
    cols = 2
    rows = (len(items) + cols - 1) // cols
    W = pad * (cols + 1) + cell_w * cols
    H = head + rows * (cell_h + 64) + pad
    sheet = Image.new('RGB', (W, H), PAPER)
    d = ImageDraw.Draw(sheet)
    d.text((pad, 34), 'HARMONIQ · LAB VIEWS', font=font(20, 'Medium'), fill=INK)
    d.text((pad, 64), 'Explode, fit underlay, dark sections and detail presets from the same model.', font=font(18), fill=STONE)
    for i, (name, label) in enumerate(items):
        cx = pad + (i % cols) * (cell_w + pad)
        cy = head + (i // cols) * (cell_h + 64)
        d.text((cx, cy), label.upper(), font=font(15, 'Medium'), fill=STONE)
        p = os.path.join(renders, f'{name}.png')
        if not os.path.exists(p):
            continue
        im = fit(Image.open(p).convert('RGB'), cell_w, cell_h)
        sheet.paste(im, (cx, cy + 30))
    sheet.save(out, quality=90)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--renders', default=os.path.join(ROOT, 'screenshots', 'lab'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'screenshots', 'checkpoint'))
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    board_vs_lab(a.renders, os.path.join(a.out, '01-board-vs-lab.jpg'))
    extras(
        a.renders,
        os.path.join(a.out, '02-lab-views.jpg'),
        [
            ('trueFront', 'True front'),
            ('top', 'Top'),
            ('module', 'Temple module — glass over the titanium sweep'),
            ('arm', 'Arm and ear rest'),
            ('side_head_1', 'Fit — construction-line head underlay'),
            ('explode_explode_1', 'Exploded view'),
            ('contacts_glow_1_bg_graphite', 'Contacts warming up — graphite section'),
            ('hero_bg_charcoal', 'Close — charcoal studio'),
        ],
    )
    print('wrote', a.out)
