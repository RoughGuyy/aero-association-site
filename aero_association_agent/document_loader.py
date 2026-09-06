"""Document extraction and chunking for club materials."""
from __future__ import annotations

import json
import re
import zipfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
from xml.etree import ElementTree as ET


TEXT_EXTENSIONS = {".txt", ".md"}
DOCX_EXTENSIONS = {".docx"}
PDF_EXTENSIONS = {".pdf"}
ASSET_EXTENSIONS = {".mp4", ".mov", ".avi", ".step", ".stp", ".stl"}
SUPPORTED_EXTENSIONS = TEXT_EXTENSIONS | DOCX_EXTENSIONS | PDF_EXTENSIONS | ASSET_EXTENSIONS


@dataclass
class ExtractedDocument:
    source: str
    path: str
    file_type: str
    status: str
    text: str
    error: str = ""


@dataclass
class DocumentChunk:
    id: str
    source: str
    path: str
    file_type: str
    status: str
    chunk_index: int
    text: str


def extract_documents(docs_dir: Path) -> list[ExtractedDocument]:
    docs: list[ExtractedDocument] = []
    if not docs_dir.exists():
        return [
            ExtractedDocument(
                source=str(docs_dir),
                path=str(docs_dir),
                file_type="missing",
                status="error",
                text="",
                error=f"资料目录不存在: {docs_dir}",
            )
        ]

    for path in sorted(p for p in docs_dir.iterdir() if p.is_file()):
        if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue
        docs.append(extract_document(path))
    return docs


def extract_document(path: Path) -> ExtractedDocument:
    suffix = path.suffix.lower()
    try:
        if suffix in DOCX_EXTENSIONS:
            text = _extract_docx(path)
            return _ok(path, "docx", text)
        if suffix in PDF_EXTENSIONS:
            text = _extract_pdf(path)
            return _ok(path, "pdf", text)
        if suffix in TEXT_EXTENSIONS:
            text = path.read_text(encoding="utf-8")
            return _ok(path, suffix.lstrip("."), text)
        if suffix in ASSET_EXTENSIONS:
            label = _asset_label(path)
            return ExtractedDocument(
                source=path.name,
                path=str(path),
                file_type=suffix.lstrip("."),
                status="asset_only",
                text=label,
            )
    except Exception as exc:  # Keep indexing alive when one file fails.
        return ExtractedDocument(
            source=path.name,
            path=str(path),
            file_type=suffix.lstrip(".") or "unknown",
            status="error",
            text=_fallback_file_text(path),
            error=str(exc),
        )

    return ExtractedDocument(
        source=path.name,
        path=str(path),
        file_type=suffix.lstrip(".") or "unknown",
        status="ignored",
        text="",
    )


def chunk_documents(documents: Iterable[ExtractedDocument], chunk_size: int = 550) -> list[DocumentChunk]:
    chunks: list[DocumentChunk] = []
    for doc in documents:
        parts = _split_text(doc.text, chunk_size=chunk_size)
        if not parts and doc.text:
            parts = [doc.text]
        for index, text in enumerate(parts):
            chunks.append(
                DocumentChunk(
                    id=f"{_safe_id(doc.source)}-{index + 1}",
                    source=doc.source,
                    path=doc.path,
                    file_type=doc.file_type,
                    status=doc.status,
                    chunk_index=index + 1,
                    text=text,
                )
            )
    return chunks


def documents_to_json(documents: list[ExtractedDocument], chunks: list[DocumentChunk]) -> dict:
    return {
        "documents": [asdict(doc) for doc in documents],
        "chunks": [asdict(chunk) for chunk in chunks],
    }


def documents_from_json(data: dict) -> tuple[list[ExtractedDocument], list[DocumentChunk]]:
    documents = [ExtractedDocument(**doc) for doc in data.get("documents", [])]
    chunks = [DocumentChunk(**chunk) for chunk in data.get("chunks", [])]
    return documents, chunks


def _ok(path: Path, file_type: str, text: str) -> ExtractedDocument:
    cleaned = _clean_text(text)
    status = "ok" if cleaned else "empty"
    return ExtractedDocument(path.name, str(path), file_type, status, cleaned)


def _extract_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml = archive.read("word/document.xml")
    root = ET.fromstring(xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for para in root.findall(".//w:p", ns):
        texts = [node.text for node in para.findall(".//w:t", ns) if node.text]
        line = "".join(texts).strip()
        if line:
            paragraphs.append(line)
    return "\n".join(paragraphs)


def _extract_pdf(path: Path) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        try:
            from PyPDF2 import PdfReader  # type: ignore
        except Exception as exc:
            raise RuntimeError("未安装 PDF 文本解析库 pypdf/PyPDF2，暂不能提取 PDF 正文") from exc

    reader = PdfReader(str(path))
    pages: list[str] = []
    for i, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append(f"[第 {i} 页]\n{text.strip()}")
    return "\n\n".join(pages)


def _asset_label(path: Path) -> str:
    kind = {
        ".mp4": "视频资料",
        ".mov": "视频资料",
        ".avi": "视频资料",
        ".step": "三维模型文件",
        ".stp": "三维模型文件",
        ".stl": "三维模型文件",
    }.get(path.suffix.lower(), "资料文件")
    return f"{kind}: {path.name}\n当前版本不解析该文件正文，但可以在相关问题中提示同学查看这个群文件。"


def _fallback_file_text(path: Path) -> str:
    return f"资料文件: {path.name}\n当前版本未能提取正文。回答相关问题时可提示同学查看该文件，并建议在群里确认细节。"


def _clean_text(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line).strip()


def _split_text(text: str, chunk_size: int) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n+", text) if p.strip()]
    chunks: list[str] = []
    current = ""
    for para in paragraphs:
        if len(current) + len(para) + 1 <= chunk_size:
            current = f"{current}\n{para}".strip()
        else:
            if current:
                chunks.append(current)
            if len(para) <= chunk_size:
                current = para
            else:
                chunks.extend(para[i : i + chunk_size] for i in range(0, len(para), chunk_size))
                current = ""
    if current:
        chunks.append(current)
    return chunks


def _safe_id(value: str) -> str:
    normalized = re.sub(r"[^0-9A-Za-z\u4e00-\u9fff]+", "-", value).strip("-")
    return normalized[:80] or "chunk"
