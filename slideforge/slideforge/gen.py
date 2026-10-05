"""Image-generation providers: the asset-creation seam of the library.

The library never calls a model directly and never hand-makes assets.
A gen provider is ``(prompt, out_path, **opts) -> out_path``. Register one::

    from slideforge.plugins import gen

    @gen("my-backend")
    def my_backend(prompt, out_path, **opts):
        ...

Use :func:`generate` for the full step. Providers:
  agent   explicit handoff — a human or the Muse agent generates the image
          by hand and saves it to out_path (raises with instructions)
  openai  OpenAI Images API (needs OPENAI_API_KEY)
"""

import json
import os
import urllib.request
from pathlib import Path

from .plugins import gen as _gen_deco, gen_registry


@_gen_deco("agent")
def _gen_agent(prompt, out_path, **opts):
    raise RuntimeError(
        "gen='agent': generate an image for this prompt and save it to "
        f"{out_path}\nPROMPT: {prompt}")


@_gen_deco("openai")
def _gen_openai(prompt, out_path, size="1536x1024", model="gpt-image-1",
                **opts):
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY not set")
    body = {"model": model, "prompt": prompt, "size": size}
    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json",
                 "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = json.loads(r.read())["data"][0]
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    if "b64_json" in data:
        import base64
        out.write_bytes(base64.b64decode(data["b64_json"]))
    else:  # url
        with urllib.request.urlopen(data["url"], timeout=300) as r:
            out.write_bytes(r.read())
    return str(out)


def autodetect():
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    return "agent"


def generate(prompt, out_path, provider="auto", **opts):
    """Generate an image with `provider` and save it to out_path."""
    if provider == "auto":
        provider = autodetect()
    fn = gen_registry.get(provider)
    return fn(prompt, str(out_path), **opts)
