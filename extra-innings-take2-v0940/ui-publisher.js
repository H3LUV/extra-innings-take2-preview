(()=>{
'use strict';
const frame=document.getElementById('game');
const status=document.getElementById('status');
let tries=0;

const ASSET_BASE='/extra-innings-take2-preview/extra-innings-take2-v0940/assets/ui/';
const ASSETS={
 backgrounds:{
  home:ASSET_BASE+'home-stadium.svg',
  training:ASSET_BASE+'home-stadium.svg',
  relations:ASSET_BASE+'home-stadium.svg',
  info:ASSET_BASE+'home-stadium.svg',
  collection:ASSET_BASE+'home-stadium.svg',
  settings:ASSET_BASE+'home-stadium.svg'
 },
 characters:{
  school:ASSET_BASE+'protagonist-school.svg',
  training:ASSET_BASE+'protagonist-school.svg',
  casual:ASSET_BASE+'protagonist-school.svg'
 }
};

const LIFE={
 school:{title:'학교생활',category:'school',items:[
  ['수업에 집중한다','수업과 시험 준비에 집중한다.',['수업','교실','시험','공부','성적','담임']],
  ['동아리 활동을 한다','친구들과 학교 행사와 동아리 활동에 참여한다.',['동아리','축제','학교 행사','반 친구']],
  ['진로 상담을 받는다','담임 선생님과 야구와 진로를 이야기한다.',['진로','상담','담임','선생님']],
  ['학교에서 휴식한다','학교 안에서 잠시 쉬며 컨디션을 정리한다.',['학교','옥상','휴식','교실']]
 ]},
 team:{title:'팀 동료·감독',category:'team',items:[
  ['감독과 대화한다','출전 기회와 팀 내 역할을 이야기한다.',['감독','출전','선발','보직','기용','면담']],
  ['코치에게 지도를 받는다','현재 문제점과 개선 방향을 묻는다.',['코치','지도','레슨','훈련','폼','기술']],
  ['동료와 시간을 보낸다','훈련 뒤 동료와 팀 분위기를 나눈다.',['동료','팀메이트','선배','후배','주장','라커룸','팀워크']],
  ['경쟁자와 이야기한다','같은 자리를 두고 경쟁하는 선수와 대화한다.',['라이벌','경쟁자','주전 경쟁','포지션 경쟁','도발']]
 ]},
 family:{title:'가족과의 시간',category:'family',items:[
  ['가족과 식사한다','가족과 한자리에 모여 식사한다.',['가족','식사','저녁','밥상']],
  ['아버지와 대화한다','아버지와 야구와 미래를 이야기한다.',['아버지','부친']],
  ['어머니와 외출한다','어머니와 장을 보거나 가까운 곳에 다녀온다.',['어머니','엄마','장보기','외출']],
  ['가족과 나들이를 간다','가족과 함께 짧은 나들이를 떠난다.',['가족','나들이','여행','외출']]
 ]},
 friend:{title:'친구 만나기',category:'friend',items:[
  ['PC방에 간다','친구와 게임을 하며 스트레스를 푼다.',['PC방','게임','친구']],
  ['카페에서 이야기한다','친구와 근황과 고민을 나눈다.',['카페','대화','고민','친구']],
  ['영화를 본다','친구와 영화를 보며 평범한 하루를 보낸다.',['영화','극장','친구']],
  ['산책하거나 외출한다','친구와 거리를 걷거나 가까운 곳에 다녀온다.',['산책','외출','친구','거리']]
 ]},
 sns:{title:'SNS 확인',category:'sns',items:[
  ['게시물을 올린다','훈련과 일상 사진을 SNS에 올린다.',['SNS','게시물','업로드','사진','팔로워']],
  ['팬 반응을 확인한다','팬들의 댓글과 반응을 살펴본다.',['팬','댓글','반응','SNS']],
  ['지인 게시물을 확인한다','친구와 지인들의 최근 소식을 확인한다.',['지인','게시물','SNS','친구']],
  ['SNS 활동을 쉰다','휴대폰을 내려놓고 SNS에서 잠시 벗어난다.',['SNS','휴식','휴대폰']]
 ]}
};

const ACTIONS=[
 ['train','훈련하기','능력치와 경기 감각을 성장시킨다','⚾'],
 ['rest','휴식하기','체력과 컨디션을 회복한다','🛏'],
 ['school','학교생활','수업·동아리·진로·휴식','🏫'],
 ['team','팀 동료·감독','감독·코치·동료·경쟁자','🧢'],
 ['family','가족과의 시간','가족 관계와 일상 이벤트','🏠'],
 ['friend','친구 만나기','친구와 스트레스를 해소한다','🤝'],
 ['romance','연애·데이트','관계가 열린 인물을 만난다','❤'],
 ['sns','SNS 확인','게시물과 팬 반응을 확인한다','📱']
];
const NAV=[
 ['hub','홈','⌂'],['train','훈련','⚾'],['relations','관계','👥'],['info','정보','▣'],['endings','도감','▤'],['settings','설정','⚙']
];

function deepest(){try{let w=frame.contentWindow;for(let i=0;i<32;i++){const f=w?.document?.getElementById('game');if(!f?.contentWindow)break;w=f.contentWindow;}return w}catch(e){return null}}
function el(w,tag,cls,children){const n=w.document.createElement(tag);if(cls)n.className=cls;(Array.isArray(children)?children:[children]).filter(v=>v!==undefined&&v!==null).forEach(v=>n.append(v?.nodeType?v:w.document.createTextNode(String(v))));return n}
function btn(w,cls,children,fn){const b=el(w,'button',cls,children);b.type='button';if(fn)b.addEventListener('click',fn);return b}
function val(obj,key,fallback=0){const v=obj?.[key];return Number.isFinite(Number(v))?Math.round(Number(v)):fallback}
function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0))}
function stageName(w,id){return w.GameData?.STAGES?.find(x=>x.id===id)?.name||id||''}
function positionName(w,id){return w.GameData?.POSITIONS?.find(x=>x.id===id)?.name||id||''}
function overall(w,state){try{return Math.round(w.Game?.Careers?.overallSkill?.(state)||62)}catch(e){return 62}}
function sceneAsset(section){return ASSETS.backgrounds[section]||ASSETS.backgrounds.home}
function charAsset(section){return section==='training'?ASSETS.characters.training:section==='home'?ASSETS.characters.school:ASSETS.characters.casual}
function clear(w){w.document.body.className='ei-published';return w.UI.clear()}
function navFn(w,id){return {hub:()=>w.UI.showHub(),train:()=>w.UI.showTrainingMenu(),relations:()=>w.UI.showRelations(),info:()=>w.UI.showPlayerInfo(),endings:()=>w.UI.showCollectionHub(),settings:()=>w.UI.showSettingsScreen()}[id]}
function renderNav(w,active='hub'){
 const nav=el(w,'nav','ei-nav');
 NAV.forEach(([id,label,icon])=>nav.append(btn(w,'ei-nav-btn'+(id===active?' is-active':''),[
  el(w,'span','ei-nav-icon',icon),el(w,'span','ei-nav-label',label)
 ],navFn(w,id))));
 return nav;
}
function radar(points){const cx=50,cy=50,r=38;return points.map((v,i)=>{const a=(-90+i*72)*Math.PI/180,rr=r*clamp(v)/100;return `${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`}).join(' ')}
function progress(w,label,value,max=100,tone='blue'){
 const pct=clamp((Number(value)||0)/Math.max(1,max)*100);
 return el(w,'div','ei-progress',[el(w,'div','ei-progress-top',[el(w,'span','',label),el(w,'b','',Math.round(Number(value)||0))]),el(w,'div','ei-progress-track',[Object.assign(el(w,'i','ei-progress-fill '+tone),{style:`width:${pct}%`})])]);
}
function pageHeader(w,title,kicker='PLAYER MENU',subtitle='',back=()=>w.UI.showHub()){
 return el(w,'header','ei-page-head',[btn(w,'ei-back','‹',back),el(w,'div','',[el(w,'small','',kicker),el(w,'h1','',title),subtitle?el(w,'p','',subtitle):null])]);
}
function sceneStrip(w,section,title,subtitle){
 return el(w,'section','ei-page-scene',[Object.assign(el(w,'img','ei-page-bg'),{src:sceneAsset(section),alt:''}),Object.assign(el(w,'img','ei-page-character'),{src:charAsset(section),alt:'주인공'}),el(w,'div','ei-page-scene-copy',[el(w,'small','',title),el(w,'strong','',subtitle)])]);
}
function pageShell(w,{title,kicker,subtitle,active,section='home',back,sceneTitle,sceneSubtitle}){
 const root=clear(w),page=el(w,'main','ei-page');
 page.append(pageHeader(w,title,kicker,subtitle,back),sceneStrip(w,section,sceneTitle||title,sceneSubtitle||''));
 root.append(page);page.append(renderNav(w,active));
 return {root,page,content:page};
}
function recordLine(w,rec,group){
 rec=rec||{};
 if(group==='pitcher')return `${rec.pGames||0}경기 · ${rec.wins||0}승 ${rec.losses||0}패 · ${rec.saves||0}세이브 ${rec.holds||0}홀드 · ERA ${rec.era||'0.00'} · WHIP ${rec.whip||'0.00'} · 탈삼진 ${rec.strikeoutsPitched||0}`;
 return `${rec.games||0}경기 · 타율 ${rec.avg||'.000'} · 출루율 ${rec.obp||'.000'} · 장타율 ${rec.slg||'.000'} · OPS ${rec.ops||'.000'} · ${rec.hr||0}홈런 ${rec.rbi||0}타점 ${rec.stolenBases||0}도루`;
}
function actionFn(w,key){if(key==='train')return()=>w.UI.showTrainingMenu();if(key==='rest')return()=>w.UI.showRestMenu();if(key==='romance')return()=>w.UI.showRomanceMenu();return()=>showLife(w,key)}

