"""Runtime settings for the aerospace association assistant."""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
INDEX_PATH = DATA_DIR / "knowledge_index.json"
CONVERSATIONS_DIR = PROJECT_ROOT / "conversations"
FRONTEND_DIR = PROJECT_ROOT / "frontend"
CONTENT_DIR = PROJECT_ROOT / "网站内容"
PUBLIC_ASSETS_DIR = PROJECT_ROOT / "发布资源"
KNOWLEDGE_DIR = PUBLIC_ASSETS_DIR / "教程附件"
DEFAULT_DOCS_DIR = PROJECT_ROOT / "source_materials"

_ENV_LOADED = False


def load_environment() -> None:
    """Load project-local environment variables once."""
    global _ENV_LOADED
    if _ENV_LOADED:
        return
    load_dotenv(PROJECT_ROOT / ".env")
    _ENV_LOADED = True


def docs_dir() -> Path:
    load_environment()
    configured = os.getenv("AERO_DOCS_DIR")
    if configured:
        return Path(configured)
    return DEFAULT_DOCS_DIR


def access_code() -> str:
    load_environment()
    return os.getenv("AERO_ACCESS_CODE", "").strip()


def access_code_required() -> bool:
    return bool(access_code())


def server_host() -> str:
    load_environment()
    return os.getenv("HOST", "127.0.0.1")


def server_port() -> int:
    load_environment()
    return int(os.getenv("PORT", "8000"))
