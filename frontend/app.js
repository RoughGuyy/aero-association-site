'use strict';

const SITE_STRUCTURE = typeof require === 'function'
  ? require('../网站内容/站点结构.json') : globalThis.AERO_SITE_STRUCTURE;
const PAGES = Object.fromEntries(SITE_STRUCTURE.pages.map(node => [node.page, { title: node.title, ...(node.article ? {article: node.article} : {}) }]));
const PAGE_ALIASES = { outreach: 'activities', updates: 'activities' };
const ROUTES = { ...SITE_STRUCTURE.legacyRoutes };
const HANDBOOKS = [];
const FLIGHT_COURSES = [];
function collectNavigation(node) {
  const articles = [node.article, ...(node.children || []).map(child => child.article)].filter(Boolean);
  if (node.route) ROUTES[node.route] = {title: node.title, articles, references: node.references || []};
  if (node.group) HANDBOOKS.push({title: node.title, anchor: node.anchor, pending: node.pending, articles: (node.children || []).map(child => child.article)});
  if (node.course) FLIGHT_COURSES.push({title: node.title, isCourse: true, articles});
  (node.children || []).forEach(collectNavigation);
}
SITE_STRUCTURE.pages.forEach(collectNavigation);
const PORTAL_ARTICLES = {
  'association-intro': 'home', 'newcomer-path': 'guide', 'resource-center': 'resources',
  'competitions-and-growth': 'projects', 'outreach-service': 'activities',
  'activity-guide': 'activities', 'activity-records': 'activities'
};
const SHORT_TITLES = {};
const SITE_ROOT = typeof document === 'undefined'
  ? new URL('http://localhost/')
  : new URL('./', document.currentScript?.src || document.baseURI);