function renderHome(w){
 const state=w.Game.state;if(!state)return;
 const p=state.player,c=p.condition||{},root=clear(w),shell=el(w,'main','ei-home');
 const top=el(w,'header','ei-top-ribbon',[el(w,'div','ei-date',[el(w,'b','',`${p.date?.year||1}년차`),el(w,'strong','',`${p.date?.month||1}월 ${p.date?.day||1}일`)]),el(w,'div','ei-stage',`${stageName(w,p.stageId)} · ${positionName(w,p.primaryPos)}`)]);
 const visual=el(w,'div','ei-visual-layer',[Object.assign(el(w,'img','ei-scene-bg'),{src:ASSETS.backgrounds.home,alt:''}),Object.assign(el(w,'img','ei-character'),{src:ASSETS.characters.school,alt:'주인공 캐릭터'})]);
 const stats=[val(c,'energy',50),val(c,'health',50),val(c,'morale',50),val(c,'gameSense',50),Math.max(0,100-val(c,'fatigue',0))];
 const info=el(w,'div','ei-profile-info',[el(w,'div','ei-name-row',[el(w,'h1','',p.name||'선수'),el(w,'div','ei-ovr',[el(w,'small','','OVR'),el(w,'b','',overall(w,state))])]),el(w,'ul','ei-facts',[el(w,'li','',`🎓 ${p.age||16}세`),el(w,'li','',`🧢 ${p.school||p.team||'야구부'}`),el(w,'li','',`🧤 ${positionName(w,p.primaryPos)}`),el(w,'li','',`🛡 ${stageName(w,p.stageId)}`)]),el(w,'div','ei-radar-wrap'),el(w,'div','ei-injury',[el(w,'span','','🛡 부상 위험'),el(w,'b','',val(c,'injuryRisk',0))])]);
 const svg=w.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.classList.add('ei-radar-svg');
 [100,75,50,25].forEach(pc=>{const poly=w.document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',radar([pc,pc,pc,pc,pc]));poly.setAttribute('class','ei-radar-grid');svg.append(poly)});
 const poly=w.document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',radar(stats));poly.setAttribute('class','ei-radar-value');svg.append(poly);
 info.querySelector('.ei-radar-wrap').replaceChildren(svg,el(w,'div','ei-radar-labels',[el(w,'span','','에너지'),el(w,'span','','건강'),el(w,'span','','사기'),el(w,'span','','경기감각'),el(w,'span','','회복')]));
 const scene=el(w,'section','ei-profile-scene',[visual,info]);
 let next=null,schedule=null;try{next=w.Game.League.nextDirectGameIn(state);schedule=w.Game.League.ensureSeason(state)}catch(e){}
 const scheduleBar=el(w,'section','ei-schedule',[el(w,'span','ei-ball','⚾'),el(w,'strong','',`다음 직접 경기까지 ${Number.isFinite(next)?next:'-'}일`),el(w,'span','',`팀 ${schedule?.teamWins||0}승 ${schedule?.teamLosses||0}패`)]);
 const grid=el(w,'section','ei-action-grid');
 ACTIONS.forEach(([key,title,sub,icon])=>grid.append(btn(w,'ei-action-card',[el(w,'span','ei-action-art',icon),el(w,'span','ei-action-copy',[el(w,'b','',title),el(w,'small','',sub)]),el(w,'i','','›')],actionFn(w,key))));
 grid.append(btn(w,'ei-next-game',[el(w,'span','','⚾'),el(w,'b','','다음 경기까지'),el(w,'strong','','›››')],()=>w.UI.passTime()));
 shell.append(top,scene,scheduleBar,grid,renderNav(w,'hub'));root.append(shell);
}

function renderTraining(w){
 const state=w.Game.state,p=state.player,group=w.GameData.POSITIONS.find(x=>x.id===p.primaryPos)?.group;
 const {page}=pageShell(w,{title:'훈련',kicker:'TRAINING PROGRAM',subtitle:'현재 컨디션과 포지션에 맞는 훈련을 선택합니다.',active:'train',section:'training',sceneTitle:'TODAY TRAINING',sceneSubtitle:`에너지 ${val(p.condition,'energy')} · 부상 위험 ${val(p.condition,'injuryRisk')}`});
 const groups=[['common','공통 훈련'],['batter','타자 훈련'],['pitcher','투수 훈련'],['position','포지션별 훈련']];
 const body=el(w,'section','ei-published-body');
 groups.forEach(([id,label])=>{
  if(id==='batter'&&group==='pitcher')return;if(id==='pitcher'&&group==='fielder')return;
  const items=(w.GameData.TRAININGS||[]).filter(t=>t.group===id);if(!items.length)return;
  body.append(el(w,'h2','ei-section-title',label));
  const cards=el(w,'div','ei-menu-grid');
  items.forEach(t=>cards.append(btn(w,'ei-menu-card',[el(w,'span','ei-menu-icon',t.intensity==='high'?'🔥':'⚾'),el(w,'span','ei-menu-copy',[el(w,'b','',t.name),el(w,'small','',`에너지 -${t.energyCost||0}${t.intensity==='high'?' · 고강도':''}`)]),el(w,'i','','›')],()=>w.UI.doTraining(t.id))));
  body.append(cards);
 });
 page.insertBefore(body,page.lastChild);
}
function renderRest(w){
 const p=w.Game.state.player,{page}=pageShell(w,{title:'휴식',kicker:'RECOVERY PROGRAM',subtitle:'체력과 건강을 회복할 방법을 선택합니다.',active:'train',section:'training',sceneTitle:'RECOVERY DAY',sceneSubtitle:`에너지 ${val(p.condition,'energy')} · 건강 ${val(p.condition,'health')}`});
 const cards=el(w,'section','ei-menu-grid ei-published-body');
 (w.GameData.RESTS||[]).forEach(r=>cards.append(btn(w,'ei-menu-card',[el(w,'span','ei-menu-icon','🛏'),el(w,'span','ei-menu-copy',[el(w,'b','',r.name),el(w,'small','',`에너지 +${r.energyGain||0}`)]),el(w,'i','','›')],()=>w.UI.doRest(r.id))));
 page.insertBefore(cards,page.lastChild);
}

function eventText(ev){return [ev?.title,ev?.desc,ev?.line,ev?.role,ev?.targetRole,ev?.characterId].filter(Boolean).join(' ')}
function fallback(key){const effects=key==='team'?{'condition.trustCoach':2,'condition.teamStanding':1}:{'condition.morale':2,'condition.stress':-2};return{id:'pub_'+key+'_'+Date.now(),title:LIFE[key].title,category:LIFE[key].category,desc:'선택한 활동을 통해 하루의 관계와 컨디션이 조금 달라진다.',choices:[{text:'적극적으로 참여한다',effects,result:'오늘의 선택을 끝까지 이어갔다.'},{text:'균형을 지킨다',effects:{'condition.focus':1},result:'무리하지 않고 균형을 지켰다.'},{text:'잠시 쉬어 간다',effects:{'condition.energy':2},result:'잠시 숨을 고르며 하루를 마쳤다.'}]}}
function pickEvent(w,key,words){let pool=[];try{pool=w.Game.Events.eligible(w.Game.state,LIFE[key].category)||[]}catch(e){}const related=pool.filter(ev=>words.some(x=>eventText(ev).includes(x)));return related[Math.floor(Math.random()*related.length)]||fallback(key)}
function showLife(w,key){
 const spec=LIFE[key],{page}=pageShell(w,{title:spec.title,kicker:'CONNECTED EVENT',subtitle:'선택한 대상과 활동에 맞는 이벤트만 발생합니다.',active:'relations',section:'relations',sceneTitle:spec.title,sceneSubtitle:'관계와 일상을 선택하는 시간'});
 const grid=el(w,'section','ei-life-grid ei-published-body');
 spec.items.forEach(([title,desc,words])=>grid.append(btn(w,'ei-life-card',[el(w,'b','',title),el(w,'small','',desc),el(w,'i','','›')],()=>{
  [...grid.querySelectorAll('button')].forEach(b=>b.disabled=true);
  if(key!=='team'&&typeof w.Game.state.player.condition?.gameSense==='number')w.Game.state.player.condition.gameSense=Math.max(0,w.Game.state.player.condition.gameSense-1);
  showEvent(w,pickEvent(w,key,words),()=>{try{w.Game.Time.advancePart(w.Game.state);w.Game.Save.autosave(w.Game.state)}catch(e){}w.UI.showHub()},'relations');
 })));
 page.insertBefore(grid,page.lastChild);
}
function showEvent(w,event,onDone,active='relations'){
 const root=clear(w),page=el(w,'main','ei-page ei-event-page');
 page.append(pageHeader(w,event.title||'이벤트','CONNECTED EVENT',event.desc||'',()=>w.UI.showHub()));
 const choices=el(w,'section','ei-choice-list');let locked=false;
 (event.choices||[]).forEach((c,i)=>choices.append(btn(w,'ei-choice',[el(w,'b','',c.text),el(w,'i','','›')],()=>{
  if(locked)return;locked=true;[...choices.querySelectorAll('button')].forEach(b=>b.disabled=true);
  try{const result=w.Game.Events.resolveChoice(w.Game.state,event,i);showResult(w,event.title,[result.text,...(result.changeLog||[])],onDone,active)}catch(e){locked=false;[...choices.querySelectorAll('button')].forEach(b=>b.disabled=false);w.UI.toast('이벤트 처리 중 오류가 발생했습니다.')}
 })));
 page.append(sceneStrip(w,'relations','EVENT SCENE',event.title||''),choices,renderNav(w,active));root.append(page);
}
function showResult(w,title,lines,onDone,active='hub'){
 const root=clear(w),page=el(w,'main','ei-page ei-result-page');
 page.append(pageHeader(w,title||'결과','EVENT RESULT','선택 결과가 능력치와 관계에 반영되었습니다.',()=>{}),sceneStrip(w,active==='train'?'training':'relations','RESULT',title||''),el(w,'section','ei-result-list',(lines||[]).filter(Boolean).map(x=>el(w,'div','ei-result-line',x))),btn(w,'ei-confirm','확인',onDone),renderNav(w,active));root.append(page);
}

function renderRelations(w){
 const {page}=pageShell(w,{title:'관계',kicker:'RELATIONSHIP',subtitle:'가족·친구·팀 인물과의 관계를 확인합니다.',active:'relations',section:'relations',sceneTitle:'RELATIONSHIP MAP',sceneSubtitle:'신뢰와 친밀도가 이벤트를 바꿉니다.'});
 const body=el(w,'section','ei-published-body');
 body.append(btn(w,'ei-feature-card',[el(w,'span','ei-feature-icon','❤'),el(w,'span','ei-menu-copy',[el(w,'b','','연애·데이트'),el(w,'small','','현재 만날 수 있는 인물과 관계 단계를 확인합니다.')]),el(w,'i','','›')],()=>w.UI.showRomanceMenu()));
 const list=el(w,'div','ei-relation-grid');
 (w.GameData.NPCS||[]).forEach(n=>{const r=w.Game.state.relationships?.[n.id]||{};list.append(el(w,'article','ei-relation-card',[el(w,'div','ei-relation-head',[el(w,'div','ei-avatar',String(n.name||'?').slice(0,1)),el(w,'div','',[el(w,'b','',n.name),el(w,'small','',n.desc||n.relType||'')])]),progress(w,'친밀도',(Number(r.affinity)||0)+100,200,'cyan'),progress(w,'신뢰',(Number(r.trust)||0)+100,200,'yellow')]))});
 body.append(el(w,'h2','ei-section-title','인간관계'),list);page.insertBefore(body,page.lastChild);
}
function renderRomance(w){
 const {page}=pageShell(w,{title:'연애·데이트',kicker:'ROMANCE ROUTE',subtitle:'인물을 선택하면 현재 관계 단계에 맞는 이벤트가 발생합니다.',active:'relations',section:'relations',sceneTitle:'ROMANCE',sceneSubtitle:'선택과 관계도에 따라 루트가 달라집니다.'});
 const grid=el(w,'section','ei-character-grid ei-published-body');
 (w.GameData.ROMANCE_CHARS||[]).forEach(c=>{const r=w.Game.state.romance?.[c.id]||{},stage=w.GameData.ROMANCE_OUTCOMES?.[r.stage]?.name||r.stage||'미발견';grid.append(btn(w,'ei-character-card',[el(w,'div','ei-character-portrait',String(c.name||'?').slice(0,1)),el(w,'div','ei-character-copy',[el(w,'b','',`${c.name} · ${c.archetype||''}`),el(w,'small','',c.role||''),el(w,'strong','',`관계 단계: ${stage}`)]),el(w,'i','','›')],()=>w.UI.doRomanceVisit(c.id)))});
 page.insertBefore(grid,page.lastChild);
}

function renderInfo(w){
 const state=w.Game.state,p=state.player,group=w.GameData.POSITIONS.find(x=>x.id===p.primaryPos)?.group;
 const {page}=pageShell(w,{title:'선수 정보',kicker:'PLAYER DATA',subtitle:'능력치·기록·커리어 상태를 확인합니다.',active:'info',section:'info',sceneTitle:p.name||'PLAYER',sceneSubtitle:`${positionName(w,p.primaryPos)} · OVR ${overall(w,state)}`});
 const body=el(w,'section','ei-published-body');
 const summary=el(w,'div','ei-info-summary',[el(w,'div','ei-info-ovr',[el(w,'small','','OVR'),el(w,'b','',overall(w,state))]),el(w,'dl','ei-summary-list',[el(w,'div','',[el(w,'dt','','이름'),el(w,'dd','',p.name)]),el(w,'div','',[el(w,'dt','','소속'),el(w,'dd','',p.team)]),el(w,'div','',[el(w,'dt','','포지션'),el(w,'dd','',positionName(w,p.primaryPos))]),el(w,'div','',[el(w,'dt','','단계'),el(w,'dd','',stageName(w,p.stageId))]),el(w,'div','',[el(w,'dt','','스타일'),el(w,'dd','',p.playStyle||'-')]),el(w,'div','',[el(w,'dt','','약점'),el(w,'dd','',p.weakness||'-')])])]);
 body.append(summary,el(w,'h2','ei-section-title','이번 시즌 기록'),el(w,'div','ei-record-card',recordLine(w,p.season,group)),el(w,'h2','ei-section-title','통산 기록'),el(w,'div','ei-record-card',recordLine(w,p.record,group)));
 const tabs=el(w,'div','ei-tabs'),panel=el(w,'div','ei-stat-panel');
 const groups=[['skill',group==='pitcher'?'투수 능력':'타자 능력'],['condition','현재 컨디션'],['physical','신체·성향']];
 const draw=id=>{panel.replaceChildren();[...tabs.children].forEach(x=>x.classList.toggle('is-active',x.dataset.id===id));let keys=[],src={};if(id==='condition'){keys=w.GameData.CONDITION_STATS||[];src=p.condition||{}}else if(id==='physical'){keys=w.GameData.PHYSICAL_STATS||[];src=p.stats?.physical||{}}else{keys=group==='pitcher'?(w.GameData.PITCHING_STATS||[]):(w.GameData.BATTING_STATS||[]);src=group==='pitcher'?p.stats?.pitching||{}:p.stats?.batting||{}}keys.forEach(k=>panel.append(progress(w,w.GameData.STAT_LABELS?.[k]||k,val(src,k),100,id==='condition'?'cyan':id==='physical'?'yellow':'blue')))};
 groups.forEach(([id,label])=>{const b=btn(w,'ei-tab',label,()=>draw(id));b.dataset.id=id;tabs.append(b)});body.append(tabs,panel);draw('skill');page.insertBefore(body,page.lastChild);
}

function renderCollection(w){
 const progressData=w.Game.Meta.collectionProgress(),endingCount=w.Game.state?.endingHistory?.length||0;
 const {page}=pageShell(w,{title:'도감',kicker:'COLLECTION',subtitle:'발견한 인물과 엔딩 기록을 확인합니다.',active:'endings',section:'collection',sceneTitle:'COLLECTION',sceneSubtitle:`인물 ${progressData.discovered}/${progressData.total} · 엔딩 ${endingCount}`});
 const body=el(w,'section','ei-collection-grid ei-published-body');
 body.append(btn(w,'ei-collection-card',[el(w,'span','ei-collection-icon','👥'),el(w,'span','ei-menu-copy',[el(w,'b','','인물 도감'),el(w,'small','',`발견 ${progressData.discovered}/${progressData.total}`)]),el(w,'i','','›')],()=>w.UI.showCharacterCodex()),btn(w,'ei-collection-card',[el(w,'span','ei-collection-icon','🏆'),el(w,'span','ei-menu-copy',[el(w,'b','','엔딩 도감'),el(w,'small','',`발견한 엔딩 ${endingCount}개`)]),el(w,'i','','›')],()=>w.UI.showEndingGallery()));
 page.insertBefore(body,page.lastChild);
}
function renderCharacters(w){
 const data=w.Game.Meta.collectionProgress(),{page}=pageShell(w,{title:'인물 도감',kicker:'CHARACTER CODEX',subtitle:`발견 ${data.discovered}/${data.total}`,active:'endings',section:'collection',back:()=>w.UI.showCollectionHub(),sceneTitle:'CHARACTERS',sceneSubtitle:'만남과 이벤트가 도감을 해금합니다.'});
 const grid=el(w,'section','ei-character-grid ei-published-body');
 (w.GameData.CHARACTER_REGISTRY||[]).forEach(c=>{const entry=data.meta?.characters?.[c.id],open=!!entry?.discovered;grid.append(el(w,'article','ei-character-card '+(open?'':'is-locked'),[el(w,'div','ei-character-portrait',open?String(c.name).slice(0,1):'?'),el(w,'div','ei-character-copy',[el(w,'b','',open?c.name:'???'),el(w,'small','',open?`${c.role} · 해금 단계 ${entry.level||1}`:'아직 만나지 못한 인물'),open?el(w,'strong','',`만난 횟수 ${entry.encounters||1}`):null])]))});
 page.insertBefore(grid,page.lastChild);
}
function renderEndings(w){
 const list=w.Game.state?.endingHistory||[],{page}=pageShell(w,{title:'엔딩 도감',kicker:'ENDING GALLERY',subtitle:`발견한 엔딩 ${list.length}개`,active:'endings',section:'collection',back:()=>w.UI.showCollectionHub(),sceneTitle:'ENDING ARCHIVE',sceneSubtitle:'커리어와 인생의 결말을 기록합니다.'});
 const body=el(w,'section','ei-published-body ei-ending-grid');
 if(!list.length)body.append(el(w,'div','ei-empty','아직 발견한 엔딩이 없습니다.'));
 list.forEach(e=>body.append(el(w,'article','ei-ending-card',[el(w,'b','',e.title),el(w,'small','',`${e.romanceOutcome||''} · ${e.postCareerPath||''}`)])));
 page.insertBefore(body,page.lastChild);
}

function renderSettings(w){
 const {page}=pageShell(w,{title:'설정',kicker:'OPTIONS',subtitle:'저장과 게임 진행 옵션을 관리합니다.',active:'settings',section:'settings',sceneTitle:'GAME OPTIONS',sceneSubtitle:'현재 세이브 데이터는 그대로 유지됩니다.'});
 const body=el(w,'section','ei-menu-grid ei-published-body');
 body.append(btn(w,'ei-menu-card',[el(w,'span','ei-menu-icon','💾'),el(w,'span','ei-menu-copy',[el(w,'b','','수동 저장'),el(w,'small','','5개 슬롯에 현재 진행 상황을 저장합니다.')]),el(w,'i','','›')],()=>w.UI.showManualSaveSlots()),btn(w,'ei-menu-card',[el(w,'span','ei-menu-icon','↩'),el(w,'span','ei-menu-copy',[el(w,'b','','타이틀로 돌아가기'),el(w,'small','','현재 화면을 종료하고 타이틀로 이동합니다.')]),el(w,'i','','›')],()=>w.UI.showTitle()),btn(w,'ei-menu-card ei-danger',[el(w,'span','ei-menu-icon','🏁'),el(w,'span','ei-menu-copy',[el(w,'b','','지금 은퇴하고 엔딩 보기'),el(w,'small','','현재 커리어를 종료하고 엔딩을 계산합니다.')]),el(w,'i','','›')],()=>{if(w.confirm('정말로 지금 커리어를 마무리하시겠습니까?')){w.Game.state.flags.add('force_ending');w.UI.showEndingScreen()}}));
 page.insertBefore(body,page.lastChild);
}
function renderSaveSlots(w){
 const slots=w.Game.Save.listSlots(),{page}=pageShell(w,{title:'수동 저장',kicker:'SAVE DATA',subtitle:'현재 진행 상황을 원하는 슬롯에 저장합니다.',active:'settings',section:'settings',back:()=>w.UI.showSettingsScreen(),sceneTitle:'SAVE SLOTS',sceneSubtitle:'기존 자동저장과 이어하기 데이터는 유지됩니다.'});
 const body=el(w,'section','ei-save-grid ei-published-body');
 ['slot1','slot2','slot3','slot4','slot5'].forEach(id=>{const found=slots.find(s=>s.id===id);body.append(el(w,'article','ei-save-card',[el(w,'div','',[el(w,'b','',found?`${found.meta?.name||'선수'} · ${found.meta?.stage||''}`:'빈 슬롯'),el(w,'small','',found?.meta?.date||id)]),btn(w,'ei-save-button',found?'덮어쓰기':'저장',()=>{w.Game.Save.saveToSlot(id,w.Game.state,{name:w.Game.state.player.name,stage:stageName(w,w.Game.state.player.stageId),date:`${w.Game.state.player.date.year}년차 ${w.Game.state.player.date.month}월 ${w.Game.state.player.date.day}일`});w.UI.toast('저장했습니다.');renderSaveSlots(w)})]))});
 page.insertBefore(body,page.lastChild);
}

function installCSS(w){if(w.document.getElementById('ei-publisher-style'))return;const s=w.document.createElement('style');s.id='ei-publisher-style';s.textContent=`
*{box-sizing:border-box}body.ei-published{margin:0;background:#061b43;color:#061b43;font-family:'Noto Sans KR',system-ui,sans-serif}.ei-published #app{min-height:100vh;padding:0!important}.ei-home,.ei-page{position:relative;width:min(100%,480px);min-height:100vh;margin:0 auto;padding-bottom:96px;background:#eef6ff;overflow:hidden}.ei-top-ribbon{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:linear-gradient(135deg,#06377f,#0b59aa);color:#fff;border-bottom:7px solid #fff;box-shadow:0 5px 0 #ef334b}.ei-date b{display:block;color:#ffd323;font-size:15px}.ei-date strong{font-size:34px;line-height:1}.ei-stage{font-weight:900}.ei-profile-scene{display:grid;grid-template-columns:52% 48%;min-height:370px;background:#fff;border-bottom:5px solid #0a3d88}.ei-visual-layer{position:relative;overflow:hidden;border-right:3px solid #0a3d88}.ei-scene-bg,.ei-character{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ei-character{object-fit:contain;object-position:center bottom;z-index:2}.ei-profile-info{position:relative;padding:18px 14px 12px}.ei-name-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.ei-name-row h1{margin:10px 0 0;font-size:32px}.ei-ovr,.ei-info-ovr{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle,#0c5db2,#032a6d);color:#fff;border:6px double #fff;box-shadow:0 0 0 4px #0b3f8e;flex:0 0 auto}.ei-ovr small,.ei-info-ovr small{font-weight:900}.ei-ovr b,.ei-info-ovr b{font-size:34px;line-height:1}.ei-facts{list-style:none;margin:14px 0 8px;padding:0;display:grid;gap:5px;font-weight:900}.ei-radar-wrap{position:relative;min-height:165px}.ei-radar-svg{width:100%;height:140px}.ei-radar-grid{fill:none;stroke:#aac8e8;stroke-width:1}.ei-radar-value{fill:#24b9d5aa;stroke:#0874bd;stroke-width:2}.ei-radar-labels{position:absolute;inset:0;font-size:9px;font-weight:900}.ei-radar-labels span:nth-child(1){position:absolute;top:0;left:42%}.ei-radar-labels span:nth-child(2){position:absolute;top:42%;right:0}.ei-radar-labels span:nth-child(3){position:absolute;bottom:4px;right:12%}.ei-radar-labels span:nth-child(4){position:absolute;bottom:4px;left:2%}.ei-radar-labels span:nth-child(5){position:absolute;top:42%;left:0}.ei-injury{display:flex;justify-content:space-between;border:2px solid #0b3f8e;padding:8px 10px;font-weight:900}.ei-injury b{color:#148743;font-size:22px}.ei-schedule{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;border-bottom:5px solid #ef334b;font-weight:900}.ei-schedule strong{font-size:18px}.ei-ball{font-size:30px}.ei-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;background:#e6f1ff}.ei-action-card,.ei-menu-card,.ei-feature-card,.ei-collection-card{display:grid;grid-template-columns:54px 1fr 18px;align-items:center;min-height:84px;padding:10px;border:3px solid #0b3f8e;background:linear-gradient(155deg,#fff 0 74%,#e7f1ff 74%);box-shadow:0 5px 0 #03183e;color:#061b43;text-align:left}.ei-action-art,.ei-menu-icon,.ei-feature-icon,.ei-collection-icon{font-size:34px}.ei-action-copy,.ei-menu-copy{display:grid}.ei-action-copy b,.ei-menu-copy b{font-size:16px}.ei-action-copy small,.ei-menu-copy small{font-size:10px;color:#677996;line-height:1.35}.ei-action-card i,.ei-menu-card i,.ei-feature-card i,.ei-collection-card i,.ei-life-card i,.ei-choice i,.ei-character-card i{color:#ef334b;font-size:28px;font-style:normal}.ei-next-game{grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:13px;min-height:72px;border:4px solid #fff;outline:3px solid #0b3f8e;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;font-size:22px;font-weight:1000;box-shadow:0 5px 0 #03183e}.ei-next-game strong{color:#ffd323;font-size:30px}.ei-nav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,480px);height:88px;display:grid;grid-template-columns:repeat(6,1fr);background:linear-gradient(#0b438d,#031e51);border-top:4px solid #fff;box-shadow:0 -4px 0 #ef334b;z-index:100}.ei-nav-btn{position:relative;border:0;background:transparent;color:#fff;display:grid;place-items:center;align-content:center;gap:1px}.ei-nav-btn:not(:last-child)::after{content:'';position:absolute;right:0;top:14px;bottom:14px;width:1px;background:#4d82bd}.ei-nav-icon{font-size:28px}.ei-nav-label{font-size:11px;font-weight:1000}.ei-nav-btn.is-active .ei-nav-label{color:#ffd323}.ei-nav-btn.is-active::before{content:'';position:absolute;bottom:0;left:13px;right:13px;height:5px;background:#ffd323}.ei-page-head{display:flex;gap:12px;align-items:flex-start;padding:17px 16px;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;border-bottom:6px solid #ffd323;box-shadow:0 5px 0 #ef334b}.ei-page-head small{color:#ffd323;font-weight:900;letter-spacing:.12em}.ei-page-head h1{margin:2px 0 5px;font-size:28px}.ei-page-head p{margin:0;font-size:12px;line-height:1.45}.ei-back{border:3px solid #fff;background:transparent;color:#fff;font-size:30px;width:48px;height:48px;flex:0 0 auto}.ei-page-scene{position:relative;height:176px;overflow:hidden;border-bottom:4px solid #0b3f8e}.ei-page-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ei-page-character{position:absolute;right:4%;bottom:0;height:96%;max-width:42%;object-fit:contain}.ei-page-scene::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(3,24,62,.9),rgba(3,24,62,.18) 65%,transparent)}.ei-page-scene-copy{position:absolute;left:18px;bottom:20px;z-index:2;color:#fff;display:grid}.ei-page-scene-copy small{color:#ffd323;font-weight:900;letter-spacing:.12em}.ei-page-scene-copy strong{font-size:22px;max-width:270px}.ei-published-body{padding:18px 14px 110px}.ei-section-title{margin:10px 0 12px;color:#07377f;font-size:18px;border-left:6px solid #ef334b;padding-left:9px}.ei-menu-grid,.ei-life-grid,.ei-choice-list,.ei-relation-grid,.ei-character-grid,.ei-collection-grid,.ei-save-grid,.ei-ending-grid{display:grid;gap:12px}.ei-menu-card,.ei-feature-card,.ei-collection-card{width:100%}.ei-menu-card.ei-danger{border-color:#b82b38}.ei-life-card,.ei-choice{display:grid;grid-template-columns:1fr 24px;align-items:center;min-height:92px;padding:16px;border:3px solid #0b3f8e;background:linear-gradient(155deg,#fff 0 74%,#e7f1ff 74%);box-shadow:0 5px 0 #03183e;color:#061b43;text-align:left}.ei-life-card b,.ei-choice b{font-size:18px}.ei-life-card small{grid-column:1/2;margin-top:7px;color:#667896}.ei-life-card:disabled,.ei-choice:disabled{opacity:.55}.ei-result-list{display:grid;gap:10px;padding:18px 14px}.ei-result-line,.ei-record-card{border:3px solid #0b3f8e;background:#fff;padding:13px;box-shadow:0 4px 0 #03183e;font-weight:800}.ei-confirm{display:block;width:calc(100% - 28px);margin:0 14px 112px;min-height:58px;border:3px solid #03183e;background:linear-gradient(#176bc2,#073e8b);color:#fff;font-size:18px;font-weight:1000;box-shadow:0 4px 0 #03183e}.ei-relation-card,.ei-ending-card,.ei-save-card{border:3px solid #0b3f8e;background:#fff;padding:13px;box-shadow:0 4px 0 #03183e}.ei-relation-head{display:flex;align-items:center;gap:11px;margin-bottom:10px}.ei-avatar,.ei-character-portrait{display:grid;place-items:center;width:54px;height:54px;border-radius:50%;background:linear-gradient(#0c62b8,#053177);color:#fff;border:4px double #fff;box-shadow:0 0 0 2px #0b3f8e;font-weight:1000;font-size:22px;flex:0 0 auto}.ei-relation-head>div:last-child,.ei-character-copy{display:grid}.ei-relation-head small,.ei-character-copy small{color:#687a96}.ei-progress{display:grid;gap:4px;margin-top:8px}.ei-progress-top{display:flex;justify-content:space-between;font-size:11px;font-weight:900}.ei-progress-track{height:10px;background:#d9e5f3;border:1px solid #0b3f8e;overflow:hidden}.ei-progress-fill{display:block;height:100%;background:#1373c7}.ei-progress-fill.cyan{background:#18b9c9}.ei-progress-fill.yellow{background:#f2b328}.ei-character-grid{grid-template-columns:1fr 1fr}.ei-character-card{display:grid;grid-template-columns:60px 1fr 20px;align-items:center;gap:10px;border:3px solid #0b3f8e;background:#fff;padding:13px;color:#061b43;text-align:left;box-shadow:0 4px 0 #03183e}.ei-character-card.is-locked{filter:grayscale(1);opacity:.66}.ei-character-copy strong{margin-top:5px;color:#0a4b93;font-size:11px}.ei-info-summary{display:flex;align-items:center;gap:18px;border:3px solid #0b3f8e;background:#fff;padding:14px;box-shadow:0 5px 0 #03183e}.ei-summary-list{margin:0;display:grid;gap:4px;flex:1}.ei-summary-list div{display:flex;justify-content:space-between;gap:12px}.ei-summary-list dt{color:#687a96;font-size:11px}.ei-summary-list dd{margin:0;font-weight:900;text-align:right}.ei-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:18px}.ei-tab{min-height:44px;border:2px solid #0b3f8e;background:#fff;color:#061b43;font-weight:900}.ei-tab.is-active{background:#0b4f9f;color:#fff}.ei-stat-panel{display:grid;gap:9px;border:3px solid #0b3f8e;background:#fff;padding:13px}.ei-save-card{display:flex;justify-content:space-between;align-items:center;gap:12px}.ei-save-card>div{display:grid}.ei-save-card small{color:#687a96}.ei-save-button{min-width:92px;min-height:44px;border:2px solid #03183e;background:#0b55a6;color:#fff;font-weight:900}.ei-ending-card{display:grid;gap:4px}.ei-ending-card small{color:#687a96}.ei-empty{border:3px dashed #7fa5cc;padding:28px;text-align:center;color:#687a96;font-weight:900}@media(max-width:390px){.ei-profile-scene{grid-template-columns:48% 52%;min-height:340px}.ei-name-row h1{font-size:25px}.ei-ovr{width:72px;height:72px}.ei-action-copy small{display:none}.ei-character-grid{grid-template-columns:1fr}.ei-page-character{max-width:48%}}
`;w.document.head.append(s)}

function patch(w){
 if(!w?.UI||!w?.Game?.Events)return false;
 if(w.__EI_PUBLISHER_V2__)return true;
 w.__EI_PUBLISHER_V2__=true;
 installCSS(w);
 const originalHub=w.UI.showHub.bind(w.UI);
 w.UI.appendNav=(root,active)=>root.append(renderNav(w,active));
 w.UI.showHub=function(...args){const out=originalHub(...args);if(w.document.querySelector('.app-shell'))renderHome(w);return out};
 w.UI.showTrainingMenu=()=>renderTraining(w);
 w.UI.showRestMenu=()=>renderRest(w);
 w.UI.showRelations=()=>renderRelations(w);
 w.UI.showRomanceMenu=()=>renderRomance(w);
 w.UI.showPlayerInfo=()=>renderInfo(w);
 w.UI.showCollectionHub=()=>renderCollection(w);
 w.UI.showCharacterCodex=()=>renderCharacters(w);
 w.UI.showEndingGallery=()=>renderEndings(w);
 w.UI.showSettingsScreen=()=>renderSettings(w);
 w.UI.showManualSaveSlots=()=>renderSaveSlots(w);
 w.UI.showEventModal=(event,onClose)=>showEvent(w,event,onClose,'relations');
 w.UI.showResultOverlay=(title,lines,onClose)=>showResult(w,title,lines,onClose,'hub');
 if(w.Game.state&&w.document.querySelector('.app-shell'))renderHome(w);
 return true;
}
function tick(){tries++;const w=deepest();if(w&&patch(w)){status.textContent='목업 기반 전체 화면 퍼블리싱 적용';setTimeout(()=>status.style.opacity='0',1000);return}if(tries<600)setTimeout(tick,100);else status.textContent='UI 퍼블리싱 적용 실패'}
frame.addEventListener('load',()=>setTimeout(tick,200));setTimeout(tick,400);
})();
