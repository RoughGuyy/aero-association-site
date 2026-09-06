const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function subpathSite() {
  const context = { URL, module: { exports: {} }, document: {
    currentScript: { src: 'https://example.github.io/aero-association-site/app.js' },
    getElementById: () => null
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8'), context);
  return context.module.exports;
}

test('repository-path tutorial links stay in the current tab', () => {
  const site = subpathSite();
  const html = site.renderMarkdown('[安全须知](/?article=safety-rules)');
  assert.ok(html.includes('/aero-association-site/?article=safety-rules'));
  assert.ok(!html.includes('target="_blank"'));
});

test('repository-path video links keep the full asset path', () => {
  const site = subpathSite();
  const html = site.renderMarkdown('[视频](/knowledge/assets/videos/demo.mp4)');
  assert.ok(html.includes('/aero-association-site/knowledge/assets/videos/demo.mp4'));
});
