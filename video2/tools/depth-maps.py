#!/usr/bin/env python3
"""Depth maps for 2.5D parallax (docs/LOOK.md). For each image, writes public/depth/<image path>.png: 8-bit grayscale,
white = near, same aspect as the image (long edge capped at 2048). Uses Depth Anything V2 through transformers.

  python tools/depth-maps.py public/historic/u3e1/*.jpg            # cuda (5090) / mps (Apple) / cpu, auto
  python tools/depth-maps.py --model depth-anything/Depth-Anything-V2-Large-hf public/historic/u3e1/grenville.jpg

Install once in the Python you run it with:  pip install -r requirements-depth.txt
Existing maps are skipped unless --force; the source image hash is stored beside each map so edits re-run.
"""
import argparse, glob, hashlib, os, sys

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('images', nargs='+')
    ap.add_argument('--model', default='depth-anything/Depth-Anything-V2-Base-hf')
    ap.add_argument('--public', default=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public'))
    ap.add_argument('--max-edge', type=int, default=2048)
    ap.add_argument('--force', action='store_true')
    args = ap.parse_args()
    try:
        import torch
        from PIL import Image
        from transformers import pipeline
    except ImportError as exc:
        raise SystemExit(f'missing dependency ({exc}); run: pip install -r requirements-depth.txt')
    device = 'cuda' if torch.cuda.is_available() else 'mps' if torch.backends.mps.is_available() else 'cpu'
    estimator = None
    public = os.path.abspath(args.public)
    done = skipped = 0
    # Expand wildcards ourselves: Windows cmd passes '*.jpg' through literally.
    paths = [p for pattern in args.images for p in (sorted(glob.glob(pattern)) or [pattern])]
    for path in paths:
        src = os.path.abspath(path)
        rel = os.path.relpath(src, public)
        if rel.startswith('..'):
            raise SystemExit(f'{path} is not under {public}')
        out = os.path.join(public, 'depth', os.path.splitext(rel)[0] + '.png')
        stamp = out + '.sha256'
        digest = hashlib.sha256(open(src, 'rb').read()).hexdigest()
        if not args.force and os.path.exists(out) and os.path.exists(stamp) and open(stamp).read().strip() == digest:
            skipped += 1
            continue
        if estimator is None:
            print(f'[depth] loading {args.model} on {device}', flush=True)
            estimator = pipeline('depth-estimation', model=args.model, device=device)
        image = Image.open(src).convert('RGB')
        scale = min(1.0, args.max_edge / max(image.size))
        work = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS) if scale < 1 else image
        depth = estimator(work)['depth']  # PIL 'L' or 'I': relative inverse depth, brighter = nearer
        depth = depth.convert('F')
        lo, hi = depth.getextrema()
        depth = depth.point(lambda v: 255 * (v - lo) / (hi - lo or 1)).convert('L').resize(work.size, Image.BILINEAR)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        depth.save(out)
        open(stamp, 'w').write(digest + '\n')
        done += 1
        print(f'[depth] {rel} -> {os.path.relpath(out, public)} ({work.width}x{work.height})', flush=True)
    print(f'[depth] {done} written, {skipped} current', flush=True)

if __name__ == '__main__':
    main()
