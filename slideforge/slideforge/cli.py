"""slideforge command line: make-route, validate, plugins."""

import argparse
import sys


def _cmd_make_route(args):
    from .tools import make_route
    sys.argv = ["make-route"] + args.rest
    return make_route.main()


def _cmd_validate(args):
    from . import validate
    ok = True
    for target in args.targets:
        issues = validate.route(target)
        ok = validate.report(target, issues) and ok
    return 0 if ok else 1


def _cmd_plugins(args):
    from . import plugins
    for registry, _group in plugins._ENTRY_GROUPS:
        print(f"[{registry.kind}]")
        for name in registry.names():
            print(f"  {name}")
    return 0


def _cmd_gen(args):
    from . import gen as gen_mod
    out = gen_mod.generate(args.prompt, args.out, provider=args.provider)
    print(f"wrote {out}")
    return 0


def _cmd_fetch(args):
    from . import assets
    if args.search:
        for t in assets.search(args.search, limit=args.limit):
            print(t)
        return 0
    out, lic = assets.download(args.title, args.out)
    print(f"wrote {out} [{lic}]")
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="slideforge",
                                 description="Animated slide-video engine")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("make-route",
                       help="map + places -> animated route video")
    p.add_argument("rest", nargs=argparse.REMAINDER,
                   help="args for tools/make_route.py (see --help there)")
    p.set_defaults(fn=_cmd_make_route)

    p = sub.add_parser("validate", help="validate route JSON files")
    p.add_argument("targets", nargs="+", help="route name or .json path")
    p.set_defaults(fn=_cmd_validate)

    p = sub.add_parser("plugins", help="list registered plugins")
    p.set_defaults(fn=_cmd_plugins)

    p = sub.add_parser("gen", help="generate an image asset")
    p.add_argument("prompt", help="image prompt")
    p.add_argument("--out", required=True, help="output image path")
    p.add_argument("--provider", default="auto",
                   help="gen plugin: auto|agent|openai")
    p.set_defaults(fn=_cmd_gen)

    p = sub.add_parser("fetch", help="fetch a Wikimedia Commons file")
    p.add_argument("--search", default=None, help="search query (lists titles)")
    p.add_argument("--title", default=None, help="Commons file title")
    p.add_argument("--out", default=None, help="output path (for --title)")
    p.add_argument("--limit", type=int, default=5)
    p.set_defaults(fn=_cmd_fetch)

    args = ap.parse_args(argv)
    if args.cmd == "make-route" and args.rest[:1] == ["--"]:
        args.rest = args.rest[1:]
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
