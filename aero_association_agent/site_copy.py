"""Editable homepage and shared wording; only these explicit files are public."""
from __future__ import annotations

import html
import hashlib
import json
import re

from .settings import CONTENT_DIR, FRONTEND_DIR


def load_site_copy() -> dict:
    result = {}
    for key, relative in (("home", "00_首页/首页文字.json"), ("common", "公共文字.json")):
        path = CONTENT_DIR / relative
        try:
            result[key] = json.loads(path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as exc:
            raise ValueError(f"{path.name}：第 {exc.lineno} 行，第 {exc.colno} 列格式有误") from exc
    return result


def render_index() -> str:
    common = load_site_copy()["common"]
    common["资源"] = {
        key: f"/{filename}?v={hashlib.sha256((FRONTEND_DIR / filename).read_bytes()).hexdigest()[:12]}"
        for key, filename in (("样式", "styles.css"), ("脚本", "app.js"))
    }

    def replace(match):
        value = common
        for key in match[1].split("."):
            value = value[key]
        return html.escape(str(value), quote=True)

    return re.sub(r"\{\{([^{}]+)\}\}", replace, (FRONTEND_DIR / "index.html").read_text(encoding="utf-8"))
