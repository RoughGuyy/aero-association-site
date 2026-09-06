const test = require('node:test');
const assert = require('node:assert/strict');
const site = require('../frontend/app.js');
const fs = require('node:fs');
const path = require('node:path');
const copy = {
  home: JSON.parse(fs.readFileSync(path.join(__dirname, '../网站内容/00_首页/首页文字.json'), 'utf8')),
  common: JSON.parse(fs.readFileSync(path.join(__dirname, '../网站内容/公共文字.json'), 'utf8'))
};
site.setSiteCopy(copy);

function articleBody(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', '网站内容', relativePath), 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
}

test('homepage overlays live text on one twilight image without extra hero copy', () => {
  const html = site.renderHome();
  const hero = html.split('<section class="section">')[0];
  assert.ok(hero.includes('/assets/hero-twilight-plume.jpg'));
  assert.ok(hero.includes('width="2800" height="1260"'));
  assert.ok(!hero.includes('/assets/cuadc-field.jpg'));
  assert.ok(hero.includes('class="hero-scene"'));
  assert.ok(!html.includes('class="hero-models"'));
  assert.ok(html.includes('class="hero-copy"'));
  assert.ok(hero.includes('<div class="hero-scene"><img'));
  assert.ok(hero.includes('class="hero-layout container"'));
  assert.ok(!hero.includes('class="hero-photo"'));
  assert.ok(!hero.includes('hero-credit'));
  assert.ok(!hero.includes('hero-nebula'));
  assert.ok(!hero.includes('hero-j10-no-cone'));
  assert.ok(!hero.includes('NASA'));
  assert.ok(hero.includes('电子科技大学航空航天科技协会'));
  assert.ok(!hero.includes('451851387'));
  assert.ok(!hero.includes('研究院大楼'));
  assert.equal((hero.match(/<img /g) || []).length, 1);
  assert.equal((hero.match(/href="\/\?page=guide"/g) || []).length, 1);
  assert.ok(!html.includes('class="hero-aircraft"'));
  assert.ok(!html.includes('/assets/hero-j10-k8-cutout-v2.png'));
  assert.ok(!html.includes('/assets/hero-j10-k8-dusk-v2.png'));
  assert.ok(!html.includes('/assets/hero-dusk-airfield-v1.webp'));
  assert.ok(!html.includes('/assets/hero-sailplane-concept-v1.png'));
  assert.ok(!html.includes('/assets/hero-aircraft.jpg'));
  assert.ok(!html.includes('自主设计的 J10'));
  assert.ok(html.includes('/assets/cuadc-field.jpg'));
  assert.equal((html.match(/src="\/assets\/cuadc-field.jpg"/g) || []).length, 1);
  assert.ok(html.includes('与空天技术相关的学科竞赛'));
  assert.ok(!html.includes('保研加分'));
});

test('hero shows school, association names and an artistic guide link; introduction stays below', () => {
  const body = articleBody('00_首页/协会简介.md');
  const html = site.renderHome(undefined, body);
  const hero = html.split('<section class="section">')[0];
  assert.ok(hero.includes('<p class="institution">电子科技大学</p>'));
  assert.ok(hero.includes('<h1>空天科协</h1>'));
  assert.ok(hero.includes('<p class="hero-fullname">电子科技大学航空航天科技协会</p>'));
  assert.ok(hero.includes('<p class="hero-english" lang="en">Aerospace Association · UESTC</p>'));
  assert.ok(hero.indexOf('class="institution"') < hero.indexOf('<h1>'));
  assert.ok(hero.indexOf('<h1>') < hero.indexOf('class="hero-fullname"'));
  assert.ok(hero.indexOf('class="hero-fullname"') < hero.indexOf('class="hero-english"'));
  assert.ok(!hero.includes('依托航空航天学院'));
  assert.ok(html.split('</section>')[1].includes('依托航空航天学院'));
  assert.match(hero, /<a class="hero-guide" href="\/\?page=guide"><span>新人指南<\/span>/);
  assert.ok(hero.includes('class="hero-guide-mark" aria-hidden="true"'));
  assert.ok(!hero.includes('class="button"'));
  assert.ok(!hero.includes('QQ'));
  assert.ok(!hero.includes('451851387'));
  assert.ok(!hero.includes('src=""'));
  assert.ok(html.includes('451851387'));
  assert.ok(html.includes('/assets/recruitment-qq-qr.svg'));
});

