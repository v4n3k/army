#!/usr/bin/env python3
"""Полное удаление Яндекс.Метрики из зеркала.

Что делает:
  - вырезает сниппет счётчика (сохраняя метку входа svo_entry для будущих заявок);
  - убирает noscript-пиксель mc.yandex.ru;
  - убирает вызовы ym(...) и делает goal() пустой заглушкой;
  - правит текст cookie-плашки (аналитики больше нет).

Запуск:
    python3 scripts/strip-analytics.py            # применить
    python3 scripts/strip-analytics.py --check    # только посчитать
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "site"

BLOCK = re.compile(
    r"(?:<!-- YMH:START -->)?<!-- Yandex\.Metrika counter -->.*?"
    r"<!-- /Yandex\.Metrika counter -->(?:<!-- YMH:END -->)?",
    re.S,
)
NOSCRIPT = re.compile(
    r'<noscript><div><img src="https://mc\.yandex\.ru/watch/\d+"[^>]*></div></noscript>'
)
ENTRY = re.compile(
    r"try\{if\(!sessionStorage\.getItem\('svo_entry'\)\)"
    r"sessionStorage\.setItem\('svo_entry',location\.pathname\)\}catch\(e\)\{\}"
)
GOAL_FN = re.compile(
    r"function goal\(g\)\{try\{if\(window\.ym&&window\.__ym_id\)"
    r"ym\(window\.__ym_id,'reachGoal',g\);\}catch\(e\)\{\}\}"
)
FORM_GOAL = re.compile(
    r"\s*try\{ if\(window\.ym&&window\.__ym_id\) "
    r"ym\(window\.__ym_id,'reachGoal','form_lead'\); \}catch\(err\)\{\}"
)
BANNER_OLD = (
    "Мы используем файлы cookie и Яндекс.Метрику для работы сайта и статистики."
)
BANNER_NEW = "Мы используем файлы cookie для работы сайта."


def process(path: Path, apply: bool) -> bool:
    html = path.read_text(encoding="utf-8", errors="surrogateescape")

    def drop_block(m: re.Match[str]) -> str:
        entry = ENTRY.search(m.group(0))
        return f"<script>{entry.group(0)}</script>" if entry else ""

    new = BLOCK.sub(drop_block, html)
    new = NOSCRIPT.sub("", new)
    new = GOAL_FN.sub("function goal(g){}", new)
    new = FORM_GOAL.sub("", new)
    new = new.replace(BANNER_OLD, BANNER_NEW)

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

    changed = total = 0
    for path in ROOT.rglob("*.html"):
        total += 1
        changed += process(path, apply)

    verb = "изменено" if apply else "будет изменено"
    print(f"HTML-файлов: {total}, {verb}: {changed}")

    leftovers = [
        p for p in ROOT.rglob("*.html")
        if "mc.yandex.ru" in p.read_text(encoding="utf-8", errors="ignore")
        or "ym(110539209" in p.read_text(encoding="utf-8", errors="ignore")
    ]
    print(f"Остатков Метрики: {len(leftovers)}")
    for p in leftovers[:10]:
        print("  ", p.relative_to(ROOT))
    return 0 if not leftovers else 1


if __name__ == "__main__":
    raise SystemExit(main())