let siteCopy;
function setSiteCopy(value) {
  siteCopy = value;
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
  const group = [...FLIGHT_COURSES, ...HANDBOOKS].find(item => item.articles.includes(id));
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
  const stored = globalThis.AERO_PAGE_ROUTES?.[parsed.pathname.split('/').pop() || 'index.html'];
  const query = new URLSearchParams(stored || '');
  parsed.searchParams.forEach((value, key) => query.set(key, value));
  const legacy = parsed.hash.match(/^#\/article\/(.+)$/);
  const article = query.get('article') || (legacy ? decodeURIComponent(legacy[1]) : '');
  if (article) return { type: 'article', id: article, route: query.get('route') || '', returnId: query.get('return') || '' };
  const kind = query.get('kind');
  if (['news', 'notices', 'projects', 'aircraft'].includes(kind) && query.get('id')) return { type: 'content', kind, id: query.get('id') };
  const requestedPage = query.get('page') === 'about' ? 'home' : query.get('page') || 'home';
  const page = PAGE_ALIASES[requestedPage] || requestedPage;
  return { type: 'page', page: PAGES[page] ? page : 'home' };
}
function pageHref(page) { return page === 'home' ? siteHref() : siteHref('?page=' + page); }
function staticDestination(state) {
  const routes = globalThis.AERO_PAGE_ROUTES || {};
  const keys = [];
  if (state.type === 'article') {
    const context = getArticleContext(state.id, state.route);
    if (context?.isRoute && context.references.includes(state.id)) {
      const returnId = context.articles.includes(state.returnId) ? state.returnId : context.articles[0];
      keys.push(`article=${state.id}&route=${context.key}&return=${returnId}`);
    }
    keys.push('article=' + state.id);
    if (PORTAL_ARTICLES[state.id]) keys.push('page=' + PORTAL_ARTICLES[state.id]);
  } else keys.push(state.type === 'content' ? `kind=${state.kind}&id=${state.id}` : 'page=' + state.page);
  for (const key of keys) {
    const match = Object.entries(routes).find(([, query]) => query === key);
    if (match) return match[0];
  }
  return '';
}
function contentHref(kind, id) { return siteHref('?' + new URLSearchParams({ kind, id }).toString()); }
function chapterNeighbours(id, context) {
  if (!context?.isRoute && !context?.isCourse) return { previous: '', next: '' };
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
    else if (/^content\/(news|notices|projects|aircraft)$/.test(clean)) target = 'api/' + clean + '/index.json';
    else if (/^content\/(news|notices|projects|aircraft)\//.test(clean)) target = 'api/' + clean + '.json';
    else target = 'api/' + clean + '.json';
    target = siteHref(target);
    if (globalThis.AERO_BUILD_VERSION) target += '?v=' + globalThis.AERO_BUILD_VERSION;
  }
  const response = await fetch(target, { cache: 'default', ...options });
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
function joinPanel(section) {
  if (!section) return '';
  const qr = section.body.match(/\[!\[([^\]]*)\]\(([^)]+)\)\]\(([^)]+)\)/);
  const body = qr ? section.body.replace(qr[0], '') : section.body;
  return `<section class="join-panel" id="join"><div class="markdown-body"><h2>${escapeHtml(section.title)}</h2>${renderMarkdown(body)}</div>${qr ? `<figure class="join-code"><a href="${escapeAttr(safeUrl(qr[3]))}" target="_blank" rel="noopener noreferrer"><img src="${escapeAttr(safeUrl(qr[2], true))}" alt="${escapeAttr(qr[1])}" width="185" height="185" loading="lazy"></a><figcaption>${escapeHtml(qr[1])}</figcaption></figure>` : ''}</section>`;
}
function renderHero(h = siteCopy.home) {
  const s = siteCopy.common.站点;
  return `<section class="hero"><div class="hero-scene"><img src="${escapeAttr(safeUrl(h.主视觉图片, true))}" alt="${escapeAttr(h.主视觉描述)}" width="${Number(h.主视觉宽度) || 2800}" height="${Number(h.主视觉高度) || 1260}" fetchpriority="high"></div><div class="hero-layout container"><div class="hero-copy"><p class="institution">${escapeHtml(s.学校)}</p><h1>${escapeHtml(s.名称)}</h1><p class="hero-fullname">${escapeHtml(s.全称)}</p><p class="hero-english" lang="en">${escapeHtml(h.首屏英文)}</p><div class="actions"><a class="hero-guide" href="${escapeAttr(pageHref('guide'))}"><span>${escapeHtml(PAGES.guide.title)}</span><span class="hero-guide-mark" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h13m-5-5 5 5-5 5"/></svg></span></a></div></div></div></section>`;
}
function renderHome(content = { news: [], notices: [] }, introduction = '') {
  const h = siteCopy.home;
  const facts = items => items.map(item => `<div><dt>${escapeHtml(item.标题)}</dt><dd>${escapeHtml(item.说明)}</dd></div>`).join('');
  return `${renderHero()}
  <section class="section home-welcome"><div class="container"><div class="section-title"><h2>${escapeHtml(h.首次参加标题)}</h2></div>${introduction ? `<p class="section-intro">${renderInline(stripTitle(introduction).trim())}</p>` : ''}<div class="newcomer-layout"><div class="newcomer-note">${h.安全提示 || h.安全说明 ? `<aside class="safety-note"><strong>${renderInline(h.安全提示 || '')}</strong><p>${escapeHtml(h.安全说明)}</p></aside>` : ''}${h.参加说明 ? `<p>${escapeHtml(h.参加说明)}</p>` : ''}<p>${escapeHtml(h.基础说明)}</p></div><dl class="entry-list">${h.参与内容.map(item => `<div class="entry"><dt>${escapeHtml(item.标题)}</dt><dd>${escapeHtml(item.说明)}</dd></div>`).join('')}</dl></div></div></section>
  <section class="section soft home-projects"><div class="container split"><figure><img class="split-photo" src="${escapeAttr(safeUrl(h.竞赛图片, true))}" alt="${escapeAttr(h.竞赛图注)}" loading="lazy"><figcaption class="photo-caption">${escapeHtml(h.竞赛图注)}</figcaption></figure><div><h2><a class="section-heading-link" href="${escapeAttr(pageHref('projects'))}">${escapeHtml(PAGES.projects.title)}</a></h2><p>${escapeHtml(h.竞赛介绍)}</p><dl class="project-facts">${facts(h.竞赛补充)}</dl></div></div></section>
  <section class="section home-activities"><div class="container"><div class="section-title"><h2>${escapeHtml(PAGES.activities.title)}</h2><a class="text-link" href="${escapeAttr(pageHref('activities'))}">${escapeHtml(wording('列表', '全部入口'))}</a></div><p class="section-intro">${escapeHtml(h.活动介绍)}</p><div class="stream">${renderStream('news', content.news.slice(0, 3))}</div></div></section>`;
}
function renderStream(kind, items) {
  if (!items.length) return `<p class="empty-note">${kind === 'notices' ? escapeHtml(wording('列表', '暂无通知').replace('{QQ群}', wording('站点', 'QQ群'))) : kind === 'projects' ? escapeHtml(wording('列表', '暂无项目')) : escapeHtml(wording('列表', '暂无新闻'))}</p>`;
  return items.map(item => {
    const cover = kind === 'news' ? safeUrl(item.cover, true) : '';
    return `<article class="stream-item${cover ? ' has-image' : ''}">${cover ? `<img class="stream-thumb" src="${escapeAttr(cover)}" alt="" width="240" height="180" loading="lazy">` : ''}<div class="stream-copy">${renderRecordMeta(item, kind)}<h3><a href="${escapeAttr(contentHref(kind, item.id))}">${escapeHtml(item.title)}</a></h3>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}</div></article>`;
  }).join('');
}
function renderRecordMeta(item, kind = item.kind) {
  const category = kind === 'news' ? '' : item.category || item.project_type;
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
  if (!items.length) return '';
  return `<section class="related-records" id="project-records"><h2>${escapeHtml(wording('列表', '项目记录'))}</h2><div class="record-grid">${renderStream('projects', items)}</div></section>`;
}