test('cinematic hero is height-limited above a light reading surface with local art fonts', () => {
  const css = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  assert.match(css, /\.header-inner \{[^}]*width: min\(1440px, calc\(100% - 64px\)\)/);
  assert.match(css, /\.site-header \{[^}]*background: var\(--white\)/);
  assert.ok(!/\.hero \+ \.section \{[^}]*--ink:/.test(css));
  assert.match(css, /\.hero \+ \.section \{[^}]*background: var\(--white\)/);
  assert.match(css, /\.hero \{[^}]*overflow: hidden/);
  assert.match(css, /\.hero-layout \{[^}]*min-height: clamp\(460px, 65svh, 660px\)/);
  assert.match(css, /\.hero-scene \{[^}]*position: absolute/);
  assert.match(css, /\.hero-scene img \{[^}]*width: 125%/);
  assert.ok(!css.includes('.hero-photo'));
  assert.ok(!css.includes('text-shadow: 0 2px 5px'));
  assert.ok(!css.includes('100svh - 82px'));
  assert.ok(!css.includes('min-height: 640px'));
  assert.match(css, /\.hero-copy \{[^}]*font-family: "Ma Shan Zheng"/);
  assert.match(css, /\.hero-english \{[^}]*font-family: "Caveat"/);
  assert.match(css, /\.hero-guide \{[^}]*background: none/);
  assert.match(css, /\.hero-guide:focus-visible/);
  assert.match(css, /\.hero-guide::after/);
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*\.hero-guide::after/);
  assert.match(css, /\.hero-fullname \{[^}]*white-space: nowrap/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.hero-scene \{[^}]*left: 92%[^}]*height: 80%/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*\.hero-layout \{[^}]*padding-block: 36px/);
  assert.ok(!css.includes('--mobile-scene-height'), 'mobile artwork remains a background, without a separate reserved row');
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*\.hero-fullname \{[^}]*white-space: normal/);
  for (const filename of ['mashanzheng-regular.woff2', 'caveat-variable.woff2']) {
    assert.ok(css.includes(`/fonts/${filename}`));
    const font = fs.readFileSync(path.join(__dirname, '../发布资源/网页字体', filename));
    assert.equal(font.subarray(0, 4).toString(), 'wOF2');
  }
});

test('twilight source crop omits phone chrome without modifying the source photograph', () => {
  const source = fs.readFileSync(path.join(__dirname, '../source_materials/70_外部参考资料/官网视觉参考/暮光羽流/暮光羽流-用户提供原图.jpg'));
  const published = fs.readFileSync(path.join(__dirname, '../发布资源/官网配图/hero-twilight-plume.jpg'));
  assert.deepEqual(published, source);
  const css = fs.readFileSync(path.join(__dirname, '../frontend/styles.css'), 'utf8');
  assert.match(css, /\.hero-scene \{[^}]*aspect-ratio: 2240 \/ 1216/);
  assert.match(css, /\.hero-scene img \{[^}]*left: -12\.5%/);
  // A 2240px viewport displays x=280..2520 and y=0..1216 of the 2800x1260 image.
  assert.equal(2240 * 1.25, copy.home.主视觉宽度);
  assert.equal(2240 * 0.125, 280);
  assert.ok(1178 < 1216 && 1216 < 1236); // signature stays; phone bar is below the crop
});

test('photo comparison reuses the real hero without putting preview controls on the homepage', () => {
  const preview = fs.readFileSync(path.join(__dirname, '../frontend/hero-preview.html'), 'utf8');
  assert.ok(preview.includes('renderHero('));
  assert.ok(preview.includes('name="robots" content="noindex, nofollow"'));
  for (const filename of ['cuadc-field.jpg', 'hero-member-j11.jpeg', 'hero-member-decathlon.jpeg']) {
    assert.ok(preview.includes(filename));
    assert.ok(fs.existsSync(path.join(__dirname, '../发布资源/官网配图', filename)));
  }
  assert.ok(!site.renderHome().includes('hero-preview'));
  assert.ok(!fs.readFileSync(path.join(__dirname, '../frontend/index.html'), 'utf8').includes('hero-preview'));
  const alternate = site.renderHero({ ...copy.home, 主视觉图片: '/assets/hero-member-j11.jpeg', 主视觉描述: '成员的 J11 航模', 主视觉宽度: 4096, 主视觉高度: 3072 });
  assert.ok(alternate.includes('/assets/hero-member-j11.jpeg'));
  assert.ok(alternate.includes('width="4096" height="3072"'));
  assert.ok(!site.renderHome().includes('/assets/hero-member-j11.jpeg'));
});

