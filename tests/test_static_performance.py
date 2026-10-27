"""Check the built delivery format, independent of visual styling."""
import re
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'


class Document(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.tags = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))


class StaticPerformanceTests(unittest.TestCase):
    def test_pages_are_readable_without_javascript_and_local_links_resolve(self):
        pages = list(DIST.glob('*.html'))
        self.assertGreaterEqual(len(pages), 121)
        for page in pages:
            if page.name == '404.html':
                continue
            text = page.read_text(encoding='utf-8')
            self.assertNotIn('正在加载内容…', text, page.name)
            self.assertIn('<h1', text, page.name)
            for tag, attrs in Document(text).tags:
                if tag not in ('a', 'img', 'script', 'link'):
                    continue
                target = urlsplit(attrs.get('href', attrs.get('src', '')))
                if target.scheme or target.netloc or not target.path:
                    continue
                self.assertFalse(target.path.startswith('/'), (page.name, target.path))
                self.assertTrue((DIST / unquote(target.path)).exists(), (page.name, target.path))

    def test_images_are_responsive_and_have_reserved_dimensions(self):
        for name in ('index.html', 'aircraft.html', 'article-3d-printing.html'):
            tags = Document((DIST / name).read_text(encoding='utf-8')).tags
            images = [attrs for tag, attrs in tags if tag == 'img' and attrs.get('src', '').startswith('images/')]
            self.assertTrue(images)
            for image in images:
                self.assertIn('srcset', image)
                self.assertIn('sizes', image)
                self.assertGreater(int(image['width']), 0)
                self.assertGreater(int(image['height']), 0)
        home = (DIST / 'index.html').read_text(encoding='utf-8')
        hero = next(attrs for tag, attrs in Document(home).tags if tag == 'img' and attrs.get('fetchpriority') == 'high')
        self.assertNotEqual(hero.get('loading'), 'lazy')

    def test_fonts_keep_published_characters_and_reduce_payload(self):
        source = ROOT / '发布资源/网页字体/mashanzheng-regular.woff2'
        target = next((DIST / 'fonts').glob('mashanzheng-regular-*.woff2'))
        self.assertLess(target.stat().st_size, source.stat().st_size / 2)
        with TTFont(source) as original, TTFont(target) as small:
            original_chars = set(original.getBestCmap())
            kept = set(small.getBestCmap())
        for path in DIST.glob('*.html'):
            text = path.read_text(encoding='utf-8')
            missing = {ord(char) for char in text} & original_chars - kept
            self.assertFalse(missing, (path.name, ''.join(map(chr, sorted(missing)))))
        css = (DIST / 'styles.css').read_text(encoding='utf-8')
        for font in re.findall(r'url\([\'"](fonts/[^\'"]+)', css):
            self.assertTrue((DIST / font).exists())


if __name__ == '__main__':
    unittest.main()
