"""One public navigation tree shared by the website and its guide."""
from __future__ import annotations

import json
from urllib.parse import urlencode

from .article_loader import load_articles
from .content_loader import load_public_content
from .settings import CONTENT_DIR


def load_structure() -> dict:
    return json.loads((CONTENT_DIR / "站点结构.json").read_text(encoding="utf-8-sig"))


def navigation_index() -> dict:
    source = load_structure()
    loaded = load_articles()
    articles = {a.id: a for a in loaded}
    if len(articles) != len(loaded):
        raise ValueError("公开文章中存在重复 id")
    entries, rules, seen = [], [], set()

    def expand(node, ancestors=()):
        article = articles.get(node.get("article"))
        if node.get("article") and article is None:
            raise ValueError(f"站点结构引用不存在的文章：{node['article']}")
        for reference in node.get("references", []):
            if reference not in articles:
                raise ValueError(f"路线引用不存在的资料：{reference}")
        identifier = node.get("id") or node.get("article")
        title = node.get("title") or (article.title if article else "")
        purpose = node.get("purpose") or (article.summary if article else "")
        result = {"title": title}
        if identifier:
            if identifier in seen:
                raise ValueError(f"站点结构重复入口：{identifier}")
            seen.add(identifier)
            href = "?" + urlencode({"page": node["page"]} if "page" in node else {"article": identifier})
            if node.get("anchor"):
                href = "?page=resources#" + node["anchor"]
            entries.append({"id": identifier, "title": title, "href": href,
                            "summary": article.summary if article else node.get("summary", ""),
                            "ancestors": list(ancestors)})
            result.update(id=identifier, purpose=purpose)
            if "match" in node:
                rules.append({"id": identifier, **node["match"]})
        descendants = (*ancestors, identifier) if identifier else ancestors
        children = [expand(child, descendants) for child in node.get("children", [])]
        if kind := node.get("collection"):
            records = []
            for item in load_public_content(kind):
                record_id = f"{kind}/{item.id}"
                if record_id in seen:
                    raise ValueError(f"站点结构重复记录：{record_id}")
                seen.add(record_id)
                entries.append({"id": record_id, "title": item.title,
                                "href": "?" + urlencode({"kind": kind, "id": item.id}),
                                "summary": item.summary, "ancestors": list(descendants)})
                records.append({"id": record_id, "title": item.title, "purpose": item.summary})
            children.append({"title": {"news": "活动记录", "projects": "项目记录", "aircraft": "机型档案"}[kind], "children": records})
        if children:
            result["children"] = children
        return result

    tree = [expand(node) for node in source["pages"]]
    unplaced = set(articles) - seen - set(source["unlistedArticles"])
    if unplaced:
        raise ValueError(f"文章尚未归入站点结构：{sorted(unplaced)}")
    return {"tree": tree, "entries": entries, "rules": rules}
