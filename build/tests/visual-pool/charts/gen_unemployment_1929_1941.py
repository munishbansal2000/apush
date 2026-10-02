#!/usr/bin/env python3
"""Fixed-seed generator for the U.S. unemployment rate chart 1929-1941.

Original artwork for the visual MCQ pool (pr25e-test3-q37..q40). Data are
historical BLS annual unemployment rates (facts, not copyrightable); the
rendering is original. Run: python3 gen_unemployment_1929_1941.py
Writes: unemployment-1929-1941.svg (same directory).
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# BLS historical annual unemployment rates, percent (public facts).
YEARS = [1929, 1930, 1931, 1932, 1933, 1934, 1935, 1936, 1937, 1938, 1939, 1940, 1941]
RATES = [3.2, 8.7, 15.9, 23.6, 24.9, 21.7, 20.1, 16.9, 14.3, 19.0, 17.2, 14.6, 9.9]

fig, ax = plt.subplots(figsize=(8, 4.5))
ax.plot(YEARS, RATES, marker="o", linewidth=2, color="#1f4e79")
ax.fill_between(YEARS, RATES, alpha=0.12, color="#1f4e79")
ax.set_title("U.S. Unemployment Rate, 1929-1941", fontsize=14, fontweight="bold")
ax.set_xlabel("Year", fontsize=11)
ax.set_ylabel("Percent of labor force", fontsize=11)
ax.set_xlim(1929, 1941)
ax.set_ylim(0, 27)
ax.set_xticks(YEARS)
ax.set_xticklabels(YEARS, rotation=45, ha="right", fontsize=9)
ax.set_yticks(range(0, 28, 5))
ax.grid(axis="y", linestyle="--", alpha=0.5)
ax.annotate("Stock market crash", xy=(1929, 3.2), xytext=(1930.5, 8),
            arrowprops=dict(arrowstyle="->", color="black"), fontsize=9)
ax.annotate("Peak: ~25% (1933)", xy=(1933, 24.9), xytext=(1934.5, 24.9),
            arrowprops=dict(arrowstyle="->", color="black"), fontsize=9)
ax.annotate("1937-38 downturn", xy=(1938, 19.0), xytext=(1939.2, 22),
            arrowprops=dict(arrowstyle="->", color="black"), fontsize=9)
fig.tight_layout()
fig.savefig("unemployment-1929-1941.svg", format="svg")
print("wrote unemployment-1929-1941.svg")
