import fs from 'node:fs/promises';
import crypto from 'node:crypto';

const NEWS_HOME='https://www.nba.com/news';
const DATA_FILE=new URL('../public/data/news.json',import.meta.url);
const ARTICLE_DIR=new URL('../public/data/articles/',import.meta.url);
const MAX_ITEMS=4;
const MIN_BODY_WORDS=220;
const EXCLUDE_URL=/\/news\/(?:category|writers?|authors?|tag|video|podcasts?|archive)(?:\/|$)/i;
const EXCLUDE_TITLE=/where to watch|stream|schedule|odds|betting|fantasy|mock draft|tickets|merchandise|2k cover|all-time .* leaders/i;

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

function decodeHtml(value=''){
 return String(value)
  .replace(/&nbsp;|&#160;/gi,' ')
  .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
  .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>')
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}

function clean(value=''){
 return decodeHtml(String(value))
  .replace(/<!\[CDATA\[|\]\]>/g,'')
  .replace(/<[^>]+>/g,' ')
  .replace(/\s+/g,' ')
  .trim();
}

function stripTags(value=''){
 return decodeHtml(String(value)
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ')
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,' ')
  .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi,' ')
  .replace(/<br\s*\/?\s*>/gi,'\n')
  .replace(/<[^>]+>/g,' '))
  .replace(/[ \t]+/g,' ')
  .replace(/\n[ \t]+/g,'\n')
  .replace(/\n{3,}/g,'\n\n')
  .trim();
}

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

async function readExisting(){
 try{return JSON.parse(await fs.readFile(DATA_FILE,'utf8'))}catch{return{items:[]}}
}

async function fetchText(url,timeout=25000){
 const response=await fetch(url,{
  headers:{accept:'text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8','accept-language':'en-US,en;q=0.9',referer:'https://www.nba.com/','user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/142 Safari/537.36 today-nba'},
  redirect:'follow',signal:AbortSignal.timeout(timeout)
 });
 if(!response.ok)throw new Error(`${response.status} ${url}`);
 return response.text();
}

async function translateChunk(text){
 const url=new URL('https://translate.googleapis.com/translate_a/single');
 url.searchParams.set('client','gtx');url.searchParams.set('sl','en');url.searchParams.set('tl','ko');url.searchParams.set('dt','t');url.searchParams.set('q',text);
 const response=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 today-nba'},signal:AbortSignal.timeout(25000)});
 if(!response.ok)throw new Error(`translation ${response.status}`);
 const payload=await response.json();
 const result=clean((payload?.[0]||[]).map(part=>part?.[0]||'').join(''));
 if(!hasHangul(result))throw new Error('translation returned no Korean text');
 return polishKo(result);
}

function splitText(text,maxLength=1200){
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
 const source=String(text||'').trim();
 if(source.length<900)return'';
 const translated=[];
 for(const chunk of splitText(source)){
  let result='';
  for(let attempt=0;attempt<2&&!result;attempt+=1){
   try{result=await translateChunk(chunk)}catch(error){if(attempt===1)console.warn(`NBA body translation failed: ${error.message}`);else await new Promise(r=>setTimeout(r,700))}
  }
  if(!result||!hasHangul(result))return'';
  translated.push(result);
  await new Promise(r=>setTimeout(r,180));
 }
 return translated.join('\n\n');
}

function collectObjects(value,out=[]){
 if(!value||typeof value!=='object')return out;
 if(Array.isArray(value)){for(const item of value)collectObjects(item,out);return out}
 out.push(value);for(const child of Object.values(value))collectObjects(child,out);return out;
}

function jsonLdArticle(html){
 const matches=[...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
 for(const match of matches){
  try{
   const parsed=JSON.parse(decodeHtml(match[1]).trim());
   const article=collectObjects(parsed).find(obj=>{const type=Array.isArray(obj?.['@type'])?obj['@type'].join(' '):String(obj?.['@type']||'');return/NewsArticle|Article|ReportageNewsArticle/i.test(type)&&(obj.headline||obj.articleBody)});
   if(article)return article;
  }catch{}
 }
 return null;
}

function metaContent(html,key){
 const patterns=[new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,'i'),new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,'i')];
 for(const pattern of patterns){const match=html.match(pattern);if(match)return decodeHtml(match[1]).trim()}
 return'';
}

