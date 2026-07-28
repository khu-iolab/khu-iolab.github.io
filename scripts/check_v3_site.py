"""Integrity check for the v3.0 production pages."""
import re
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "members.html", "research.html", "publications.html",
         "projects.html", "courses.html", "community.html"]
REDIRECTS = ["team.html", "news.html", "photos.html", "contact.html"]
LEFTOVERS = ["<x-dc", "<sc-", "data-dc-script", "support.js", "{{"]


def check_page(name, html, errors):
    for bad in LEFTOVERS:
        if bad in html:
            errors.append(f"{name}: leftover canvas artifact {bad!r}")
    if "<title>" not in html:
        errors.append(f"{name}: missing <title>")
    if '<html lang="ko">' not in html:
        errors.append(f'{name}: missing <html lang="ko">')
    refs = re.findall(r'(?:href|src)="([^"]+)"', html)
    refs += re.findall(r"url\(['\"]?([^'\")]+)['\"]?\)", html)
    for url in refs:
        if url.startswith(("http://", "https://", "mailto:", "#", "data:")):
            continue
        target = url.split("#")[0].split("?")[0]
        if target and not (ROOT / target).exists():
            errors.append(f"{name}: broken local ref {url}")


def main():
    errors = []
    for name in PAGES + REDIRECTS:
        path = ROOT / name
        if not path.exists():
            errors.append(f"{name}: file missing")
            continue
        check_page(name, path.read_text(encoding="utf-8"), errors)
    for name in REDIRECTS:
        path = ROOT / name
        if path.exists() and 'http-equiv="refresh"' not in path.read_text(encoding="utf-8"):
            errors.append(f"{name}: expected a meta-refresh redirect stub")
    if errors:
        print("\n".join(errors))
        sys.exit(1)
    print(f"OK: {len(PAGES)} pages + {len(REDIRECTS)} redirects clean")


if __name__ == "__main__":
    main()
