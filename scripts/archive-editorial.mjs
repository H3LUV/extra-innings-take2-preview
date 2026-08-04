import fs from 'node:fs/promises';

const latestUrl = new URL('../public/data/editorial.json', import.meta.url);
const latest = JSON.parse(await fs.readFile(latestUrl, 'utf8'));
if (!latest.slug) throw new Error('editorial.json has no slug');

const archiveDir = new URL('../public/data/editorials/', import.meta.url);
await fs.mkdir(archiveDir, { recursive: true });
await fs.writeFile(new URL(`${latest.slug}.json`, archiveDir), JSON.stringify(latest, null, 2), 'utf8');

const indexUrl = new URL('index.json', archiveDir);
let archiveIndex = { items: [] };
try { archiveIndex = JSON.parse(await fs.readFile(indexUrl, 'utf8')); } catch {}

const summary = {
  slug: latest.slug,
  title: latest.title,
  dek: latest.dek || '',
  author: 'H3러브의 지시를 받은 누군가',
  publishedAt: latest.publishedAt || new Date().toISOString(),
  url: `./columns/${latest.slug}/`
};

const items = [summary, ...(archiveIndex.items || []).filter(item => item.slug !== latest.slug)]
  .sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
await fs.writeFile(indexUrl, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf8');

const pageDir = new URL(`../public/columns/${latest.slug}/`, import.meta.url);
await fs.mkdir(pageDir, { recursive: true });
const pageHtml = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#12090d">
<title>${latest.title || '오늘의 NBA 칼럼'} | 오늘의 NBA</title>
<link rel="stylesheet" href="../../column.css">
</head>
<body data-slug="${latest.slug}">
<header><div class="bar"><a href="../../#top">오늘의 NBA</a><span>Created by H3LUV</span></div></header>
<main class="article-wrap"><article id="article"><h1>칼럼을 불러오는 중입니다.</h1></article></main>
<script src="../../column-page.js" defer></script>
</body>
</html>`;
await fs.writeFile(new URL('index.html', pageDir), pageHtml, 'utf8');
console.log(`Archived NBA editorial: ${latest.slug}`);