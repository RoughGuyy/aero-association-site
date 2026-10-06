const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function site(random = Math.random) {
  const context = { URL, URLSearchParams, Math: Object.assign(Object.create(Math), { random }), module: { exports: {} }, document: {
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
  assert.match(listing, /<p class="record-meta">固定翼 · 个人 · 草稿<\/p>/);
  const published = { ...item, service_status: '适航', status: 'published' };
  assert.match(app.renderAircraftDirectory([published]), /<p class="record-meta">固定翼 · 适航 · 个人<\/p>/);
  assert.match(app.renderAircraftDirectory([{ ...published, ownership: '' }]), /<p class="record-meta">固定翼 · 适航<\/p>/);
  assert.match(app.renderAircraftDirectory([{ ...published, ownership: '<协会>' }]), /固定翼 · 适航 · &lt;协会&gt;/);
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

test('different aircraft types share a single directory grid', () => {
  const html = site().renderAircraftDirectory([
    { id: 'a', title: '飞机 A', category: '电动3D特技机' },
    { id: 'b', title: '飞机 B', category: '电动竞速滑翔机' }
  ]);
  assert.equal((html.match(/class="aircraft-grid"/g) || []).length, 1);
  assert.equal((html.match(/class="aircraft-card"/g) || []).length, 2);
  assert.ok(!html.includes('<h2>电动3D特技机</h2>'));
  assert.ok(!html.includes('<h2>电动竞速滑翔机</h2>'));
});

test('aircraft order is randomized per page lifetime and stable on return', () => {
  const items = ['a', 'b', 'c'].map(id => ({ id, title: id, category: '固定翼' }));
  const order = html => [...html.matchAll(/kind=aircraft&amp;id=([abc])/g)].map(match => match[1]);
  let calls = 0;
  const ranks = [0.9, 0.1, 0.5];
  const app = site(() => ranks[calls++]);
  assert.deepEqual(order(app.renderAircraftDirectory(items)), ['b', 'c', 'a']);
  assert.deepEqual(order(app.renderAircraftDirectory([...items].reverse())), ['b', 'c', 'a']);
  assert.equal(calls, 3);
  assert.deepEqual(items.map(item => item.id), ['a', 'b', 'c']);
  let index = 0;
  const fresh = site(() => [0.1, 0.5, 0.9][index++]);
  assert.deepEqual(order(fresh.renderAircraftDirectory(items)), ['a', 'b', 'c']);
});
