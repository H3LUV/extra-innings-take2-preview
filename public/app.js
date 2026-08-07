const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const COLUMN_BYLINE='H3LUV · support by GPT';
const getJSON=async(url,timeout=15000)=>{const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:ctrl.signal});if(!r.ok)throw Error(r.status);return await r.json()}finally{clearTimeout(timer)}};
const kstDate=(date=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
const espnDate=()=>kstDate().replaceAll('-','');
const fmtTime=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(iso));
const fmtDate=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(iso));

function renderColumn(d){
  if(!d?.title){$('#columnBody').innerHTML='<div class="empty">등록된 칼럼이 없습니다.</div>';return}
  const url=`./columns/${encodeURIComponent(d.slug||'latest')}/`;
  $('#columnBody').innerHTML=`<h2>${esc(d.title)}</h2><p class="dek">${esc(d.dek||'')}</p>${d.thesis?`<div class="thesis">${esc(d.thesis)}</div>`:''}<div class="meta">${esc(COLUMN_BYLINE)}${d.publishedAt?` · ${fmtDate(d.publishedAt)}`:''}</div><div class="btns"><a class="btn" href="${url}">칼럼 전문 읽기</a><button class="btn alt" id="copyColumn" type="button">주소 복사</button></div>`;
  $('#copyColumn')?.addEventListener('click',async()=>{const abs=new URL(url,location.href).href;await navigator.clipboard.writeText(abs);$('#copyColumn').textContent='복사 완료'});
}

