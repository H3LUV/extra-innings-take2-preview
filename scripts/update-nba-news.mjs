import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const NEWS_HOME='https://www.nba.com/news';
const DATA_FILE=new URL('../public/data/news.json',import.meta.url);
const ARTICLE_DIR=new URL('../public/data/articles/',import.meta.url);
const MAX_ITEMS=4;
const MIN_BODY_WORDS=220;
const PIPELINE='reader-v4';
const EXCLUDE_URL=/\/news\/(?:category|writer|writers|writers-archive|author|authors|authors-archive|tag|video|podcasts?|archive|key-dates|2026-nba-draft-order|2026-offseason-trade-tracker)(?:\/|$)/i;
const EXCLUDE_TITLE=/page not found|writers? archive|authors? archive|key dates|draft results|draft order|trade tracker|where to watch|stream|schedule|odds|betting|fantasy|mock draft|tickets|all-time .* leaders/i;

const TEAM_NAMES=[
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

const hasHangul=text=>/[가-힣]/.test(String(text||''));
const canonical=value=>String(value||'').replace(/[?#].*$/,'').replace(/\/$/,'');
const stableId=link=>`nba-${crypto.createHash('sha1').update(canonical(link)).digest('hex').slice(0,12)}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function polishKo(text=''){
 let result=String(text).replace(/\s+/g,' ').trim();
 for(const[en,ko]of TEAM_NAMES)result=result.replaceAll(en,ko);
 return result.replace(/three-pointer/gi,'3점슛').replace(/field goal/gi,'야투').replace(/free throw/gi,'자유투')
  .replace(/postseason/gi,'플레이오프').replace(/\s+([,.:;!?])/g,'$1').trim();
}

function markdownToText(markdown=''){
 const marker='Markdown Content:';
 const source=String(markdown).includes(marker)?String(markdown).split(marker).slice(1).join(marker):String(markdown);
 return source.replace(/!\[[^\]]*\]\([^)]*\)/g,' ').replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/^#{1,6}\s+/gm,'').replace(/^\s*[-*+]\s+/gm,'').replace(/^\s*\d+\.\s+/gm,'')
  .replace(/^[-*_]{3,}\s*$/gm,'').replace(/`{1,3}([^`]+)`{1,3}/g,'$1').replace(/<[^>]+>/g,' ')
  .replace(/[ \t]+/g,' ').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}

async function readExisting(){try{return JSON.parse(await fs.readFile(DATA_FILE,'utf8'))}catch{return{items:[]}}}
async function fetchReader(targetUrl,timeout=60000){
 const response=await fetch(`https://r.jina.ai/${targetUrl}`,{headers:{accept:'text/plain','user-agent':'today-nba/4.0'},signal:AbortSignal.timeout(timeout)});
 if(!response.ok)throw new Error(`reader ${response.status} ${targetUrl}`);return response.text();
}
function readerMeta(text,key){return String(text).match(new RegExp(`^${key}:\\s*(.+)$`,'mi'))?.[1]?.trim()||''}

function articleLinks(text){
 const results=[];
 for(const match of String(text).matchAll(/\[([^\]]{8,180})\]\((https:\/\/www\.nba\.com\/news\/[a-z0-9-]+)\)/gi)){
  const titleHint=match[1].replace(/[*_`]/g,'').trim();const link=canonical(match[2]);
  if(EXCLUDE_URL.test(link)||EXCLUDE_TITLE.test(titleHint))continue;
  results.push({link,titleHint});
 }
 for(const match of String(text).matchAll(/https:\/\/www\.nba\.com\/news\/[a-z0-9-]+/gi)){
  const link=canonical(match[0]);if(EXCLUDE_URL.test(link))continue;results.push({link,titleHint:''});
 }
 return[...new Map(results.map(item=>[item.link,item])).values()];
}

async function translateChunk(text){
 const url=new URL('https://translate.googleapis.com/translate_a/single');
 url.searchParams.set('client','gtx');url.searchParams.set('sl','en');url.searchParams.set('tl','ko');url.searchParams.set('dt','t');url.searchParams.set('q',text);
 const response=await fetch(url,{headers:{'user-agent':'today-nba/4.0'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`translation ${response.status}`);
 const payload=await response.json();const result=(payload?.[0]||[]).map(part=>part?.[0]||'').join('').replace(/\s+/g,' ').trim();
 if(!hasHangul(result))throw new Error('translation returned no Korean text');return polishKo(result);
}

function splitText(text,maxLength=1100){
 const paragraphs=String(text||'').split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);const chunks=[];let current='';
 const flush=()=>{if(current.trim())chunks.push(current.trim());current=''};
 for(const paragraph of paragraphs){
  if(paragraph.length>maxLength){flush();const sentences=paragraph.split(/(?<=[.!?])\s+/);let part='';
   for(const sentence of sentences){if((`${part} ${sentence}`).trim().length>maxLength){if(part.trim())chunks.push(part.trim());part=sentence}else part=`${part} ${sentence}`.trim()}
   if(part.trim())chunks.push(part.trim());continue;
  }
  if((`${current}\n\n${paragraph}`).trim().length>maxLength)flush();current=current?`${current}\n\n${paragraph}`:paragraph;
 }
 flush();return chunks;
}

async function translateText(text){
 const translated=[];
 for(const chunk of splitText(text)){
  let result='';for(let attempt=0;attempt<3&&!result;attempt+=1){try{result=await translateChunk(chunk)}catch(error){if(attempt===2)console.warn(`NBA translation chunk failed: ${error.message}`);else await sleep(900*(attempt+1))}}
  if(!result)return'';translated.push(result);await sleep(220);
 }
 return translated.join('\n\n');
}

function cleanArticleBody(readerText,title){
 let body=markdownToText(readerText).replace(/^Title:.*$/gmi,'').replace(/^URL Source:.*$/gmi,'').replace(/^Published Time:.*$/gmi,'').replace(/^Markdown Content:.*$/gmi,'');
 const escaped=String(title||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 if(escaped){const match=body.match(new RegExp(escaped,'i'));if(match&&typeof match.index==='number')body=body.slice(match.index+match[0].length)}
 return body.split('\n').map(x=>x.trim()).filter(Boolean)
  .filter(line=>!/^(navigation toggle|download the nba app|nba\.com|sign in|log in|privacy policy|terms of use|copyright.*)$/i.test(line))
  .join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
}

async function buildItem(candidate,cached){
 if(cached?.articleFile&&cached?.bodyVerified&&cached?.translationType==='full'&&cached?.pipelineVersion===PIPELINE)return cached;
 const readerText=await fetchReader(candidate.link);const title=readerMeta(readerText,'Title')||candidate.titleHint||candidate.link.split('/').pop().replaceAll('-',' ');
 if(EXCLUDE_URL.test(candidate.link)||EXCLUDE_TITLE.test(title))throw new Error(`excluded page: ${title}`);
 const pubDate=readerMeta(readerText,'Published Time')||readerMeta(readerText,'Published')||new Date().toISOString();
 const body=cleanArticleBody(readerText,title);const wordCount=body.split(/\s+/).filter(Boolean).length;
 if(wordCount<MIN_BODY_WORDS)throw new Error(`reader body too short: ${wordCount} words`);
 const titleKo=await translateChunk(title);const translated=await translateText(body);
 if(!titleKo||!translated||translated.length<700)throw new Error('full translation incomplete');
 const id=stableId(candidate.link);const translatedAt=new Date().toISOString();
 await fs.writeFile(new URL(`${id}.json`,ARTICLE_DIR),JSON.stringify({available:true,title:titleKo,originalTitle:title,translated,source:'NBA.com',link:candidate.link,pubDate,translationType:'full',pipelineVersion:PIPELINE,translatedAt},null,2),'utf8');
 return{id,articleFile:`./data/articles/${id}.json`,title,titleKo,link:candidate.link,pubDate,source:'NBA.com',category:'미국 현지 읽을거리',readingMinutes:Math.max(4,Math.round(wordCount/220)),bodyVerified:true,bodyChars:translated.length,sourceWordCount:wordCount,translationType:'full',pipelineVersion:PIPELINE,translatedAt};
}

async function main(){
 await fs.mkdir(ARTICLE_DIR,{recursive:true});const existing=await readExisting();
 const existingByUrl=new Map((existing.items||[]).map(item=>[canonical(item.link),item]));
 const validExisting=(existing.items||[]).filter(item=>item.articleFile&&item.bodyVerified&&item.translationType==='full'&&item.pipelineVersion===PIPELINE&&!EXCLUDE_URL.test(item.link)&&!EXCLUDE_TITLE.test(item.title));
 let homeText='';try{homeText=await fetchReader(`${NEWS_HOME}?refresh=${Date.now()}`)}catch(error){console.warn(`NBA news home reader failed: ${error.message}`)}
 const candidates=articleLinks(homeText).slice(0,60);const built=[];const seen=new Set();
 for(const candidate of candidates){
  if(built.length>=12)break;const key=canonical(candidate.link);if(seen.has(key))continue;
  try{const item=await buildItem(candidate,existingByUrl.get(key));built.push(item);seen.add(key)}catch(error){console.warn(`Skipped NBA article ${candidate.link}: ${error.message}`)}
 }
 built.sort((a,b)=>new Date(b.pubDate||0)-new Date(a.pubDate||0));const items=built.slice(0,MAX_ITEMS);const selected=new Set(items.map(x=>canonical(x.link)));
 for(const old of validExisting.sort((a,b)=>new Date(b.pubDate||0)-new Date(a.pubDate||0))){if(items.length>=MAX_ITEMS)break;const key=canonical(old.link);if(selected.has(key))continue;items.push(old);selected.add(key)}
 await fs.writeFile(DATA_FILE,JSON.stringify({items,message:items.length?'NBA.com의 최신 일반 기사 중 제목과 본문 전체 자동 번역이 완료된 기사만 제공합니다.':'NBA 전문 번역 기사를 생성하고 있습니다.',selectionPolicy:'최신 일반 기사 우선 · 오류/분류/목록/일정/트래커 페이지 제외 · 전체 번역 필수',translationPolicy:'newest_valid_article_full_translation_keep_previous_on_failure',pipelineVersion:PIPELINE,selectedCount:items.length,updatedAt:new Date().toISOString()},null,2),'utf8');
 console.log(`NBA valid full-text readings updated: ${items.length}`);
}

main().catch(async error=>{
 console.warn(`NBA full-text news update failed: ${error.message}`);const existing=await readExisting();
 const valid=(existing.items||[]).filter(item=>item.articleFile&&item.bodyVerified&&item.translationType==='full'&&item.pipelineVersion===PIPELINE&&!EXCLUDE_URL.test(item.link)&&!EXCLUDE_TITLE.test(item.title)).slice(0,MAX_ITEMS);
 await fs.writeFile(DATA_FILE,JSON.stringify({items:valid,message:valid.length?'직전 정상 번역 기사를 유지합니다.':'NBA 전문 번역 기사를 생성하고 있습니다.',selectionPolicy:'상세 요약과 자료성·목록 페이지 사용 안 함',translationPolicy:'valid_full_translation_only',pipelineVersion:PIPELINE,selectedCount:valid.length,updatedAt:new Date().toISOString()},null,2),'utf8');
});