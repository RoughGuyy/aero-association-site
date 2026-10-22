"""Build, serve and refresh the real site when local source files are saved."""
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from aero_association_agent.site_guide import GuideHandlerMixin
from aero_association_agent.settings import load_environment

DIST = ROOT / "dist"
STAGING = ROOT / ".preview-build"
PREVIOUS = ROOT / ".preview-previous"
WATCHED = [ROOT / name for name in ("网站内容", "frontend", "发布资源", "aero_association_agent")]
LOCK = threading.RLock()
revision = ""


def snapshot() -> dict[str, tuple[int, int]]:
    paths = [ROOT / "build_static_site.py", ROOT / "requirements-static.txt"]
    for folder in WATCHED:
        paths.extend(p for p in folder.rglob("*") if p.is_file() and "__pycache__" not in p.parts)
    result = {}
    for path in paths:
        try:
            stat = path.stat()
            result[str(path)] = (stat.st_mtime_ns, stat.st_size)
        except FileNotFoundError:
            pass
    return result


def rebuild() -> bool:
    global revision
    command = "import build_static_site as b; b.OUTPUT_DIR=b.PROJECT_ROOT/'.preview-build'; b.build()"
    result = subprocess.run([sys.executable, "-c", command], cwd=ROOT)
    if result.returncode:
        print("构建失败，保留上一次正常预览。修改并保存后会自动重试。", flush=True)
        return False
    with LOCK:
        # These are fixed build directories, never source or user-input folders.
        assert STAGING.resolve().parent == ROOT and PREVIOUS.resolve().parent == ROOT
        if PREVIOUS.exists():
            shutil.rmtree(PREVIOUS)
        if DIST.exists():
            DIST.rename(PREVIOUS)
        STAGING.rename(DIST)
        revision = str(time.time_ns())
        if PREVIOUS.exists():
            shutil.rmtree(PREVIOUS)
    print("预览已更新。", flush=True)
    return True


def watch() -> None:
    previous = snapshot()
    while True:
        time.sleep(0.8)
        current = snapshot()
        if current == previous:
            continue
        # Wait for an editor's save/replace sequence to settle.
        while current != previous:
            previous = current
            time.sleep(0.6)
            current = snapshot()
        rebuild()


class PreviewHandler(GuideHandlerMixin, SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        with LOCK:
            path = urlsplit(self.path).path
            if path == "/__preview_revision":
                body = json.dumps({"revision": revision}).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
                return
            if path in ("/", "/index.html"):
                body = (DIST / "index.html").read_text(encoding="utf-8")
                script = """<script>
const previewRevision = REVISION;
let checkingPreview = false;
setInterval(async () => {
  if (checkingPreview) return;
  checkingPreview = true;
  try {
    const response = await fetch('/__preview_revision', {cache: 'no-store'});
    if (response.ok && (await response.json()).revision !== previewRevision) location.reload();
  } catch (_) {} finally { checkingPreview = false; }
}, 1000);
</script>""".replace("REVISION", json.dumps(revision))
                load_environment()
                endpoint = os.getenv("AERO_GUIDE_API_URL", "/api/guide")
                guide_config = "<script>globalThis.AERO_GUIDE_API_URL=" + json.dumps(endpoint) + ";</script>"
                encoded = body.replace("</body>", guide_config + script + "</body>").encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(encoded)))
                self.end_headers()
                self.wfile.write(encoded)
                return
            super().do_GET()

    def log_message(self, format, *args):
        if "/__preview_revision" not in str(args[0]):
            super().log_message(format, *args)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    server = ThreadingHTTPServer(("127.0.0.1", args.port), PreviewHandler)
    if not rebuild() and not (DIST / "index.html").exists():
        server.server_close()
        raise SystemExit("没有可用的预览，请先修正构建错误。")
    threading.Thread(target=watch, daemon=True).start()
    print(f"自动预览：http://127.0.0.1:{args.port}/ （保持此终端运行）", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
