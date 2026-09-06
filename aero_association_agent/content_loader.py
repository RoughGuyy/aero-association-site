"""Load publishable website content from Markdown files."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from .article_loader import _as_list, _parse_frontmatter
from .settings import CONTENT_DIR


CONTENT_KINDS = {"news", "notices", "projects"}
CONTENT_FOLDERS = {
    "news": "05_新闻与通知/活动新闻",
    "notices": "05_新闻与通知/活动通知",
    "projects": "03_项目与竞赛/项目记录",
}


@dataclass
class ContentItem:
    id: str
    kind: str
    title: str
    summary: str
    date: str
    metadata: dict[str, str]
    body: str

    def as_dict(self) -> dict:
        data: dict = {
            "id": self.id,
            "kind": self.kind,
            "title": self.title,
            "summary": self.summary,
            "date": self.date,
            "body": self.body,
        }
        data.update(self.metadata)
        for field in ("gallery", "members"):
            if field in data:
                data[field] = _as_list(data[field])
        return data


def load_public_content(kind: str) -> list[ContentItem]:
    if kind not in CONTENT_KINDS:
        raise ValueError(f"Unsupported content kind: {kind}")

    content_dir = CONTENT_DIR / CONTENT_FOLDERS[kind]
    if not content_dir.exists():
        return []

    items: list[ContentItem] = []
    for path in sorted(content_dir.glob("*.md")):
        if path.name.startswith("_"):
            continue
        item = _load_content_item(kind, path)
        if item.metadata.get("status") != "published":
            continue
        if item.metadata.get("visibility") != "public":
            continue
        items.append(item)

    items.sort(key=lambda item: (item.date, item.title), reverse=True)
    return items


def get_public_content(kind: str, content_id: str) -> ContentItem | None:
    return next((item for item in load_public_content(kind) if item.id == content_id), None)


def _load_content_item(kind: str, path: Path) -> ContentItem:
    raw = path.read_text(encoding="utf-8-sig")
    metadata, body = _parse_frontmatter(raw)
    date = (
        metadata.get("date")
        or metadata.get("event_date")
        or metadata.get("publish_date")
        or metadata.get("year")
        or ""
    )
    return ContentItem(
        id=metadata.get("id") or path.stem,
        kind=kind,
        title=metadata.get("title") or path.stem,
        summary=metadata.get("summary") or "",
        date=date,
        metadata=metadata,
        body=body.strip(),
    )