test('a direct aircraft link has only its own ordered chapters', () => {
  const context = site.getArticleContext('fixed-wing-simulator');
  assert.equal(context.key, 'fixed-wing');
  assert.deepEqual(context.articles, ['fixed-wing-simulator', 'moyi90', 'first-flight-check', 'after-moyi90-airframes']);
  const sidebar = site.renderSidebar(context, 'moyi90');
  const mainChapters = sidebar.match(/<nav>([\s\S]*?)<\/nav>/)[1];
  assert.equal((mainChapters.match(/class="chapter"/g) || []).length, 4);
  assert.ok(!mainChapters.includes('fpv-path'));
  assert.ok(!mainChapters.includes('association-intro'));
  assert.match(mainChapters, /article=moyi90[^>]+aria-current="page"/);
});

test('the first and last chapter do not continue into other aircraft routes', () => {
  const context = site.getArticleContext('moyi90');
  assert.deepEqual(site.chapterNeighbours('fixed-wing-simulator', context), { previous: '', next: 'moyi90' });
  assert.deepEqual(site.chapterNeighbours('after-moyi90-airframes', context), { previous: 'first-flight-check', next: '' });
  for (const id of ['fpv-path', 'helicopter-path']) {
    assert.deepEqual(site.chapterNeighbours(id, site.getArticleContext(id)), { previous: '', next: '' });
  }
});

test('a shared making tutorial keeps the design entry and its return link', () => {
  const href = site.articleHref('moyi90', 'design', 'design-making');
  const state = site.readLocation(href);
  const context = site.getArticleContext(state.id, state.route);
  assert.equal(context.key, 'design');
  assert.equal(state.returnId, 'design-making');
  const html = site.renderReader({ id: 'moyi90', title: '制作', body: '# 制作\n\n## 材料\n说明', media: [] }, context, state);
  assert.match(html, /article=design-making&amp;route=design/);
  assert.ok(!html.includes('class="chapter-footer"'));
  assert.equal((html.match(/<h1/g) || []).length, 1);
});

test('handbook references keep a valid origin across copied URLs', () => {
  const state = site.readLocation(site.articleHref('tx12-quickstart', 'fixed-wing', 'moyi90'));
  assert.equal(state.returnId, 'moyi90');
  assert.equal(site.getArticleContext(state.id, state.route).key, 'fixed-wing');
  assert.equal(site.getArticleContext('tx12-quickstart').isRoute, false);
  assert.equal(site.getArticleContext('fpv-path', 'fixed-wing').key, 'fpv');
  assert.ok(!site.articleHref('tx12-quickstart', 'fixed-wing', 'fpv-path').includes('return='));
});

test('public pages and old article URLs remain usable', () => {
  assert.equal(site.getArticleContext('association-intro'), null);
  assert.equal(site.getArticleContext('competitions-and-growth'), null);
  assert.equal(site.PORTAL_ARTICLES['newcomer-path'], 'guide');
  assert.equal(site.readLocation('/#/article/moyi90').id, 'moyi90');
  assert.equal(site.readLocation('/?article=moyi90').id, 'moyi90');
  assert.deepEqual(site.readLocation('/?kind=notices&id=event-1'), { type: 'content', kind: 'notices', id: 'event-1' });
});

test('markdown links retain route parameters and heading targets', () => {
  const html = site.renderMarkdown('# 标题\n\n## 配置\n[制作](?article=moyi90&route=design)\n\n![图片](/assets/aircraft-making.jpg)\n\n## 配置\n内容');
  assert.match(html, /href="\?article=moyi90&amp;route=design"/);
  assert.ok(!html.includes('&amp;amp;'));
  for (const heading of site.extractHeadings('## 配置\n内容\n## 配置')) assert.ok(html.includes(`id="${heading.id}"`));
  assert.equal(site.safeUrl('javascript:alert(1)'), '');
  assert.equal(site.safeUrl('//example.com/image.jpg', true), '');
});

test('published content detail displays supplied event fields and attachments', () => {
  const html = site.renderContent({ id: 'demo', kind: 'notices', title: '制作活动', summary: '说明', body: '# 制作活动\n\n## 活动内容\n制作', event_date: '2026-09-08', location: '研究院大楼 324', registration_url: 'https://example.org/signup', gallery: ['/assets/workshop-2026.jpg'] });
  assert.ok(html.includes('2026-09-08'));
  assert.ok(html.includes('研究院大楼 324'));
  assert.ok(html.includes('https://example.org/signup'));
  assert.ok(html.includes('/assets/workshop-2026.jpg'));
  assert.ok(!html.includes('报名截止'));
});