function normalizeGame(g){return{id:g.id,status:g.status||'',venue:g.venue||'',gameDate:g.gameDate,away:g.away||{},home:g.home||{}}}
function gamesFromEspn(data){return(data?.events||[]).map(e=>{const c=e.competitions?.[0]||{},teams=c.competitors||[],away=teams.find(x=>x.homeAway==='away')||{},home=teams.find(x=>x.homeAway==='home')||{};return{id:e.id,gameDate:e.date,status:e.status?.type?.shortDetail||e.status?.type?.detail||'',venue:c.venue?.fullName||'',away:{name:away.team?.displayName||'',score:away.score??'-'},home:{name:home.team?.displayName||'',score:home.score??'-'}}})}
function renderGames(data){const games=Array.isArray(data)?data:(data?.games||[]);if(!games.length){$('#gamesList').innerHTML=`<div class="empty">${esc(data?.message||'오늘 예정된 경기가 없습니다.')}</div>`;return}$('#gamesList').innerHTML=games.map(raw=>{const g=normalizeGame(raw);return`<article class="game"><div class="gmeta"><span>${g.gameDate?fmtTime(g.gameDate):''}</span><span>${esc(g.status)}</span></div><div class="team"><span>${esc(g.away.name||'원정팀')}</span><span class="score">${esc(g.away.score??'-')}</span></div><div class="team"><span>${esc(g.home.name||'홈팀')}</span><span class="score">${esc(g.home.score??'-')}</span></div><div class="sub">${esc(g.venue||'')}</div></article>`}).join('')}
async function refreshGames(staticData){try{const live=gamesFromEspn(await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate()}`,9000));renderGames({games:live,message:staticData?.message});$('#gamesStatus').className='status live';$('#gamesStatus').textContent='실시간 · 60초 갱신'}catch(e){renderGames(staticData);$('#gamesStatus').className='status fallback';$('#gamesStatus').textContent='백업 · 매시간 갱신'}}

function statValue(entry,name){const s=(entry?.stats||[]).find(x=>x.name===name||x.abbreviation===name);return s?.displayValue??s?.value??'-'}
function standingsFromEspn(data){const groups=data?.children||data?.groups||[];return groups.map(g=>({name:g.name||g.abbreviation||'콘퍼런스',teams:(g.standings?.entries||g.entries||[]).map((e,i)=>({seed:Number(statValue(e,'playoffseed'))||i+1,name:e.team?.displayName||e.team?.name||'',w:statValue(e,'wins'),l:statValue(e,'losses'),gb:statValue(e,'gamesbehind')}))})).filter(g=>g.teams.length)}
function renderStandings(data){const groups=Array.isArray(data)?data:(data?.conferences||[]);if(!groups.length){$('#standingsList').innerHTML=`<div class="empty">${esc(data?.message||'순위 데이터가 없습니다.')}</div>`;return}$('#standingsList').innerHTML=groups.map(g=>`<div class="conference"><h3>${esc(g.name)}</h3>${(g.teams||[]).map((t,i)=>`<div class="standing-row"><span class="seed">${esc(t.seed||i+1)}</span><b>${esc(t.name)}</b><span>${esc(t.w)}</span><span>${esc(t.l)}</span><span>${esc(t.gb??'-')}</span></div>`).join('')}</div>`).join('')}
async function refreshStandings(staticData){try{const live=standingsFromEspn(await getJSON('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=2&sort=playoffseed%3Aasc',10000));renderStandings({conferences:live,message:staticData?.message});$('#standingsStatus').className='status live';$('#standingsStatus').textContent='실시간 순위'}catch(e){renderStandings(staticData);$('#standingsStatus').className='status fallback';$('#standingsStatus').textContent='백업 · 매시간 갱신'}}

function renderNews(d){
  const items=(d?.items||[]).slice(0,4);
  $('#newsList').innerHTML=items.length?items.map(x=>{
    const internal=Boolean(x.articleFile&&x.id);
    const href=internal?`./article.html?id=${encodeURIComponent(x.id)}`:(x.link||x.originalLink||'#');
    const attrs=internal?'':` target="_blank" rel="noopener noreferrer"`;
    const label=internal?'한국어 전문':'원문';
    return `<a class="news" href="${esc(href)}"${attrs}><strong>${esc(x.titleKo||x.title)}</strong><div class="sub">${esc(x.source||'미국 현지 매체')} · ${esc(x.readingMinutes||'')}분 · ${label}</div></a>`;
  }).join(''):`<div class="empty">${esc(d?.message||'선정된 읽을거리가 없습니다.')}</div>`;
}

function methodBox(method){
  if(!method)return'';
  const w=method.weights||{};
  return `<div class="method-note"><strong>${esc(method.name||'RII')} 산정 방식</strong><p>${esc(method.comparison||'최근 10경기와 직전 10경기 비교')}</p><div class="method-grid"><span>생산성 ${esc(w.productivity??45)}%</span><span>TS% ${esc(w.efficiency??25)}%</span><span>역할 ${esc(w.role??20)}%</span><span>출전시간 ${esc(w.minutes??10)}%</span></div><small>${esc(method.eligibility||'')}</small></div>`;
}
function signed(value,suffix=''){const n=Number(value||0);return`${n>0?'+':''}${n.toFixed(1)}${suffix}`}
function renderRising(d){
  const items=d?.players||[];
  const status=$('#risingStatus');
  if(status){status.textContent=d?.status==='offseason'?'오프시즌 · 산정 중지':'RII · 최근 10경기 비교';status.className=d?.status==='offseason'?'status fallback':'status live'}
  if(!items.length){$('#risingList').innerHTML=`<div class="empty rising-empty">${esc(d?.message||'상승세 선수 데이터 생성 중입니다.')}</div>${methodBox(d?.method)}`;return}
  $('#risingList').innerHTML=items.slice(0,5).map((p,i)=>`<article class="player"><div class="rank">#${esc(p.rank||i+1)} · ${esc(p.metric||'RII')}</div><h3>${esc(p.name)}</h3><div class="sub">${esc(p.team||'')}</div><div class="rii-score">${Number(p.score||0).toFixed(1)}<small>/100</small></div><div class="component"><span>생산성</span><b>${signed(p.delta?.productivity)}</b></div><div class="component"><span>TS%</span><b>${signed(p.delta?.ts,'%p')}</b></div><div class="component"><span>공격 역할</span><b>${signed(p.delta?.role)}</b></div><div class="component"><span>출전시간</span><b>${signed(p.delta?.mpg,'분')}</b></div><div class="stats">최근: 생산성 ${esc(p.recent?.productivity)} · TS ${esc(p.recent?.ts)}% · ${esc(p.recent?.mpg)}분<br>직전: 생산성 ${esc(p.previous?.productivity)} · TS ${esc(p.previous?.ts)}% · ${esc(p.previous?.mpg)}분</div></article>`).join('')+methodBox(d?.method);
}

function renderTx(d){
  const items=(d?.items||[]).slice(0,18);
  $('#txList').innerHTML=items.length?items.map(x=>`<article class="tx"><div class="tx-meta"><span>${esc(x.typeKo||x.type||'이동')}</span><time>${esc(x.dateKo||'')}</time></div><strong>${esc(x.title||x.typeKo||'트랜잭션')}</strong><div class="tx-desc">${esc(x.descriptionKo||x.description||'')}</div>${x.sourceLink?`<a class="tx-source" href="${esc(x.sourceLink)}" target="_blank" rel="noopener noreferrer">${esc(x.source||'NBA.com')} 공식 내역</a>`:''}</article>`).join(''):`<div class="empty">${esc(d?.message||'최근 트랜잭션이 없습니다.')}</div>`;
}

(async()=>{
  const paths=['editorial.json','schedule.json','standings.json','news.json','rising.json','transactions.json'];
  const settled=await Promise.allSettled(paths.map(p=>getJSON(`./data/${p}?v=${Date.now()}`)));
  const[editorial,schedule,standings,news,rising,tx]=settled.map(x=>x.status==='fulfilled'?x.value:null);
  renderColumn(editorial);renderGames(schedule);renderStandings(standings);renderNews(news);renderRising(rising);renderTx(tx);
  $('#updated').textContent=`기준 ${new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'medium',timeStyle:'short'}).format(new Date())}`;
  await Promise.allSettled([refreshGames(schedule),refreshStandings(standings)]);
  setInterval(()=>refreshGames(schedule),60000);setInterval(()=>refreshStandings(standings),300000);
})().catch(e=>{console.error(e);$('#updated').textContent='일부 데이터 로딩 실패'});
