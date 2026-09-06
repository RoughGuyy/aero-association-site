'use strict';

const PAGES = {
  home: { title: '首页' },
  guide: { title: '新人指南', article: 'newcomer-path' },
  resources: { title: '技术资料', article: 'resource-center' },
  projects: { title: '项目与竞赛', article: 'competitions-and-growth' },
  outreach: { title: '科普活动', article: 'outreach-service' },
  updates: { title: '新闻与通知' }
};
const ROUTES = {
  // 保留旧 design 参数和参考资料返回地址；不作为第四种机型入口展示。
  design: {
    title: '设计与制作',
    articles: ['design-making'],
    references: ['moyi90', '3d-printing', 'equipment-flow', 'opentx-logic', 'tx12-quickstart', 'radio-curves', 'safety-rules']
  },
  'fixed-wing': {
    title: '固定翼入门',
    articles: ['fixed-wing-simulator', 'moyi90', 'first-flight-check', 'after-moyi90-airframes'],
    references: ['tx12-quickstart', 'setup-radio', 'opentx-logic', 'radio-curves', 'equipment-flow', 'safety-rules', 'simulator-goals', 'aerobatics-training']
  },
  fpv: {
    title: '穿越机入门', articles: ['fpv-path'],
    references: ['tx12-quickstart', 'setup-radio', 'opentx-logic', 'safety-rules', 'simulator-goals']
  },
  helicopter: {
    title: '直升机入门', articles: ['helicopter-path'],
    references: ['safety-rules', 'simulator-goals']
  }
};
const HANDBOOKS = [
  { title: '设计与制作', articles: ['design-making', 'equipment-flow', '3d-printing'] },
  { title: '遥控器与航电', articles: ['tx12-quickstart', 'opentx-logic', 'setup-radio', 'radio-curves'] },
  { title: '安全与训练参考', articles: ['safety-rules', 'simulator-goals', 'aerobatics-training'] }
];
const PORTAL_ARTICLES = {
  'association-intro': 'home', 'newcomer-path': 'guide', 'resource-center': 'resources',
  'competitions-and-growth': 'projects', 'outreach-service': 'outreach', 'activity-records': 'updates'
};
const SHORT_TITLES = {};
const SITE_ROOT = typeof document === 'undefined'
  ? new URL('http://localhost/')
  : new URL('./', document.currentScript?.src || document.baseURI);
let siteCopy;
function setSiteCopy(value) {
  siteCopy = value;
  for (const [key, title] of Object.entries(value.common.栏目)) PAGES[key].title = title;
  for (const [key, title] of Object.entries(value.common.路线)) ROUTES[key].title = title;
  HANDBOOKS.forEach((group, index) => { group.title = value.common.资料分组[index]; });
  Object.assign(SHORT_TITLES, value.common.文章简称);
}
function wording(group, key) { return siteCopy.common[group][key]; }
function siteHref(suffix = '') {
  const url = new URL(SITE_ROOT);
  if (suffix.startsWith('?') || suffix.startsWith('#')) url.href += suffix;
  else url.href = new URL(String(suffix).replace(/^\/+/, ''), SITE_ROOT).href;
  return url.pathname + url.search + url.hash;
}