test('historical team stories are separate from association project records', () => {
  const html = site.renderProjectRecords([
    { id: 'current-build', title: '制作记录', date: '2026-09-01' },
    { id: 'old-team', title: '往届团队', record_type: 'history', project_type: '历史团队报道', date: '2022-06-10', date_label: '报道日期' }
  ]);
  const history = html.split('id="project-history"')[1];
  assert.ok(html.includes('id="project-records"'));
  assert.ok(history.includes('往届成员与相关团队'));
  assert.ok(history.includes('id=old-team'));
  assert.ok(!history.includes('id=current-build'));
  assert.ok(history.includes('class="history-stories"'));
  assert.ok(!history.includes('class="record-grid"'));
  assert.ok(!site.renderProjectRecords([]).includes('项目资料正在整理'));
});

test('recruitment is native text and a working group code, not an embedded poster', () => {
  const html = site.renderHome();
  assert.ok(!html.includes('/assets/recruitment-2026.jpg'));
  assert.ok(!html.includes('join-poster'));
  assert.match(html, /<a href="https:\/\/qm.qq.com\/q\/71RzbkmIZG" target="_blank" rel="noopener noreferrer"><img src="\/assets\/recruitment-qq-qr.svg"/);
  assert.ok(html.includes('用 QQ 扫码加入招新群'));
  assert.ok(html.includes('class="join-facts"'));
  assert.ok(html.includes('451851387'));
  assert.ok(html.includes('电子科技大学研究院大楼 324'));
});

test('CUADC employment evidence is subordinate to the competition, not a standalone poster section', () => {
  const body = articleBody('03_项目与竞赛/项目与竞赛.md');
  const headings = site.extractHeadings(body);
  assert.ok(!headings.some(item => item.text.includes('大疆')));
  const cuadc = body.split('## CUADC')[1].split('## 相关学科竞赛')[0];
  assert.ok(cuadc.includes('### 参赛经历与求职'));
  assert.ok(cuadc.includes('/assets/dji-cuadc-recruitment-2027.jpg'));
  assert.ok(cuadc.includes('不代表录用承诺'));
  assert.ok(!body.includes('通道已'));
  const html = site.renderPortal({ id: 'competitions-and-growth', title: '项目与竞赛', body }, 'projects', { projects: [] });
  assert.ok(html.includes('class="markdown-body competition-copy"'));
  assert.match(html, /<blockquote><img src="\/assets\/dji-cuadc-recruitment-2027.jpg"/);
  assert.match(html, /href="\/assets\/dji-cuadc-recruitment-2027.jpg"/);
});

test('directory links use their text without repeated decorative arrows', () => {
  const vm = require('node:vm');
  const sandbox = { module: { exports: {} }, URL, URLSearchParams };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../frontend/app.js'), 'utf8'), sandbox);
  sandbox.module.exports.setSiteCopy(copy);
  vm.runInContext('allArticles = [{ id: "moyi90", title: "魔翼 90 制作与协会取材" }, { id: "fpv-path", title: "穿越机入门" }]', sandbox);
  const html = sandbox.module.exports.renderResources({ body: '' });
  assert.match(html, /href="[^\"]*article=moyi90[^\"]*">魔翼 90 制作与协会取材<\/a>/);
  assert.ok(!/[→↗]/.test(html));
  assert.ok(!/[→↗]/.test(site.renderHome()));
});

test('record dates and source attribution do not invent event dates or links', () => {
  const item = { kind: 'news', title: '岑巩科普', body: '制作与试飞辅导。', date: '2025-12-12', date_label: '报道日期', source_name: '成电新闻网', source_title: '学校报道', source_date: '2025-12-12', source_url: 'https://news.uestc.edu.cn/info/1131/36224.htm' };
  const html = site.renderContent(item);
  assert.ok(html.includes('报道日期'));
  assert.ok(!html.includes('活动日期'));
  assert.ok(html.includes('datetime="2025-12-12"'));
  assert.ok(html.includes('class="record-source"'));
  assert.match(html, /href="https:\/\/news.uestc.edu.cn\/info\/1131\/36224.htm"/);
  assert.ok(html.includes('返回新闻与通知'));
  const withoutLink = site.renderContent({ ...item, source_url: 'javascript:alert(1)' });
  assert.ok(!withoutLink.includes('javascript:'));
  assert.ok(!withoutLink.includes('原链接待补'));
  assert.ok(withoutLink.includes('学校报道'));
});

