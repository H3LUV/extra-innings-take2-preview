import fs from 'node:fs/promises';

const NEWS_API = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news';
const DATA_FILE = new URL('../public/data/news.json', import.meta.url);
const READING_DIR = new URL('../public/reading/', import.meta.url);
const EXCLUDE = /fanatics fest|where to watch|stream|schedule|odds|betting|fantasy|power rankings|mock draft/i;

const CURATED = {
  '49526057': {
    titleKo:'닉스 농구 운영 부문 부사장 거슨 로사스, 4년 만에 팀 떠난다',
    summaryKo:'ESPN은 리그 관계자들을 인용해 뉴욕 닉스의 농구 운영 담당 수석 부사장 거슨 로사스가 네 시즌을 보낸 뒤 구단을 떠난다고 전했습니다.'
  },
  '49521766': {
    titleKo:'웸반야마, 프랑스 훈련에 스퍼스 동료 8~10명 초청',
    summaryKo:'빅터 웸반야마가 새 시즌 반등을 준비하며 이번 주 프랑스에서 스퍼스 동료 8~10명과 함께 비시즌 훈련을 진행할 예정입니다.'
  },
  '49521358': {
    titleKo:'크리스 보시, 혈전 진단받은 웸반야마에게 “약을 반드시 챙겨라”',
    summaryKo:'선수 시절 혈전 문제로 은퇴한 크리스 보시가 같은 진단을 받은 빅터 웸반야마에게 치료 지침을 철저히 따르고 건강을 최우선으로 관리하라고 조언했습니다.'
  },
  '49490878': {
    titleKo:'격동의 한 달 뒤 돌아본 2026 NBA FA: 무엇이 사실이고 무엇이 과장인가',
    summaryKo:'ESPN의 프런트오피스 전문가 바비 마크스가 2026년 자유계약 시장과 주요 트레이드 이후 남은 핵심 질문을 사실과 전망으로 나눠 점검합니다.'
  }
};

const NAME_REPLACEMENTS = [
  [/New York Knicks/g,'뉴욕 닉스'],[/San Antonio Spurs/g,'샌안토니오 스퍼스'],[/Miami Heat/g,'마이애미 히트'],
  [/Milwaukee Bucks/g,'밀워키 벅스'],[/Los Angeles Lakers/g,'LA 레이커스'],[/Cleveland Cavaliers/g,'클리블랜드 캐벌리어스'],
  [/LA Clippers/g,'LA 클리퍼스'],[/Boston Celtics/g,'보스턴 셀틱스'],[/Victor Wembanyama/g,'빅터 웸반야마'],
  [/Wembanyama/g,'웸반야마'],[/Wemby/g,'웸비'],[/Chris Bosh/g,'크리스 보시'],[/Knicks/g,'닉스'],[/Spurs/g,'스퍼스']
];

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hasHangul = text => /[가-힣]/.test(text || '');
const kstDate = value => new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', year:'numeric', month:'long', day:'numeric' }).format(new Date(value));

function polishKo(text) {
  let result = String(text || '').trim();
  for (const [pattern,replacement] of NAME_REPLACEMENTS) result = result.replace(pattern,replacement);
  return result
    .replace(/^출처:\s*/,'')
    .replace(/팀 동료/g,'동료')
    .replace(/초대합니다$/,'초청')
    .replace(/예정입니다\.$/,'예정입니다.')
    .replace(/\s+/g,' ')
    .trim();
}

function localizeRelated(list=[]) {
  return list.map(item => polishKo(item));
}

function applyPolish(item) {
  const curated = CURATED[String(item.id)] || {};
  return {
    ...item,
    titleKo:curated.titleKo || polishKo(item.titleKo),
    summaryKo:curated.summaryKo || polishKo(item.summaryKo),
    related:localizeRelated(item.related || [])
  };
}

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
  return polishKo(result);
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
<article><div class="kicker">미국 현지 읽을거리 · 한국어 핵심 번역</div><h1 class="title">${esc(item.titleKo)}</h1><p class="dek">${esc(item.summaryKo)}</p><div class="meta">${esc(item.source)} · ${esc(kstDate(item.publishedAt))}${item.byline ? ` · ${esc(item.byline)}` : ''}</div><div class="thesis">원문 제목: ${esc(item.title)}</div><div class="body"><p>${esc(item.summaryKo)}</p><p>저작권을 존중해 원문 전체를 복제하지 않고, 공개된 제목과 요약문을 한국어로 옮겨 핵심 맥락을 제공합니다. 세부 내용과 원문 인용은 아래 링크에서 확인할 수 있습니다.</p></div>${related}<div class="share"><a class="primary" href="${esc(item.originalLink)}" target="_blank" rel="noopener noreferrer">ESPN 원문 보기</a><a class="secondary" href="../../#reading">읽을거리 목록</a></div></article></body></html>`;
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
      const item = applyPolish(cached);
      items.push(item);
      await writePage(item);
      continue;
    }
    try {
      const [titleKo, summaryKo] = await Promise.all([translate(article.headline), translate(article.description)]);
      const related = [...new Set((article.categories || []).filter(c => c.type === 'team' || c.type === 'athlete').map(c => c.description).filter(Boolean))].slice(0, 5);
      const item = applyPolish({
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
      });
      items.push(item);
      await writePage(item);
    } catch (error) {
      console.warn(`Skipped untranslated article ${id}: ${error.message}`);
    }
  }

  for (const oldRaw of existing.items || []) {
    if (items.length >= 4) break;
    if (items.some(item => String(item.id) === String(oldRaw.id))) continue;
    const old = applyPolish(oldRaw);
    if (hasHangul(old.titleKo) && (hasHangul(old.summaryKo) || old.titleKo)) {
      items.push(old);
      if (old.slug && old.summaryKo) await writePage(old);
    }
  }

  if (!items.length) throw new Error('No translated NBA articles available; existing file preserved');
  await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive:true });
  await fs.writeFile(DATA_FILE, JSON.stringify({
    items:items.slice(0,4),
    message:'미국 현지 기사 네 편의 제목과 공개 요약문을 자연스러운 한국어로 번역해 제공합니다.',
    updatedAt:new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(`NBA translated readings updated: ${Math.min(items.length,4)}`);
}

main().catch(error => {
  console.warn(`NBA news update skipped: ${error.message}`);
});