function routeContains(route, id) {
  return Boolean(ROUTES[route] && [...ROUTES[route].articles, ...ROUTES[route].references].includes(id));
}
function getArticleContext(id, requestedRoute = '') {
  if (routeContains(requestedRoute, id)) return { key: requestedRoute, ...ROUTES[requestedRoute], isRoute: true };
  for (const [key, route] of Object.entries(ROUTES)) {
    if (route.articles.includes(id)) return { key, ...route, isRoute: true };
  }
  const group = HANDBOOKS.find(item => item.articles.includes(id));
  return group ? { ...group, key: '', references: [], isRoute: false } : null;
}
function articleHref(id, route = '', returnId = '') {
  const params = new URLSearchParams({ article: id });
  if (routeContains(route, id)) {
    params.set('route', route);
    if (ROUTES[route].references.includes(id) && ROUTES[route].articles.includes(returnId)) params.set('return', returnId);
  }
  return siteHref('?' + params.toString());
}
function readLocation(url) {
  const parsed = new URL(url, 'http://localhost');
  const query = parsed.searchParams;
  const legacy = parsed.hash.match(/^#\/article\/(.+)$/);
  const article = query.get('article') || (legacy ? decodeURIComponent(legacy[1]) : '');
  if (article) return { type: 'article', id: article, route: query.get('route') || '', returnId: query.get('return') || '' };
  const kind = query.get('kind');
  if (['news', 'notices', 'projects'].includes(kind) && query.get('id')) return { type: 'content', kind, id: query.get('id') };
  const page = query.get('page') === 'about' ? 'home' : query.get('page') || 'home';
  return { type: 'page', page: PAGES[page] ? page : 'home' };
}
function pageHref(page) { return page === 'home' ? siteHref() : siteHref('?page=' + page); }
function contentHref(kind, id) { return siteHref('?' + new URLSearchParams({ kind, id }).toString()); }
function chapterNeighbours(id, context) {
  if (!context?.isRoute) return { previous: '', next: '' };
  const index = context.articles.indexOf(id);
  if (index < 0) return { previous: '', next: '' };
  return { previous: context.articles[index - 1] || '', next: context.articles[index + 1] || '' };
}

let allArticles = [];
let currentState = { type: 'page', page: 'home' };
let currentContext = null;
let currentContent = null;
let renderVersion = 0;
const articleCache = new Map();

async function fetchJson(path, options = {}) {
  let target = path;
  if (globalThis.AERO_STATIC_SITE) {
    const clean = path.replace(/^\/api\//, '');
    if (clean === 'articles') target = 'api/articles/index.json';
    else if (/^articles\//.test(clean)) target = 'api/' + clean + '.json';
    else if (/^content\/(news|notices|projects)$/.test(clean)) target = 'api/' + clean + '/index.json';
    else if (/^content\/(news|notices|projects)\//.test(clean)) target = 'api/' + clean + '.json';
    else target = 'api/' + clean + '.json';
    target = siteHref(target);
  }
  const response = await fetch(target, { cache: 'no-store', ...options });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}
async function fetchArticle(id) {
  if (!articleCache.has(id)) articleCache.set(id, await fetchJson('/api/articles/' + encodeURIComponent(id)));
  return articleCache.get(id);
}
function articleTitle(id, short = false) {
  if (short && SHORT_TITLES[id]) return SHORT_TITLES[id];
  return allArticles.find(item => item.id === id)?.title || SHORT_TITLES[id] || '查看资料';
}
function setActivePage(page) {
  document.querySelectorAll('.site-nav a').forEach(link => {
    if (link.dataset.page === page) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="当前位置"><a href="${escapeAttr(siteHref())}">${escapeHtml(PAGES.home.title)}</a>${items.map(item => `<span aria-hidden="true">/</span>${item.href ? `<a href="${escapeAttr(item.href)}">${escapeHtml(item.label)}</a>` : `<span aria-current="page">${escapeHtml(item.label)}</span>`}`).join('')}</nav>`;
}
function pageHeader(title, summary = '') {
  return `<header class="page-head"><h1>${escapeHtml(title)}</h1>${summary ? `<p>${escapeHtml(summary)}</p>` : ''}</header>`;
}
function joinPanel() {
  const h = siteCopy.home;
  const s = siteCopy.common.站点;
  return `<section class="join-panel" id="join"><div><h2>${escapeHtml(h.入会标题)}</h2><p>${escapeHtml(h.入会说明)}</p><dl class="join-facts"><div><dt>${escapeHtml(h.招新群标签)}</dt><dd>${escapeHtml(s.QQ群)}</dd></div><div><dt>${escapeHtml(h.地点标签)}</dt><dd>${escapeHtml(s.地点)}</dd></div></dl><p>${escapeHtml(h.场地设备)}</p><p>${escapeHtml(h.到访提醒)}</p></div><figure class="join-code"><a href="${escapeAttr(safeUrl(h.招新群链接))}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttr(safeUrl(h.招新二维码, true))}" alt="${escapeAttr(h.二维码描述)}" width="185" height="185" loading="lazy"></a><figcaption>${escapeHtml(h.二维码说明)}</figcaption></figure></section>`;
}
function renderHero(h = siteCopy.home) {
  const s = siteCopy.common.站点;
  return `<section class="hero"><div class="hero-scene"><img src="${escapeAttr(safeUrl(h.主视觉图片, true))}" alt="${escapeAttr(h.主视觉描述)}" width="${Number(h.主视觉宽度) || 2800}" height="${Number(h.主视觉高度) || 1260}" fetchpriority="high"></div><div class="hero-layout container"><div class="hero-copy"><p class="institution">${escapeHtml(s.学校)}</p><h1>${escapeHtml(s.名称)}</h1><p class="hero-fullname">${escapeHtml(s.全称)}</p><p class="hero-english" lang="en">${escapeHtml(h.首屏英文)}</p><div class="actions"><a class="hero-guide" href="${escapeAttr(pageHref('guide'))}"><span>${escapeHtml(PAGES.guide.title)}</span><span class="hero-guide-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h13m-5-5 5 5-5 5"/></svg></span></a></div></div></div></section>`;
}
function renderHome(content = { news: [], notices: [] }, introduction = '') {
  const h = siteCopy.home;
  const facts = items => items.map(item => `<div><dt>${escapeHtml(item.标题)}</dt><dd>${escapeHtml(item.说明)}</dd></div>`).join('');
  return `${renderHero()}
  <section class="section"><div class="container"><div class="section-title"><h2>${escapeHtml(h.首次参加标题)}</h2></div>${introduction ? `<p class="section-intro">${renderInline(stripTitle(introduction).trim())}</p>` : ''}<div class="newcomer-layout"><div class="newcomer-note"><aside class="safety-note"><strong>${renderInline(h.安全提示)}</strong><p>${escapeHtml(h.安全说明)}</p></aside><p>${escapeHtml(h.参加说明)}</p><p>${escapeHtml(h.基础说明)}</p></div><dl class="entry-list">${h.参与内容.map(item => `<div class="entry"><dt>${escapeHtml(item.标题)}</dt><dd>${escapeHtml(item.说明)}</dd></div>`).join('')}</dl></div></div></section>
  <section class="section soft"><div class="container split"><figure><img class="split-photo" src="${escapeAttr(safeUrl(h.竞赛图片, true))}" alt="${escapeAttr(h.竞赛图注)}" loading="lazy"><figcaption class="photo-caption">${escapeHtml(h.竞赛图注)}</figcaption></figure><div><h2>${escapeHtml(PAGES.projects.title)}</h2><p>${escapeHtml(h.竞赛介绍)}</p><dl class="project-facts">${facts(h.竞赛补充)}</dl><div class="actions"><a class="text-link" href="${escapeAttr(pageHref('projects'))}">${escapeHtml(h.竞赛入口)}</a></div></div></div></section>
  <section class="section"><div class="container"><div class="section-title"><h2>${escapeHtml(h.科普标题)}</h2><a class="text-link" href="${escapeAttr(pageHref('outreach'))}">${escapeHtml(h.科普入口)}</a></div><div class="outreach-overview"><figure><img class="outreach-photo" src="${escapeAttr(safeUrl(h.科普图片, true))}" alt="${escapeAttr(h.科普图片描述)}" loading="lazy"><figcaption class="photo-caption">${escapeHtml(h.科普图注)}</figcaption></figure><div class="outreach-copy"><p>${escapeHtml(h.科普介绍)}</p><p>${escapeHtml(h.科普岗位)}</p><div class="service-types">${h.科普类型.map(item => `<span>${escapeHtml(item)}</span>`).join('')}</div></div></div></div></section>
  <section class="section soft"><div class="container"><div class="section-title"><h2>${escapeHtml(PAGES.updates.title)}</h2><a class="text-link" href="${escapeAttr(pageHref('updates'))}">${escapeHtml(wording('列表', '全部入口'))}</a></div><div class="streams"><section class="stream"><h3>${escapeHtml(wording('列表', '新闻标题'))}</h3>${renderStream('news', content.news.slice(0, 3))}</section><section class="stream"><h3>${escapeHtml(wording('列表', '通知标题'))}</h3>${renderStream('notices', content.notices.slice(0, 3))}</section></div></div></section>
  <div class="container">${joinPanel()}</div>`;
}
function renderStream(kind, items) {
  if (!items.length) return `<p class="empty-note">${kind === 'notices' ? escapeHtml(wording('列表', '暂无通知').replace('{QQ群}', wording('站点', 'QQ群'))) : kind === 'projects' ? escapeHtml(wording('列表', '暂无项目')) : escapeHtml(wording('列表', '暂无新闻'))}</p>`;
  return items.map(item => {
    const cover = kind === 'news' ? safeUrl(item.cover, true) : '';
    return `<article class="stream-item${cover ? ' has-image' : ''}">${cover ? `<img class="stream-thumb" src="${escapeAttr(cover)}" alt="" width="240" height="180" loading="lazy">` : ''}<div class="stream-copy">${renderRecordMeta(item, kind)}<h3><a href="${escapeAttr(contentHref(kind, item.id))}">${escapeHtml(item.title)}</a></h3>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}</div></article>`;
  }).join('');
}
function renderRecordMeta(item, kind = item.kind) {
  const category = item.category || item.project_type;
  const label = item.date_label || (kind === 'news' ? '活动日期' : kind === 'notices' ? '发布日期' : '记录日期');
  if (!category && !item.date) return '';
  return `<p class="record-meta">${category ? `<span class="record-category">${escapeHtml(category)}</span>` : ''}${item.date ? `<time datetime="${escapeAttr(item.date)}">${escapeHtml(label)} ${escapeHtml(item.date)}</time>` : ''}</p>`;
}
function renderSource(item) {
  if (!item.source_title) return '';
  const href = safeUrl(item.source_url);
  const title = escapeHtml(item.source_title);
  return `<footer class="record-source"><strong>${escapeHtml(wording('列表', '来源标题'))}</strong><p>${title}</p>${item.source_name || item.source_date ? `<p>${[item.source_name, item.source_date].filter(Boolean).map(escapeHtml).join(' · ')}</p>` : ''}${href ? `<a class="text-link" href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.source_link_text || wording('列表', '完整报道'))}</a>` : ''}</footer>`;
}
function renderProjectRecords(items) {
  const projects = items.filter(item => item.record_type !== 'history');
  const history = items.filter(item => item.record_type === 'history');
  return `${projects.length ? `<section class="related-records" id="project-records"><h2>${escapeHtml(wording('列表', '项目记录'))}</h2><div class="record-grid">${renderStream('projects', projects)}</div></section>` : ''}${history.length ? `<section class="related-records" id="project-history"><h2>${escapeHtml(wording('列表', '历史标题'))}</h2><p>${escapeHtml(wording('列表', '历史说明'))}</p><div class="history-stories">${renderStream('projects', history)}</div></section>` : ''}`;
}
function renderUpdates(content) {
  return `<div class="container page">${breadcrumbs([{ label: PAGES.updates.title }])}${pageHeader(PAGES.updates.title)}<div class="updates-layout"><section class="stream" id="news"><h2>${escapeHtml(wording('列表', '新闻标题'))}</h2>${renderStream('news', content.news)}</section><aside class="stream updates-notices" id="notices" aria-label="活动通知"><h2>${escapeHtml(wording('列表', '通知标题'))}</h2>${renderStream('notices', content.notices)}</aside></div></div>`;
}
function stripTitle(body) { return String(body || '').replace(/^\s*#\s+[^\n]+\n*/, ''); }
function splitSections(body) {
  const parts = stripTitle(body).split(/^##\s+(.+)$/m);
  const sections = [];
  for (let i = 1; i < parts.length; i += 2) {
    const marker = parts[i].match(/\s+\{#([\w-]+)\}$/);
    sections.push({ key: marker?.[1] || '', title: parts[i].replace(/\s+\{#[\w-]+\}$/, '').trim(), body: parts[i + 1] || '' });
  }
  return { intro: parts[0], sections };
}
function renderGuide(article) {
  const data = splitSections(article.body);
  const directionKeys = ['fixed-wing', 'fpv', 'helicopter'];
  const start = data.sections.find(item => item.key === 'start');
  const introduction = data.sections.find(item => item.key === 'aircraft');
  const supporting = data.sections.filter(item => ![...directionKeys, 'start', 'aircraft'].includes(item.key));
  return `<div class="container page">${breadcrumbs([{ label: PAGES.guide.title }])}${pageHeader(article.title || PAGES.guide.title, article.summary)}<div class="guide-intro markdown-body">${renderMarkdown(data.intro)}</div>${start ? `<section class="guide-start markdown-body"><h2>${escapeHtml(start.title)}</h2>${renderMarkdown(start.body)}</section>` : ''}<section class="guide-routes" id="flight"><h2>${escapeHtml(introduction?.title || '')}</h2>${introduction ? `<div class="guide-intro markdown-body">${renderMarkdown(introduction.body)}</div>` : ''}<div class="guide-options">${directionKeys.map(key => {
    const item = data.sections.find(part => part.key === key);
    return item ? `<section class="guide-option"><h3>${escapeHtml(item.title)}</h3><div class="markdown-body">${renderMarkdown(item.body)}</div></section>` : '';
  }).join('')}</div></section><div class="guide-supplement">${supporting.map(item => `<section class="guide-intro markdown-body"><h2>${escapeHtml(item.title)}</h2>${renderMarkdown(item.body)}</section>`).join('')}</div></div>`;
}
function renderResources(article) {
  const routeGroups = Object.entries(ROUTES).filter(([key]) => key !== 'design').map(([key, route]) => ({ ...route, key }));
  return `<div class="container page">${breadcrumbs([{ label: PAGES.resources.title }])}${pageHeader(article.title || PAGES.resources.title, article.summary)}<div class="guide-intro markdown-body">${renderMarkdown(stripTitle(article.body))}</div><div class="resource-grid">${[...routeGroups, ...HANDBOOKS].map(group => `<section class="resource-group"><h2>${escapeHtml(group.title)}</h2><ul>${group.articles.filter(id => allArticles.some(item => item.id === id)).map(id => `<li><a href="${articleHref(id, group.key || '')}">${escapeHtml(articleTitle(id))}</a></li>`).join('')}</ul></section>`).join('')}</div></div>`;
}
function renderToc(body, inline = false) {
  const headings = extractHeadings(body);
  if (headings.length < 3) return '';
  const links = headings.map(h => `<a class="level-${h.level}" href="#${escapeAttr(h.id)}">${escapeHtml(h.text)}</a>`).join('');
  return inline ? `<details class="article-toc"><summary>${escapeHtml(wording('阅读', '本页目录'))}</summary><nav>${links}</nav></details>` : `<aside class="toc" aria-label="本页目录"><strong>${escapeHtml(wording('阅读', '本页目录'))}</strong>${links}</aside>`;
}
function renderPortal(article, page, content = currentContent) {
  const body = stripTitle(article.body);
  const isMainPage = PAGES[page]?.article === article.id;
  const crumbs = isMainPage ? [{ label: PAGES[page].title }] : [{ label: PAGES[page]?.title || PAGES.resources.title, href: pageHref(page) }, { label: article.title }];
  const records = isMainPage && page === 'projects' ? renderProjectRecords(content?.projects || []) : isMainPage && page === 'outreach' && content?.news?.length ? `<section class="related-records" id="activity-records"><div class="section-title"><h2>${escapeHtml(wording('列表', '活动记录'))}</h2><a class="text-link" href="${escapeAttr(pageHref('updates') + '#news')}">${escapeHtml(wording('列表', '全部入口'))}</a></div>${renderStream('news', content.news.slice(0, 3))}</section>` : '';
  const hasSideToc = page === 'projects';
  return `<div class="container page">${isMainPage ? '' : breadcrumbs(crumbs)}${pageHeader(article.title, article.summary)}<div class="${hasSideToc ? 'portal-layout' : 'portal-reading'}"><div>${hasSideToc ? '' : renderToc(body, true)}<article class="markdown-body${isMainPage && page === 'projects' ? ' competition-copy' : ''}">${renderMarkdown(body)}</article>${renderMedia(article.media || [])}</div>${hasSideToc ? renderToc(body) : ''}</div>${records}</div>`;
}
function renderSidebar(context, id) {
  if (!context.isRoute || context.articles.length < 2 || !context.articles.includes(id)) return '';
  const link = articleId => `<a class="chapter" href="${articleHref(articleId, context.key)}"${id === articleId ? ' aria-current="page"' : ''}>${escapeHtml(articleTitle(articleId, true))}</a>`;
  return `<aside class="route-sidebar" aria-label="${escapeAttr(context.title)}目录"><h2>${escapeHtml(context.title)}</h2><nav>${context.articles.map(link).join('')}</nav></aside>`;
}
function renderReader(article, context, state) {
  const body = stripTitle(article.body);
  const isReference = context.isRoute && !context.articles.includes(article.id);
  const returnId = context.articles.includes(state.returnId) ? state.returnId : context.articles[0];
  const siblings = chapterNeighbours(article.id, context);
  const adjacent = (id, rel) => `<a rel="${rel}" href="${escapeAttr(articleHref(id, context.key))}"><small>${escapeHtml(wording('阅读', rel === 'prev' ? '上一篇' : '下一篇'))}</small>${escapeHtml(articleTitle(id, true))}</a>`;
  const sidebar = renderSidebar(context, article.id);
  const subject = isReference ? getArticleContext(article.id) : context;
  const isAircraftRoute = subject?.isRoute && subject.key !== 'design';
  const crumbs = [{ label: isAircraftRoute ? PAGES.guide.title : PAGES.resources.title, href: pageHref(isAircraftRoute ? 'guide' : 'resources') }, { label: subject?.title || article.title }];
  const safetyLink = `<a href="${escapeAttr(articleHref('safety-rules', context.key, article.id))}">${escapeHtml(articleTitle('safety-rules', true))}</a>`;
  const safety = isAircraftRoute && !isReference ? `<p class="route-safety">${escapeHtml(wording('阅读', '安全提示')).replace('{安全链接}', safetyLink)}</p>` : '';
  const chapters = context.isRoute && !isReference && (siblings.previous || siblings.next) ? `<nav class="chapter-footer" aria-label="章节导航">${siblings.previous ? adjacent(siblings.previous, 'prev') : ''}${siblings.next ? adjacent(siblings.next, 'next') : ''}</nav>` : '';
  return `<div class="reading-layout${sidebar ? '' : ' reading-single'}">${sidebar}<div class="reading-main">${breadcrumbs(crumbs)}${isReference ? `<div class="return-route"><a href="${escapeAttr(articleHref(returnId, context.key))}">← ${escapeHtml(wording('阅读', '返回'))}${escapeHtml(articleTitle(returnId, true))}</a></div>` : ''}${pageHeader(article.title, article.summary)}${safety}${renderToc(body, true)}<article class="markdown-body">${renderMarkdown(body)}</article>${renderMedia(article.media || [])}${chapters}</div></div>`;
}
function renderContent(item) {
  const page = item.kind === 'projects' ? 'projects' : 'updates';
  const fields = [
    ['event_date', '活动日期'], ['start_time', '开始时间'], ['end_time', '结束时间'],
    ['location', '活动地点'], ['registration_deadline', '报名截止'], ['contact', '联系与咨询']
  ].filter(([key]) => item[key]);
  const cover = safeUrl(item.cover, true);
  const showCover = cover && !(item.body || '').includes(`](${item.cover})`);
  const registration = safeUrl(item.registration_url);
  const media = (item.gallery || []).map(src => ({ src, caption: item.title }));
  const backHref = pageHref(page) + (item.record_type === 'history' ? '#project-history' : '');
  return `<div class="container page">${breadcrumbs([{ label: PAGES[page].title, href: backHref }, { label: item.title }])}${pageHeader(item.title, item.summary)}${renderRecordMeta(item)}${showCover ? `<img class="page-cover${item.kind === 'news' ? ' news-cover' : ''}" src="${escapeAttr(cover)}" alt="${escapeAttr(item.cover_alt || item.title)}">` : ''}${fields.length ? `<dl class="notice-facts">${fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(item[key])}</dd></div>`).join('')}</dl>` : ''}<div class="portal-reading">${renderToc(item.body, true)}<article class="markdown-body">${renderMarkdown(stripTitle(item.body))}</article>${registration ? `<div class="actions"><a class="button" href="${escapeAttr(registration)}" target="_blank" rel="noopener noreferrer">前往报名</a></div>` : ''}${renderMedia(media)}${renderSource(item)}<nav class="content-footer" aria-label="返回列表"><a href="${backHref}">← ${escapeHtml(wording('阅读', '返回'))}${escapeHtml(PAGES[page].title)}</a></nav></div></div>`;
}

async function navigate(url, push = true, restoreScroll = false) {
  const target = new URL(url, location.origin);
  if (push && target.href !== location.href) {
    history.replaceState({ ...history.state, scrollY: window.scrollY }, '', location.href);
    history.pushState({}, '', target);
  }
  const state = readLocation(target.href);
  currentState = state;
  currentContext = null;
  const version = ++renderVersion;
  const main = document.getElementById('main');
  main.setAttribute('aria-busy', 'true');
  closeMenu();
  try {
    let html = '';
    let page = 'home';
    let title = '空天科协';
    if (state.type === 'content') {
      const item = await fetchJson(`/api/content/${state.kind}/${encodeURIComponent(state.id)}`);
      html = renderContent(item);
      page = state.kind === 'projects' ? 'projects' : 'updates';
      title = item.title;
    } else {
      const mappedPage = state.type === 'article' ? PORTAL_ARTICLES[state.id] : state.page;
      if (['home', 'updates', 'projects', 'outreach'].includes(mappedPage)) {
        const [news, notices, projects] = await Promise.all(['news', 'notices', 'projects'].map(kind => fetchJson('/api/content/' + kind)));
        if (version !== renderVersion) return;
        currentContent = { news: news.items, notices: notices.items, projects: projects.items };
      }
      if (mappedPage === 'home') html = renderHome(currentContent, (await fetchArticle('association-intro')).body);
      else if (mappedPage === 'updates') {
        page = 'updates'; title = PAGES[page].title;
        html = renderUpdates(currentContent);
      } else {
        const id = state.type === 'article' ? state.id : PAGES[state.page].article;
        const article = await fetchArticle(id);
        if (version !== renderVersion) return;
        const context = getArticleContext(id, state.route);
        if (context) {
          currentContext = context;
          const subject = getArticleContext(id);
          page = subject?.isRoute && subject.key !== 'design' ? 'guide' : 'resources';
          html = renderReader(article, context, state);
        } else if (mappedPage === 'guide') { page = 'guide'; html = renderGuide(article); }
        else if (mappedPage === 'resources') { page = 'resources'; html = renderResources(article); }
        else { page = mappedPage || (id === 'activity-guide' ? 'outreach' : 'resources'); html = renderPortal(article, page); }
        title = article.title;
      }
    }
    if (version !== renderVersion) return;
    main.innerHTML = html;
    document.title = page === 'home' ? `${wording('站点', '名称')} · ${wording('站点', '学校')}` : `${title} · ${wording('站点', '名称')}`;
    setActivePage(page);
    main.removeAttribute('aria-busy');
    if (restoreScroll) window.scrollTo({ top: history.state?.scrollY || 0, behavior: 'instant' });
    else if (target.hash && !target.hash.startsWith('#/article/')) scrollToHash(target.hash);
    else window.scrollTo({ top: 0, behavior: 'instant' });
    if (push) main.focus({ preventScroll: true });
  } catch (error) {
    if (version !== renderVersion) return;
    main.removeAttribute('aria-busy');
    main.innerHTML = `<div class="container error-page"><h1>${error.message === '404' ? '没有找到这篇内容' : '内容暂时无法打开'}</h1><p>可以返回首页，或重新加载后再试。</p><a class="button" href="${escapeAttr(siteHref())}">返回首页</a></div>`;
  }
}
function scrollToHash(hash) {
  let id;
  try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
  const node = document.getElementById(id);
  if (node) node.scrollIntoView();
}
function closeMenu() {
  document.getElementById('siteNav').classList.remove('open');
  document.getElementById('menuToggle').setAttribute('aria-expanded', 'false');
}
function followLink(event) {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || link.target === '_blank' || link.hasAttribute('download')) return;
  const raw = link.getAttribute('href');
  if (raw.startsWith('#')) return;
  const target = new URL(link.href);
  if (target.origin !== location.origin || target.pathname !== SITE_ROOT.pathname) return;
  event.preventDefault();
  const id = target.searchParams.get('article');
  if (id && currentContext?.isRoute && routeContains(currentContext.key, id) && !target.searchParams.has('route')) target.searchParams.set('route', currentContext.key);
  const route = target.searchParams.get('route');
  if (id && route && ROUTES[route]?.references.includes(id)) {
    const returnId = ROUTES[route].articles.includes(currentState.id) ? currentState.id : currentState.returnId;
    if (ROUTES[route].articles.includes(returnId)) target.searchParams.set('return', returnId);
  }
  navigate(target.href);
}

function renderMedia(media) {
  if (!media.length) return '';
  return `<section class="media" aria-label="图片与资料">${media.map(item => {
    const src = mediaHref(item.src || ''); const label = item.caption || wording('阅读', '资料附件');
    if (!src) return '';
    if (isImageUrl(src)) return `<figure><a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttr(src)}" alt="${escapeAttr(label)}" loading="lazy"></a><figcaption>${escapeHtml(label)}</figcaption></figure>`;
    if (isVideoUrl(src)) return `<figure><video controls preload="metadata" src="${escapeAttr(src)}"></video><figcaption>${escapeHtml(label)}</figcaption></figure>`;
    return `<a class="attachment" href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
  }).join('')}</section>`;
}
function safeUrl(value, image = false) {
  const text = String(value || '').trim();
  if (/^https?:\/\//i.test(text)) return text;
  if (/^\/(?!\/)/.test(text)) return siteHref(text);
  if (!image && (/^\?(article|page|kind)=/.test(text) || /^#/.test(text))) return text;
  return '';
}
function mediaHref(src) {
  const safe = safeUrl(src, true); if (safe) return safe;
  if (!src || /[:/\\]/.test(src)) return '';
  if (isImageUrl(src)) return siteHref('knowledge/assets/images/' + encodeURIComponent(src));
  if (isVideoUrl(src)) return siteHref('knowledge/assets/videos/' + encodeURIComponent(src));
  return '';
}
function isVideoUrl(src) { return /\.(mp4|mov|webm)(\?.*)?$/i.test(src); }
function isImageUrl(src) { return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(src); }
function slug(text) { return String(text).trim().toLowerCase().replace(/\s+/g, '-'); }
function extractHeadings(markdown) {
  const counts = {}; let inCode = false; const items = [];
  for (const line of String(markdown || '').split(/\r?\n/)) {
    if (line.trim().startsWith('```')) { inCode = !inCode; continue; }
    if (inCode) continue;
    const match = /^(#{2,3})\s+(.+)$/.exec(line.trim()); if (!match) continue;
    const text = match[2].replace(/#+$/, '').trim(); const base = slug(text);
    counts[base] = (counts[base] || 0) + 1;
    items.push({ level: match[1].length, text, id: counts[base] > 1 ? `${base}-${counts[base]}` : base });
  }
  return items;
}
function renderMarkdown(markdown) {
  const lines = String(markdown || '').replace(/\r\n/g, '\n').split('\n');
  const html = []; const counts = {}; let paragraph = []; let listType = ''; let inCode = false; let code = [];
  const flush = () => { if (paragraph.length) { html.push(`<p>${renderInline(paragraph.join(' '))}</p>`); paragraph = []; } };
  const closeList = () => { if (listType) { html.push(`</${listType}>`); listType = ''; } };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.trim().startsWith('```')) {
      if (inCode) { html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); inCode = false; code = []; }
      else { flush(); closeList(); inCode = true; }
      continue;
    }
    if (inCode) { code.push(raw); continue; }
    if (!line.trim()) { flush(); closeList(); continue; }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (heading) {
      flush(); closeList(); const level = heading[1].length; const text = heading[2].replace(/#+$/, '').trim(); const base = slug(text);
      counts[base] = (counts[base] || 0) + 1; const id = counts[base] > 1 ? `${base}-${counts[base]}` : base;
      html.push(`<h${level} id="${escapeAttr(id)}">${renderInline(text)}</h${level}>`); continue;
    }
    const list = /^(?:([-*])|\d+\.)\s+(.+)$/.exec(line.trim());
    if (list) {
      flush(); const type = list[1] ? 'ul' : 'ol';
      if (listType !== type) { closeList(); html.push(`<${type}>`); listType = type; }
      html.push(`<li>${renderInline(list[2])}</li>`); continue;
    }
    const quote = /^>\s?(.+)$/.exec(line.trim());
    if (quote) { flush(); closeList(); html.push(`<blockquote>${renderInline(quote[1])}</blockquote>`); continue; }
    closeList(); paragraph.push(line.trim());
  }
  flush(); closeList(); if (inCode) html.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`);
  return html.join('\n');
}
function renderInline(text) {
  const pattern = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  let html = ''; let position = 0;
  for (const match of String(text).matchAll(pattern)) {
    html += escapeHtml(text.slice(position, match.index));
    if (match[1] !== undefined) {
      const src = safeUrl(match[2], true);
      html += src ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(match[1])}" loading="lazy">` : escapeHtml(match[1]);
    } else if (match[3] !== undefined) {
      const href = safeUrl(match[4]);
      const external = /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith(SITE_ROOT.pathname + '?') && href !== SITE_ROOT.pathname);
      html += href ? `<a href="${escapeAttr(href)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(match[3])}</a>` : escapeHtml(match[3]);
    } else if (match[5] !== undefined) html += `<code>${escapeHtml(match[5])}</code>`;
    else html += `<strong>${escapeHtml(match[6])}</strong>`;
    position = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(position));
}
function escapeHtml(text) { return String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function escapeAttr(text) { return escapeHtml(text).replaceAll('`', '&#96;'); }

async function init() {
  document.addEventListener('click', followLink);
  document.getElementById('menuToggle').addEventListener('click', () => {
    const open = document.getElementById('siteNav').classList.toggle('open');
    document.getElementById('menuToggle').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => navigate(location.href, false, true));
  try {
    setSiteCopy(await fetchJson('/api/site-copy'));
    const data = await fetchJson('/api/articles');
    allArticles = data.sections.flatMap(section => section.articles);
  } catch {
    document.getElementById('main').innerHTML = '<div class="container error-page"><h1>内容暂时无法打开</h1><p>请刷新后再试。</p></div>';
    return;
  }
  await navigate(location.href, false);
}
if (typeof document !== 'undefined' && document.getElementById('main')) init();
if (typeof module !== 'undefined' && module.exports) module.exports = { setSiteCopy, ROUTES, HANDBOOKS, PAGES, PORTAL_ARTICLES, getArticleContext, articleHref, readLocation, chapterNeighbours, renderMarkdown, extractHeadings, renderSidebar, renderReader, renderGuide, renderResources, renderContent, renderHero, renderHome, renderPortal, renderProjectRecords, renderUpdates, safeUrl };
