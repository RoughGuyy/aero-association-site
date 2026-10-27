"""Build responsive images, used-character fonts and directly readable pages."""
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import parse_qsl, unquote, urlencode, urlsplit

from PIL import Image, ImageOps
from fontTools import subset
from fontTools.ttLib import TTFont


def optimize(output: Path, sources: list[tuple[Path, Path]], texts: list[str]) -> None:
    root = Path(__file__).resolve().parents[1]
    cache = root / '.asset-cache'
    cache.mkdir(exist_ok=True)
    images = {}
    used_cache = set()
    for source, relative in sources:
        if source.suffix.lower() not in {'.jpg', '.jpeg', '.png', '.webp'}:
            continue
        with Image.open(source) as original:
            if original.format in ('GIF', 'PNG', 'WEBP') and getattr(original, 'is_animated', False):
                continue
            image = ImageOps.exif_transpose(original)
            width, height = image.size
            digest = hashlib.sha256(source.read_bytes() + b'webp-84-v1').hexdigest()[:20]
            variants = []
            for size in sorted({min(width, limit) for limit in (480, 960, 1600)}):
                name = f'{digest}-{size}.webp'
                saved = cache / name
                used_cache.add(name)
                if not saved.exists():
                    resized = image.copy()
                    resized.thumbnail((size, max(1, round(height * size / width))), Image.Resampling.LANCZOS)
                    if resized.mode not in ('RGB', 'RGBA'):
                        resized = resized.convert('RGBA' if 'transparency' in resized.info else 'RGB')
                    resized.save(saved, 'WEBP', quality=84, method=4, lossless=width <= 300)
                destination = output / 'images' / name
                destination.parent.mkdir(exist_ok=True)
                shutil.copy2(saved, destination)
                variants.append((f'images/{name}', size))
            images[relative.as_posix()] = (width, height, variants)

    styles_path = output / 'styles.css'
    styles = styles_path.read_text(encoding='utf-8')
    characters = ''.join(sorted(set(''.join(texts) + (root / 'frontend/app.js').read_text(encoding='utf-8'))))
    for source, relative in sources:
        if source.suffix.lower() != '.woff2':
            continue
        digest = hashlib.sha256(source.read_bytes() + characters.encode()).hexdigest()[:20]
        name = f'{source.stem}-{digest}.woff2'
        saved = cache / name
        used_cache.add(name)
        if not saved.exists():
            font = TTFont(source)
            options = subset.Options()
            options.flavor = 'woff2'
            sub = subset.Subsetter(options=options)
            sub.populate(text=characters)
            sub.subset(font)
            font.save(saved)
            font.close()
        shutil.copy2(saved, output / 'fonts' / name)
        styles = styles.replace(relative.as_posix(), f'fonts/{name}')
        # Full fonts stay in the source repository, not in the published payload.
        (output / relative).unlink()
    styles_path.write_text(styles, encoding='utf-8')

    result = subprocess.run(['node', str(root / 'scripts/render_pages.cjs'), str(output)],
                            capture_output=True, encoding='utf-8', check=True)
    pages = json.loads(result.stdout)
    routes = {file: page['query'] for file, page in pages.items()}
    by_query = {query: file for file, query in routes.items()}

    def link(match):
        raw = html.unescape(match[1])
        parsed = urlsplit(raw)
        if raw in ('/', './'):
            return 'href="index.html"'
        if parsed.scheme or parsed.netloc or parsed.path not in ('', '/', './') or not parsed.query:
            return match[0]
        params = dict(parse_qsl(parsed.query))
        keys = ['article'] if 'article' in params else ['kind', 'id'] if 'kind' in params else ['page']
        query = '&'.join(f'{key}={params.get(key, "")}' for key in keys)
        if 'article' in params and 'route' in params:
            prefix = query + '&route=' + params['route'] + '&return='
            contextual = prefix + params.get('return', '')
            if contextual not in by_query:
                contextual = next((key for key in by_query if key.startswith(prefix)), '')
            if contextual:
                query = contextual
                keys += ['route', 'return']
        if query not in by_query:
            return match[0]
        remaining = {key: value for key, value in params.items() if key not in keys}
        target = by_query[query] + ('?' + urlencode(remaining) if remaining else '')
        target += '#' + parsed.fragment if parsed.fragment else ''
        return f'href="{html.escape(target, quote=True)}"'

    def picture(match):
        tag = match[0]
        src = re.search(r'\bsrc="([^"]+)"', tag)
        if not src:
            return tag
        path = unquote(urlsplit(html.unescape(src[1])).path).lstrip('/')
        if path not in images:
            return tag
        width, height, variants = images[path]
        tag = tag.replace(src[0], f'src="{variants[-1][0]}"')
        sizes = '(max-width: 640px) 100vw, (max-width: 1080px) 80vw, 960px'
        if 'fetchpriority="high"' in tag:
            sizes = '100vw'
        elif 'card-photo' in tag or 'stream-thumb' in tag:
            sizes = '(max-width: 640px) 100vw, (max-width: 1080px) 50vw, 480px'
        tag = tag[:-1] + f' srcset="{", ".join(f"{name} {size}w" for name, size in variants)}" sizes="{sizes}" decoding="async">'
        if not re.search(r'\bwidth=', tag):
            tag = tag[:-1] + f' width="{width}" height="{height}">'
        return tag

    template = (output / 'index.html').read_text(encoding='utf-8')
    style_version = hashlib.sha256(styles.encode()).hexdigest()[:12]
    template = re.sub(r'styles\.css\?v=[a-f0-9]+', f'styles.css?v={style_version}', template)
    version = hashlib.sha256(''.join(texts).encode()).hexdigest()[:12]
    template = template.replace('</head>', f'<script>globalThis.AERO_BUILD_VERSION="{version}";</script></head>')
    (output / '404.html').write_text(template, encoding='utf-8')
    config = json.dumps(routes, ensure_ascii=False).replace('<', '\\u003c')
    template = template.replace('</head>', '<script>globalThis.AERO_PRERENDERED=true;globalThis.AERO_PAGE_ROUTES=' + config + ';</script></head>')
    for file, page in pages.items():
        rendered = re.sub(r'(<main\b[^>]*>)[\s\S]*?</main>', lambda m: m[1] + page['html'] + '</main>', template, count=1)
        title = page['title'] + ' · 空天科协' if page['page'] != 'home' else '空天科协 · 电子科技大学'
        rendered = re.sub(r'<title>.*?</title>', lambda _: '<title>' + html.escape(title) + '</title>', rendered)
        rendered = re.sub(r'href="([^"]*)"', link, rendered)
        rendered = re.sub(r'<img\b[^>]*>', picture, rendered)
        # All generated documents live together, including on project-based Pages URLs.
        rendered = re.sub(r'(src|href)="/(?!/)', r'\1="', rendered)
        rendered = rendered.replace(f'data-page="{page["page"]}"', f'data-page="{page["page"]}" aria-current="page"')
        (output / file).write_text(rendered, encoding='utf-8')
    # Keep only reusable current build inputs, rather than accumulating variants forever.
    for saved in cache.iterdir():
        if saved.is_file() and saved.suffix in ('.webp', '.woff2') and saved.name not in used_cache:
            saved.unlink()
    print(f'直接可读页面 {len(pages)} 个，响应式图片 {len(images)} 张，字体按公开用字自动精简')
