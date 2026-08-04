import fs from "node:fs/promises";

const FILE = new URL("../public/data/news.json", import.meta.url);
const existing = JSON.parse(await fs.readFile(FILE, "utf8"));

const clean = value => String(value || "")
  .replace(/<!\[CDATA\[|\]\]>/g, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&quot;/g, '"')
  .replace(/\s+/g, " ")
  .trim();

const canonical = value => String(value || "").replace(/[?#].*$/, "");
const hasKorean = value => /[가-힣]/.test(String(value || ""));

const manualTranslations = new Map([
  [
    "https://blogs.fangraphs.com/foster-for-four-people-guardians-acquire-foster-griffin-for-multi-prospect-package/",
    "포스터 한 명에 유망주 네 명? 가디언스, 대형 패키지로 포스터 그리핀 영입"
  ],
  [
    "https://blogs.fangraphs.com/pirates-add-a-whole-new-bullpen-camilo-doval-luke-weaver-lake-bachar-kirby-yates/",
    "파이리츠, 불펜을 통째로 개편하다: 카밀로 도발·루크 위버·레이크 바차·커비 예이츠 영입"
  ]
]);

const previousTranslations = new Map(
  (existing.items || [])
    .filter(item => hasKorean(item.titleKo))
    .map(item => [canonical(item.link || item.title), item.titleKo])
);

async function translateHeadline(title, link) {
  const key = canonical(link || title);
  if (manualTranslations.has(key)) return manualTranslations.get(key);
  if (previousTranslations.has(key)) return previousTranslations.get(key);

  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "en");
    url.searchParams.set("tl", "ko");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", title);

    const response = await fetch(url, {
      headers: { "user-agent": "today-mlb/1.0" }
    });
    if (!response.ok) throw new Error(`translation ${response.status}`);

    const data = await response.json();
    const translated = clean((data?.[0] || []).map(part => part?.[0] || "").join(""));
    if (translated && translated !== title && hasKorean(translated)) return translated;
  } catch (error) {
    console.warn(`Headline translation failed: ${title}`, error.message);
  }

  return "";
}

function itemsFromXml(xml, source) {
  return [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)]
    .map((match, index) => {
      const itemXml = match[0];
      const pick = tag => clean(
        (itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i")) || [])[1]
      );
      return {
        id: `rss-${source}-${index}-${Date.now()}`,
        title: pick("title"),
        titleKo: "",
        link: pick("link") || pick("guid"),
        pubDate: pick("pubDate"),
        source,
        category: "미국 현지 읽을거리",
        readingMinutes: 6,
        bodyVerified: false,
        depthScore: source === "FanGraphs" ? 62 : 52
      };
    })
    .filter(item => item.title && item.link);
}

const feeds = [
  ["MLB.com", "https://www.mlb.com/feeds/news/rss.xml"],
  ["FanGraphs", "https://blogs.fangraphs.com/feed/"]
];

const verified = (existing.items || [])
  .filter(item => item.bodyVerified && hasKorean(item.titleKo))
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

  seen.add(key);
  selected.push({ ...item, titleKo, translatedAt: new Date().toISOString() });
}

// 번역 서비스가 일시적으로 실패하면 영어 제목을 올리지 않고
// 직전 번역 완료 기사로 네 자리를 채웁니다.
for (const item of existing.items || []) {
  if (selected.length >= 4) break;
  const key = canonical(item.link || item.title);
  if (!key || seen.has(key) || !hasKorean(item.titleKo)) continue;
  seen.add(key);
  selected.push(item);
}

const out = {
  ...existing,
  items: selected.slice(0, 4),
  selectedCount: Math.min(4, selected.length),
  policy: "two_verified_longform_plus_two_translated_current_us_items",
  translationPolicy: "korean_title_required_keep_previous_on_failure",
  updatedAt: new Date().toISOString()
};

await fs.writeFile(FILE, JSON.stringify(out, null, 2));
console.log(`Selected translated reading items: ${out.selectedCount}`);
