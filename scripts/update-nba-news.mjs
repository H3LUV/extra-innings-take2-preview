import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const NEWS_HOME='https://www.nba.com/news';
const DATA_FILE=new URL('../public/data/news.json',import.meta.url);
const ARTICLE_DIR=new URL('../public/data/articles/',import.meta.url);
const MAX_ITEMS=4;
const MIN_BODY_WORDS=220;

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
const canonical=value=>String(value||'').replace(/[?#].*$/,'');
const stableId=link=>`nba-${crypto.createHash('sha1').update(canonical(link)).digest('hex').slice(0,12)}`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function polishKo(text=''){
 let result=String(text).replace(/\s+/g,' ').trim();
 for(const[en,ko]of TEAM_NAMES)result=result.replaceAll(en,ko);
 return result
  .replace(/three-pointer/gi,'3점슛')
  .replace(/field goal/gi,'야투')
  .replace(/free throw/gi,'자유투')
  .replace(/postseason/gi,'플레이오프')
  .replace(/\s+([,.:;!?])/g,'$1')
  .trim();
}

function markdownToText(markdown=''){
 const marker='Markdown Content:';
 const source=String(markdown).includes(marker)?String(markdown).split(marker).slice(1).join(marker):String(markdown);
 return source
  .replace(/!\[[^\]]*\]\([^)]*\)/g,' ')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/^#{1,6}\s+/gm,'')
  .replace(/^\s*[-*+]\s+/gm,'')
  .replace(/^\s*\d+\.\s+/gm,'')
  .replace(/^[-*_]{3,}\s*$/gm,'')
  .replace(/`{1,3}([^`]+)`{1,3}/g,'$1')
  .replace(/<[^>]+>/g,' ')
  .replace(/[ \t]+/g,' ')
  .replace(/\n[ \t]+/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
}

async function readExisting(){
 try{return JSON.parse(await fs.readFile(DATA_FILE,'utf8'))}catch{return{items:[]}}
}

async function fetchReader(targetUrl,timeout=60000){
 const url=`https://r.jina.ai/${targetUrl}`;
 const response=await fetch(url,{
  headers:{accept:'text/plain','user-agent':'today-nba/2.0'},
  signal:AbortSignal.timeout(timeout)
 });
 if(!response.ok)throw new Error(`reader ${response.status} ${targetUrl}`);
 return response.text();
}

function readerMeta(text,key){
 const match=String(text).match(new RegExp(`^${key}:\\s*(.+)$`,'mi'));
 return match?.[1]?.trim()||'';
}

function articleLinks(text){
 const matches=[...String(text).matchAll(/https:\/\/www\.nba\.com\/news\/[a-z0-9-]+/gi)].map(match=>match[0].replace(/[),.]+$/,''));
 return[...new Set(matches)].filter(url=>!/(schedule|where-to-watch|odds|betting|fantasy|tickets|mock-draft)/i.test(url));
}

async function translateChunk(text){
 const url=new URL('https://translate.googleapis.com/translate_a/single');
 url.searchParams.set('client','gtx');url.searchParams.set('sl','en');url.searchParams.set('tl','ko');url.searchParams.set('dt','t');url.searchParams.set('q',text);
 const response=await fetch(url,{headers:{'user-agent':'today-nba/2.0'},signal:AbortSignal.timeout(30000)});
 if(!response.ok)throw new Error(`translation ${response.status}`);
 const payload=await response.json();
 const result=(payload?.[0]||[]).map(part=>part?.[0]||'').join('').replace(/\s+/g,' ').trim();
 if(!hasHangul(result))throw new Error('translation returned no Korean text');
 return polishKo(result);
}

function splitText(text,maxLength=1100){
 const paragraphs=String(text||'').split(/\n\s*\n+/).map(x=>x.trim()).filter(Boolean);
 const chunks=[];let current='';
 const flush=()=>{if(current.trim())chunks.push(current.trim());current=''};
 for(const paragraph of paragraphs){
  if(paragraph.length>maxLength){
   flush();
   const sentences=paragraph.split(/(?<=[.!?])\s+/);let part='';
   for(const sentence of sentences){
    if((`${part} ${sentence}`).trim().length>maxLength){if(part.trim())chunks.push(part.trim());part=sentence}else part=`${part} ${sentence}`.trim();
   }
   if(part.trim())chunks.push(part.trim());
   continue;
  }
  if((`${current}\n\n${paragraph}`).trim().length>maxLength)flush();
  current=current?`${current}\n\n${paragraph}`:paragraph;
 }
 flush();return chunks;
}

async function translateText(text){
 const translated=[];
 for(const chunk of splitText(text)){
  let result='';
  for(let attempt=0;attempt<3&&!result;attempt+=1){
   try{result=await translateChunk(chunk)}catch(error){if(attempt===2)console.warn(`NBA translation chunk failed: ${error.message}`);else await sleep(900*(attempt+1))}
  }
  if(!result)return'';
  translated.push(result);
  await sleep(220);
 }
 return translated.join('\n\n');
}

