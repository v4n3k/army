#!/usr/bin/env python3
"""Production server for the site.

Serves ./site as static files and handles POST /api/lead:
  - validates name/phone, drops honeypot hits and rate-limits by IP;
  - forwards every lead to overseas relay (which then sends to Telegram).

Environment:
  HOST            bind address (default 127.0.0.1)
  PORT            port (default 8000)
  RELAY_URL       URL of overseas relay (e.g. https://relay.example.com/lead)
  RELAY_SECRET    shared secret for relay auth
"""
from __future__ import annotations

import json
import os
import re
import threading
import time
import urllib.request
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"

MAX_BODY = 32 * 1024
RATE_LIMIT = 5          # requests
RATE_WINDOW = 60        # seconds
PHONE_RE = re.compile(r"\D")

_lock = threading.Lock()
_hits: dict[str, list[float]] = {}


def client_ip(handler: SimpleHTTPRequestHandler) -> str:
    forwarded = handler.headers.get("X-Forwarded-For", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return handler.client_address[0]


def rate_limited(ip: str) -> bool:
    now = time.time()
    with _lock:
        hits = [t for t in _hits.get(ip, []) if now - t < RATE_WINDOW]
        if len(hits) >= RATE_LIMIT:
            _hits[ip] = hits
            return True
        hits.append(now)
        _hits[ip] = hits
    return False


def normalize_phone(raw: str) -> str | None:
    digits = PHONE_RE.sub("", raw or "")
    if len(digits) == 10 and digits[0] == "9":
        digits = "7" + digits
    elif len(digits) == 11 and digits[0] == "8":
        digits = "7" + digits[1:]
    if not (11 <= len(digits) <= 15):
        return None
    return "+" + digits


def notify_telegram(lead: dict) -> None:
    """Forward lead to overseas relay, which sends it to Telegram."""
    relay_url = os.environ.get("RELAY_URL")
    secret = os.environ.get("RELAY_SECRET")
    if not relay_url or not secret:
        print("[relay] RELAY_URL or RELAY_SECRET not set, skipping", flush=True)
        return

    body = json.dumps(lead, ensure_ascii=False).encode("utf-8")

    for attempt in range(3):
        try:
            req = urllib.request.Request(
                relay_url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {secret}",
                },
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                resp.read()
            print(f"[relay] delivered on attempt {attempt + 1}", flush=True)
            return
        except Exception as exc:
            print(f"[relay] attempt {attempt + 1} failed: {exc}", flush=True)
            if attempt < 2:
                time.sleep(2 ** attempt)  # 1s, 2s между попытками

    print("[relay] CRITICAL: all attempts failed, lead LOST", flush=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def log_message(self, fmt: str, *args) -> None:
        print(f"[{self.log_date_time_string()}] {self.address_string()} {fmt % args}", flush=True)

    def end_headers(self) -> None:
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        super().end_headers()

    def copyfile(self, source, outputfile) -> None:
        try:
            super().copyfile(source, outputfile)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def do_GET(self) -> None:
        if self.path.split("?")[0] == "/health":
            self.send_json({"ok": True})
            return
        super().do_GET()

    def do_POST(self) -> None:
        if self.path.split("?")[0] != "/api/lead":
            self.send_json({"ok": False, "error": "not found"}, status=404)
            return

        ip = client_ip(self)
        if rate_limited(ip):
            self.send_json({"ok": False, "error": "too many requests"}, status=429)
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = 0
        if length <= 0 or length > MAX_BODY:
            self.send_json({"ok": False, "error": "bad body"}, status=400)
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError
        except (ValueError, UnicodeDecodeError):
            self.send_json({"ok": False, "error": "invalid json"}, status=400)
            return

        # Honeypot: pretend everything is fine, process nothing.
        if str(payload.get("hp") or "").strip():
            self.send_json({"ok": True})
            return

        name = str(payload.get("name") or "").strip()[:100]
        if len(name) < 2:
            self.send_json({"ok": False, "error": "name required"}, status=400)
            return

        phone = normalize_phone(str(payload.get("phone") or ""))
        if not phone:
            self.send_json({"ok": False, "error": "phone required"}, status=400)
            return

        utm = payload.get("utm")
        lead = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "name": name,
            "phone": phone,
            "page": str(payload.get("page") or "")[:300],
            "entry": str(payload.get("entry") or "")[:300],
            "label": str(payload.get("label") or "")[:100],
            "quiz": str(payload.get("quiz") or "")[:2000],
            "utm": utm if isinstance(utm, dict) else None,
            "elapsed_ms": payload.get("elapsed") if isinstance(payload.get("elapsed"), int) else None,
            "ip": ip,
            "ua": (self.headers.get("User-Agent") or "")[:300],
        }

        notify_telegram(lead)
        print(f"[lead] {lead['name']} {lead['phone']} {lead['page']}", flush=True)
        self.send_json({"ok": True})

    def send_json(self, data: dict, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)


def load_env(path: Path) -> None:
    """Read KEY=VALUE pairs from app/.env without overriding real env vars."""
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> None:
    load_env(ROOT / "app" / ".env")
    host = os.environ.get("HOST", "127.0.0.1")
    port = int(os.environ.get("PORT", "8000"))
    if not SITE.is_dir():
        raise SystemExit(f"site directory not found: {SITE}")

    server = ThreadingHTTPServer((host, port), Handler)
    print(f"http://{host}:{port}  (leads -> relay)", flush=True)
    if not (os.environ.get("RELAY_URL") and os.environ.get("RELAY_SECRET")):
        print("WARNING: RELAY_URL or RELAY_SECRET not set — leads won't reach Telegram.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()