const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function subpathSite(routes) {
  const context = { AERO_PAGE_ROUTES: routes, AERO_SITE_STRUCTURE: require('../网站内容/站点结构.json'), URL, URLSearchParams, module: { exports: {} }, document: {
    currentScript: { src: 'https://example.github.io/aero-association-site/app.js' },
    getElementById: () => null
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8'), context);
  return context.module.exports;
}

test('repository-path tutorial links stay in the current tab', () => {
  const site = subpathSite();
  const html = site.renderMarkdown('[锂电池与充电](/?article=battery-charging)');
  assert.ok(html.includes('/aero-association-site/?article=battery-charging'));
  assert.ok(!html.includes('target="_blank"'));
});

test('repository-path video links keep the full asset path', () => {
  const site = subpathSite();
  const html = site.renderMarkdown('[视频](/knowledge/assets/videos/demo.mp4)');
  assert.ok(html.includes('/aero-association-site/knowledge/assets/videos/demo.mp4'));
});

test('generated pages and legacy queries resolve to the same article', () => {
  const site = subpathSite({'article-fpv-path.html': 'article=fpv-path', 'activities.html': 'page=activities'});
  assert.equal(site.readLocation('https://example.github.io/aero-association-site/article-fpv-path.html').id, 'fpv-path');
  assert.equal(site.staticDestination(site.readLocation('https://example.github.io/aero-association-site/?article=fpv-path')), 'article-fpv-path.html');
  assert.equal(site.staticDestination(site.readLocation('https://example.github.io/aero-association-site/?page=outreach')), 'activities.html');
  assert.equal(site.staticDestination(site.readLocation('https://example.github.io/aero-association-site/#/article/fpv-path')), 'article-fpv-path.html');
});

test('shared reference preserves the originating route and return chapter', () => {
  const site = subpathSite({'shared.html': 'article=3d-printing&route=design&return=design-making'});
  assert.equal(site.staticDestination(site.readLocation('https://example.github.io/aero-association-site/?article=3d-printing&route=design')), 'shared.html');
  assert.equal(site.readLocation('https://example.github.io/aero-association-site/shared.html').returnId, 'design-making');
});
