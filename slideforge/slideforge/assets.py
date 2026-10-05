"""Asset fetching: public-domain media from Wikimedia Commons.

No API key needed. This is how maps, portraits, and other historical
images enter the library — through code, not by hand::

    from slideforge import assets
    assets.search("Henry Ford 1919 portrait")
    assets.download("File:Henry ford 1919.jpg", "assets/portraits/ford.jpg")
"""

import json
import urllib.parse
import urllib.request
from pathlib import Path

API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "slideforge/1.0 (educational video engine)"}


def _api(params):
    q = urllib.parse.urlencode(params)
    req = urllib.request.Request(API + "?" + q, headers=UA)
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def search(query, limit=5, filetype="bitmap"):
    """Search Commons files; return [file titles].

    filetype="bitmap" (default) restricts to JPEG/PNG/WebP/etc. photos;
    pass None to allow any file type.
    """
    srsearch = query if not filetype else f"{query} filetype:{filetype}"
    d = _api({"action": "query", "list": "search", "srsearch": srsearch,
              "srnamespace": 6, "srlimit": limit, "format": "json"})
    try:
        results = d["query"]["search"]
    except (KeyError, TypeError):
        raise RuntimeError(
            f"Commons API error for query {query!r}: "
            f"{d.get('error', {}).get('info', d)!r}")
    return [x["title"] for x in results]


def file_info(title):
    """Return (direct_url, license_short_name) for a Commons file title."""
    d = _api({"action": "query", "titles": title, "prop": "imageinfo",
              "iiprop": "url|extmetadata", "format": "json"})
    for p in d["query"]["pages"].values():
        if "imageinfo" in p:
            ii = p["imageinfo"][0]
            lic = ii.get("extmetadata", {}).get(
                "LicenseShortName", {}).get("value", "?")
            return ii["url"], lic
    raise ValueError(f"file not found on Commons: {title!r}")


def download(title, out_path):
    """Download a Commons file to out_path. Returns (out_path, license)."""
    url, lic = file_info(title)
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=300) as r:
        out.write_bytes(r.read())
    return str(out), lic
