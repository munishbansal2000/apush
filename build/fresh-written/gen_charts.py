#!/usr/bin/env python3
"""Generate original charts for fresh-written questions (deterministic).

Reads every chart_spec in build/fresh-written/drafts/, renders PNGs to
build/fresh-written/charts/<item-id>.png with matplotlib (fixed seed).
Run: python3 gen_charts.py
"""
import glob
import json
import os

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

np.random.seed(20261002)

REPO = "/home/hatch/workspace/apush"
DRAFTS = os.path.join(REPO, "build", "fresh-written", "drafts")
OUT = os.path.join(REPO, "build", "fresh-written", "charts")
os.makedirs(OUT, exist_ok=True)

COLORS = ["#1f4e79", "#c55a11", "#548235", "#7f6000", "#2e75b6"]


def render_bar(spec, path):
    labels = spec["labels"]
    values = spec["values"]
    # values: list of series (grouped) or flat list (single)
    if values and isinstance(values[0], (list, tuple)):
        series = values
    else:
        series = [values]
    n_cat, n_ser = len(labels), len(series)
    x = np.arange(n_cat)
    width = 0.8 / n_ser
    ser_labels = spec.get("series_labels")
    fig, ax = plt.subplots(figsize=(8, 5))
    for i, s in enumerate(series):
        lbl = ser_labels[i] if ser_labels and i < len(ser_labels) else (
            f"Series {i + 1}" if n_ser > 1 else None)
        ax.bar(x + (i - (n_ser - 1) / 2) * width, s, width * 0.95,
               label=lbl, color=COLORS[i % len(COLORS)])
    ax.set_xticks(x)
    ax.set_xticklabels(labels, fontsize=10)
    ax.set_xlabel(spec.get("x_label", ""), fontsize=11)
    ax.set_ylabel(spec.get("y_label", ""), fontsize=11)
    ax.set_title(spec["title"], fontsize=13, fontweight="bold", pad=12)
    if n_ser > 1:
        ax.legend()
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def render_line(spec, path):
    labels = spec["labels"]
    values = spec["values"]
    if values and isinstance(values[0], (list, tuple)):
        series = values
    else:
        series = [values]
    fig, ax = plt.subplots(figsize=(8, 5))
    for i, s in enumerate(series):
        ax.plot(labels, s, marker="o", linewidth=2.5,
                color=COLORS[i % len(COLORS)],
                label=f"Series {i + 1}" if len(series) > 1 else None)
    ax.set_xlabel(spec.get("x_label", ""), fontsize=11)
    ax.set_ylabel(spec.get("y_label", ""), fontsize=11)
    ax.set_title(spec["title"], fontsize=13, fontweight="bold", pad=12)
    if len(series) > 1:
        ax.legend()
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(True, alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main():
    done, failed = 0, []
    patterns = ["*/mcq-batch-*.json", "*/deindust-batch-*.json"]
    for pat in patterns:
        for p in sorted(glob.glob(os.path.join(DRAFTS, pat))):
            if "_superseded" in p or "quarantined" in p:
                continue
            for q in json.load(open(p))["items"]:
                st = q.get("stimulus")
                if not (isinstance(st, dict) and st.get("kind") == "chart"):
                    continue
                spec = st["chart_spec"]
                out = os.path.join(OUT, q["id"] + ".png")
                try:
                    if spec["type"] == "bar":
                        render_bar(spec, out)
                    else:
                        render_line(spec, out)
                    done += 1
                except Exception as e:
                    failed.append((q["id"], str(e)[:100]))
    print(f"charts rendered: {done}, failed: {len(failed)}")
    for f in failed:
        print("  FAIL", f)


if __name__ == "__main__":
    main()
