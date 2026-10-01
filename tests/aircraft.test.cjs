const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function site() {
  const context = { URL, URLSearchParams, module: { exports: {} }, document: {
    currentScript: { src: 'https://example.github.io/aero-association-site/app.js' },
    getElementById: () => null
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8'), context);
  const app = context.module.exports;
  app.setSiteCopy({ common: JSON.parse(fs.readFileSync(path.join(__dirname, '../网站内容/公共文字.json'), 'utf8')) });
  return app;
}

test('aircraft directory and detail keep repository paths and ownership', () => {
  const app = site();
  const item = { id: 'su57', kind: 'aircraft', title: 'SU-57', category: '固定翼', ownership: '个人', status: 'draft', cover: '/aircraft-assets/SU-57.jpg', gallery: ['/aircraft-assets/L-39%20%281%29.jpg'], body: '## 故事\n\n从大胡子手中购入。\n\n## 空章节\n\n<!-- 填写提示 -->' };
  const listing = app.renderAircraftDirectory([item]);
  assert.ok(!listing.includes('个人'));
  assert.match(listing, /aero-association-site\/\?kind=aircraft&amp;id=su57/);
  const html = app.renderContent(item);
  assert.match(html, /个人/);
  assert.match(html, /aero-association-site\/aircraft-assets\/SU-57.jpg/);
  assert.match(html, /相册/);
  assert.match(html, /从大胡子手中购入/);
  assert.ok(!html.includes('空章节'));
  assert.ok(!html.includes('填写提示'));
  assert.match(html, /本地草稿预览/);
  assert.match(html, /aero-association-site\/\?page=aircraft/);
  assert.equal(app.readLocation('?kind=aircraft&id=su57').kind, 'aircraft');
  assert.equal(app.readLocation('?page=aircraft').page, 'aircraft');
});

test('empty aircraft directory has no fabricated records', () => {
  const html = site().renderAircraftDirectory([]);
  assert.match(html, /航模档案正在整理/);
  assert.ok(!html.includes('class="aircraft-card"'));
});
