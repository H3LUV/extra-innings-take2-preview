import fs from 'node:fs/promises';

const originalPath = new URL('./update-nba-news.mjs', import.meta.url);
const runtimePath = new URL('./update-nba-news-runtime.mjs', import.meta.url);
let source = await fs.readFile(originalPath, 'utf8');

function replaceRequired(before, after, label) {
  if (!source.includes(before)) throw new Error(`NBA runtime patch target missing: ${label}`);
  source = source.replace(before, after);
}

replaceRequired("const PIPELINE='reader-v4';", "const PIPELINE='reader-v6';", 'pipeline version');
replaceRequired("if(built.length>=12)break;", "if(built.length>=4)break;", 'article build limit');

replaceRequired(
  "const EXCLUDE_URL=/\\/news\\/(?:category|writer|writers|writers-archive|author|authors|authors-archive|tag|video|podcasts?|archive|key-dates|2026-nba-draft-order|2026-offseason-trade-tracker)(?:\\/|$)/i;",
  "const EXCLUDE_URL=/\\/news\\/(?:category|writer|writers|writers-archive|author|authors|authors-archive|tag|video|podcasts?|archive|key-dates|2026-nba-draft-order|2026-offseason-trade-tracker|[^/]*(?:tax-strategy|privacy|cookie|terms-of-use|accessibility|legal)[^/]*)(?:\\/|$)/i;",
  'legal URL exclusion'
);

replaceRequired(
  "const EXCLUDE_TITLE=/page not found|writers? archive|authors? archive|key dates|draft results|draft order|trade tracker|where to watch|stream|schedule|odds|betting|fantasy|mock draft|tickets|all-time .* leaders/i;",
  "const EXCLUDE_TITLE=/page not found|writers? archive|authors? archive|tax strategy|privacy policy|cookie policy|terms of use|accessibility statement|legal notice|key dates|draft results|draft order|trade tracker|where to watch|stream|schedule|odds|betting|fantasy|mock draft|tickets|all-time .* leaders/i;",
  'legal title exclusion'
);

replaceRequired(
  ".replace(/postseason/gi,'플레이오프').replace(/\\s+([,.:;!?])/g,'$1').trim();",
  ".replace(/postseason/gi,'플레이오프').replace(/계약 연장 계약 체결/g,'계약 연장').replace(/\\bKnicks\\b/g,'뉴욕 닉스').replace(/\\bMavericks\\b/g,'댈러스 매버릭스').replace(/\\bWarriors\\b/g,'골든스테이트 워리어스').replace(/\\s+([,.:;!?])/g,'$1').trim();",
  'title polishing'
);

replaceRequired(
  " if(escaped){const match=body.match(new RegExp(escaped,'i'));if(match&&typeof match.index==='number')body=body.slice(match.index+match[0].length)}\n return body.split('\\n').map(x=>x.trim()).filter(Boolean)",
  " if(escaped){const match=body.match(new RegExp(escaped,'i'));if(match&&typeof match.index==='number')body=body.slice(match.index+match[0].length)}\n const cutPatterns=[/\\n\\s*related(?: stories)?\\s*\\n/i,/\\n\\s*latest\\s*\\n/i,/\\n\\s*nba organization\\s*\\n/i,/\\n\\s*nba id benefits\\s*\\n/i,/\\n\\s*customer support\\s*\\n/i,/\\n\\s*privacy policy\\s*\\n/i];\n const cutIndexes=cutPatterns.map(pattern=>body.search(pattern)).filter(index=>index>0);\n if(cutIndexes.length)body=body.slice(0,Math.min(...cutIndexes));\n return body.split('\\n').map(x=>x.trim()).filter(Boolean)",
  'article end cutoff'
);

replaceRequired(
  ".filter(line=>!/^(navigation toggle|download the nba app|nba\\.com|sign in|log in|privacy policy|terms of use|copyright.*)$/i.test(line))",
  ".filter(line=>!/^(navigation toggle|download the nba app|nba\\.com|sign in|log in|privacy policy|terms of use|copyright.*|related|related stories|latest|nba organization|nba id benefits|customer support)$/i.test(line))",
  'footer line filter'
);

replaceRequired(
  " const titleKo=await translateChunk(title);const translated=await translateText(body);",
  " let titleKo=await translateChunk(title);\n titleKo=titleKo.replace(/계약 연장 계약 체결/g,'계약 연장').replace(/Knicks/g,'뉴욕 닉스').replace(/Mavericks/g,'댈러스 매버릭스').replace(/Warriors/g,'골든스테이트 워리어스');\n let translated=await translateText(body);\n const footerKo=/관련 기사|관련된|NBA 조직|NBA ID 혜택|NBA 공식|NBA 채용|팬 행동 강령|고객 지원|개인정보 보호정책|개인 정보 보호 정책|쿠키 정책|접근성 및 자막|광고 쿠키|귀하의 개인 정보 보호 선택|최신 ####|관련 ####/i;\n translated=translated.split(/\\n\\s*\\n+/).map(paragraph=>paragraph.split(/(?<=[.!?])\\s+/).filter(sentence=>!footerKo.test(sentence)).join(' ')).filter(Boolean).join('\\n\\n').trim();",
  'translated footer cleanup'
);

await fs.writeFile(runtimePath, source, 'utf8');
try {
  await import(`${runtimePath.href}?v=${Date.now()}`);
} finally {
  await fs.rm(runtimePath, { force: true });
}