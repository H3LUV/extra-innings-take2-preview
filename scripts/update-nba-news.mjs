import fs from 'node:fs/promises';

const NEWS_HOME = 'https://www.nba.com/news';
const DATA_FILE = new URL('../public/data/news.json', import.meta.url);
const READING_DIR = new URL('../public/reading/', import.meta.url);
const MAX_ITEMS = 4;
const MIN_BODY_WORDS = 220;
const MAX_DETAIL_SENTENCES = 7;
const MAX_DETAIL_CHARS = 2300;
const EXCLUDE_URL = /\/news\/(?:category|writers?|authors?|tag|video|podcasts?|archive)(?:\/|$)/i;
const EXCLUDE_TITLE = /where to watch|stream|schedule|odds|betting|fantasy|mock draft|tickets|merchandise|2k cover|all-time .* leaders/i;

const TEAM_NAMES = [
  ['Atlanta Hawks','애틀랜타 호크스'],['Boston Celtics','보스턴 셀틱스'],['Brooklyn Nets','브루클린 네츠'],
  ['Charlotte Hornets','샬럿 호네츠'],['Chicago Bulls','시카고 불스'],['Cleveland Cavaliers','클리블랜드 캐벌리어스'],
  ['Dallas Mavericks','댈러스 매버릭스'],['Denver Nuggets','덴버 너기츠'],['Detroit Pistons','디트로이트 피스턴스'],
  ['Golden State Warriors','골든스테이트 워리어스'],['Houston Rockets','휴스턴 로키츠'],['Indiana Pacers','인디애나 페이서스'],
  ['LA Clippers','LA 클리퍼스'],['Los Angeles Clippers','LA 클리퍼스'],['Los Angeles Lakers','LA 레이커스'],
  ['Memphis Grizzlies','멤피스 그리즐리스'],['Miami Heat','마이애미 히트'],['Milwaukee Bucks','밀워키 벅스'],
  ['Minnesota Timberwolves','미네소타 팀버울브스'],['New Orleans Pelicans','뉴올리언스 펠리컨스'],['New York Knicks','뉴욕 닉스'],
  ['Oklahoma City Thunder','오클라호마시티 선더'],['Orlando Magic','올랜도 매직'],['Philadelphia 76ers','필라델피아 세븐티식서스'],
  ['Phoenix Suns','피닉스 선스'],['Portland Trail Blazers','포틀랜드 트레일블레이저스'],['Sacramento Kings','새크라멘토 킹스'],
  ['San Antonio Spurs','샌안토니오 스퍼스'],['Toronto Raptors','토론토 랩터스'],['Utah Jazz','유타 재즈'],
  ['Washington Wizards','워싱턴 위저즈']
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasHangul = text => /[가-힣]/.test(text || '');
const kstDate = value => new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric', month:'long', day:'numeric' }).format(new Date(value));

function decodeHtml(value='') {
  return String(value)
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}

function stripTags(value='') {
  return decodeHtml(String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,' ')
    .replace(/<br\s*\/?\s*>/gi,'\n')
    .replace(/<[^>]+>/g,' '))
    .replace(/\s+/g,' ')
    .trim();
}

function polishKo(text='') {
  let result = String(text).replace(/\s+/g,' ').trim();
  for (const [en,ko] of TEAM_NAMES) result = result.replaceAll(en,ko);
  return result
    .replace(/Philadelphia 76ers/g,'필라델피아 세븐티식서스')
    .replace(/New York Knicks/g,'뉴욕 닉스')
    .replace(/San Antonio Spurs/g,'샌안토니오 스퍼스')
    .replace(/Los Angeles Lakers/g,'LA 레이커스')
    .replace(/\s+([,.:;!?])/g,'$1')
    .trim();
}

async function readExisting() {
  try { return JSON.parse(await fs.readFile(DATA_FILE,'utf8')); }
  catch { return { items:[] }; }
}

