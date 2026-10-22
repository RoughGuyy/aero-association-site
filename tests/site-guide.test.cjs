const test = require('node:test');
const assert = require('node:assert/strict');
const site = require('../frontend/app.js');

test('guide results only link inside the real site and escape model output', () => {
  assert.equal(site.guideResultHref('https://evil.example/'), '');
  assert.equal(site.guideResultHref('javascript:alert(1)'), '');
  const html = site.renderGuideResults({message: '<script>bad</script>', matches: [
    {title: '<img src=x>', href: '?article=3d-printing#1.-安装-bambu-studio', reason: '<b>here</b>'},
    {title: 'evil', href: 'https://evil.example/'}]});
  assert.ok(html.includes('article=3d-printing'));
  assert.ok(!html.includes('script'));
  assert.ok(html.includes('&lt;b&gt;here&lt;/b&gt;'));
  assert.ok(!html.includes('site-guide-answer'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('evil.example'));
});
