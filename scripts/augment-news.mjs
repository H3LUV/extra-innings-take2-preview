import fs from "node:fs/promises";
import crypto from "node:crypto";

const FILE = new URL("../public/data/news.json", import.meta.url);
const ARTICLE_DIR = new URL("../public/data/articles/", import.meta.url);
const existing = JSON.parse(await fs.readFile(FILE, "utf8"));
await fs.mkdir(ARTICLE_DIR, { recursive: true });

const decodeEntities = value => String(value || "")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">");

const clean = value => decodeEntities(String(value || ""))
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const htmlToText = value => decodeEntities(String(value || ""))
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/<script\b[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[\s\S]*?<\/style>/gi, "")
  .replace(/<(?:p|div|section|article|h[1-6]|li|blockquote)[^>]*>/gi, "\n")
  .replace(/<br\s*\/?\s*>/gi, "\n")
  .replace(/<[^>]+>/g, " ")
  .replace(/[ \t]+/g, " ")
  .replace(/\n[ \t]+/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const canonical = value => String(value || "").replace(/[?#].*$/, "");
const hasKorean = value => /[가-힣]/.test(String(value || ""));
const stableId = link => `rss-${crypto.createHash("sha1").update(canonical(link)).digest("hex").slice(0, 12)}`;

const manualTranslations = new Map([
  [
    "https://blogs.fangraphs.com/foster-for-four-people-guardians-acquire-foster-griffin-for-multi-prospect-package/",
    "포스터 한 명에 유망주 네 명? 가디언스, 대형 패키지로 포스터 그리핀 영입"
  ],
  [
    "https://blogs.fangraphs.com/pirates-add-a-whole-new-bullpen-camilo-doval-luke-weaver-lake-bachar-kirby-yates/",
    "파이리츠, 불펜을 통째로 개편하다: 카밀로 도발·루크 위버·레이크 바차·커비 예이츠 영입"
  ],
  [
    "https://blogs.fangraphs.com/casey-mize-dealt-to-padres-for-kash-considerations/",
    "파드리스, 케이시 마이즈 영입…대가는 유망주 카시 메이필드"
  ],
  [
    "https://blogs.fangraphs.com/diamondbacks-pay-dearly-for-nootbaar-and-not-a-moment-too-soon/",
    "다이아몬드백스, 눗바 영입에 큰 대가…더는 미룰 수 없었다"
  ]
]);

const previousTranslations = new Map(
  (existing.items || [])
    .filter(item => hasKorean(item.titleKo))
    .map(item => [canonical(item.link || item.title), item.titleKo])
);

async function translateChunk(text) {
  const url = new URL("https://translate.googleapis.com/translate_a/single");
  url.searchParams.set("client", "gtx");
  url.searchParams.set("sl", "en");
  url.searchParams.set("tl", "ko");
  url.searchParams.set("dt", "t");
  url.searchParams.set("q", text);

  const response = await fetch(url, { headers: { "user-agent": "today-mlb/1.0" } });
  if (!response.ok) throw new Error(`translation ${response.status}`);
  const data = await response.json();
  return clean((data?.[0] || []).map(part => part?.[0] || "").join(""));
}

function splitText(text, maxLength = 1200) {
  const paragraphs = String(text || "").split(/\n\s*\n+/).map(x => x.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      pushCurrent();
      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      let part = "";
      for (const sentence of sentences) {
        if ((part + " " + sentence).trim().length > maxLength) {
          if (part.trim()) chunks.push(part.trim());
          part = sentence;
        } else {
          part = `${part} ${sentence}`.trim();
        }
      }
      if (part.trim()) chunks.push(part.trim());
      continue;
    }

    if ((current + "\n\n" + paragraph).trim().length > maxLength) pushCurrent();
    current = current ? `${current}\n\n${paragraph}` : paragraph;
  }
  pushCurrent();
  return chunks;
}

async function translateText(text) {
  const source = String(text || "").slice(0, 14000).trim();
  if (source.length < 700) return "";

  const chunks = splitText(source);
  const translated = [];
  for (const chunk of chunks) {
    let result = "";
    for (let attempt = 0; attempt < 2 && !result; attempt += 1) {
      try {
        result = await translateChunk(chunk);
      } catch (error) {
        if (attempt === 1) console.warn(`Body translation failed: ${error.message}`);
        else await new Promise(resolve => setTimeout(resolve, 700));
      }
    }
    if (!result || !hasKorean(result)) return "";
    translated.push(result);
    await new Promise(resolve => setTimeout(resolve, 180));
  }
  return translated.join("\n\n");
}

async function translateHeadline(title, link) {
  const key = canonical(link || title);
  if (manualTranslations.has(key)) return manualTranslations.get(key);
  if (previousTranslations.has(key)) return previousTranslations.get(key);
  try {
    const translated = await translateChunk(title);
    if (translated && translated !== title && hasKorean(translated)) return translated;
  } catch (error) {
    console.warn(`Headline translation failed: ${title}`, error.message);
  }
  return "";
}

function itemsFromXml(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map(match => {
      const itemXml = match[0];
      const pickRaw = tag => (
        itemXml.match(new RegExp(`<${tag.replace(":", "\\:")}[^>]*>([\\s\\S]*?)<\\/${tag.replace(":", "\\:")}>`, "i")) || []
      )[1] || "";
      const title = clean(pickRaw("title"));
      const link = clean(pickRaw("link")) || clean(pickRaw("guid"));
      const fullBody = htmlToText(pickRaw("content:encoded") || pickRaw("description"));
      return {
        id: stableId(link),
        title,
        titleKo: "",
        link,
        pubDate: clean(pickRaw("pubDate")),
        source,
        category: "미국 현지 읽을거리",
        readingMinutes: Math.max(4, Math.round(fullBody.length / 900)),
        bodyVerified: false,
        depthScore: source === "FanGraphs" ? 62 : 52,
        sourceBody: fullBody
      };
    })
    .filter(item => item.title && item.link && item.sourceBody.length >= 700);
}

const feeds = [
  ["MLB.com", "https://www.mlb.com/feeds/news/rss.xml"],
  ["FanGraphs", "https://blogs.fangraphs.com/feed/"]
];

const verified = (existing.items || [])
  .filter(item => item.bodyVerified && item.articleFile && hasKorean(item.titleKo))
  .sort((a, b) => (b.depthScore || 0) - (a.depthScore || 0))
  .slice(0, 2);

let pool = [];
for (const [source, url] of feeds) {
  try {
    const response = await fetch(url, { headers: { "user-agent": "today-mlb/1.0" } });
    if (response.ok) pool.push(...itemsFromXml(await response.text(), source));
  } catch (error) {
    console.warn(`Feed failed: ${source}`, error.message);
  }
}

const score = item =>
  (item.source === "FanGraphs" ? 30 : 0) +
  (/how|why|impact|strategy|analysis|inside|adjust|change|development/i.test(item.title) ? 15 : 0) -
  (/tracker|every move|traded to|deal$/i.test(item.title) ? 12 : 0) +
  (item.depthScore || 0);

pool.sort((a, b) => score(b) - score(a) || new Date(b.pubDate || 0) - new Date(a.pubDate || 0));

const selected = [...verified];
const seen = new Set(selected.map(item => canonical(item.link || item.title)).filter(Boolean));

for (const item of pool) {
  if (selected.length >= 4) break;
  const key = canonical(item.link || item.title);
  if (!key || seen.has(key)) continue;

  const titleKo = await translateHeadline(item.title, item.link);
  if (!titleKo) continue;

  const translated = await translateText(item.sourceBody);
  if (!translated || translated.length < 600) continue;

  const article = {
    available: true,
    title: titleKo,
    originalTitle: item.title,
    translated,
    source: item.source,
    link: item.link,
    pubDate: item.pubDate,
    translationType: "full",
    translatedAt: new Date().toISOString()
  };
  await fs.writeFile(new URL(`${item.id}.json`, ARTICLE_DIR), JSON.stringify(article, null, 2));

  seen.add(key);
  selected.push({
    ...item,
    titleKo,
    articleFile: `./data/articles/${item.id}.json`,
    bodyVerified: true,
    bodyChars: translated.length,
    translatedAt: article.translatedAt,
    sourceBody: undefined
  });
}

// 번역 본문 생성이 실패하면 영어 원문을 대신 올리지 않고,
// 직전의 한국어 본문 보유 기사로 네 자리를 유지합니다.
for (const item of existing.items || []) {
  if (selected.length >= 4) break;
  const key = canonical(item.link || item.title);
  if (!key || seen.has(key) || !item.articleFile || !hasKorean(item.titleKo)) continue;
  seen.add(key);
  selected.push(item);
}

const out = {
  ...existing,
  items: selected.slice(0, 4).map(({ sourceBody, ...item }) => item),
  selectedCount: Math.min(4, selected.length),
  policy: "four_korean_fulltext_reading_items",
  translationPolicy: "korean_title_and_body_required_keep_previous_on_failure",
  updatedAt: new Date().toISOString()
};

await fs.writeFile(FILE, JSON.stringify(out, null, 2));
console.log(`Selected Korean full-text reading items: ${out.selectedCount}`);