async function fetchText(url, timeout=25000) {
  const response = await fetch(url, {
    headers:{
      accept:'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8',
      'accept-language':'en-US,en;q=0.9',
      referer:'https://www.nba.com/',
      'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/142 Safari/537.36 today-nba'
    },
    redirect:'follow',
    signal:AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.text();
}

async function translate(text) {
  if (!text) return '';
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client','gtx');
  url.searchParams.set('sl','en');
  url.searchParams.set('tl','ko');
  url.searchParams.set('dt','t');
  url.searchParams.set('q',text);
  const response = await fetch(url, {
    headers:{ 'user-agent':'Mozilla/5.0 today-nba' },
    signal:AbortSignal.timeout(25000)
  });
  if (!response.ok) throw new Error(`translation ${response.status}`);
  const payload = await response.json();
  const result = (payload?.[0] || []).map(part => part?.[0] || '').join('').trim();
  if (!hasHangul(result)) throw new Error('translation returned no Korean text');
  return polishKo(result);
}

function collectObjects(value, out=[]) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item,out);
    return out;
  }
  out.push(value);
  for (const child of Object.values(value)) collectObjects(child,out);
  return out;
}

function jsonLdArticle(html) {
  const matches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const match of matches) {
    try {
      const parsed = JSON.parse(decodeHtml(match[1]).trim());
      const article = collectObjects(parsed).find(obj => {
        const type = Array.isArray(obj?.['@type']) ? obj['@type'].join(' ') : String(obj?.['@type'] || '');
        return /NewsArticle|Article|ReportageNewsArticle/i.test(type) && (obj.headline || obj.articleBody);
      });
      if (article) return article;
    } catch {}
  }
  return null;
}

function metaContent(html, key) {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,'i')
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return decodeHtml(match[1]).trim();
  }
  return '';
}

