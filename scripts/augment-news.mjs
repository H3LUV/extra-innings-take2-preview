import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const DATA_FILE = new URL('../public/data/news.json', import.meta.url);
const ARTICLE_DIR = new URL('../public/data/articles/', import.meta.url);
const MAX_ITEMS = 4;
const MIN_WORDS = 220;
const PIPELINE = 'reader-v3';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const canonical = value => String(value || '').replace(/[?#].*$/, '');
const hasHangul = value => /[가-힣]/.test(String(value || ''));
const stableId = link => `mlb-${crypto.createHash('sha1').update(canonical(link)).digest('hex').slice(0, 12)}`;

const NAME_MAP = [
  ['Arizona Diamondbacks','애리조나 다이아몬드백스'],['Diamondbacks','다이아몬드백스'],
  ['Atlanta Braves','애틀랜타 브레이브스'],['Braves','브레이브스'],
  ['Baltimore Orioles','볼티모어 오리올스'],['Orioles','오리올스'],
  ['Boston Red Sox','보스턴 레드삭스'],['Red Sox','레드삭스'],
  ['Chicago Cubs','시카고 컵스'],['Cubs','컵스'],
  ['Chicago White Sox','시카고 화이트삭스'],['White Sox','화이트삭스'],
  ['Cincinnati Reds','신시내티 레즈'],['Reds','레즈'],
  ['Cleveland Guardians','클리블랜드 가디언스'],['Guardians','가디언스'],
  ['Colorado Rockies','콜로라도 로키스'],['Rockies','로키스'],
  ['Detroit Tigers','디트로이트 타이거스'],['Tigers','타이거스'],
  ['Houston Astros','휴스턴 애스트로스'],['Astros','애스트로스'],
  ['Kansas City Royals','캔자스시티 로열스'],['Royals','로열스'],
  ['Los Angeles Angels','LA 에인절스'],['Angels','에인절스'],
  ['Los Angeles Dodgers','LA 다저스'],['Dodgers','다저스'],
  ['Miami Marlins','마이애미 말린스'],['Marlins','말린스'],
  ['Milwaukee Brewers','밀워키 브루어스'],['Brewers','브루어스'],
  ['Minnesota Twins','미네소타 트윈스'],['Twins','트윈스'],
  ['New York Mets','뉴욕 메츠'],['Mets','메츠'],
  ['New York Yankees','뉴욕 양키스'],['Yankees','양키스'],
  ['Oakland Athletics','오클랜드 애슬레틱스'],['Athletics','애슬레틱스'],
  ['Philadelphia Phillies','필라델피아 필리스'],['Phillies','필리스'],
  ['Pittsburgh Pirates','피츠버그 파이리츠'],['Pirates','파이리츠'],
  ['San Diego Padres','샌디에이고 파드리스'],['Padres','파드리스'],
  ['San Francisco Giants','샌프란시스코 자이언츠'],['Giants','자이언츠'],
  ['Seattle Mariners','시애틀 매리너스'],['Mariners','매리너스'],
  ['St. Louis Cardinals','세인트루이스 카디널스'],['Cardinals','카디널스'],['St. Louis','세인트루이스'],
  ['Tampa Bay Rays','탬파베이 레이스'],['Rays','레이스'],
  ['Texas Rangers','텍사스 레인저스'],['Rangers','레인저스'],
  ['Toronto Blue Jays','토론토 블루제이스'],['Blue Jays','블루제이스'],
  ['Washington Nationals','워싱턴 내셔널스'],['Nationals','내셔널스']
];

const MANUAL_TITLES = new Map([
  ['Marlins Cap Off Deadline Day by Ordering Vodnik on the Rockies','말린스, 트레이드 마감일 마지막 퍼즐로 로키스의 빅터 보드닉 영입'],
  ['Reds Deadline Preemption: Nathaniel Lowe to Cleveland, Caleb Ferguson to St. Louis','레즈, 마감 시한 직전 연쇄 거래…나다니엘 로우는 클리블랜드·케일럽 퍼거슨은 세인트루이스행'],
  ['ZiPSing Up the Trade Deadline: 2026 Edition','ZiPS로 돌아본 2026 MLB 트레이드 마감 시한'],
  ['Brendan Gawlowski Prospects Chat: 8/4/26','브렌던 가울로스키의 유망주 채팅: 2026년 8월 4일']
]);

const PROMO_START = /you(?:'re| are) not a fangraphs member|not a fangraphs member or (?:you(?:'re| are) )?not logged in/i;
const PROMO_END = /we (?:didn't|did not) want to overdo it|removed all the other ads in this article/i;
const PROMO_MARKERS = /ad-free viewing|unlimited articles|dark mode and classic mode|custom player page dashboard|one-click data export|more steamer projections|victim of fomo|support fangraphs|weekly mailbag column|personalized year-end review|incredibly long sales pitch/i;

function applyNames(text = '') {
  let result = String(text);
  for (const [en, ko] of NAME_MAP) result = result.replaceAll(en, ko);
  return result;
}

function polishKo(text = '') {
  return applyNames(String(text).replace(/\s+/g, ' ').trim())
    .replace(/무역 마감(?:일| 시한)/g, '트레이드 마감 시한')
    .replace(/거래 마감(?:일| 시한)/g, '트레이드 마감 시한')
    .replace(/트레이드 마감일 마감일/g, '트레이드 마감일')
    .replace(/trade deadline/gi, '트레이드 마감 시한')
    .replace(/deadline day/gi, '트레이드 마감일')
    .replace(/postseason/gi, '포스트시즌')
    .replace(/World Series/gi, '월드시리즈')
    .replace(/starting pitcher/gi, '선발투수')
    .replace(/relief pitcher/gi, '구원투수')
    .replace(/bullpen/gi, '불펜')
    .replace(/home run/gi, '홈런')
    .replace(/\s+([,.:;!?])/g, '$1')
    .trim();
}

function polishTitleKo(text = '') {
  return polishKo(text)
    .replace(/전망 채팅/g, '유망주 채팅')
    .replace(/마감일 선점/g, '마감 시한 직전 거래')
    .replace(/에서 (클리블랜드|세인트루이스|뉴욕|보스턴|시애틀|샌디에이고)로/g, '$1행')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function decodeEntities(value = '') {
  return String(value)
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function cleanXml(value = '') {
  return decodeEntities(String(value).replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function markdownToText(markdown = '') {
  const marker = 'Markdown Content:';
  const source = String(markdown).includes(marker) ? String(markdown).split(marker).slice(1).join(marker) : String(markdown);
  return decodeEntities(source)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^[-*_]{3,}\s*$/gm, '')
    .replace(/`{1,3}([^`]+)`{1,3}/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function readExisting() {
  try { return JSON.parse(await fs.readFile(DATA_FILE, 'utf8')); }
  catch { return { items: [] }; }
}

async function fetchReader(targetUrl, timeout = 60000) {
  const response = await fetch(`https://r.jina.ai/${targetUrl}`, {
    headers: { accept: 'text/plain', 'user-agent': 'today-mlb/3.0' },
    signal: AbortSignal.timeout(timeout)
  });
  if (!response.ok) throw new Error(`reader ${response.status} ${targetUrl}`);
  return response.text();
}

function readerMeta(text, key) {
  return String(text).match(new RegExp(`^${key}:\\s*(.+)$`, 'mi'))?.[1]?.trim() || '';
}

function stripPromoBlock(text = '') {
  const paragraphs = String(text).split(/\n\s*\n+/).map(x => x.trim()).filter(Boolean);
  const kept = [];
  let insidePromo = false;

  for (let paragraph of paragraphs) {
    if (insidePromo) {
      const end = paragraph.search(PROMO_END);
      if (end >= 0) {
        insidePromo = false;
        paragraph = paragraph.slice(end).replace(PROMO_END, '').trim();
        if (paragraph && !PROMO_MARKERS.test(paragraph)) kept.push(paragraph);
      }
      continue;
    }

    const start = paragraph.search(PROMO_START);
    if (start >= 0) {
      const before = paragraph.slice(0, start).trim();
      if (before) kept.push(before);
      const afterStart = paragraph.slice(start);
      const end = afterStart.search(PROMO_END);
      if (end >= 0) {
        const tail = afterStart.slice(end).replace(PROMO_END, '').trim();
        if (tail && !PROMO_MARKERS.test(tail)) kept.push(tail);
      } else {
        insidePromo = true;
      }
      continue;
    }

    if (PROMO_MARKERS.test(paragraph)) continue;
    kept.push(paragraph);
  }
  return kept.join('\n\n');
}

function isCreditLine(line = '') {
  return /^[^.!?]{2,100}-(?:Imagn|Getty|AP|USA TODAY)(?: Images?)?$/i.test(line)
    || /^[^.!?]{2,100}\s+(?:Imagn|Getty|AP|USA TODAY) Images?$/i.test(line)
    || /^Image(?:s)?(?: credit)?:/i.test(line);
}

function cleanArticleBody(readerText, title) {
  let body = markdownToText(readerText)
    .replace(/^Title:.*$/gmi, '')
    .replace(/^URL Source:.*$/gmi, '')
    .replace(/^Published Time:.*$/gmi, '')
    .replace(/^Markdown Content:.*$/gmi, '');

  const escaped = String(title || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (escaped) {
    const match = body.match(new RegExp(escaped, 'i'));
    if (match && typeof match.index === 'number') body = body.slice(match.index + match[0].length);
  }

  body = stripPromoBlock(body);
  const lines = body.split('\n').map(x => x.trim()).filter(Boolean).filter(line =>
    !isCreditLine(line) &&
    !/^(scores|schedule|standings|stats|teams|players|tickets|shop|watch|news|mlb\.tv|sign in|log in|privacy policy|terms of use|copyright)$/i.test(line) &&
    !/^(al|nl) (east|central|west)$/i.test(line) &&
    !/^related (stories|content)$/i.test(line) &&
    !PROMO_MARKERS.test(line)
  );

  const cleaned = lines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  if (PROMO_START.test(cleaned) || PROMO_MARKERS.test(cleaned)) throw new Error('promotional block remained after cleaning');
  return cleaned;
}

async function rawTranslate(text) {
  const url = new URL('https://translate.googleapis.com/translate_a/single');
  url.searchParams.set('client', 'gtx');
  url.searchParams.set('sl', 'en');
  url.searchParams.set('tl', 'ko');
  url.searchParams.set('dt', 't');
  url.searchParams.set('q', text);
  const response = await fetch(url, { headers: { 'user-agent': 'today-mlb/3.0' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`translation ${response.status}`);
  const payload = await response.json();
  return (payload?.[0] || []).map(part => part?.[0] || '').join('').replace(/\s+/g, ' ').trim();
}

async function repairEnglishSegments(text) {
  const segments = String(text).split(/(?<=[.!?])\s+/);
  const repaired = [];
  for (const segment of segments) {
    const latinWords = segment.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    if (!hasHangul(segment) && latinWords.length >= 6) {
      const translated = await rawTranslate(segment);
      repaired.push(hasHangul(translated) ? translated : segment);
    } else repaired.push(segment);
  }
  return repaired.join(' ');
}

async function translateChunk(text) {
  let result = await rawTranslate(text);
  result = await repairEnglishSegments(result);
  if (!hasHangul(result)) throw new Error('translation returned no Korean text');
  return polishKo(result);
}

async function translateTitle(title) {
  if (MANUAL_TITLES.has(title)) return MANUAL_TITLES.get(title);
  return polishTitleKo(await translateChunk(title));
}

function splitText(text, maxLength = 1050) {
  const paragraphs = String(text || '').split(/\n\s*\n+/).map(x => x.trim()).filter(Boolean);
  const chunks = [];
  let current = '';
  const flush = () => { if (current.trim()) chunks.push(current.trim()); current = ''; };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      flush();
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let part = '';
      for (const sentence of sentences) {
        if ((`${part} ${sentence}`).trim().length > maxLength) {
          if (part.trim()) chunks.push(part.trim());
          part = sentence;
        } else part = `${part} ${sentence}`.trim();
      }
      if (part.trim()) chunks.push(part.trim());
      continue;
    }
    if ((`${current}\n\n${paragraph}`).trim().length > maxLength) flush();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  flush();
  return chunks;
}

async function translateText(text) {
  const translated = [];
  for (const chunk of splitText(text)) {
    let result = '';
    for (let attempt = 0; attempt < 3 && !result; attempt += 1) {
      try { result = await translateChunk(chunk); }
      catch (error) {
        if (attempt === 2) console.warn(`MLB translation chunk failed: ${error.message}`);
        else await sleep(900 * (attempt + 1));
      }
    }
    if (!result) return '';
    translated.push(result);
    await sleep(220);
  }
  return translated.join('\n\n');
}

function feedItems(xml, source) {
  return [...String(xml).matchAll(/<item\b[\s\S]*?<\/item>/gi)].map(match => {
    const block = match[0];
    const pick = tag => (block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i')) || [])[1] || '';
    return { title: cleanXml(pick('title')), link: cleanXml(pick('link')) || cleanXml(pick('guid')), pubDate: cleanXml(pick('pubDate')), source };
  }).filter(item => item.title && /^https?:/i.test(item.link));
}

async function buildItem(candidate, cached) {
  if (cached?.articleFile && cached?.bodyVerified && cached?.translationType === 'full' && cached?.pipelineVersion === PIPELINE) return cached;
  const readerText = await fetchReader(candidate.link);
  const title = readerMeta(readerText, 'Title') || candidate.title;
  const pubDate = readerMeta(readerText, 'Published Time') || candidate.pubDate || new Date().toISOString();
  const body = cleanArticleBody(readerText, title);
  const wordCount = body.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_WORDS) throw new Error(`article body too short: ${wordCount} words`);

  const titleKo = await translateTitle(title);
  const translated = await translateText(body);
  if (!titleKo || !translated || translated.length < 700) throw new Error('full translation incomplete');
  if (/팬그래프 회원|광고 없이|기사 무제한|FOMO|멤버십/.test(translated)) throw new Error('translated promotional text detected');

  const id = stableId(candidate.link);
  const translatedAt = new Date().toISOString();
  const article = { available: true, title: titleKo, originalTitle: title, translated, source: candidate.source, link: candidate.link, pubDate, translationType: 'full', pipelineVersion: PIPELINE, translatedAt };
  await fs.writeFile(new URL(`${id}.json`, ARTICLE_DIR), JSON.stringify(article, null, 2), 'utf8');

  return {
    id,
    articleFile: `./data/articles/${id}.json`,
    title,
    titleKo,
    link: candidate.link,
    pubDate,
    source: candidate.source,
    category: '미국 현지 읽을거리',
    readingMinutes: Math.max(4, Math.round(wordCount / 220)),
    bodyVerified: true,
    bodyChars: translated.length,
    sourceWordCount: wordCount,
    translationType: 'full',
    pipelineVersion: PIPELINE,
    translatedAt
  };
}

async function main() {
  await fs.mkdir(ARTICLE_DIR, { recursive: true });
  const existing = await readExisting();
  const existingByUrl = new Map((existing.items || []).map(item => [canonical(item.link), item]));
  const validExisting = (existing.items || []).filter(item => item.articleFile && item.bodyVerified && item.translationType === 'full' && item.pipelineVersion === PIPELINE);
  const feeds = [['MLB.com', 'https://www.mlb.com/feeds/news/rss.xml'], ['FanGraphs', 'https://blogs.fangraphs.com/feed/']];
  let candidates = [];

  for (const [source, url] of feeds) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'today-mlb/3.0' }, signal: AbortSignal.timeout(30000) });
      if (response.ok) candidates.push(...feedItems(await response.text(), source));
    } catch (error) { console.warn(`MLB feed failed ${source}: ${error.message}`); }
  }

  candidates = [...new Map(candidates.map(item => [canonical(item.link), item])).values()]
    .filter(item => !/(podcast|video|tracker|where to watch|schedule|odds|betting|fantasy|chat:|prospects chat)/i.test(item.title))
    .sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

  const items = [];
  const seen = new Set();
  for (const candidate of candidates.slice(0, 40)) {
    if (items.length >= MAX_ITEMS) break;
    const key = canonical(candidate.link);
    if (seen.has(key)) continue;
    try {
      const item = await buildItem(candidate, existingByUrl.get(key));
      items.push(item);
      seen.add(key);
    } catch (error) { console.warn(`Skipped MLB article ${candidate.link}: ${error.message}`); }
  }

  for (const old of validExisting) {
    if (items.length >= MAX_ITEMS) break;
    const key = canonical(old.link);
    if (!key || seen.has(key)) continue;
    items.push(old);
    seen.add(key);
  }

  await fs.writeFile(DATA_FILE, JSON.stringify({
    items: items.slice(0, MAX_ITEMS),
    message: items.length ? '미국 현지 기사 중 광고·회원가입 문구를 제거하고 제목과 본문 전체 자동 번역이 완료된 기사만 제공합니다.' : 'MLB 전문 번역 기사를 생성하고 있습니다.',
    selectionPolicy: '최신 무료 전문 우선 · 광고와 회원가입 문구 제거 · 제목과 본문 전체 번역 필수',
    translationPolicy: 'clean_full_translation_keep_previous_on_failure',
    pipelineVersion: PIPELINE,
    selectedCount: Math.min(MAX_ITEMS, items.length),
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(`MLB clean full-text readings updated: ${items.length}`);
}

main().catch(async error => {
  console.warn(`MLB full-text update failed: ${error.message}`);
  const existing = await readExisting();
  const valid = (existing.items || []).filter(item => item.articleFile && item.bodyVerified && item.translationType === 'full' && item.pipelineVersion === PIPELINE).slice(0, MAX_ITEMS);
  await fs.writeFile(DATA_FILE, JSON.stringify({
    items: valid,
    message: valid.length ? '직전 정상 번역 기사를 유지합니다.' : 'MLB 전문 번역 기사를 생성하고 있습니다.',
    selectionPolicy: '광고·회원가입 문구와 상세 요약 사용 안 함',
    translationPolicy: 'clean_full_translation_only',
    pipelineVersion: PIPELINE,
    selectedCount: valid.length,
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
});