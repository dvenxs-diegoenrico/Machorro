"""
Cut Chorro out of a photo: remove the background, clean the edge, crop, save a PNG.

This is a one-off asset tool, not part of the site build. Run it locally when a new photo
needs a cut-out:

    python -m venv .venv && .venv/bin/pip install "rembg[cpu]" pillow scipy
    .venv/bin/python scripts/cutout.py public/assets/lespaul-blur.jpg public/assets/cut-lespaul.png

Options: --models a,b   segmentation models to combine (their masks are merged)
         --scale 2      upscale factor for small sources
Then add the new file to content/cutouts.ts.
"""
import argparse

import numpy as np
from PIL import Image, ImageFilter
from rembg import new_session, remove
from scipy import ndimage

parser = argparse.ArgumentParser()
parser.add_argument("src")
parser.add_argument("out")
parser.add_argument("--models", default="isnet-general-use")
parser.add_argument("--scale", type=int, default=2)
args = parser.parse_args()

image = Image.open(args.src).convert("RGB")

# 1. merge the masks from each model (one finds the person, another the guitar)
alpha = np.zeros((image.height, image.width), dtype=np.float32)
for model in args.models.split(","):
    mask = remove(image, session=new_session(model), only_mask=True)
    alpha = np.maximum(alpha, np.asarray(mask, dtype=np.float32) / 255)

# 2. harden the edge: no ghostly half-transparent areas
alpha = np.clip((alpha - 0.3) / 0.3, 0, 1)

# 3. keep only the main figure, drop stray specks
labels, count = ndimage.label(alpha > 0.5)
if count > 1:
    sizes = ndimage.sum(alpha > 0.5, labels, range(1, count + 1))
    alpha = alpha * (labels == (1 + int(np.argmax(sizes))))
alpha = ndimage.binary_fill_holes(alpha > 0.5).astype(np.float32) * np.maximum(alpha, 0.999 * (alpha > 0.5))

# 4. crop to the figure, upscale, and soften the cut by a hair
ys, xs = np.where(alpha > 0.5)
pad = 4
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0), min(xs.max() + pad, image.width), min(ys.max() + pad, image.height))
rgba = image.convert("RGBA")
rgba.putalpha(Image.fromarray((alpha * 255).astype(np.uint8)))
rgba = rgba.crop(box)
if args.scale > 1:
    rgba = rgba.resize((rgba.width * args.scale, rgba.height * args.scale), Image.LANCZOS)
r, g, b, a = rgba.split()
a = a.filter(ImageFilter.GaussianBlur(0.8)).point(lambda v: 0 if v < 96 else min(255, int((v - 96) * 2.2)))
rgba = Image.merge("RGBA", (r, g, b, a))
rgba.save(args.out, optimize=True)
print(f"{args.out}: {rgba.width}x{rgba.height}")