function paragraphCandidates(html) {
  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const scope = articleMatch?.[1] || html;
  const parts = [...scope.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(match => stripTags(match[2]))
    .filter(Boolean)
    .filter(text => text.length >= 45)
    .filter(text => !/download the nba app|sign up|subscribe|cookie|privacy policy|terms of use|follow us|related stories|copyright/i.test(text));
  return [...new Set(parts)];
}

function bodyParagraphs(html, article) {
  const articleBody = stripTags(article?.articleBody || '');
  if (articleBody.length > 900) {
    const split = articleBody.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map(x=>x.trim()).filter(x=>x.length>=45);
    if (split.length >= 5) return split;
  }
  return paragraphCandidates(html);
}

function sentenceList(paragraphs) {
  const joined = paragraphs.join(' ');
  return joined
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"'])/)
    .map(text => text.replace(/\s+/g,' ').trim())
    .filter(text => text.length >= 55 && text.length <= 360)
    .filter(text => !/download the nba app|sign up|subscribe|cookie|privacy|terms of use|copyright/i.test(text));
}

function sentenceScore(sentence, index) {
  let score = 0;
  if (index < 8) score += 4 - index * 0.3;
  if (/\d|%|points|rebounds|assists|minutes|record|rating|trade|signed|contract|injury|offense|defense|playoffs|season/i.test(sentence)) score += 2;
  if (/however|but|because|while|question|key|means|could|should|will/i.test(sentence)) score += 1;
  if (sentence.length >= 90 && sentence.length <= 240) score += 1;
  if (/said|“|"/.test(sentence)) score -= 0.7;
  return score;
}

function selectDetails(paragraphs) {
  const sentences = sentenceList(paragraphs);
  const ranked = sentences
    .map((text,index)=>({text,index,score:sentenceScore(text,index)}))
    .sort((a,b)=>b.score-a.score || a.index-b.index);
  const selected=[];
  let total=0;
  for (const item of ranked) {
    if (selected.length >= MAX_DETAIL_SENTENCES) break;
    if (total + item.text.length > MAX_DETAIL_CHARS) continue;
    if (selected.some(x => x.text.slice(0,45) === item.text.slice(0,45))) continue;
    selected.push(item);
    total += item.text.length;
  }
  return selected.sort((a,b)=>a.index-b.index).map(x=>x.text);
}

function articleLinks(homeHtml) {
  const found=[];
  for (const match of homeHtml.matchAll(/href=["'](https:\/\/www\.nba\.com\/news\/[^"'#?]+|\/news\/[^"'#?]+)["']/gi)) {
    const absolute = new URL(match[1],'https://www.nba.com').href.replace(/\/$/,'');
    const path = new URL(absolute).pathname;
    if (EXCLUDE_URL.test(path)) continue;
    if (path.split('/').filter(Boolean).length < 2) continue;
    found.push(absolute);
  }
  return [...new Set(found)];
}

function authorName(author) {
  if (!author) return '';
  if (Array.isArray(author)) return author.map(authorName).filter(Boolean).join(', ');
  if (typeof author === 'string') return author;
  return author.name || '';
}

function relatedNames(text='') {
  const result=[];
  for (const [en,ko] of TEAM_NAMES) if (text.includes(en) && !result.includes(ko)) result.push(ko);
  return result.slice(0,5);
}

function slugFromUrl(url) {
  return new URL(url).pathname.split('/').filter(Boolean).pop().replace(/[^a-z0-9-]/gi,'-').toLowerCase();
}

function articlePage(item) {
  const detailBody = (item.detailsKo || []).map((paragraph,index)=>`<section class="detail-block"><h2>${index===0?'핵심 흐름':`핵심 내용 ${index+1}`}</h2><p>${esc(paragraph)}</p></section>`).join('');
  const related = item.related?.length ? `<div class="takeaways"><h2>관련 팀</h2><ul>${item.related.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>` : '';
  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#12090d"><title>${esc(item.titleKo)} | 오늘의 NBA</title><meta name="description" content="${esc(item.summaryKo)}"><link rel="stylesheet" href="../../column.css"></head>
<body><header><div class="bar"><a href="../../#reading">오늘의 NBA</a><span>FULL-ARTICLE DIGEST</span></div></header>
<article><div class="kicker">미국 현지 읽을거리 · 무료 전문 기반 상세 한국어 정리</div><h1 class="title">${esc(item.titleKo)}</h1><p class="dek">${esc(item.summaryKo)}</p><div class="meta">${esc(item.source)} · ${esc(kstDate(item.publishedAt))}${item.byline?` · ${esc(item.byline)}`:''}</div><div class="thesis">원문 제목: ${esc(item.title)}</div><div class="body">${detailBody}<p class="translation-note">원문 전체를 확인해 핵심 논리와 수치, 맥락을 한국어로 상세 정리했습니다. 저작권상 원문 문장을 순서대로 복제하는 전문 번역이 아니라, 원문을 읽지 않아도 주요 내용을 파악할 수 있도록 재구성한 상세 요약입니다.</p></div>${related}<div class="share"><a class="primary" href="${esc(item.originalLink)}" target="_blank" rel="noopener noreferrer">NBA.com 무료 원문 보기</a><a class="secondary" href="../../#reading">읽을거리 목록</a></div></article></body></html>`;
}

async function writePage(item) {
  const dir = new URL(`./${item.slug}/`,READING_DIR);
  await fs.mkdir(dir,{recursive:true});
  await fs.writeFile(new URL('index.html',dir),articlePage(item),'utf8');
}

async function buildItem(url, cached) {
  if (cached?.detailsKo?.length >= 4 && cached?.accessType === 'free-full-text') {
    await writePage(cached);
    return cached;
  }

  const html = await fetchText(url);
  if (/subscribe to continue|sign in to continue|premium content|the athletic/i.test(html)) throw new Error('paywall or restricted article');
  const article = jsonLdArticle(html);
  const title = stripTags(article?.headline || metaContent(html,'og:title') || html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const description = stripTags(article?.description || metaContent(html,'og:description') || metaContent(html,'description'));
  const byline = authorName(article?.author) || stripTags(html.match(/class=["'][^"']*(?:author|byline)[^"']*["'][^>]*>([\s\S]*?)<\//i)?.[1] || '');
  const publishedAt = article?.datePublished || article?.dateModified || metaContent(html,'article:published_time') || new Date().toISOString();
  const paragraphs = bodyParagraphs(html,article);
  const wordCount = paragraphs.join(' ').split(/\s+/).filter(Boolean).length;
  if (!title || EXCLUDE_TITLE.test(title)) throw new Error('excluded title');
  if (wordCount < MIN_BODY_WORDS) throw new Error(`article body too short: ${wordCount} words`);
  const detailSource = selectDetails(paragraphs);
  if (detailSource.length < 4) throw new Error('not enough detail sentences');

  const separator='\n<<<NBA_DETAIL_BREAK>>>\n';
  const [titleKo, summaryKoRaw, detailsCombined] = await Promise.all([
    translate(title),
    translate(description || detailSource[0]),
    translate(detailSource.join(separator))
  ]);
  const detailsKo = detailsCombined.split(/<<<NBA_DETAIL_BREAK>>>/).map(polishKo).filter(hasHangul).slice(0,MAX_DETAIL_SENTENCES);
  if (detailsKo.length < 4) throw new Error('translated details incomplete');

  const slug=`nba-${slugFromUrl(url)}`;
  const item={
    id:slug,
    slug,
    titleKo:polishKo(titleKo),
    title,
    summaryKo:polishKo(summaryKoRaw),
    detailsKo,
    source:'NBA.com',
    byline,
    publishedAt,
    originalLink:url,
    link:`./reading/${slug}/`,
    related:relatedNames(`${title} ${paragraphs.join(' ')}`),
    accessType:'free-full-text',
    accessLabel:'무료 전문 확인',
    sourceWordCount:wordCount,
    translationType:'무료 전문 기반 상세 한국어 정리'
  };
  await writePage(item);
  return item;
}

async function main() {
  const existing=await readExisting();
  const existingByUrl=new Map((existing.items || []).map(item=>[item.originalLink,item]));
  const homeHtml=await fetchText(NEWS_HOME);
  const candidates=articleLinks(homeHtml).slice(0,28);
  const items=[];

  for (const url of candidates) {
    if (items.length >= MAX_ITEMS) break;
    try {
      const item=await buildItem(url,existingByUrl.get(url));
      if (!items.some(x=>x.originalLink===item.originalLink)) items.push(item);
    } catch (error) {
      console.warn(`Skipped NBA.com article ${url}: ${error.message}`);
    }
  }

  for (const old of existing.items || []) {
    if (items.length >= MAX_ITEMS) break;
    if (old.accessType !== 'free-full-text' || !old.detailsKo?.length) continue;
    if (items.some(item=>item.originalLink===old.originalLink)) continue;
    items.push(old);
    await writePage(old);
  }

  if (items.length < 2) throw new Error(`Only ${items.length} free full-text NBA articles available; existing data preserved`);
  await fs.mkdir(new URL('../public/data/',import.meta.url),{recursive:true});
  await fs.writeFile(DATA_FILE,JSON.stringify({
    items:items.slice(0,MAX_ITEMS),
    message:'유료·로그인 기사를 제외하고, 무료로 전문을 확인할 수 있는 NBA.com 기사만 골라 원문 전체를 바탕으로 상세 한국어 정리를 제공합니다.',
    selectionPolicy:'NBA.com 무료 전문 접근 가능 · 본문 220단어 이상 · 유료/외부 기사 제외',
    updatedAt:new Date().toISOString()
  },null,2),'utf8');
  console.log(`NBA free full-text detailed readings updated: ${items.length}`);
}

main().catch(error=>{
  console.warn(`NBA detailed news update skipped: ${error.message}`);
});
