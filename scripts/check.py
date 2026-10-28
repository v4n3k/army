#!/usr/bin/env python3
"""Проверка целостности зеркала после правок.

Проверяет:
  1. все URL из sitemap.xml есть на диске;
  2. все локальные src/href/url() в HTML и CSS указывают на существующие файлы.

Запуск: python3 scripts/check.py
"""
from __future__ import annotations

import re
import sys
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site"
SKIP = ("http://", "https://", "#", "tel:", "mailto:", "data:", "javascript:")


def local_target(base: Path, url: str) -> Path | None:
    u = urllib.parse.unquote(url.split("?")[0].split("#")[0])
    if not u:
        return None
    target = (ROOT / u.lstrip("/")) if u.startswith("/") else (base / u)
    return target / "index.html" if u.endswith("/") else target


def main() -> int:
    if not ROOT.is_dir():
        print(f"Нет папки {ROOT}", file=sys.stderr)
        return 1

    errors: list[str] = []

    sitemap = ROOT / "sitemap.xml"
    if sitemap.is_file():
        urls = re.findall(r"<loc>(.*?)</loc>", sitemap.read_text(encoding="utf-8"))
        missing = []
        for u in urls:
            p = u.replace("https://voenny-kontrakt.ru", "").strip("/")
            f = (ROOT / p / "index.html") if p else (ROOT / "index.html")
            if not f.is_file():
                missing.append(u)
        print(f"sitemap: {len(urls)} URL, нет на диске: {len(missing)}")
        errors += [f"нет страницы: {u}" for u in missing]
    else:
        print("sitemap.xml не найден — пропускаю")

    htmls = list(ROOT.rglob("*.html"))
    broken: set[tuple[str, str]] = set()
    for h in htmls:
        txt = h.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r'(?:src|href)="([^"]+)"', txt):
            u = m.group(1)
            if u.startswith(SKIP) or "'+" in u or "window." in u or "${" in u:
                continue
            t = local_target(h.parent, u)
            if t is not None and not t.exists():
                broken.add((str(h.relative_to(ROOT)), u))

    for css in list(ROOT.rglob("*.css")) + htmls:
        txt = css.read_text(encoding="utf-8", errors="ignore")
        for m in re.finditer(r"url\((['\"]?)([^)'\"]+)\1\)", txt):
            u = m.group(2).strip()
            if u.startswith(SKIP) or "'+" in u or "window." in u or "${" in u:
                continue
            t = local_target(css.parent, u)
            if t is not None and not t.exists():
                broken.add((str(css.relative_to(ROOT)), u))

    print(f"HTML: {len(htmls)}, битых локальных ссылок: {len(broken)}")
    for page, url in sorted(broken)[:20]:
        print(f"  {page} -> {url}")
    errors += [f"{p} -> {u}" for p, u in broken]

    print("\nOK" if not errors else f"\nПроблем: {len(errors)}")
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
