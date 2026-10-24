# armia-rf.ru — локальное зеркало

Точная копия сайта `https://armia-rf.ru/`, снятая `wget` 24.10.2026.

- **493** страницы из `sitemap.xml` + 2 вне sitemap (`/privacy/`, `/stati/kak-proyti-vvk/`)
- **43 МБ**, 495 HTML-файлов
- 0 битых внутренних ссылок (проверено `scripts/check.py`)

Сайт статический: HTML + общий CSS `/assets/geo.css` + `/assets/svo-attr.js`,
картинки в `/assets/`. Шаблонизатора и CMS нет — тексты лежат прямо в HTML.

## Запуск

```bash
./scripts/serve.sh          # http://localhost:8000
```

Или вручную (формы при этом работать не будут — только статика):

```bash
cd site && python3 -m http.server 8000
```

## Структура

```
site/                 # зеркало (корень = корень сайта)
  index.html          # главная (свой инлайн-CSS ~19 КБ)
  moskva/index.html   # /moskva/
  assets/             # geo.css, svo-attr.js, картинки, фавиконы
  sitemap.xml
  robots.txt
server/
  app.py              # статика + POST /api/lead
  .env.example        # шаблон настроек (токен Telegram и chat_id)
scripts/
  serve.sh            # локальный сервер
  check.py            # проверка ссылок и полноты после правок
  strip-analytics.py  # полностью удаляет Яндекс.Метрику из всех страниц
  set-domain.sh       # замена домена перед публикацией
data/                 # leads.jsonl — заявки (в git не попадает)
wget.log              # лог скачивания
```

## Приём заявок

Формы на главной и квиз на внутренних страницах шлют JSON на `POST /api/lead`.
`server/app.py` принимает его, проверяет имя/телефон, отбрасывает honeypot и спам
(5 запросов в минуту с IP) и пишет заявку строкой в `data/leads.jsonl`.

Чтобы заявки приходили в Telegram:

```bash
cp server/.env.example server/.env
# вписать TELEGRAM_BOT_TOKEN (от @BotFather) и TELEGRAM_CHAT_ID (от @userinfobot)
./scripts/serve.sh
```

Без токена заявки всё равно сохраняются локально. Файл `data/` в `.gitignore` —
персональные данные не должны попадать в репозиторий.

## Проверка после правок

```bash
python3 scripts/check.py
```

Сверяет все URL из `sitemap.xml` с файлами на диске и ищет битые
`src` / `href` / `url()` во всех HTML и CSS.

## Что не работает в копии

| Что                                   | Почему                                                         | Что делать                                                     |
| ------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- |
| Формы заявок                          | шлют POST на `/api/lead`                                       | работают через `server/app.py`: заявки в `data/leads.jsonl`, опционально в Telegram |
| Яндекс.Метрика                        | счётчик `110539209` чужой, не нужен                            | удалена полностью через `strip-analytics.py` |
| Google Fonts                          | грузятся с `fonts.googleapis.com`                              | работает онлайн; для полного офлайна — скачать шрифты локально |
| `og:url`, `sitemap.xml`, `robots.txt` | указывают на `armia-rf.ru`                                     | `./scripts/set-domain.sh https://ваш-домен.ru`                 |
| `canonical`                           | после `wget --convert-links` стал относительным (`index.html`) | перед публикацией заменить на абсолютный URL страницы          |
| Телефоны, бренд «АРМИЯ РФ»            | чужой контент                                                  | заменить на свои перед публикацией                             |

## Обновить зеркало

Докачать только изменившееся (запускать из `site/`):

```bash
wget --mirror --convert-links --adjust-extension --page-requisites \
     --no-parent --domains=armia-rf.ru --wait=0.15 --random-wait \
     -N https://armia-rf.ru/
```

После обновления снова прогнать `strip-analytics.py` (он идемпотентен) и `check.py`.

## Правки дизайна

- Внутренние страницы (городские, выплаты, статьи, калькулятор) используют
  один общий файл `site/assets/geo.css` — стили меняются в одном месте.
- Главная (`site/index.html`) содержит свой инлайн-CSS (~19 КБ) — её правим отдельно.
- Скрипты атрибуции/UTM — `site/assets/svo-attr.js`.
