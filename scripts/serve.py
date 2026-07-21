#!/usr/bin/env python3
"""
Local dev server for ai-engineering-from-scratch (fork).

Serves the repo root directory on port 8000 and provides a POST /api/progress
endpoint so changes made in the web UI automatically sync directly to
progress.json in real time.

Usage:
    python scripts/serve.py [port]
"""

import http.server
import json
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROGRESS_PATH = os.path.join(REPO_ROOT, "progress.json")


class ProgressHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=REPO_ROOT, **kwargs)

    def do_POST(self):
        if self.path == "/api/progress" or self.path == "/site/api/progress":
            try:
                length = int(self.headers.get("Content-Length", 0))
                raw_body = self.rfile.read(length)
                payload = json.loads(raw_body.decode("utf-8"))

                if not isinstance(payload, dict) or "lessons" not in payload:
                    self._send_json({"error": "Invalid progress payload"}, status=400)
                    return

                # Write formatted JSON to progress.json
                with open(PROGRESS_PATH, "w", encoding="utf-8") as f:
                    json.dump(payload, f, indent=2, ensure_ascii=False)
                    f.write("\n")

                self._send_json({"ok": True, "updatedAt": payload.get("updatedAt", 0)})
            except Exception as e:
                self._send_json({"error": str(e)}, status=500)
        else:
            self.send_error(404, "Not Found")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)


def run():
    if hasattr(sys.stdout, "reconfigure"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, ProgressHandler)
    print("=" * 64)
    print(f"Serving ai-engineering-from-scratch at http://localhost:{PORT}")
    print(f"Catalog: http://localhost:{PORT}/site/catalog.html")
    print(f"Roadmap: http://localhost:{PORT}/site/prereqs.html")
    print(f"Auto-save API enabled: POST /api/progress -> writes progress.json")
    print("=" * 64)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
        sys.exit(0)


if __name__ == "__main__":
    run()
