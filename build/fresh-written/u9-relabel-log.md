# U9 period audit log — 2026-10-02

Audited all 179 bank U9 MCQs (bank = build/reclaim-merged/staged/** + build/fresh-written/*.json)
for period mislabeling: does the item's substance belong in Period 9 (1980–present)
or Period 8 (1945–1980)?

## Relabeled (3)

| id | field changes | reason |
|---|---|---|
| original-u9-deindust-v2-13 | period U9→U8, topic_code 9.4→8.14 | Stem asks why 1970s stagflation broke the Keynesian playbook — substance is the 1970s economic crisis, taught under Period 8 (8.14 Society in Transition). |
| original-u9-deindust-v2-14 | period U9→U8, topic_code 9.2→8.14 | Stem asks how the 1970s economic breakdown set up later politics — the tested knowledge is the 1970s itself (8.14 Society in Transition). |
| original-u9-deindust-v2-27 | period U9→U8, topic_code 9.4→8.4 | Stem asks what the postwar industrial bargain looked like "at its height" (1950s–c.1970) — that bargain is Period 8 content (8.4 Economy after 1945). |

Topic codes verified against build/cb-codes.json (official list): 8.14 "Society in Transition",
8.4 "Economy after 1945". Unit prefixes match the new period. Ids unchanged (stay unique).

## Reviewed and KEPT as U9 (176)

- build/fresh-written/u9-gaps.json: 137 remaining items — all genuinely post-1980:
  immigration batch (24, incl. 1965-act items — post-1965 immigration is CED Topic 9.5),
  Cold War endgame batch (28, 1983–1991), 21st-century batch (30), Reagan batch (32),
  deindustrialization batch (23 — long process anchored post-1980, CED Topic 9.4).
  Borderline keeps: immig-16 (1970 low point as baseline for the post-1965 wave),
  immig-04/09/14/22 (cross-era comparisons anchored in 1990s/2000s).
- build/fresh-written/contextualization.json: 13/13 kept — all post-1980 (PATCO, Berlin Wall,
  NAFTA, Patriot Act, 2008 crisis, ACA, Obergefell, Bush v. Gore, Iraq, welfare reform, Tea Party).
- build/reclaim-merged/staged/**: 26/26 kept — book chapters on Reagan→present
  (Contract with America, Cold War end, Clinton, Greenspan, religious right, 9/11, Trump, Ferraro 1984, Gulf War, Patriot Act).

## Result

U9: 179 → 176 items. U8: 90 → 93 items. The remaining U9 overweight is genuine
Period 9 content, not mislabeling — see coverage report for the residual math.