test('outreach has activity records while unrelated portal pages do not', () => {
  const article = { id: 'outreach-service', title: '科普活动', body: '# 科普活动\n\n## 参加\n说明', media: [] };
  const content = { news: [{ id: 'school-camp', title: '科学营', date: '2019-07-15' }], projects: [] };
  const html = site.renderPortal(article, 'outreach', content);
  assert.ok(html.includes('活动记录'));
  assert.ok(html.includes('id=school-camp'));
  const guide = site.renderPortal({ ...article, id: 'activity-guide' }, 'outreach', content);
  assert.ok(!guide.includes('id=school-camp'));
});

test('news and notices remain distinct on the updated listing', () => {
  const html = site.renderUpdates({ news: [{ id: 'past-event', title: '活动记录', date: '2025-12-16' }], notices: [] });
  assert.ok(html.includes('class="updates-layout"'));
  assert.ok(html.includes('id="news"'));
  assert.ok(html.includes('id="notices"'));
  assert.ok(html.includes('kind=news&amp;id=past-event'));
  assert.ok(html.includes('近期活动安排请查看群内通知'));
  assert.ok(!html.includes('kind=notices&amp;id=past-event'));
});

test('homepage introduces activities without a second set of tutorial entrances', () => {
  const html = site.renderHome();
  for (const page of ['guide', 'projects', 'outreach', 'updates']) {
    assert.equal((html.match(new RegExp(`href="/\\?page=${page}"`, 'g')) || []).length, 1);
  }
  assert.deepEqual([...html.matchAll(/href="([^"\s]*\?article=[^"]+)"/g)].map(match => match[1]), ['/?article=safety-rules']);
  assert.ok(!html.includes('#activity-records'));
  assert.ok(!html.includes('学飞快捷入口'));
});

test('a route sidebar does not offer other directions or duplicate its parent link', () => {
  const html = site.renderSidebar(site.getArticleContext('moyi90'), 'moyi90');
  assert.ok(!html.includes('常用参考'));
  assert.ok(!html.includes('其他学习方向'));
  assert.ok(!html.includes('fpv-path'));
  assert.ok(!html.includes('sidebar-back'));
  assert.equal(site.renderSidebar(site.getArticleContext('design-making'), 'design-making'), '');
});

test('a shared reference has its own subject and only a return to the originating chapter', () => {
  const state = site.readLocation(site.articleHref('radio-curves', 'fixed-wing', 'moyi90'));
  const context = site.getArticleContext(state.id, state.route);
  const html = site.renderReader({ id: state.id, title: 'EXP 与 DR 设置', body: '正文' }, context, state);
  assert.ok(html.includes('href="/?page=resources"'));
  assert.ok(html.includes('遥控器与航电'));
  assert.ok(html.includes('返回魔翼 90 制作'));
  assert.ok(!html.includes('route-sidebar'));
  assert.ok(!html.includes('chapter-footer'));
  assert.ok(!html.includes('href="/?page=guide"'));
  const direct = site.renderReader({ id: state.id, title: 'EXP 与 DR 设置', body: '正文' }, site.getArticleContext(state.id), {});
  assert.ok(!direct.includes('route-sidebar'));
});

test('aircraft chapters retain a distinct safety prerequisite, not a reference catalogue', () => {
  for (const id of ['fixed-wing-simulator', 'moyi90', 'fpv-path', 'helicopter-path']) {
    const html = site.renderReader({ id, title: id, body: '正文' }, site.getArticleContext(id), {});
    assert.ok(html.includes('操作前必读'));
    assert.match(html, /href="[^\"]*article=safety-rules[^\"]*"/);
    assert.ok(!html.includes('常用参考'));
  }
});

test('moyi video notes have a parent section and subordinate operation headings', () => {
  const body = articleBody('01_新人指南/固定翼入门/02_魔翼90制作.md');
  const headings = site.extractHeadings(body);
  const top = headings.filter(item => item.level === 2).map(item => item.text);
  assert.deepEqual(top, ['材料在哪里', '先看完整制作视频', '制作视频的补充与注意事项', '制作完成后的关键设置', '制作完成后的下一步']);
  const notes = body.split('## 制作视频的补充与注意事项')[1].split('## 制作完成后的关键设置')[0];
  assert.ok(notes.includes('以下文字是对制作视频的补充和注意事项'));
  for (const title of ['胶水选择', '翼台制作', '电机固定座位置']) {
    assert.ok(headings.some(item => item.text === title && item.level === 3));
  }
  const html = site.renderReader({ id: 'moyi90', title: '魔翼 90 制作', body }, site.getArticleContext('moyi90'), {});
  assert.match(html, /<h2[^>]*>制作视频的补充与注意事项<\/h2>/);
  assert.match(html, /<h3[^>]*>胶水选择<\/h3>/);
});

