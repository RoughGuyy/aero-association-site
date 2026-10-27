"""Build and validate the public static site without extra test dependencies."""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"


def run(*command: str) -> None:
    subprocess.run(command, cwd=ROOT, check=True)


def main() -> None:
    run(sys.executable, "build_static_site.py")
    run(sys.executable, "cloudflare/build_catalog.py")
    run("node", "--test", "tests/aircraft.test.cjs", "tests/navigation.test.cjs", "tests/static-paths.test.cjs", "tests/site-guide.test.cjs", "tests/guide-worker.test.mjs")
    run(sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_site_guide.py")

    run(sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_site_structure.py")
    run(sys.executable, "-m", "unittest", "discover", "-s", "tests", "-p", "test_static_performance.py")

    records = json.loads((DIST / "api/content/news/index.json").read_text(encoding="utf-8"))["items"]
    if len(records) != 14:
        raise SystemExit(f"公开活动记录应为 14 条，实际为 {len(records)} 条")
    dates = [item["date"] for item in records]
    if dates != sorted(dates, reverse=True):
        raise SystemExit("活动记录没有按时间倒序生成")

    required = [
        "index.html",
        "assets/association-logo.png",
        "assets/cuadc-field.jpg",
        "assets/cuadc-west-team.jpg",
        "assets/drone-soccer-final-team.jpg",
        "api/content/aircraft/index.json",
    ]
    missing = [relative for relative in required if not (DIST / relative).is_file()]
    if missing:
        raise SystemExit("构建结果缺少文件：" + "、".join(missing))
    print("综合检查通过：构建成功，前端及导览接口检查通过，14 条活动记录按时间倒序生成。")


if __name__ == "__main__":
    main()
