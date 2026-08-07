import fs from 'node:fs/promises';

const SITE='https://today-nba.pages.dev';
const NAME='오늘의 NBA';
const DESCRIPTION='NBA 경기, 순위, 미국 현지 분석과 한국어 데이터 칼럼을 제공하는 독립 편집 사이트';
const THEME='#12090d';
const BYLINE='H3LUV · support by GPT';
const root=new URL('../public/',import.meta.url);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xml=v=>esc(v);
const index=JSON.parse(await fs.readFile(new URL('data/editorials/index.json',root),'utf8'));
const items=(index.items||[]).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));

for(const item of items){
  let article={...item,body:[]};
  try{article={...article,...JSON.parse(await fs.readFile(new URL(`data/editorials/${item.slug}.json`,root),'utf8'))}}catch{}
  const url=`${SITE}/columns/${encodeURIComponent(item.slug)}/`;
  const title=`${article.title} | ${NAME}`;
  const desc=article.metaDescription||article.dek||DESCRIPTION;
  const published=article.publishedAt||new Date().toISOString();
  const tags=article.tags||['NBA','농구','NBA 분석'];
  const jsonLd={
    '@context':'https://schema.org','@type':'Article',headline:article.title,description:desc,
    datePublished:published,dateModified:article.updatedAt||published,inLanguage:'ko-KR',mainEntityOfPage:url,
    author:{'@type':'Organization',name:BYLINE},publisher:{'@type':'Organization',name:NAME,url:SITE},
    keywords:tags.join(', ')
  };
  const body=(article.body||[]).map(p=>{
    const text=String(p??'');
    return text.startsWith('## ')?`<h2>${esc(text.slice(3))}</h2>`:`<p>${esc(text)}</p>`;
  }).join('');
  const takeaways=article.takeaways?.length?`<section class="takeaways"><h2>핵심 정리</h2><ul>${article.takeaways.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:'';
  const html=`<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="${THEME}">\n<title>${esc(title)}</title><meta name="description" content="${esc(desc)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="${url}"><link rel="alternate" type="application/rss+xml" title="${NAME} RSS" href="${SITE}/rss.xml">\n<meta property="og:type" content="article"><meta property="og:locale" content="ko_KR"><meta property="og:site_name" content="${NAME}"><meta property="og:title" content="${esc(article.title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${url}"><meta property="article:published_time" content="${published}">\n<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(article.title)}"><meta name="twitter:description" content="${esc(desc)}"><script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g,'\\u003c')}</script><link rel="stylesheet" href="../../column.css"></head>\n<body><header><div class="bar"><a href="../../#top">${NAME}</a><span>Created by H3LUV</span></div></header><main class="article-wrap"><article id="article"><div class="kicker">${esc(article.eyebrow||"TODAY'S COLUMN")}</div><h1 class="title">${esc(article.title)}</h1><p class="dek">${esc(article.dek||'')}</p><div class="meta">${BYLINE} · ${esc(published.slice(0,10))}</div>${article.thesis?`<div class="thesis">${esc(article.thesis)}</div>`:''}<div class="body">${body}</div>${takeaways}<div class="share"><a class="primary" href="../">지난 칼럼</a><a class="secondary" href="../../#top">오늘의 NBA 홈</a></div></article></main></body></html>`;
  const dir=new URL(`columns/${item.slug}/`,root);await fs.mkdir(dir,{recursive:true});await fs.writeFile(new URL('index.html',dir),html,'utf8');
}

const lastmod=new Date(index.updatedAt||Date.now()).toISOString();
const urls=[`${SITE}/`,`${SITE}/columns/`,...items.map(x=>`${SITE}/columns/${encodeURIComponent(x.slug)}/`)];
const sitemap=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u,i)=>`  <url><loc>${xml(u)}</loc><lastmod>${i<2?lastmod:new Date(items[i-2]?.publishedAt||lastmod).toISOString()}</lastmod><changefreq>${i===0?'daily':'weekly'}</changefreq><priority>${i===0?'1.0':i===1?'0.8':'0.7'}</priority></url>`).join('\n')}\n</urlset>\n`;
await fs.writeFile(new URL('sitemap.xml',root),sitemap,'utf8');
await fs.writeFile(new URL('robots.txt',root),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`,'utf8');
const rss=`<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${NAME}</title><link>${SITE}/</link><description>${DESCRIPTION}</description><language>ko</language>${items.map(x=>`<item><title>${xml(x.title)}</title><link>${SITE}/columns/${encodeURIComponent(x.slug)}/</link><guid>${SITE}/columns/${encodeURIComponent(x.slug)}/</guid><pubDate>${new Date(x.publishedAt).toUTCString()}</pubDate><description>${xml(x.dek||'')}</description></item>`).join('')}</channel></rss>\n`;
await fs.writeFile(new URL('rss.xml',root),rss,'utf8');
console.log(`SEO assets generated for ${items.length} NBA columns`);