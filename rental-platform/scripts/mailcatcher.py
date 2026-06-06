#!/usr/bin/env python3
"""mailcatcher.py — a tiny dependency-free mail server for end-to-end tests.

It accepts SMTP on one port (so the backend can "send" magic-link / admin-validation
emails to it) and exposes the captured messages over a small HTTP/JSON API on another,
so a test script (e.g. host_journey.py) can read the link out of the email.

Point the backend at it (local/staging only — not prod):
    SMTP_HOST=127.0.0.1  SMTP_PORT=1025  SMTP_SECURE=false
    # (clear SMTP_URL / SendGrid settings so nodemailer uses host:port)

Run:
    python3 rental-platform/scripts/mailcatcher.py            # SMTP :1025, HTTP :1080
    SMTP_PORT=2525 HTTP_PORT=8025 python3 .../mailcatcher.py

HTTP API:
    GET    /messages                 -> all captured messages (newest first)
    GET    /messages?to=foo@bar      -> filter by recipient substring
    GET    /messages/latest?to=...   -> the newest matching message (404 if none)
    DELETE /messages                 -> clear the mailbox
Each message: {id, from, to:[...], subject, text, links:[...], date, raw}
"""
import json
import os
import re
import socketserver
import threading
import time
from email.parser import Parser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

SMTP_PORT = int(os.getenv("SMTP_PORT", "1025"))
HTTP_PORT = int(os.getenv("HTTP_PORT", "1080"))

_messages = []
_lock = threading.Lock()
_counter = [0]
_URL_RE = re.compile(r"https?://[^\s\"'<>)\]]+")


def _store(mail_from, rcpts, raw_data):
    msg = Parser().parsestr(raw_data)
    # Prefer the text/plain part; fall back to the whole payload.
    text = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                try:
                    text = part.get_payload(decode=True).decode("utf-8", "replace")
                except Exception:
                    text = part.get_payload()
                break
        if not text:
            text = raw_data
    else:
        try:
            text = msg.get_payload(decode=True).decode("utf-8", "replace")
        except Exception:
            text = msg.get_payload()
    with _lock:
        _counter[0] += 1
        entry = {
            "id": _counter[0],
            "from": mail_from,
            "to": rcpts,
            "subject": msg.get("Subject", ""),
            "text": text,
            "links": _URL_RE.findall(text or "") + _URL_RE.findall(raw_data or ""),
            "date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "raw": raw_data,
        }
        _messages.append(entry)
    print(f"[mailcatcher] captured #{entry['id']} to={rcpts} subject={entry['subject']!r} links={len(entry['links'])}")


class SMTPHandler(socketserver.StreamRequestHandler):
    """Minimal RFC-5321 subset: enough for nodemailer to deliver a message."""

    def _send(self, line):
        self.wfile.write((line + "\r\n").encode())

    def handle(self):
        self._send("220 mailcatcher ready")
        mail_from, rcpts = "", []
        while True:
            line = self.rfile.readline()
            if not line:
                break
            cmd = line.decode("utf-8", "replace").strip()
            up = cmd.upper()
            if up.startswith("EHLO") or up.startswith("HELO"):
                self._send("250 mailcatcher")
            elif up.startswith("MAIL FROM"):
                mail_from = cmd[cmd.find(":") + 1:].strip().strip("<>")
                self._send("250 OK")
            elif up.startswith("RCPT TO"):
                rcpts.append(cmd[cmd.find(":") + 1:].strip().strip("<>"))
                self._send("250 OK")
            elif up == "DATA":
                self._send("354 End data with <CR><LF>.<CR><LF>")
                buf = []
                while True:
                    dl = self.rfile.readline()
                    if not dl or dl == b".\r\n" or dl == b".\n":
                        break
                    s = dl.decode("utf-8", "replace")
                    if s.startswith(".."):
                        s = s[1:]
                    buf.append(s)
                _store(mail_from, rcpts, "".join(buf))
                self._send("250 OK: queued")
                mail_from, rcpts = "", []
            elif up == "RSET":
                mail_from, rcpts = "", []
                self._send("250 OK")
            elif up == "NOOP":
                self._send("250 OK")
            elif up == "QUIT":
                self._send("221 Bye")
                break
            else:
                self._send("250 OK")


class ThreadingTCP(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


class HTTPHandler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

    def _json(self, code, payload):
        body = json.dumps(payload).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        to = (q.get("to") or [""])[0]
        with _lock:
            items = list(reversed(_messages))
        if to:
            items = [m for m in items if any(to in r for r in m["to"])]
        if u.path == "/messages":
            self._json(200, items)
        elif u.path == "/messages/latest":
            if items:
                self._json(200, items[0])
            else:
                self._json(404, {"error": "no message"})
        else:
            self._json(404, {"error": "not found"})

    def do_DELETE(self):
        if urlparse(self.path).path == "/messages":
            with _lock:
                _messages.clear()
            self._json(200, {"ok": True, "cleared": True})
        else:
            self._json(404, {"error": "not found"})


def main():
    smtp = ThreadingTCP(("0.0.0.0", SMTP_PORT), SMTPHandler)
    http = ThreadingHTTPServer(("0.0.0.0", HTTP_PORT), HTTPHandler)
    threading.Thread(target=smtp.serve_forever, daemon=True).start()
    print(f"[mailcatcher] SMTP on :{SMTP_PORT}  |  HTTP API on :{HTTP_PORT}")
    print(f"[mailcatcher] point the backend at SMTP_HOST=127.0.0.1 SMTP_PORT={SMTP_PORT} SMTP_SECURE=false")
    try:
        http.serve_forever()
    except KeyboardInterrupt:
        print("\n[mailcatcher] shutting down")


if __name__ == "__main__":
    main()
