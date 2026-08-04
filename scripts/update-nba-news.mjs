import fs from 'node:fs/promises';

const NEWS_API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news';
const DATA_FILE = new URL('../public/data/news.json', import.meta.url);
const READING_DIR = new URL('../public/reading/', import.meta.url);
const EXCLUDE = /fanatics fest|where to watch|stream|schedule|odds|betting|fantasy|power rankings|mock draft/i;

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasHangul = text => /[가-힣]/.test(text || '');
const kstDate = value => new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric', month:'long', day:'numeric' }).format(new Date(value));

async function readExisting() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
  catch { return { items:[] }; }
}

async function translate(text) {
  if (!text) return '';
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', 'ko');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const response = await fetch(url, { headers:{ 'user-agent':'Mozilla/5.0 today-nba' }, signal:AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`translation ${response.status}`);
  const payload = await response.json();
  const result = (payload?.[0] || []).map(part => part?.[0] || '').join('').trim();
  if (!hasHangul(result)) throw new Error('translation returned no Korean text');
  return result;
}

function articleLink(article) {
  return article?.links?.web?.href || article?.links?.mobile?.href || 'https://www.espn.com/nba/';
}

function relevant(article) {
  if (!article?.headline || !article?.description || EXCLUDE.test(article.headline)) return false;
  if (article.premium) return false;
  const categories = article.categories || [];
  return categories.some(c => c.type === 'team' || c.type === 'athlete' || c.type === 'league');
}

function articlePage(item) {
  const related = item.related?.length ? `<div class="takeaways"><h2>관련 팀·선수</h2><ul>${item.related.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#12090d"><title>${esc(item.titleKo)} | 오늘의 NBA</title><meta name="description" content="${esc(item.summaryKo)}"><link rel="stylesheet" href="../../column.css"></head>
<body><header><div class="bar"><a href="../../#reading">오늘의 NBA</a><span>TRANSLATED READING</span></div></header>
<article><div class="kicker">미국 현지 읽을거리 · 한국어 핵심 번역</div><h1 class="title">${esc(item.titleKo)}</h1><p class="dek">${esc(item.summaryKo)}</p><div class="meta">${esc(item.source)} · ${esc(kstDate(item.publishedAt))}${item.byline ? ` · ${esc(item.byline)}` : ''}</div><div class="thesis">원문 제목: ${esc(item.title)}</div><div class="body"><p>${esc(item.summaryKo)}</p><p>이 페이지는 원문의 제목과 공개 요약문을 한국어로 옮겨 핵심 맥락을 전달합니다. 원문 전체 내용과 세부 인용은 아래 원문 링크에서 확인할 수 있습니다.</p></div>${related}<div class="share"><a class="primary" href="${esc(item.originalLink)}" target="_blank" rel="noopener noreferrer">ESPN 원문 보기</a><a class="secondary" href="../../#reading">읽을거리 목록</a></div></article></body></html>`;
}

async function writePage(item) {
  const dir = new URL(`./${item.slug}/`, READING_DIR);
  await fs.mkdir(dir, { recursive:true });
  await fs.writeFile(new URL('index.html', dir), articlePage(item), 'utf8');
}

async function main() {
  const existing = await readExisting();
  const existingById = new Map((existing.items || []).map(item => [String(item.id), item]));
  const response = await fetch(`${NEWS_API}?limit=30`, { headers:{ accept:'application/json', 'user-agent':'today-nba/1.0' }, signal:AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`ESPN NBA news ${response.status}`);
  const payload = await response.json();
  const selected = (payload.articles || []).filter(relevant).sort((a,b) => new Date(b.published) - new Date(a.published)).slice(0, 8);
  const items = [];

  for (const article of selected) {
    if (items.length >= 4) break;
    const id = String(article.id);
    const cached = existingById.get(id);
    if (cached?.titleKo && cached?.summaryKo && hasHangul(cached.titleKo) && hasHangul(cached.summaryKo)) {
      items.push(cached);
      await writePage(cached);
      continue;
    }
    try {
      const [titleKo, summaryKo] = await Promise.all([translate(article.headline), translate(article.description)]);
      const related = [...new Set((article.categories || []).filter(c => c.type === 'team' || c.type === 'athlete').map(c => c.description).filter(Boolean))].slice(0, 5);
      const item = {
        id,
        slug:`espn-${id}`,
        titleKo,
        title:article.headline,
        summaryKo,
        source:'ESPN',
        byline:article.byline || '',
        publishedAt:article.published || article.lastModified || new Date().toISOString(),
        originalLink:articleLink(article),
        link:`./reading/espn-${id}/`,
        related,
        translationType:'제목·공개 요약문 한국어 번역'
      };
      items.push(item);
      await writePage(item);
    } catch (error) {
      console.warn(`Skipped untranslated article ${id}: ${error.message}`);
    }
  }

  for (const old of existing.items || []) {
    if (items.length >= 4) break;
    if (items.some(item => String(item.id) === String(old.id))) continue;
    if (hasHangul(old.titleKo) && (hasHangul(old.summaryKo) || old.titleKo)) {
      items.push(old);
      if (old.slug && old.summaryKo) await writePage(old);
    }
  }

  if (!items.length) throw new Error('No translated NBA articles available; existing file preserved');
  await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive:true });
  await fs.writeFile(DATA_FILE, JSON.stringify({
    items:items.slice(0,4),
    message:'미국 현지 기사 네 편의 제목과 공개 요약문을 한국어로 번역해 제공합니다.',
    updatedAt:new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(`NBA translated readings updated: ${Math.min(items.length,4)}`);
}

main().catch(error => {
  console.warn(`NBA news update skipped: ${error.message}`);
});
