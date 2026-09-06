"""Load curated knowledge articles from Markdown files."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .document_loader import ExtractedDocument
from .settings import CONTENT_DIR


@dataclass
class Article:
    id: str
    title: str
    section: str
    subsection: str | None
    order: int
    summary: str
    tags: list[str]
    source_refs: list[str]
    media: list[dict]
    path: str
    body: str


def article_paths() -> list[Path]:
    return sorted(path for path in CONTENT_DIR.rglob("*.md")
                  if not path.name.startswith("_") and path.name != "README.md"
                  and not {"活动新闻", "活动通知", "项目记录"}.intersection(path.parts))


def load_articles() -> list[Article]:
    articles = [_load_article(path) for path in article_paths()]
    articles.sort(key=lambda item: (item.order, item.section, item.title))
    return articles


def get_article(article_id: str) -> Article | None:
    for article in load_articles():
        if article.id == article_id:
            return article
    return None


def article_documents() -> list[ExtractedDocument]:
    docs: list[ExtractedDocument] = []
    for article in load_articles():
        section_label = article.section
        if article.subsection:
            section_label += f" / {article.subsection}"
        body = re.sub(r" +\{#[\w-]+\}", "", article.body)
        text = (
            f"# {article.title}\n"
            f"栏目：{section_label}\n"
            f"摘要：{article.summary}\n"
            f"标签：{'、'.join(article.tags)}\n\n"
            f"{body}"
        )
        docs.append(
            ExtractedDocument(
                source=f"知识库-{article.title}.md",
                path=f"article://{article.id}",
                file_type="article",
                status="ok",
                text=text,
            )
        )
    return docs


def article_tree() -> list[dict]:
    sections: dict[str, list[dict]] = {}
    for article in load_articles():
        sections.setdefault(article.section, []).append(
            {
                "id": article.id,
                "title": article.title,
                "subsection": article.subsection,
                "summary": article.summary,
                "tags": article.tags,
                "order": article.order,
            }
        )
    return [
        {"section": section, "articles": articles}
        for section, articles in sections.items()
    ]


def _load_article(path: Path) -> Article:
    raw = path.read_text(encoding="utf-8-sig")
    metadata, body = _parse_frontmatter(raw)
    article_id = metadata.get("id") or path.stem
    subsection = metadata.get("subsection") or None
    return Article(
        id=article_id,
        title=metadata.get("title") or path.stem,
        section=metadata.get("section") or "未分类",
        subsection=subsection if subsection else None,
        order=int(metadata.get("order") or 999),
        summary=metadata.get("summary") or "",
        tags=_as_list(metadata.get("tags")),
        source_refs=_as_list(metadata.get("source_refs")),
        media=_parse_media(metadata.get("media")),
        path=str(path),
        body=body.strip(),
    )


def _parse_frontmatter(raw: str) -> tuple[dict[str, str], str]:
    if not raw.startswith("---"):
        return {}, raw
    match = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", raw, re.DOTALL)
    if not match:
        return {}, raw
    meta_text, body = match.groups()
    metadata: dict[str, str] = {}
    current_key = ""
    current_lines: list[str] = []
    for line in meta_text.splitlines():
        if re.match(r"^[A-Za-z_][A-Za-z0-9_]*:", line):
            if current_key:
                metadata[current_key] = "\n".join(current_lines).strip()
            key, value = line.split(":", 1)
            current_key = key.strip()
            current_lines = [value.strip()]
        elif current_key:
            current_lines.append(line.strip())
    if current_key:
        metadata[current_key] = "\n".join(current_lines).strip()
    return metadata, body


def _as_list(value: str | None) -> list[str]:
    if not value:
        return []
    text = value.strip()
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    return [item.strip().strip("'\"") for item in text.split(",") if item.strip()]


def _parse_media(value: str | None) -> list[dict]:
    if not value:
        return []
    media: list[dict] = []
    for line in value.splitlines():
        line = line.strip().lstrip("-").strip()
        if not line:
            continue
        parts = {}
        for item in line.split(";"):
            if "=" in item:
                key, val = item.split("=", 1)
                parts[key.strip()] = val.strip()
        if parts:
            media.append(parts)
    return media