function paragraphCandidates(html){
 const articleMatch=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
 const scope=articleMatch?.[1]||html;
 return[...new Set([...scope.matchAll(/<(p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
  .map(match=>stripTags(match[2])).filter(Boolean).filter(text=>text.length>=45)
  .filter(text=>!/download the nba app|sign up|subscribe|cookie|privacy policy|terms of use|follow us|related stories|copyright/i.test(text)) )];
}

function bodyParagraphs(html,article){
 const articleBody=stripTags(article?.articleBody||'');
 if(articleBody.length>900){
  const split=articleBody.split(/\n{2,}|(?<=[.!?])\s+(?=[A-Z0-9])/).map(x=>x.trim()).filter(x=>x.length>=45);
  if(split.length>=5)return split;
 }
 return paragraphCandidates(html);
}

function articleLinks(homeHtml){
 const found=[];
 for(const match of homeHtml.matchAll(/href=["'](https:\/\/www\.nba\.com\/news\/[^"'#?]+|\/news\/[^"'#?]+)["']/gi)){
  const absolute=new URL(match[1],'https://www.nba.com').href.replace(/\/$/,'');
  const path=new URL(absolute).pathname;
  if(EXCLUDE_URL.test(path)||path.split('/').filter(Boolean).length<2)continue;
  found.push(absolute);
 }
 return[...new Set(found)];
}

async function buildItem(url,cached){
 if(cached?.articleFile&&cached?.bodyVerified&&cached?.translationType==='full')return cached;
 const html=await fetchText(url);
 if(/subscribe to continue|sign in to continue|premium content|the athletic/i.test(html))throw new Error('paywall or restricted article');
 const article=jsonLdArticle(html);
 const title=stripTags(article?.headline||metaContent(html,'og:title')||html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]||'');
 const pubDate=article?.datePublished||article?.dateModified||metaContent(html,'article:published_time')||new Date().toISOString();
 const paragraphs=bodyParagraphs(html,article);
 const sourceBody=paragraphs.join('\n\n');
 const wordCount=sourceBody.split(/\s+/).filter(Boolean).length;
 if(!title||EXCLUDE_TITLE.test(title))throw new Error('excluded title');
 if(wordCount<MIN_BODY_WORDS)throw new Error(`article body too short: ${wordCount} words`);
 const[titleKo,translated]=await Promise.all([translateChunk(title),translateText(sourceBody)]);
 if(!titleKo||!translated||translated.length<700)throw new Error('full translation incomplete');
 const id=stableId(url);
 const translatedAt=new Date().toISOString();
 await fs.writeFile(new URL(`${id}.json`,ARTICLE_DIR),JSON.stringify({available:true,title:titleKo,originalTitle:title,translated,source:'NBA.com',link:url,pubDate,translationType:'full',translatedAt},null,2),'utf8');
 return{id,articleFile:`./data/articles/${id}.json`,title,titleKo,link:url,pubDate,source:'NBA.com',category:'미국 현지 읽을거리',readingMinutes:Math.max(4,Math.round(wordCount/220)),bodyVerified:true,bodyChars:translated.length,sourceWordCount:wordCount,translationType:'full',translatedAt};
}

async function main(){
 await fs.mkdir(ARTICLE_DIR,{recursive:true});
 const existing=await readExisting();
 const existingByUrl=new Map((existing.items||[]).map(item=>[canonical(item.link||item.originalLink),item]));
 const homeHtml=await fetchText(NEWS_HOME);
 const candidates=articleLinks(homeHtml).slice(0,30);
 const items=[];const seen=new Set();
 for(const url of candidates){
  if(items.length>=MAX_ITEMS)break;
  const key=canonical(url);if(seen.has(key))continue;
  try{const item=await buildItem(url,existingByUrl.get(key));items.push(item);seen.add(key)}catch(error){console.warn(`Skipped NBA.com article ${url}: ${error.message}`)}
 }
 for(const old of existing.items||[]){
  if(items.length>=MAX_ITEMS)break;
  const key=canonical(old.link||old.originalLink);if(!key||seen.has(key)||!old.articleFile||!old.bodyVerified||old.translationType!=='full')continue;
  items.push(old);seen.add(key);
 }
 if(items.length<2)throw new Error(`Only ${items.length} fully translated NBA articles available; existing data preserved`);
 await fs.writeFile(DATA_FILE,JSON.stringify({items:items.slice(0,MAX_ITEMS),message:'NBA.com 무료 기사 중 본문 전체 자동 번역이 완료된 기사만 제공합니다.',selectionPolicy:'무료 전문 접근 가능 · 제목과 본문 전체 한국어 번역 필수 · 번역 실패 시 직전 번역 기사 유지',translationPolicy:'korean_title_and_full_body_required_keep_previous_on_failure',selectedCount:Math.min(MAX_ITEMS,items.length),updatedAt:new Date().toISOString()},null,2),'utf8');
 console.log(`NBA Korean full-text readings updated: ${items.length}`);
}

main().catch(error=>{console.warn(`NBA full-text news update skipped: ${error.message}`);process.exitCode=1});