test('making and flying tutorials contain essentials without prerequisite handbook detours', () => {
  const making = articleBody('01_新人指南/固定翼入门/02_魔翼90制作.md');
  assert.ok(making.includes('docx-image-04.jpeg'));
  assert.ok(making.includes('EXP'));
  assert.ok(making.includes('DR'));
  assert.ok(making.includes('tx12对频示例.mp4'));
  assert.ok(!making.includes('?article=equipment-flow'));
  assert.ok(!making.includes('?article=radio-curves'));
  const fpv = articleBody('01_新人指南/穿越机入门.md');
  assert.ok(!fpv.includes('?article=tx12-quickstart'));
  assert.ok(fpv.includes('USB Joystick'));
  const curves = articleBody('02_技术资料/遥控器与航电/EXP与DR设置.md');
  assert.ok(!curves.includes('?article=tx12-quickstart'));
});

test('the safety prerequisite does not send newcomers into a second course', () => {
  const safety = articleBody('02_技术资料/安全与训练/安全须知.md');
  assert.ok(!safety.includes('?article='));
  const lastChapter = articleBody('01_新人指南/固定翼入门/04_后续机型.md');
  assert.ok(lastChapter.indexOf('?article=aerobatics-training') > lastChapter.indexOf('## 进入这些机型前'));
  assert.ok(lastChapter.includes('不是完成入门路线的必读内容'));
});

test('association introduction and recruitment live on home; old about URLs stay usable', () => {
  const body = articleBody('00_首页/协会简介.md');
  const html = site.renderHome(undefined, body);
  for (const term of ['电子科技大学航空航天科技协会', '依托航空航天学院', '焊接工具', '451851387', '/assets/recruitment-qq-qr.svg']) assert.ok(html.includes(term), term);
  assert.ok(html.includes('id="join"'));
  assert.ok(!html.includes('page=about'));
  assert.ok(!('about' in site.PAGES));
  assert.equal(site.readLocation('/?page=about#join').page, 'home');
  assert.equal(site.PORTAL_ARTICLES['association-intro'], 'home');
  assert.equal(site.PORTAL_ARTICLES['activity-records'], 'updates');
});

test('single-page guides have no artificial chapter navigation', () => {
  for (const id of ['design-making', 'fpv-path', 'helicopter-path']) {
    const html = site.renderReader({ id, title: id, body: '正文', media: [] }, site.getArticleContext(id), {});
    assert.ok(html.includes('reading-single'));
    assert.ok(!html.includes('chapter-footer'));
    assert.ok(!html.includes('route-sidebar'));
  }
  const context = site.getArticleContext('after-moyi90-airframes');
  const html = site.renderReader({ id: 'after-moyi90-airframes', title: '后续机型', body: '正文' }, context, {});
  assert.ok(html.includes('上一篇'));
  assert.ok(!html.includes('继续查阅'));
  assert.ok(!html.includes('href="/?page=resources"'));
});

test('activity detail ends with its source and parent, not unrelated recommendations', () => {
  const html = site.renderContent({ id: 'record', kind: 'news', title: '活动', body: '正文' });
  assert.ok(html.includes('返回新闻与通知'));
  assert.ok(!html.includes('page=outreach'));
  assert.ok(!html.includes('design-making'));
});

test('news lists pair a thumbnail with its summary and keep one detail link per story', () => {
  const news = [{ id: 'camp', title: '少年营', summary: '无人机足球课堂', cover: '/assets/camp.jpg' }];
  const html = site.renderUpdates({ news, notices: [] });
  assert.match(html, /class="stream-item has-image"><img class="stream-thumb" src="\/assets\/camp.jpg" alt=""/);
  assert.ok(html.includes('<p>无人机足球课堂</p>'));
  assert.equal((html.match(/href="\/\?kind=news&amp;id=camp"/g) || []).length, 1);
  const home = site.renderHome({ news, notices: [] });
  assert.ok(home.includes('class="stream-thumb"'));
  const withoutImage = site.renderUpdates({ news: [{ ...news[0], cover: '' }], notices: [] });
  assert.ok(!withoutImage.includes('stream-thumb'));
});

