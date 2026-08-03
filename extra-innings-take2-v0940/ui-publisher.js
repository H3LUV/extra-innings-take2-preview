(()=>{
'use strict';
const frame=document.getElementById('game');
const status=document.getElementById('status');
let tries=0;

const ASSETS={
  backgrounds:{home:'assets/ui/home-stadium.svg'},
  characters:{school:'assets/ui/protagonist-school.svg'}
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
function btn(w,cls,children,fn){const b=el(w,'button',cls,children);b.type='button';b.addEventListener('click',fn);return b}
function stageName(w,s){return w.GameData?.STAGES?.find(x=>x.id===s)?.name||s||''}
function positionName(w,s){return w.GameData?.POSITIONS?.find(x=>x.id===s)?.name||s||''}
function overall(w,state){try{return Math.round(w.Game?.Careers?.overallSkill?.(state)||62)}catch(e){return 62}}
function val(obj,key,fallback=0){const v=obj?.[key];return Number.isFinite(Number(v))?Math.round(Number(v)):fallback}
function navFn(w,id){return {hub:()=>w.UI.showHub(),train:()=>w.UI.showTrainingMenu(),relations:()=>w.UI.showRelations(),info:()=>w.UI.showPlayerInfo(),endings:()=>w.UI.showCollectionHub(),settings:()=>w.UI.showSettingsScreen()}[id]}
function renderNav(w,active='hub'){
 const nav=el(w,'nav','ei-nav');
 NAV.forEach(([id,label,icon])=>nav.append(btn(w,'ei-nav-btn'+(id===active?' is-active':''),[
  el(w,'span','ei-nav-icon',icon),el(w,'span','ei-nav-label',label)
 ],navFn(w,id))));
 return nav;
}
function radar(points){const cx=50,cy=50,r=38;return points.map((v,i)=>{const a=(-90+i*72)*Math.PI/180;const rr=r*Math.max(0,Math.min(100,v))/100;return `${(cx+Math.cos(a)*rr).toFixed(1)},${(cy+Math.sin(a)*rr).toFixed(1)}`}).join(' ')}
function actionFn(w,key){
 if(key==='train')return()=>w.UI.showTrainingMenu();
 if(key==='rest')return()=>w.UI.showRestMenu();
 if(key==='romance')return()=>w.UI.showRomanceMenu();
 return()=>showLife(w,key);
}
function renderHome(w){
 const state=w.Game.state;if(!state)return;
 const p=state.player,c=p.condition||{},root=w.UI.clear();
 w.document.body.className='ei-published';
 const shell=el(w,'main','ei-home');
 const top=el(w,'header','ei-top-ribbon',[
  el(w,'div','ei-date',[el(w,'b','',`${p.date?.year||1}년차`),el(w,'strong','',`${p.date?.month||1}월 ${p.date?.day||1}일`)]),
  el(w,'div','ei-stage',`${stageName(w,p.stageId)} · ${positionName(w,p.primaryPos)}`)
 ]);
 const scene=el(w,'section','ei-profile-scene');
 const visual=el(w,'div','ei-visual-layer',[
  Object.assign(el(w,'img','ei-scene-bg'),{src:ASSETS.backgrounds.home,alt:''}),
  Object.assign(el(w,'img','ei-character'),{src:ASSETS.characters.school,alt:'주인공 캐릭터'})
 ]);
 const stats=[val(c,'energy',50),val(c,'health',50),val(c,'morale',50),val(c,'gameSense',50),Math.max(0,100-val(c,'fatigue',0))];
 const info=el(w,'div','ei-profile-info',[
  el(w,'div','ei-name-row',[el(w,'h1','',p.name||'선수'),el(w,'div','ei-ovr',[el(w,'small','','OVR'),el(w,'b','',overall(w,state))])]),
  el(w,'ul','ei-facts',[
   el(w,'li','',`🎓 ${p.age||16}세`),el(w,'li','',`🧢 ${p.school||p.team||'야구부'}`),el(w,'li','',`🧤 ${positionName(w,p.primaryPos)}`),el(w,'li','',`🛡 ${stageName(w,p.stageId)}`)
  ]),
  el(w,'div','ei-radar-wrap'),
  el(w,'div','ei-injury',[el(w,'span','','🛡 부상 위험'),el(w,'b','',val(c,'injuryRisk',0))])
 ]);
 const svg=w.document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 100 100');svg.classList.add('ei-radar-svg');
 [100,75,50,25].forEach(pc=>{const poly=w.document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',radar([pc,pc,pc,pc,pc]));poly.setAttribute('class','ei-radar-grid');svg.append(poly)});
 const poly=w.document.createElementNS('http://www.w3.org/2000/svg','polygon');poly.setAttribute('points',radar(stats));poly.setAttribute('class','ei-radar-value');svg.append(poly);
 info.querySelector('.ei-radar-wrap').replaceChildren(svg,el(w,'div','ei-radar-labels',[el(w,'span','','에너지'),el(w,'span','','건강'),el(w,'span','','사기'),el(w,'span','','경기감각'),el(w,'span','','회복')]));
 scene.append(visual,info);
 const next=(()=>{try{return w.Game.League.nextDirectGameIn(state)}catch(e){return null}})();
 const schedule=el(w,'section','ei-schedule',[el(w,'span','ei-ball','⚾'),el(w,'strong','',`다음 직접 경기까지 ${Number.isFinite(next)?next:'-'}일`),el(w,'span','',`팀 ${state.teamRecord?.wins||0}승 ${state.teamRecord?.losses||0}패`)]);
 const grid=el(w,'section','ei-action-grid');
 ACTIONS.forEach(([key,title,sub,icon])=>grid.append(btn(w,'ei-action-card',[el(w,'span','ei-action-art',icon),el(w,'span','ei-action-copy',[el(w,'b','',title),el(w,'small','',sub)]),el(w,'i','','›')],actionFn(w,key))));
 grid.append(btn(w,'ei-next-game',[el(w,'span','','⚾'),el(w,'b','','다음 경기까지'),el(w,'strong','','›››')],()=>w.UI.passTime()));
 shell.append(top,scene,schedule,grid,renderNav(w,'hub'));root.append(shell);
}
function eventText(ev){return [ev?.title,ev?.desc,ev?.line,ev?.role,ev?.targetRole,ev?.characterId].filter(Boolean).join(' ')}
function pickEvent(w,key,words){const state=w.Game.state;let pool=[];try{pool=w.Game.Events.eligible(state,LIFE[key].category)||[]}catch(e){}const related=pool.filter(ev=>words.some(x=>eventText(ev).includes(x)));return related[Math.floor(Math.random()*related.length)]||fallback(key)}
function fallback(key){const effects=key==='team'?{'condition.trustCoach':2,'condition.teamStanding':1}:{'condition.morale':2,'condition.stress':-2};return{id:'pub_'+key+'_'+Date.now(),title:LIFE[key].title,category:LIFE[key].category,desc:'선택한 활동을 통해 하루의 관계와 컨디션이 조금 달라진다.',choices:[{text:'적극적으로 참여한다',effects,result:'오늘의 선택을 끝까지 이어갔다.'},{text:'균형을 지킨다',effects:{'condition.focus':1},result:'무리하지 않고 균형을 지켰다.'},{text:'잠시 쉬어 간다',effects:{'condition.energy':2},result:'잠시 숨을 고르며 하루를 마쳤다.'}]}}
function showLife(w,key){
 const spec=LIFE[key],root=w.UI.clear();w.document.body.className='ei-published';
 const page=el(w,'main','ei-page');
 page.append(el(w,'header','ei-page-head',[btn(w,'ei-back','‹',()=>w.UI.showHub()),el(w,'div','',[el(w,'small','','CONNECTED EVENT'),el(w,'h1','',spec.title),el(w,'p','','선택한 대상과 활동에 맞는 이벤트만 발생합니다.')])]),el(w,'section','ei-life-grid'));
 const grid=page.querySelector('.ei-life-grid');
 spec.items.forEach(([title,desc,words])=>grid.append(btn(w,'ei-life-card',[el(w,'b','',title),el(w,'small','',desc),el(w,'i','','›')],()=>{
  [...grid.querySelectorAll('button')].forEach(b=>b.disabled=true);
  if(key!=='team'&&typeof w.Game.state.player.condition?.gameSense==='number')w.Game.state.player.condition.gameSense=Math.max(0,w.Game.state.player.condition.gameSense-1);
  showEvent(w,pickEvent(w,key,words),()=>{try{w.Game.Time.advancePart(w.Game.state);w.Game.Save.autosave(w.Game.state)}catch(e){}w.UI.showHub()});
 })));
 page.append(renderNav(w,'relations'));root.append(page);
}
function showEvent(w,event,onDone){
 const root=w.UI.clear(),page=el(w,'main','ei-page ei-event-page');
 const head=el(w,'header','ei-page-head',[el(w,'div','',[el(w,'small','','CONNECTED EVENT'),el(w,'h1','',event.title||'이벤트'),el(w,'p','',event.desc||'')])]);
 const choices=el(w,'section','ei-choice-list');let locked=false;
 (event.choices||[]).forEach((c,i)=>choices.append(btn(w,'ei-choice',[el(w,'b','',c.text),el(w,'i','','›')],()=>{
  if(locked)return;locked=true;[...choices.querySelectorAll('button')].forEach(b=>b.disabled=true);
  const result=w.Game.Events.resolveChoice(w.Game.state,event,i);showResult(w,event.title,[result.text,...(result.changeLog||[])],onDone);
 })));
 page.append(head,choices,renderNav(w,'relations'));root.append(page);
}
function showResult(w,title,lines,onDone){const root=w.UI.clear(),page=el(w,'main','ei-page ei-result-page',[el(w,'header','ei-page-head',[el(w,'div','',[el(w,'small','','EVENT RESULT'),el(w,'h1','',title)])]),el(w,'section','ei-result-list',(lines||[]).filter(Boolean).map(x=>el(w,'div','ei-result-line',x))),btn(w,'ei-confirm','확인',onDone),renderNav(w,'relations')]);root.append(page)}
function installCSS(w){if(w.document.getElementById('ei-publisher-style'))return;const s=w.document.createElement('style');s.id='ei-publisher-style';s.textContent=`
*{box-sizing:border-box}body.ei-published{margin:0;background:#061b43;color:#061b43;font-family:'Noto Sans KR',system-ui,sans-serif}.ei-published #app{min-height:100vh;padding:0!important}.ei-home,.ei-page{position:relative;width:min(100%,480px);min-height:100vh;margin:0 auto;padding-bottom:96px;background:#eef6ff;overflow:hidden}.ei-top-ribbon{display:flex;justify-content:space-between;align-items:center;padding:14px 18px;background:linear-gradient(135deg,#06377f,#0b59aa);color:#fff;border-bottom:7px solid #fff;box-shadow:0 5px 0 #ef334b}.ei-date b{display:block;color:#ffd323;font-size:15px}.ei-date strong{font-size:34px;line-height:1}.ei-stage{font-weight:900}.ei-profile-scene{display:grid;grid-template-columns:52% 48%;min-height:370px;background:#fff;border-bottom:5px solid #0a3d88}.ei-visual-layer{position:relative;overflow:hidden;border-right:3px solid #0a3d88}.ei-scene-bg,.ei-character{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.ei-character{object-fit:contain;object-position:center bottom;z-index:2}.ei-profile-info{position:relative;padding:18px 14px 12px}.ei-name-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.ei-name-row h1{margin:10px 0 0;font-size:32px}.ei-ovr{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;align-content:center;background:radial-gradient(circle,#0c5db2,#032a6d);color:#fff;border:6px double #fff;box-shadow:0 0 0 4px #0b3f8e}.ei-ovr small{font-weight:900}.ei-ovr b{font-size:34px;line-height:1}.ei-facts{list-style:none;margin:14px 0 8px;padding:0;display:grid;gap:5px;font-weight:900}.ei-radar-wrap{position:relative;min-height:165px}.ei-radar-svg{width:100%;height:140px}.ei-radar-grid{fill:none;stroke:#aac8e8;stroke-width:1}.ei-radar-value{fill:#24b9d5aa;stroke:#0874bd;stroke-width:2}.ei-radar-labels{position:absolute;inset:0;font-size:9px;font-weight:900}.ei-radar-labels span:nth-child(1){position:absolute;top:0;left:42%}.ei-radar-labels span:nth-child(2){position:absolute;top:42%;right:0}.ei-radar-labels span:nth-child(3){position:absolute;bottom:4px;right:12%}.ei-radar-labels span:nth-child(4){position:absolute;bottom:4px;left:2%}.ei-radar-labels span:nth-child(5){position:absolute;top:42%;left:0}.ei-injury{display:flex;justify-content:space-between;border:2px solid #0b3f8e;padding:8px 10px;font-weight:900}.ei-injury b{color:#148743;font-size:22px}.ei-schedule{display:flex;align-items:center;justify-content:center;gap:8px;padding:15px;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;border-bottom:5px solid #ef334b;font-weight:900}.ei-schedule strong{font-size:18px}.ei-ball{font-size:30px}.ei-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;padding:12px;background:#e6f1ff}.ei-action-card{display:grid;grid-template-columns:54px 1fr 18px;align-items:center;min-height:84px;padding:10px;border:3px solid #0b3f8e;background:linear-gradient(155deg,#fff 0 74%,#e7f1ff 74%);box-shadow:0 5px 0 #03183e;color:#061b43;text-align:left}.ei-action-art{font-size:34px}.ei-action-copy{display:grid}.ei-action-copy b{font-size:16px}.ei-action-copy small{font-size:9px;color:#677996}.ei-action-card i,.ei-life-card i,.ei-choice i{color:#ef334b;font-size:28px;font-style:normal}.ei-next-game{grid-column:1/-1;display:flex;justify-content:center;align-items:center;gap:13px;min-height:72px;border:4px solid #fff;outline:3px solid #0b3f8e;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;font-size:22px;font-weight:1000;box-shadow:0 5px 0 #03183e}.ei-next-game strong{color:#ffd323;font-size:30px}.ei-nav{position:fixed;left:50%;bottom:0;transform:translateX(-50%);width:min(100%,480px);height:88px;display:grid;grid-template-columns:repeat(6,1fr);background:linear-gradient(#0b438d,#031e51);border-top:4px solid #fff;box-shadow:0 -4px 0 #ef334b;z-index:100}.ei-nav-btn{position:relative;border:0;background:transparent;color:#fff;display:grid;place-items:center;align-content:center;gap:1px}.ei-nav-btn:not(:last-child)::after{content:'';position:absolute;right:0;top:14px;bottom:14px;width:1px;background:#4d82bd}.ei-nav-icon{font-size:28px}.ei-nav-label{font-size:11px;font-weight:1000}.ei-nav-btn.is-active .ei-nav-label{color:#ffd323}.ei-nav-btn.is-active::before{content:'';position:absolute;bottom:0;left:13px;right:13px;height:5px;background:#ffd323}.ei-page-head{display:flex;gap:12px;align-items:flex-start;padding:17px 16px;background:linear-gradient(135deg,#06377f,#0a55a4);color:#fff;border-bottom:6px solid #ffd323;box-shadow:0 5px 0 #ef334b}.ei-page-head small{color:#ffd323;font-weight:900;letter-spacing:.12em}.ei-page-head h1{margin:2px 0 5px;font-size:28px}.ei-page-head p{margin:0;font-size:12px}.ei-back{border:3px solid #fff;background:transparent;color:#fff;font-size:30px;width:48px;height:48px}.ei-life-grid,.ei-choice-list{display:grid;gap:12px;padding:18px 14px}.ei-life-card,.ei-choice{display:grid;grid-template-columns:1fr 24px;align-items:center;min-height:92px;padding:16px;border:3px solid #0b3f8e;background:linear-gradient(155deg,#fff 0 74%,#e7f1ff 74%);box-shadow:0 5px 0 #03183e;color:#061b43;text-align:left}.ei-life-card b,.ei-choice b{font-size:18px}.ei-life-card small{grid-column:1/2;margin-top:7px;color:#667896}.ei-life-card:disabled,.ei-choice:disabled{opacity:.55}.ei-result-list{display:grid;gap:10px;padding:18px 14px}.ei-result-line{border:3px solid #0b3f8e;background:#fff;padding:13px;box-shadow:0 4px 0 #03183e;font-weight:800}.ei-confirm{display:block;width:calc(100% - 28px);margin:0 14px 112px;min-height:58px;border:3px solid #03183e;background:linear-gradient(#176bc2,#073e8b);color:#fff;font-size:18px;font-weight:1000;box-shadow:0 4px 0 #03183e}@media(max-width:390px){.ei-profile-scene{grid-template-columns:48% 52%;min-height:340px}.ei-name-row h1{font-size:25px}.ei-ovr{width:72px;height:72px}.ei-action-copy small{display:none}}
`;w.document.head.append(s)}
function patch(w){if(!w?.UI||!w?.Game?.state||!w?.Game?.Events)return false;if(w.__EI_PUBLISHER__)return true;w.__EI_PUBLISHER__=true;installCSS(w);const original=w.UI.showHub.bind(w.UI);w.UI.showHub=function(...args){const out=original(...args);if(w.document.querySelector('.app-shell'))renderHome(w);return out};if(w.document.querySelector('.app-shell'))renderHome(w);return true}
function tick(){tries++;const w=deepest();if(w&&patch(w)){status.textContent='목업 기반 UI 퍼블리싱 적용';setTimeout(()=>status.style.opacity='0',1000);return}if(tries<600)setTimeout(tick,100);else status.textContent='UI 퍼블리싱 적용 실패'}
frame.addEventListener('load',()=>setTimeout(tick,200));setTimeout(tick,400);
})();
