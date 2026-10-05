"""Shared HTML/CSS renderer for APUSH video beats.

One visual system across episodes: parameterized header/footer, fixed
1920x1080 stage. Episode identity comes from the beat sheet, not the code.
"""
import os

CSS = """
*{margin:0;padding:0;box-sizing:border-box}
body{width:1920px;height:1080px;color:#f2ede3;font-family:'Noto Sans',sans-serif;position:relative;overflow:hidden;background:#0b0e14}
.imgbg{position:absolute;inset:-60px;background-size:cover;background-position:center;z-index:1}
.scrim{position:absolute;inset:0;z-index:2;
background:linear-gradient(180deg,rgba(5,7,10,0.55) 0%,rgba(5,7,10,0.15) 28%,rgba(5,7,10,0.10) 55%,rgba(5,7,10,0.82) 100%)}
.topbar{position:absolute;top:0;left:0;right:0;display:flex;justify-content:space-between;
padding:44px 90px;font-size:26px;letter-spacing:8px;color:#d9a441;font-weight:600;z-index:5}
.topbar .r{color:#cfd4dc;letter-spacing:6px}
.rule{position:absolute;top:110px;left:90px;right:90px;height:2px;background:linear-gradient(90deg,#d9a441,rgba(217,164,65,0));z-index:5}
.body{position:absolute;top:170px;left:90px;right:90px;bottom:150px;display:flex;flex-direction:column;justify-content:center;z-index:4;
text-shadow:0 2px 18px rgba(0,0,0,0.85),0 1px 4px rgba(0,0,0,0.9)}
h1{font-family:'Noto Serif',serif;font-size:120px;line-height:1.08;font-weight:700;color:#faf6ec}
h1 .gold{color:#e8b34b}
.sub{margin-top:28px;font-size:38px;color:#e6e9ef;line-height:1.5;max-width:1500px}
.kicker{font-size:28px;letter-spacing:10px;color:#e8b34b;margin-bottom:24px;font-weight:600}
ul{list-style:none;margin-top:8px}
li{font-size:36px;line-height:1.5;margin:20px 0;color:#f0ece0;padding-left:56px;position:relative}
li::before{content:"";position:absolute;left:8px;top:20px;width:16px;height:16px;border-radius:50%;background:#e8b34b}
li.dim{color:#9aa1ad} li.dim::before{background:#5d6575}
.big{font-family:'Noto Serif',serif;font-size:92px;line-height:1.25;color:#faf6ec}
.big .gold{color:#e8b34b}
.quote{font-family:'Noto Serif',serif;font-size:88px;line-height:1.3;color:#faf6ec;font-style:italic}
.quote .gold{color:#e8b34b;font-style:normal}
.qa{font-size:46px;line-height:1.6}
.qa .a{color:#e8b34b;font-weight:600}
.capcard{position:absolute;left:90px;right:90px;bottom:110px;z-index:4;background:rgba(10,13,19,0.72);
border:1px solid rgba(232,179,75,0.4);border-radius:18px;padding:34px 44px}
.capcard h2{font-family:'Noto Serif',serif;font-size:58px;color:#e8b34b;margin-bottom:8px;text-shadow:none}
.capcard p{font-size:31px;color:#eef0f3;line-height:1.55;text-shadow:none}
.cols3{display:flex;gap:36px;margin-top:26px}
.col{flex:1;background:rgba(10,13,19,0.55);border:1px solid rgba(232,179,75,0.35);border-radius:16px;padding:30px 28px}
.col h3{font-family:'Noto Serif',serif;font-size:44px;color:#e8b34b;margin-bottom:12px}
.col p{font-size:28px;color:#eef0f3;line-height:1.5}
.foot{position:absolute;bottom:40px;left:90px;right:90px;display:flex;justify-content:space-between;
font-size:24px;letter-spacing:5px;color:#aeb4bf;z-index:5;text-shadow:0 1px 6px rgba(0,0,0,0.9)}
"""


def kb_html(webp_rel, inner, caption=None, transparent=False, meta=None):
    """Build the full 1920x1080 beat HTML.

    webp_rel: image path relative to the shots dir (or "" for none).
    inner: HTML for the .body region.
    caption: optional (title, text) bottom card; replaces body text.
    transparent: True for pan beats (text-only overlay, bg rendered separately).
    meta: dict with unit, episode, subject, tag for header/footer.
    """
    meta = meta or {}
    unit = meta.get("unit", 1)
    ep = meta.get("episode_num", 1)
    subject = meta.get("subject", "")
    tag = meta.get("tag", "")
    cap = ""
    if caption:
        title, text = caption
        cap = f'<div class="capcard"><h2>{title}</h2><p>{text}</p></div>'
        body_inner = ""
    else:
        body_inner = inner
    if webp_rel:
        bgdiv = "" if transparent else f'<div class="imgbg" style="background-image:url(\'{webp_rel}\')"></div>'
    else:
        bgdiv = ""
    bgcss = "background:transparent;" if transparent else "background:#0b0e14;"
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{CSS}</style></head><body>
{bgdiv}<div class="scrim"></div>
<div class="topbar"><span>APUSH AUDIO</span><span class="r">UNIT {unit} \u00b7 EPISODE {ep}</span></div><div class="rule"></div>
<div class="body">{body_inner}</div>{cap}
<div class="foot"><span>{subject}</span><span>{tag}</span></div>
<style>body{{{bgcss}}}</style></body></html>"""