function renderActivities(content, guide = { title: '参与指南', body: '' }) {
  return `<div class="container page">${breadcrumbs([{ label: PAGES.activities.title }])}${pageHeader(PAGES.activities.title)}<nav class="activity-sections" aria-label="活动与实践页内导航"><a href="#participation-guide">参与指南</a><a href="#activity-records">活动记录</a></nav><section class="participation-guide markdown-body" id="participation-guide"><h2>${escapeHtml(guide.title)}</h2>${renderMarkdown(stripTitle(guide.body))}</section><section class="stream activity-records" id="activity-records"><h2>活动记录</h2>${renderStream('news', content.news)}</section></div>`;
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
  return `<div class="container page guide-page">${breadcrumbs([{ label: PAGES.guide.title }])}${pageHeader(article.title || PAGES.guide.title, article.summary)}${data.intro.trim() ? `<div class="guide-intro markdown-body">${renderMarkdown(data.intro)}</div>` : ''}${joinPanel(start)}<section class="guide-routes" id="flight"><h2>${escapeHtml(introduction?.title || '')}</h2>${introduction ? `<div class="guide-intro markdown-body">${renderMarkdown(introduction.body)}</div>` : ''}<div class="guide-options">${directionKeys.map(key => {
    const item = data.sections.find(part => part.key === key);
    return item ? `<section class="guide-option"><h3>${renderInline(item.title)}</h3><div class="markdown-body">${renderMarkdown(item.body)}</div></section>` : '';
  }).join('')}</div></section><div class="guide-supplement">${supporting.map(item => `<section class="guide-intro markdown-body"><h2>${renderInline(item.title)}</h2>${renderMarkdown(item.body)}</section>`).join('')}</div></div>`;
}
function renderResources(article) {
  const references = HANDBOOKS.map(group => `<section class="resource-group" id="${escapeAttr(group.anchor)}"><h3>${escapeHtml(group.title)}</h3><ul>${group.pending ? `<li class="resource-pending"><span class="resource-entry-title">${escapeHtml(group.pending)}</span></li>` : ''}${group.articles.map(id => allArticles.find(item => item.id === id)).filter(Boolean).map(item => `<li><a class="resource-entry" href="${escapeAttr(articleHref(item.id))}"><span class="resource-entry-title">${escapeHtml(item.title)}</span>${['3d-printing', 'flight-training', 'aerobatics-training', 'fai-model-classification'].includes(item.id) && item.summary ? `<span class="resource-entry-summary">${escapeHtml(item.summary)}</span>` : ''}</a></li>`).join('')}</ul></section>`).join('');
  return `<div class="container page resource-page">${breadcrumbs([{ label: PAGES.resources.title }])}${pageHeader(article.title || PAGES.resources.title, article.summary)}<section class="resource-reference" aria-labelledby="reference-title"><div class="resource-section-head"><h2 id="reference-title">按需查阅</h2><p>制作、调试与训练时，找到需要的资料。</p></div><div class="resource-grid">${references}</div></section></div>`;
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
  const records = isMainPage && page === 'projects' ? renderProjectRecords(content?.projects || []) : '';
  const hasSideToc = page === 'projects';
  return `<div class="container page">${isMainPage ? '' : breadcrumbs(crumbs)}${pageHeader(article.title, article.summary)}<div class="${hasSideToc ? 'portal-layout' : 'portal-reading'}"><div>${hasSideToc ? '' : renderToc(body, true)}<article class="markdown-body${isMainPage && page === 'projects' ? ' competition-copy' : ''}">${renderMarkdown(body)}</article>${renderMedia(article.media || [])}</div>${hasSideToc ? renderToc(body) : ''}</div>${records}</div>`;
}
function renderSidebar(context, id) {
  if ((!context.isRoute && !context.isCourse) || context.articles.length < 2 || !context.articles.includes(id)) return '';
  const link = articleId => `<a class="chapter" href="${articleHref(articleId, context.key)}"${id === articleId ? ' aria-current="page"' : ''}>${escapeHtml(articleTitle(articleId, true))}</a>`;
  return `<aside class="route-sidebar" aria-label="${escapeAttr(context.title)}目录"><h2>${escapeHtml(context.title)}</h2><nav>${context.articles.map(link).join('')}</nav></aside>`;
}
function isContinuousRoute(context, id) {
  return context?.key === 'fixed-wing' && context.articles.includes(id);
}
function renderContinuousRoute(articles, context) {
  const sidebar = `<aside class="route-sidebar" aria-label="${escapeAttr(context.title)}目录"><h2>${escapeHtml(context.title)}</h2><nav>${articles.map(article => `<a class="chapter" href="#chapter-${escapeAttr(article.id)}">${escapeHtml(articleTitle(article.id, true))}</a>`).join('')}</nav></aside>`;
  const sections = articles.map((article, index) => {
    const body = renderMarkdown(stripTitle(article.body))
      .replace(/id="([^"]+)"/g, `id="${article.id}--$1"`)
      .replace(/href="#([^"]+)"/g, `href="#${article.id}--$1"`);
    return `<section class="route-section" id="chapter-${escapeAttr(article.id)}" data-article="${escapeAttr(article.id)}"><header class="page-head"><${index ? 'h2' : 'h1'}>${escapeHtml(article.title)}</${index ? 'h2' : 'h1'}>${article.summary ? `<p>${escapeHtml(article.summary)}</p>` : ''}</header><article class="markdown-body">${body}</article>${renderMedia(article.media || [])}</section>`;
  }).join('');
  return `<div class="reading-layout continuous-route">${sidebar}<div class="reading-main">${breadcrumbs([{label: PAGES.guide.title, href: pageHref('guide')}, {label: context.title}])}${sections}</div></div>`;
}
let stopRouteTracking = () => {};
function trackRouteSections() {
  const sections = [...document.querySelectorAll('.route-section')];
  if (!sections.length) return;
  const links = [...document.querySelectorAll('.continuous-route .chapter')];
  let frame = 0;
  const update = () => {
    frame = 0;
    const offset = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + 24;
    let active = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= offset) active = section;
    }
    for (const link of links) {
      if (link.hash === '#' + active.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  update();
  stopRouteTracking = () => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    cancelAnimationFrame(frame);
  };
}
function renderReader(article, context, state) {
  const body = stripTitle(article.body);
  const isReference = context.isRoute && !context.articles.includes(article.id);
  const returnId = context.articles.includes(state.returnId) ? state.returnId : context.articles[0];
  const siblings = chapterNeighbours(article.id, context);
  const adjacent = (id, rel) => `<a rel="${rel}" href="${escapeAttr(articleHref(id, context.key))}"><small>${context.isCourse ? (rel === 'prev' ? '上一部分' : '下一部分') : escapeHtml(wording('阅读', rel === 'prev' ? '上一篇' : '下一篇'))}</small>${escapeHtml(articleTitle(id, true))}</a>`;
  const sidebar = renderSidebar(context, article.id);
  const subject = isReference ? getArticleContext(article.id) : context;
  const isAircraftRoute = subject?.isRoute && subject.key !== 'design';
  const crumbs = [{ label: isAircraftRoute ? PAGES.guide.title : PAGES.resources.title, href: pageHref(isAircraftRoute ? 'guide' : 'resources') }, { label: subject?.title || article.title }];
  const chapters = (context.isRoute || context.isCourse) && !isReference && (siblings.previous || siblings.next) ? `<nav class="chapter-footer" aria-label="章节导航">${siblings.previous ? adjacent(siblings.previous, 'prev') : ''}${siblings.next ? adjacent(siblings.next, 'next') : ''}</nav>` : '';
  return `<div class="reading-layout${sidebar ? '' : ' reading-single'}">${sidebar}<div class="reading-main">${breadcrumbs(crumbs)}${isReference ? `<div class="return-route"><a href="${escapeAttr(articleHref(returnId, context.key))}">← ${escapeHtml(wording('阅读', '返回'))}${escapeHtml(articleTitle(returnId, true))}</a></div>` : ''}${pageHeader(article.title, article.summary)}${renderToc(body, true)}<article class="markdown-body">${renderMarkdown(body)}</article>${renderMedia(article.media || [])}${chapters}</div></div>`;
}
function aircraftLabels(item) {
  return [item.category, item.service_status, item.ownership].filter(Boolean).map(escapeHtml).join(' · ');
}
// 生命周期随页面刷新结束；站内返回目录时保留每架飞机的位置。
const aircraftRandomRanks = new Map();
function renderAircraftDirectory(items) {
  for (const item of items) {
    if (!aircraftRandomRanks.has(item.id)) aircraftRandomRanks.set(item.id, Math.random());
  }
  items = [...items].sort((a, b) => aircraftRandomRanks.get(a.id) - aircraftRandomRanks.get(b.id) || a.id.localeCompare(b.id));
  return `<div class="container page">${breadcrumbs([{ label: PAGES.aircraft.title }])}${pageHeader(PAGES.aircraft.title, '记录协会与成员的航模，以及它们和我们一起经历的故事。')}${items.some(item => item.status === 'draft') ? '<p class="aircraft-draft">本地草稿预览：草稿不会出现在正式发布的网站上。</p>' : ''}${!items.length ? '<p>航模档案正在整理。</p>' : `<div class="aircraft-grid">${items.map(item => {
    const cover = safeUrl(item.cover, true);
    return `<a class="aircraft-card" href="${escapeAttr(contentHref('aircraft', item.id))}">${cover ? `<img class="card-photo" src="${escapeAttr(cover)}" alt="${escapeAttr(item.cover_alt || item.title)}" loading="lazy">` : ''}<div class="aircraft-card-copy"><p class="record-meta">${aircraftLabels(item)}${item.status === 'draft' ? ' · 草稿' : ''}</p><h3>${escapeHtml(item.title)}</h3>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ''}<span class="text-link">查看档案</span></div></a>`;
  }).join('')}</div>`}</div>`;
}
function renderAircraftDetail(item) {
  const back = pageHref('aircraft');
  const fields = [['model', '机型'], ['nickname', '昵称'], ['airframe_id', '机体编号'], ['category', '类别'], ['ownership', '归属'], ['service_status', '机体状态'], ['status_updated', '状态确认日期'], ['acquired_date', item.acquired_date_label || '来到协会的时间'], ['acquisition', '来源'], ['wingspan', '翼展'], ['dimensions', '尺寸'], ['weight', '重量'], ['power', '动力'], ['battery', '电池'], ['purpose', '用途']].filter(([key]) => item[key]);
  const uncommented = stripTitle(String(item.body || '').replace(/<!--[\s\S]*?-->/g, ''));
  const sections = splitSections(uncommented);
  const body = sections.intro + sections.sections.filter(section => section.body.trim()).map(section => `\n\n## ${section.title}\n${section.body}`).join('');
  const cover = safeUrl(item.cover, true);
  const gallery = [...new Set(item.gallery || [])].filter(src => src !== item.cover).map((src, index) => ({ src, caption: `${item.title} · 照片 ${index + 1}` }));
  return `<div class="container page aircraft-detail">${breadcrumbs([{ label: PAGES.aircraft.title, href: back }, { label: item.title }])}${pageHeader(item.title, item.summary)}${item.status === 'draft' ? '<p class="aircraft-draft">本地草稿预览</p>' : ''}${cover ? `<img class="page-cover aircraft-cover" src="${escapeAttr(cover)}" alt="${escapeAttr(item.cover_alt || item.title)}">` : ''}${fields.length ? `<dl class="notice-facts">${fields.map(([key, label]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(item[key])}</dd></div>`).join('')}</dl>` : ''}${item.members?.length ? `<p>参与同学：${item.members.map(escapeHtml).join('、')}</p>` : ''}<div class="portal-reading">${renderToc(body, true)}<article class="markdown-body">${renderMarkdown(body)}</article>${gallery.length ? `<h2>相册</h2>${renderMedia(gallery)}` : ''}${renderSource(item)}<nav class="content-footer" aria-label="返回列表"><a href="${escapeAttr(back)}">← 返回机型目录</a></nav></div></div>`;
}
function renderContent(item) {
  if (item.kind === 'aircraft') return renderAircraftDetail(item);
  const page = item.kind === 'projects' ? 'projects' : 'activities';
  const fields = [
    ['event_date', '活动日期'], ['start_time', '开始时间'], ['end_time', '结束时间'],
    ['location', '活动地点'], ['registration_deadline', '报名截止'], ['contact', '联系与咨询']
  ].filter(([key]) => item[key]);
  const cover = safeUrl(item.cover, true);
  const showCover = cover && !(item.body || '').includes(`](${item.cover})`);
  const registration = safeUrl(item.registration_url);
  const media = (item.gallery || []).map(src => ({ src, caption: item.title }));
  const backHref = pageHref(page) + (item.kind === 'projects' ? '#project-records' : '');
  return `<div class="container page">${breadcrumbs([{ label: PAGES[page].title, href: backHref }, { label: item.title }])}${pageHeader(item.title, item.summary)}${renderRecordMeta(item)}${showCover ? `<img class="page-cover${item.kind === 'news' ? ' news-cover' : ''}" src="${escapeAttr(cover)}" alt="${escapeAttr(item.cover_alt || item.title)}">` : ''}${fields.length ? `<dl class="notice-facts">${fields.map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(item[key])}</dd></div>`).join('')}</dl>` : ''}<div class="portal-reading">${renderToc(item.body, true)}<article class="markdown-body">${renderMarkdown(stripTitle(item.body))}</article>${registration ? `<div class="actions"><a class="button" href="${escapeAttr(registration)}" target="_blank" rel="noopener noreferrer">前往报名</a></div>` : ''}${renderMedia(media)}${renderSource(item)}<nav class="content-footer" aria-label="返回列表"><a href="${backHref}">← ${escapeHtml(wording('阅读', '返回'))}${escapeHtml(PAGES[page].title)}</a></nav></div></div>`;
}

