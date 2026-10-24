#!/usr/bin/env python3
"""Локальная адаптация зеркала.

Отключает чужую Яндекс.Метрику (счётчик 110539209), чтобы локальные
просмотры не попадали в статистику владельца сайта. Всё остальное
(цели, cookie-плашка, вёрстка) остаётся как есть.

Запуск:
    python3 scripts/localize.py            # применить
    python3 scripts/localize.py --check    # только показать, что будет изменено
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site"
LOADER = "https://mc.yandex.ru/metrika/tag.js?id=110539209"
STUB = "data:text/javascript,/* metrika disabled locally */"
NOSCRIPT_RE = re.compile(
    r"<noscript><div><img src=\"https://mc\.yandex\.ru/watch/\d+\"[^>]*></div></noscript>"
)


def process(path: Path, apply: bool) -> bool:
    html = path.read_text(encoding="utf-8", errors="surrogateescape")
    new = html.replace(LOADER, STUB)
    new = NOSCRIPT_RE.sub("", new)
    if new == html:
        return False
    if apply:
        path.write_text(new, encoding="utf-8", errors="surrogateescape")
    return True


def main() -> int:
    apply = "--check" not in sys.argv
    if not ROOT.is_dir():
        print(f"Нет папки {ROOT}", file=sys.stderr)
        return 1

    changed = 0
    total = 0
    for path in ROOT.rglob("*.html"):
        total += 1
        if process(path, apply):
            changed += 1

    verb = "изменено" if apply else "будет изменено"
    print(f"HTML-файлов: {total}, {verb}: {changed}")
    if apply and changed:
        print("Метрика отключена. Откатить — перекачать зеркало (wget -N).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
