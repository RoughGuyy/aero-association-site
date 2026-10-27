// Reuse the website renderer so editing and publishing share one presentation.
const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2];
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
global.AERO_STATIC_SITE = true;
global.fetch = async target => {
  const data = read(decodeURIComponent(new URL(target, 'http://localhost').pathname).slice(1));
  return {ok: true, json: async () => data};
};
const app = require('../frontend/app.js');
app.setSiteCopy(read('api/site-copy.json'));
const articles = read('api/articles/index.json').sections.flatMap(section => section.articles);
app.setArticles(articles);
(async () => {
  const pages = {};
  const add = async (file, query, state) => { pages[file] = {query, ...await app.renderView(state)}; };
  for (const page of Object.keys(app.PAGES)) {
    await add(page === 'home' ? 'index.html' : `${page}.html`, `page=${page}`, {type: 'page', page});
  }
  for (const item of articles) {
    await add(`article-${item.id}.html`, `article=${item.id}`, {type: 'article', id: item.id});
  }
  for (const [route, context] of Object.entries(app.ROUTES)) {
    for (const id of context.references) {
      for (const returnId of context.articles) {
        await add(`article-${id}--${route}--${returnId}.html`,
          `article=${id}&route=${route}&return=${returnId}`,
          {type: 'article', id, route, returnId});
      }
    }
  }
  for (const kind of ['news', 'notices', 'projects', 'aircraft']) {
    for (const item of read(`api/content/${kind}/index.json`).items) {
      await add(`${kind}-${item.id}.html`, `kind=${kind}&id=${item.id}`, {type: 'content', kind, id: item.id});
    }
  }
  process.stdout.write(JSON.stringify(pages));
})().catch(error => { console.error(error); process.exit(1); });