async function renderView(state) {
    let html = '';
    let page = 'home';
    let title = '空天科协';
    if (state.type === 'content') {
      const item = await fetchJson(`/api/content/${state.kind}/${encodeURIComponent(state.id)}`);
      html = renderContent(item);
      page = state.kind === 'aircraft' ? 'aircraft' : state.kind === 'projects' ? 'projects' : 'activities';
      title = item.title;
    } else {
      const mappedPage = state.type === 'article' ? PORTAL_ARTICLES[state.id] : state.page;
      if (['home', 'activities', 'projects'].includes(mappedPage)) {
        const kind = mappedPage === 'projects' ? 'projects' : 'news';
        const data = await fetchJson('/api/content/' + kind);
        currentContent = { news: [], notices: [], projects: [], [kind]: data.items };
      }
      if (mappedPage === 'home') html = renderHome(currentContent, (await fetchArticle('association-intro')).body);
      else if (mappedPage === 'activities') {
        page = 'activities'; title = PAGES[page].title;
        const guide = await fetchArticle('activity-guide');
        html = renderActivities(currentContent, guide);
      } else if (mappedPage === 'aircraft') {
        page = 'aircraft'; title = PAGES[page].title;
        const data = await fetchJson('/api/content/aircraft');
        html = renderAircraftDirectory(data.items);
      } else {
        const id = state.type === 'article' ? state.id : PAGES[state.page].article;
        const article = await fetchArticle(id);
        const context = getArticleContext(id, state.route);
        if (context) {
          currentContext = context;
          const subject = getArticleContext(id);
          page = subject?.isRoute && subject.key !== 'design' ? 'guide' : 'resources';
          if (isContinuousRoute(context, id)) {
            const articles = await Promise.all(context.articles.map(fetchArticle));
            html = renderContinuousRoute(articles, context);
          } else html = renderReader(article, context, state);
        } else if (mappedPage === 'guide') { page = 'guide'; html = renderGuide(article); }
        else if (mappedPage === 'resources') { page = 'resources'; html = renderResources(article); }
        else { page = mappedPage || 'resources'; html = renderPortal(article, page); }
        title = article.title;
      }
    }
    return {html, page, title};
}
async function navigate(url, push = true, restoreScroll = false) {
  stopRouteTracking();
  document.getElementById('printingHelp')?.close();
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
    const {html, page, title} = await renderView(state);
    if (version !== renderVersion) return;
    main.innerHTML = html;
    document.title = page === 'home' ? `${wording('站点', '名称')} · ${wording('站点', '学校')}` : `${title} · ${wording('站点', '名称')}`;
    setActivePage(page);
    main.removeAttribute('aria-busy');
    if (restoreScroll) window.scrollTo({ top: history.state?.scrollY || 0, behavior: 'instant' });
    else if (target.hash && !target.hash.startsWith('#/article/')) scrollToHash(target.hash);
    else if (isContinuousRoute(currentContext, state.id)) scrollToHash('#chapter-' + state.id);
    else window.scrollTo({ top: 0, behavior: 'instant' });
    trackRouteSections();
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
  const node = document.getElementById(id === 'project-history' ? 'project-records' : id)
    || document.getElementById(currentState.id + '--' + id);
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
  if (raw.startsWith('#')) {
    event.preventDefault();
    history.pushState({}, '', raw);
    scrollToHash(raw);
    return;
  }
  const target = new URL(link.href);
  if (target.origin !== location.origin) return;
  if (globalThis.AERO_PRERENDERED) {
    const state = readLocation(target.href);
    if (isContinuousRoute(currentContext, state.id) && document.querySelector('.continuous-route')) {
      event.preventDefault();
      const hash = target.hash ? '#' + state.id + '--' + target.hash.slice(1) : '#chapter-' + state.id;
      history.pushState({}, '', hash); scrollToHash(hash);
    }
    return;
  }
  if (target.pathname !== SITE_ROOT.pathname) return;
  event.preventDefault();
  const id = target.searchParams.get('article');
  if (isContinuousRoute(currentContext, id) && document.querySelector('.continuous-route')) {
    const hash = target.hash ? '#' + id + '--' + target.hash.slice(1) : '#chapter-' + id;
    history.pushState({}, '', hash);
    scrollToHash(hash);
    return;
  }
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
const PRINTING_DETAILS = {
  'ams-match': { title: '匹配：为项目耗材选择对应料槽', paragraphs: ['以项目已有的耗材列表为依据，为每项耗材匹配打印机中的料槽；可以点击槽位调整对应关系。没有相同材料类型时，会显示未匹配，需要重新选择合适的耗材。', '例如项目用 PETG，就匹配 AMS 中装有 PETG 的槽位。适合已经设置好材料或多色分配的项目；同步前检查材料与颜色是否符合预期。'] },
  'ams-overwrite': { title: '覆盖：用机器耗材更新项目列表', paragraphs: ['使用打印机中的耗材依次替换项目耗材列表，尚未使用的机器耗材会添加到列表末尾。', '本例从新导入的模型开始，选择“覆盖 → 立即同步”，再给模型指定 PETG。同步后检查模型的材料分配；发送打印时，再确认对应的 AMS 料槽。'] },
  'bed-leveling': { title: '自动热床调平', paragraphs: ['测量打印板各位置的高度差，并在打印时补偿喷嘴与板面的间距，让第一层铺得更均匀。', '本例默认开启。它补偿的是高度差，不能代替清洁打印板，也不能解决模型悬空。'] },
  'calibration_pa': { title: '动态流量校准', paragraphs: ['喷头加速、减速时，喷嘴内部压力不会立刻跟着变化。校准挤出补偿能减少加速时缺料、减速时堆料，使转角和线条更稳定。', '本例默认开启。它与热床调平是两件事；耗材受潮、透明材料或校准线附着不良会影响 X1C 的检测效果。'] },
  'timelapse': { title: '延时摄影', paragraphs: ['在打印过程中按层采集画面，完成后合成为模型逐渐长出的短片。它用于记录过程，不负责改善打印质量。', '本例默认关闭。需要记录成品生长过程时再开启，并确保打印机有可用存储空间；不同拍摄模式对喷头移动和擦料塔的要求不同。'] }
};
function printingDetailKey(href, label) {
  if (!href.startsWith('https://wiki.bambulab.com/')) return '';
  if (label === '自动热床调平') return 'bed-leveling';
  if (label === '匹配') return 'ams-match';
  if (label === '覆盖') return 'ams-overwrite';
  const key = href.split('/').pop().split('#')[0];
  return PRINTING_DETAILS[key] ? key : '';
}
let printingHelpOpener = null;
function handlePrintingHelp(event) {
  const pause = event.target.closest('[data-fdm-pause]');
  if (pause) {
    const paused = pause.closest('.fdm-diagram').classList.toggle('is-paused');
    pause.setAttribute('aria-pressed', String(paused));
    pause.textContent = paused ? '播放动画' : '暂停动画';
    return;
  }
  const link = event.target.closest('[data-print-detail]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const detail = PRINTING_DETAILS[link.dataset.printDetail];
  if (!detail) return;
  event.preventDefault();
  let dialog = document.getElementById('printingHelp');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'printingHelp'; dialog.className = 'printing-help';
    dialog.setAttribute('aria-labelledby', 'printingHelpTitle');
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      document.body.classList.remove('printing-help-open');
      printingHelpOpener?.focus();
    });
    dialog.addEventListener('click', e => { if (e.target.closest('[data-help-close]')) dialog.close(); });
  }
  printingHelpOpener = link;
  const paragraph = link.closest('p, ol, ul');
  if (paragraph) paragraph.after(dialog);
  dialog.innerHTML = `<header><span>阅读补充</span><button type="button" data-help-close aria-label="关闭说明" autofocus>关闭</button></header><div class="printing-help-body"><h2 id="printingHelpTitle">${escapeHtml(detail.title)}</h2>${detail.paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')}<a class="printing-help-source" href="${escapeAttr(link.href)}" target="_blank" rel="noopener noreferrer">在新标签页查看官方全文</a></div>`;
  document.body.classList.add('printing-help-open');
  if (!dialog.open) dialog.show();
  dialog.scrollTop = 0;
  dialog.querySelector('[data-help-close]').focus({ preventScroll: true });
  if (window.matchMedia('(max-width: 759px)').matches) dialog.scrollIntoView({ block: 'nearest' });
}
function renderFdmDiagram() {
  return `<figure class="fdm-diagram" id="fdm-principle"><div class="fdm-heading"><strong>从一条线，到一层，再到一个零件</strong><button type="button" data-fdm-pause aria-pressed="false">暂停动画</button></div><div class="fdm-panels">
    <div><svg viewBox="0 0 260 230" role="img" aria-label="喷嘴挤出塑料，沿底层铺出新的一层"><path class="fdm-bed" d="M25 192 H235"/><g class="fdm-layers"><path d="M45 172 H215 M45 160 H215"/></g><path class="fdm-deposit fdm-layer-one" d="M45 148 H215"/><path class="fdm-deposit fdm-layer-two" d="M215 136 H45"/><path class="fdm-deposit fdm-layer-three" d="M45 124 H215"/><g class="fdm-nozzle"><path d="M30 72 H60 L53 98 H37Z"/><path d="M41 98 H49 L45 108Z"/></g><text x="130" y="218">熔融塑料逐层堆叠</text></svg><h4>逐层成形</h4><p>喷嘴先铺完一层，再叠下一层。</p></div>
    <div><svg viewBox="0 0 260 230" role="img" aria-label="向上下拉伸时，零件可能沿水平层间分离"><g class="fdm-layers"><path d="M45 172 H215 M45 160 H215 M45 148 H215"/></g><g class="fdm-separate"><g class="fdm-layers"><path d="M45 136 H215 M45 124 H215 M45 112 H215"/></g><path class="fdm-force" d="M130 98 V62 M120 74 L130 62 L140 74"/></g><path class="fdm-force" d="M130 182 V201 M120 191 L130 201 L140 191"/><text x="130" y="225">跨层拉伸更容易分层</text></svg><h4>层间强度</h4><p>主要拉力尽量沿层面，减少把层间拉开的受力。</p></div>
    <div><svg viewBox="0 0 260 230" role="img" aria-label="悬空的软塑料会下垂，树状支撑从下方托住悬垂"><path class="fdm-bed" d="M25 192 H235"/><path class="fdm-part" d="M40 180 V112 H65"/><path class="fdm-sag" d="M65 115 Q145 162 220 117"/><path class="fdm-support" d="M150 185 V157 M150 157 L113 132 V120 M150 157 L187 132 V120 M150 173 L200 148 V120"/><text x="130" y="218">支撑托住悬空部分</text></svg><h4>底面与支撑</h4><p>先用大平面贴板、减少悬空；剩余悬垂再加支撑。</p></div>
  </div><figcaption>FDM 原理示意 · 形状与间距为说明而放大</figcaption></figure>`;
}
function renderMarkdown(markdown) {
  markdown = String(markdown || '').replace(/<!--[\s\S]*?-->/g, '');
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
    if (line.trim() === '[观看 FDM 原理动画](#fdm-principle)') {
      flush(); closeList(); html.push(renderFdmDiagram()); continue;
    }
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
    if (quote) { flush(); closeList(); html.push(quote[1].startsWith('[!WARNING] ') ? `<blockquote class="operation-warning">${renderInline(quote[1].slice(11))}</blockquote>` : `<blockquote>${renderInline(quote[1])}</blockquote>`); continue; }
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
      let dimensions = match[2].startsWith('/knowledge/assets/images/飞行技巧训练/') ? ' width="1516" height="1071"' : '';
      if (match[2].startsWith('/knowledge/assets/images/3D打印/')) {
        const name = match[2].split('/').pop();
        const [width, height] = name.startsWith('05-') ? [630, 790] : name.startsWith('07-') ? [630, 1130] : name.startsWith('09') ? [1080, 1100] : [1600, 902];
        dimensions = ` width="${width}" height="${height}"`;
      }
      html += src ? `<img src="${escapeAttr(src)}" alt="${escapeAttr(match[1])}"${dimensions} loading="lazy">` : escapeHtml(match[1]);
    } else if (match[3] !== undefined) {
      const href = safeUrl(match[4]);
      const external = /^https?:\/\//i.test(href) || (href.startsWith('/') && !href.startsWith(SITE_ROOT.pathname + '?') && href !== SITE_ROOT.pathname);
      const detail = printingDetailKey(href, match[3]);
      html += href ? `<a href="${escapeAttr(href)}"${detail ? ` data-print-detail="${escapeAttr(detail)}" aria-haspopup="dialog"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${escapeHtml(match[3])}</a>` : escapeHtml(match[3]);
    } else if (match[5] !== undefined) html += `<code>${escapeHtml(match[5])}</code>`;
    else html += `<strong>${escapeHtml(match[6])}</strong>`;
    position = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(position));
}
function escapeHtml(text) { return String(text ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function escapeAttr(text) { return escapeHtml(text).replaceAll('`', '&#96;'); }

function guideResultHref(value) {
  if (typeof value !== 'string' || !value.startsWith('?')) return '';
  const url = new URL(value, SITE_ROOT);
  const article = url.searchParams.get('article');
  const page = url.searchParams.get('page');
  const kind = url.searchParams.get('kind');
  if (!(article || PAGES[page] || ['news', 'notices', 'projects', 'aircraft'].includes(kind) && url.searchParams.get('id'))) return '';
  if (globalThis.AERO_PRERENDERED) {
    const destination = staticDestination(readLocation(url.href));
    if (destination) return siteHref(destination) + url.hash;
  }
  return url.pathname + url.search + url.hash;
}
function renderGuideResults(data) {
  const matches = (Array.isArray(data.matches) ? data.matches : []).slice(0, 5);
  if (!matches.length) return '<p class="site-guide-answer">暂时没有找到对应内容，可以换个说法再试。</p>';
  return `<ol>${matches.map(item => {
    const href = guideResultHref(item.href);
    return href ? `<li><a class="site-guide-result" href="${escapeAttr(href)}"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.reason)}</span></a></li>` : '';
  }).join('')}</ol>`;
}
function initSiteGuide() {
  const dialog = document.getElementById('siteGuide');
  const toggle = document.getElementById('guideToggle');
  const form = document.getElementById('siteGuideForm');
  const input = document.getElementById('siteGuideQuestion');
  const results = document.getElementById('siteGuideResults');
  const submit = form.querySelector('button');
  let pending = false;
  let controller;
  const open = () => {
    closeMenu();
    if (!dialog.open) dialog.showModal();
    input.focus();
  };
  toggle.addEventListener('click', open);
  dialog.addEventListener('close', () => {
    controller?.abort();
    toggle.focus({preventScroll: true});
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-guide-close]') || event.target.closest('.site-guide-result')) dialog.close();
  });
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k' && !event.altKey) {
      event.preventDefault();
      open();
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || pending) return;
    const endpoint = globalThis.AERO_GUIDE_API_URL;
    if (!endpoint) {
      results.innerHTML = '<p>站内导览暂未开放，请先通过栏目查找。</p>';
      return;
    }
    pending = true;
    submit.disabled = true;
    submit.setAttribute('aria-label', '正在查找');
    results.setAttribute('aria-busy', 'true');
    results.innerHTML = '<p class="site-guide-loading" role="status">正在查找适合你的内容…</p>';
    controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);
    let failure = '暂时无法连接导览，请稍后重试。';
    try {
      const response = await fetch(endpoint, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({question}), signal: controller.signal});
      const data = await response.json();
      if (!response.ok) {
        if (typeof data.error === 'string') failure = data.error;
        throw new Error('Guide unavailable');
      }
      results.innerHTML = renderGuideResults(data);
    } catch (error) {
      results.innerHTML = `<p>${escapeHtml(error.name === 'AbortError' ? '查询已结束，请重新尝试。' : failure)}</p>`;
    } finally {
      clearTimeout(timeout);
      pending = false;
      submit.disabled = false;
      submit.setAttribute('aria-label', '查找');
      results.removeAttribute('aria-busy');
    }
  });
}
async function init() {
  initSiteGuide();
  document.addEventListener('click', handlePrintingHelp);
  document.addEventListener('click', followLink);
  document.getElementById('menuToggle').addEventListener('click', () => {
    const open = document.getElementById('siteNav').classList.toggle('open');
    document.getElementById('menuToggle').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeMenu();
      document.getElementById('printingHelp')?.close();
    }
  });
  if (globalThis.AERO_PRERENDERED) {
    currentState = readLocation(location.href);
    currentContext = currentState.type === 'article' ? getArticleContext(currentState.id, currentState.route) : null;
    if (location.search || location.hash.startsWith('#/article/')) {
      const destination = staticDestination(currentState);
      if (destination && destination !== location.pathname.split('/').pop()) {
        location.replace(siteHref(destination) + (location.hash.startsWith('#/article/') ? '' : location.hash)); return;
      }
    }
    const grid = document.querySelector('.aircraft-grid');
    if (grid) [...grid.children].map(node => ({node, rank: Math.random()})).sort((a, b) => a.rank - b.rank).forEach(({node}) => grid.append(node));
    if (location.hash) scrollToHash(location.hash);
    else if (isContinuousRoute(currentContext, currentState.id)) scrollToHash('#chapter-' + currentState.id);
    trackRouteSections();
    return;
  }
  history.scrollRestoration = 'manual';
  window.addEventListener('popstate', () => navigate(location.href, false, true));
  try {
    const [copy, data] = await Promise.all([fetchJson('/api/site-copy'), fetchJson('/api/articles')]);
    setSiteCopy(copy);
    allArticles = data.sections.flatMap(section => section.articles);
  } catch {
    document.getElementById('main').innerHTML = '<div class="container error-page"><h1>内容暂时无法打开</h1><p>请刷新后再试。</p></div>';
    return;
  }
  await navigate(location.href, false);
}
if (typeof document !== 'undefined' && document.getElementById('main')) init();
if (typeof module !== 'undefined' && module.exports) module.exports = { staticDestination, renderView, setArticles: value => { allArticles = value; }, renderContinuousRoute, isContinuousRoute, guideResultHref, renderGuideResults, setSiteCopy, ROUTES, HANDBOOKS, FLIGHT_COURSES, PAGES, PORTAL_ARTICLES, getArticleContext, articleHref, readLocation, chapterNeighbours, renderMarkdown, extractHeadings, renderSidebar, renderReader, renderGuide, renderResources, renderContent, renderAircraftDirectory, renderAircraftDetail, renderHero, renderHome, renderPortal, renderProjectRecords, renderActivities, safeUrl };