function cleanArticleBody(readerText,title){
 let body=markdownToText(readerText);
 const boilerplate=[
  /^Navigation Toggle$/gmi,/^Download the NBA App$/gmi,/^NBA\.com$/gmi,/^Copyright.*$/gmi,
  /^Title:.*$/gmi,/^URL Source:.*$/gmi,/^Published Time:.*$/gmi,/^Markdown Content:.*$/gmi
 ];
 for(const pattern of boilerplate)body=body.replace(pattern,'');
 if(title)body=body.replace(new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s*`,'i'),'');
 return body.replace(/\n{3,}/g,'\n\n').trim();
}

async function buildItem(url,cached){
 if(cached?.articleFile&&cached?.bodyVerified&&cached?.translationType==='full')return cached;
 const readerText=await fetchReader(url);
 const title=readerMeta(readerText,'Title')||readerMeta(readerText,'Page Title')||url.split('/').pop().replaceAll('-',' ');
 const pubDate=readerMeta(readerText,'Published Time')||readerMeta(readerText,'Published')||new Date().toISOString();
 const body=cleanArticleBody(readerText,title);
 const wordCount=body.split(/\s+/).filter(Boolean).length;
 if(wordCount<MIN_BODY_WORDS)throw new Error(`reader body too short: ${wordCount} words`);
 const titleKo=await translateChunk(title);
 const translated=await translateText(body);
 if(!titleKo||!translated||translated.length<700)throw new Error('full translation incomplete');
 const id=stableId(url);
 const translatedAt=new Date().toISOString();
 await fs.writeFile(new URL(`${id}.json`,ARTICLE_DIR),JSON.stringify({available:true,title:titleKo,originalTitle:title,translated,source:'NBA.com',link:url,pubDate,translationType:'full',translatedAt},null,2),'utf8');
 return{id,articleFile:`./data/articles/${id}.json`,title,titleKo,link:url,pubDate,source:'NBA.com',category:'미국 현지 읽을거리',readingMinutes:Math.max(4,Math.round(wordCount/220)),bodyVerified:true,bodyChars:translated.length,sourceWordCount:wordCount,translationType:'full',translatedAt};
}

async function main(){
 await fs.mkdir(ARTICLE_DIR,{recursive:true});
 const existing=await readExisting();
 const existingByUrl=new Map((existing.items||[]).map(item=>[canonical(item.originalLink||item.link),item]));
 const fullExisting=(existing.items||[]).filter(item=>item.articleFile&&item.bodyVerified&&item.translationType==='full');
 let homeText='';
 try{homeText=await fetchReader(NEWS_HOME)}catch(error){console.warn(`NBA news home reader failed: ${error.message}`)}
 const seedUrls=(existing.items||[]).map(item=>item.originalLink||item.link).filter(url=>/^https?:\/\//i.test(String(url||'')));
 const candidates=[...new Set([...seedUrls,...articleLinks(homeText)])].slice(0,40);
 const items=[];const seen=new Set();
 for(const url of candidates){
  if(items.length>=MAX_ITEMS)break;
  const key=canonical(url);if(seen.has(key))continue;
  try{const item=await buildItem(url,existingByUrl.get(key));items.push(item);seen.add(key)}catch(error){console.warn(`Skipped NBA article ${url}: ${error.message}`)}
 }
 for(const old of fullExisting){
  if(items.length>=MAX_ITEMS)break;
  const key=canonical(old.originalLink||old.link);if(!key||seen.has(key))continue;
  items.push(old);seen.add(key);
 }
 await fs.writeFile(DATA_FILE,JSON.stringify({
  items:items.slice(0,MAX_ITEMS),
  message:items.length?'NBA.com 무료 기사 중 제목과 본문 전체 자동 번역이 완료된 기사만 제공합니다.':'NBA 전문 번역 기사를 생성하고 있습니다.',
  selectionPolicy:'무료 전문 접근 가능 · 제목과 본문 전체 한국어 번역 필수 · 상세 요약 사용 안 함',
  translationPolicy:'korean_title_and_full_body_required_keep_previous_on_failure',
  selectedCount:Math.min(MAX_ITEMS,items.length),updatedAt:new Date().toISOString()
 },null,2),'utf8');
 console.log(`NBA Korean full-text readings updated: ${items.length}`);
}

main().catch(async error=>{
 console.warn(`NBA full-text news update failed: ${error.message}`);
 const existing=await readExisting();
 const full=(existing.items||[]).filter(item=>item.articleFile&&item.bodyVerified&&item.translationType==='full').slice(0,MAX_ITEMS);
 await fs.writeFile(DATA_FILE,JSON.stringify({items:full,message:full.length?'직전 번역 완료 기사를 유지합니다.':'NBA 전문 번역 기사를 생성하고 있습니다.',selectionPolicy:'상세 요약 사용 안 함',translationPolicy:'full_translation_only',selectedCount:full.length,updatedAt:new Date().toISOString()},null,2),'utf8');
});
