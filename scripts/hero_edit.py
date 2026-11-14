"""
The hero photo edit: a warm, hazy, slightly faded look so the olive type sits on it
like ink on a print.

    python3 scripts/hero_edit.py <original.jpg> public/assets/hero-stage.jpg

1. lift the blacks toward deep olive (no pure black anywhere)
2. pull saturation down a little
3. a warm cream haze over everything, stronger at the top (the sky side)
"""
import sys

import numpy as np
from PIL import Image, ImageEnhance

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")

im = ImageEnhance.Color(im).enhance(0.82)
a = np.asarray(im).astype(np.float32) / 255

# 1. blacks → deep olive, whites stay
shadow = np.array([46, 49, 22], dtype=np.float32) / 255
a = shadow + a * (1 - shadow * 0.9)

# 3. warm cream haze: 16% overall, up to 30% toward the top
cream = np.array([243, 238, 220], dtype=np.float32) / 255
h = a.shape[0]
ramp = np.linspace(0.30, 0.14, h).reshape(h, 1, 1)
a = a * (1 - ramp) + cream * ramp

Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)).save(out, quality=84, optimize=True, progressive=True)
print(out, im.size)