test('news detail does not repeat a cover already placed within the article', () => {
  const item = { kind: 'news', id: 'camp', title: '活动', cover: '/assets/camp.jpg', cover_alt: '课堂 <实拍>', body: '正文' };
  const coverHtml = site.renderContent(item);
  assert.match(coverHtml, /class="page-cover news-cover"[^>]*alt="课堂 &lt;实拍&gt;"/);
  const bodyHtml = site.renderContent({ ...item, body: '现场照片\n\n![课堂](/assets/camp.jpg)' });
  assert.equal((bodyHtml.match(/src="\/assets\/camp.jpg"/g) || []).length, 1);
  assert.ok(!bodyHtml.includes('class="page-cover'));
});

test('original reporting has one explicit link and unavailable sources have no placeholder link', () => {
  const item = { kind: 'news', id: 'camp', title: '活动', body: '正文', source_title: '校方原报道', source_url: 'https://news.uestc.edu.cn/example.htm' };
  const html = site.renderContent(item);
  assert.match(html, /href="https:\/\/news.uestc.edu.cn\/example.htm" target="_blank" rel="noopener noreferrer">查看完整报道<\/a>/);
  assert.equal((html.match(/https:\/\/news.uestc.edu.cn\/example.htm/g) || []).length, 1);
  const scores = site.renderContent({ ...item, source_link_text: '查看成绩册 <原件>' });
  assert.ok(scores.includes('查看成绩册 &lt;原件&gt;</a>'));
  assert.ok(!scores.includes('查看完整报道'));
  for (const source_url of ['', 'javascript:alert(1)']) {
    const missing = site.renderContent({ ...item, source_url });
    assert.ok(missing.includes('校方原报道'));
    assert.ok(!missing.includes('查看完整报道'));
    assert.ok(!missing.includes('javascript:'));
    assert.ok(!missing.includes('待补'));
  }
});

