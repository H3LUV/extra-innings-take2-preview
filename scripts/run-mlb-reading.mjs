import fs from 'node:fs/promises';

const originalPath = new URL('./augment-news.mjs', import.meta.url);
const runtimePath = new URL('./augment-news-runtime.mjs', import.meta.url);
let source = await fs.readFile(originalPath, 'utf8');

function replaceRequired(before, after, label) {
  if (!source.includes(before)) throw new Error(`MLB runtime patch target missing: ${label}`);
  source = source.replace(before, after);
}

replaceRequired(
  "const PIPELINE = 'reader-v3';",
  "const PIPELINE = 'reader-v5';",
  'pipeline version'
);

replaceRequired(
  "const PROMO_START = /you(?:'re| are) not a fangraphs member|not a fangraphs member or (?:you(?:'re| are) )?not logged in/i;",
  "const PROMO_START = /you(?:['’]re| are) not a fangraphs member|it looks like you(?:['’]re| are) not a fangraphs member|not a fangraphs member or (?:you(?:['’]re| are) )?not logged in/i;",
  'promotion start pattern'
);

replaceRequired(
  "const PROMO_MARKERS = /ad-free viewing|unlimited articles|dark mode and classic mode|custom player page dashboard|one-click data export|more steamer projections|victim of fomo|support fangraphs|weekly mailbag column|personalized year-end review|incredibly long sales pitch/i;",
  "const PROMO_MARKERS = /ad-free viewing|unlimited articles|dark mode and classic mode|custom player page dashboard|one-click data export|more steamer projections|victim of fomo|support fangraphs|weekly mailbag column|personalized year-end review|incredibly long sales pitch|we(?:'re| are) not mad, we(?:'re| are) just disappointed|we get it,? you want to read this article|become a member|members are never blocked|consider a membership|remove the picture from the homepage/i;",
  'promotion marker pattern'
);

replaceRequired(
  "function stripPromoBlock(text = '') {\n  const paragraphs = String(text).split(/\\n\\s*\\n+/).map(x => x.trim()).filter(Boolean);",
  "function stripPromoBlock(text = '') {\n  text = String(text).replace(/[’‘]/g, \"'\");\n  text = text\n    .replace(/you(?:'re| are) not a fangraphs member[\\s\\S]*?(?:we didn't want to overdo it\\.|removed all the other ads in this article[^.]*\\.)/gi, '')\n    .replace(/it looks like you(?:'re| are) not a fangraphs member[\\s\\S]*?(?:we didn't want to overdo it\\.|removed all the other ads in this article[^.]*\\.)/gi, '');\n  const paragraphs = text.split(/\\n\\s*\\n+/).map(x => x.trim()).filter(Boolean);",
  'promotion block cleaner'
);

replaceRequired(
  "  const translated = await translateText(body);",
  "  let translated = await translateText(body);\n  const promoSentenceKo = /팬그래프 회원|FanGraphs와 전체|로그인하지 않으신|화난 것이 아니라|실망했을 뿐|이 기사를 읽고 싶|회원이 되어야|광고 없이|기사 무제한|비회원은|회원은 절대로|다크.?모드|맞춤형 플레이어 페이지|원클릭 데이터|홈페이지에 있는 사진|Steamer 프로젝션|연말 리뷰|FOMO|주간 메일백|전체 직원을 지원|멤버십|판매 홍보|다른 모든 광고|과장하고 싶지 않았/i;\n  translated = translated\n    .split(/\\n\\s*\\n+/)\n    .map(paragraph => paragraph\n      .split(/(?<=[.!?])\\s+/)\n      .map(sentence => sentence.trim())\n      .filter(sentence => sentence && !promoSentenceKo.test(sentence))\n      .join(' '))\n    .filter(Boolean)\n    .join('\\n\\n')\n    .replace(/\\n{3,}/g, '\\n\\n')\n    .trim();",
  'translated promotion cleanup'
);

await fs.writeFile(runtimePath, source, 'utf8');
try {
  await import(`${runtimePath.href}?v=${Date.now()}`);
} finally {
  await fs.rm(runtimePath, { force: true });
}