test('news image metadata is escaped and notices do not acquire news thumbnails', () => {
  const item = { id: 'unsafe', title: '<script>bad</script>', summary: '<img onerror=bad>', cover: 'javascript:bad()' };
  const html = site.renderUpdates({ news: [item], notices: [{ ...item, cover: '/assets/camp.jpg' }] });
  assert.ok(!html.includes('stream-thumb'));
  assert.ok(!html.includes('<script>'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(html.includes('&lt;img onerror=bad&gt;'));
});

test('newcomers see three complete aircraft routes, with shared skills afterwards', () => {
  const body = articleBody('01_新人指南/新人指南.md');
  const html = site.renderGuide({ body, summary: '' });
  assert.equal((html.match(/class="guide-option"/g) || []).length, 3);
  for (const title of ['固定翼入门', '穿越机入门', '直升机入门']) assert.ok(html.includes(`<h3>${title}</h3>`));
  assert.ok(html.indexOf('固定翼入门') < html.indexOf('<h2>设计与制作</h2>'));
  assert.ok(html.includes('魔翼 90 制作'));
  assert.ok(html.includes('装机'));
  assert.ok(html.includes('难度较高'));
  assert.ok(html.includes('可以同时参与'));
  assert.ok(!html.includes('route=design'));
});

test('safety reading is prominent before participation steps and aircraft routes', () => {
  const home = site.renderHome();
  assert.match(home, /class="safety-note"[\s\S]*?<a href="\/\?article=safety-rules">安全须知<\/a>/);
  const html = site.renderGuide({ body: articleBody('01_新人指南/新人指南.md'), summary: '' });
  const start = html.split('class="guide-start markdown-body"')[1].split('class="guide-routes"')[0];
  assert.match(start, /<blockquote><strong>第一次参加前，请先读<\/strong><a href="\?article=safety-rules">安全须知<\/a>/);
  assert.ok(start.indexOf('article=safety-rules') < start.indexOf('<ol>'));
});

test('equipment instructions link safety before showing equipment and procedures', () => {
  const body = articleBody('02_技术资料/设备与制作/设备取用.md');
  assert.ok(body.indexOf('?article=safety-rules') >= 0);
  assert.ok(body.indexOf('?article=safety-rules') < body.indexOf('## 新人常用设备'));
  assert.match(site.renderMarkdown(body), /<blockquote><strong>操作前，请先读<\/strong><a href="\?article=safety-rules">安全须知<\/a>/);
});

test('charging defaults to 2C only within the battery manufacturer limits', () => {
  const body = articleBody('02_技术资料/安全与训练/安全须知.md');
  for (const text of ['默认按 2C', '低于 2C', '按较低值', '无法确认允许倍率时，先不要充电', '3000mAh', '6A', '放电倍率不能当作充电倍率']) {
    assert.ok(body.includes(text), text);
  }
  assert.ok(!/3\s*C|9\s*A/.test(body));
});

test('design reference belongs to resources and is not a fourth learning route', () => {
  const html = site.renderResources({ body: '', summary: '' });
  assert.equal((html.match(/<h2>设计与制作<\/h2>/g) || []).length, 1);
  const handbook = site.HANDBOOKS.find(item => item.title === '设计与制作');
  assert.ok(handbook?.articles.includes('design-making'));
  assert.ok(handbook.articles.includes('3d-printing'));
  const reader = site.renderReader({ id: 'design-making', title: '设计与制作', body: '' }, site.getArticleContext('design-making'), {});
  assert.ok(reader.includes('href="/?page=resources"'));
  assert.ok(!reader.includes('href="/?page=guide"'));
});

test('homepage treats participation as compatible and school visits as regular outreach', () => {
  const html = site.renderHome();
  assert.ok(html.includes('/assets/beijing-highschool-visit-toned-v2.jpg'));
  assert.ok(html.includes('可以同时参与'));
  assert.ok(html.includes('有制作、编程、建模或飞行经验'));
  assert.ok(!html.includes('北京高中'));
  assert.ok(html.includes('中小学研学'));
  assert.ok(!html.includes('20 场'));
});

test('design materials focus on shared tools and outreach pairs 2026 images with 2026 text', () => {
  const design = articleBody('02_技术资料/设备与制作/设计与制作.md');
  for (const term of ['焊台', '3D 打印', '切割机', '飞机设计']) assert.ok(design.includes(term));
  assert.ok(!design.includes('?article=moyi90&route=design'));
  const outreach = articleBody('04_科普活动/科普活动.md');
  assert.ok(!outreach.includes('北京高中'));
  assert.ok(!outreach.includes('2019 年'));
  assert.ok(outreach.includes('2026 年科学营'));
  assert.ok(outreach.includes('/assets/science-camp-2026-simulator.jpg'));
});

test('school outreach photos are not presented as the Shiwai Bairen visit', () => {
  const outreach = articleBody('04_科普活动/科普活动.md');
  const schoolVisits = outreach.split('## 中小学研学')[1].split('## 2026 年科学营')[0];
  assert.ok(schoolVisits.includes('/assets/beijing-highschool-class.jpg'));
  assert.ok(!schoolVisits.includes('百人计划'));
  assert.ok(!schoolVisits.includes('实外西区'));
  const camp = outreach.split('## 2026 年科学营')[1].split('## 少年营')[0];
  for (const item of ['3D 打印', '焊接', '调参', '/assets/science-camp-2026-micro-quad.jpg']) assert.ok(camp.includes(item), item);
  assert.ok(!camp.includes('20 多架'));
});
test('editing guide headings preserves its three aircraft cards and their order', () => {
  const body = articleBody('01_新人指南/新人指南.md').replace('固定翼入门 {#fixed-wing}', '从固定翼开始 {#fixed-wing}').replace('第一次参加 {#start}', '来之前看看 {#start}');
  const html = site.renderGuide({ body, title: '来协会玩', summary: '' });
  assert.equal((html.match(/class="guide-option"/g) || []).length, 3);
  assert.ok(html.includes('<h1>来协会玩</h1>'));
  assert.ok(html.includes('<h3>从固定翼开始</h3>'));
  assert.ok(html.includes('<h2>来之前看看</h2>'));
  assert.ok(!html.includes('{#'));
  assert.ok(html.indexOf('来之前看看') < html.indexOf('从固定翼开始'));
});

test('homepage and shared copy edits render as text, not executable markup', () => {
  const revised = structuredClone(copy);
  revised.home.竞赛介绍 = '改好的竞赛介绍 <script>alert(1)</script>';
  revised.home.主视觉图片 = 'javascript:alert(1)';
  revised.home.主视觉描述 = '照片 <script>alert(3)</script>';
  revised.home.首屏英文 = '<script>alert(4)</script>';
  revised.common.栏目.projects = '竞赛与项目';
  revised.common.站点.QQ群 = '123456789';
  try {
    site.setSiteCopy(revised);
    const html = site.renderHome();
    assert.ok(html.includes('改好的竞赛介绍 &lt;script&gt;'));
    assert.ok(html.includes('照片 &lt;script&gt;'));
    assert.ok(html.includes('lang="en">&lt;script&gt;'));
    assert.ok(!html.includes('<script>'));
    assert.ok(!html.includes('javascript:'));
    assert.ok(html.includes('竞赛与项目'));
    assert.ok(html.includes('123456789'));
    assert.ok(!html.includes('451851387'));
  } finally { site.setSiteCopy(copy); }
});
