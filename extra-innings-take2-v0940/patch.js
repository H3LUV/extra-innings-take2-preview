(()=>{
'use strict';
const frame=document.getElementById('game');
const status=document.getElementById('status');
let attempts=0;

const LIFE={
 school:{title:'학교생활',category:'school',items:[
  {label:'수업에 집중한다',desc:'수업과 시험 준비에 집중한다.',words:['수업','교실','시험','공부','성적','담임']},
  {label:'동아리 활동을 한다',desc:'친구들과 학교 행사와 동아리 활동에 참여한다.',words:['동아리','축제','학교 행사','반 친구']},
  {label:'진로 상담을 받는다',desc:'담임 선생님과 야구와 진로에 대해 이야기한다.',words:['진로','상담','담임','선생님']},
  {label:'학교에서 휴식한다',desc:'학교 안에서 잠시 쉬며 컨디션을 정리한다.',words:['학교','옥상','휴식','교실']}
 ]},
 team:{title:'팀 동료·감독',category:'team',items:[
  {label:'감독과 대화한다',desc:'감독과 출전 기회와 팀 내 역할을 이야기한다.',words:['감독','출전','선발','보직','기용','면담']},
  {label:'코치에게 지도를 받는다',desc:'코치에게 현재 문제점과 개선 방향을 묻는다.',words:['코치','지도','레슨','훈련','폼','기술']},
  {label:'동료와 시간을 보낸다',desc:'훈련이 끝난 뒤 동료와 최근 팀 분위기를 나눈다.',words:['동료','팀메이트','선배','후배','주장','라커룸','팀워크']},
  {label:'경쟁자와 이야기한다',desc:'같은 자리를 두고 경쟁하는 선수와 솔직히 대화한다.',words:['라이벌','경쟁자','주전 경쟁','포지션 경쟁','도발']}
 ]},
 family:{title:'가족과의 시간',category:'family',items:[
  {label:'가족과 식사한다',desc:'가족과 한자리에 모여 식사한다.',words:['가족','식사','저녁','밥상']},
  {label:'아버지와 대화한다',desc:'아버지와 야구와 미래에 대해 이야기한다.',words:['아버지','부친']},
  {label:'어머니와 외출한다',desc:'어머니와 장을 보거나 가까운 곳에 다녀온다.',words:['어머니','엄마','장보기','외출']},
  {label:'가족과 나들이를 간다',desc:'가족과 함께 짧은 나들이를 떠난다.',words:['가족','나들이','여행','외출']}
 ]},
 friend:{title:'친구 만나기',category:'friend',items:[
  {label:'PC방에 간다',desc:'친구와 게임을 하며 스트레스를 푼다.',words:['PC방','게임','친구']},
  {label:'카페에서 이야기한다',desc:'친구와 카페에서 근황과 고민을 나눈다.',words:['카페','대화','고민','친구']},
  {label:'영화를 본다',desc:'친구와 영화를 보며 평범한 하루를 보낸다.',words:['영화','극장','친구']},
  {label:'산책하거나 외출한다',desc:'친구와 거리를 걷거나 가까운 곳에 다녀온다.',words:['산책','외출','친구','거리']}
 ]},
 sns:{title:'SNS 확인',category:'sns',items:[
  {label:'게시물을 올린다',desc:'훈련과 일상 사진을 SNS에 올린다.',words:['SNS','게시물','업로드','사진','팔로워']},
  {label:'팬 반응을 확인한다',desc:'팬들의 댓글과 반응을 차분히 살펴본다.',words:['팬','댓글','반응','SNS']},
  {label:'지인 게시물을 확인한다',desc:'친구와 지인들의 최근 소식을 확인한다.',words:['지인','게시물','SNS','친구']},
  {label:'SNS 활동을 쉰다',desc:'휴대폰을 내려놓고 SNS에서 잠시 벗어난다.',words:['SNS','휴식','휴대폰']}
 ]}
};

const ENTRY=[
 {key:'school',tests:['학교생활']},
 {key:'team',tests:['팀 동료·감독','팀 동료/감독']},
 {key:'family',tests:['가족과의 시간']},
 {key:'friend',tests:['친구 만나기']},
 {key:'sns',tests:['SNS 확인']}
];

const ICONS={
 hub:'<svg viewBox="0 0 64 64"><path d="M7 31 32 9l25 22v26H39V41H25v16H7Z"/><path d="M3 31 32 5l29 26-6 7L32 17 9 38Z"/></svg>',
 train:'<svg viewBox="0 0 64 64"><path d="M10 49 42 17l7 7-32 32Z"/><path d="M38 13c5-6 12-7 16-3s3 11-3 16l-7-7Z"/><circle cx="48" cy="47" r="11"/><path d="M38 47h20M48 37c-4 4-4 16 0 20M48 37c4 4 4 16 0 20"/></svg>',
 relations:'<svg viewBox="0 0 64 64"><circle cx="22" cy="22" r="10"/><circle cx="44" cy="20" r="9"/><path d="M4 57c1-14 8-22 18-22s18 8 19 22Z"/><path d="M31 57c1-12 7-19 15-19 8 0 13 7 14 19Z"/></svg>',
 info:'<svg viewBox="0 0 64 64"><path d="M17 10h30v8h8v39H9V18h8Z"/><path d="M23 7h18v13H23Z"/><path d="M20 31h25M20 40h25M20 49h18"/></svg>',
 endings:'<svg viewBox="0 0 64 64"><path d="M6 12c12-5 21-2 26 4v40c-7-6-16-8-26-4Z"/><path d="M58 12c-12-5-21-2-26 4v40c7-6 16-8 26-4Z"/><path d="M32 16v40"/></svg>',
 settings:'<svg viewBox="0 0 64 64"><path d="M27 5h10l3 8 8 3 7-4 5 8-6 6 1 9 7 5-5 9-8-3-7 5-1 8H29l-2-8-8-4-7 4-5-8 6-6-1-9-7-5 5-9 8 3 7-5Z"/><circle cx="32" cy="32" r="10"/></svg>'
};

function deepest(){
 try{
  let w=frame.contentWindow;
  for(let i=0;i<40;i++){
   const child=w?.document?.getElementById('game');
   if(!child?.contentWindow) break;
   w=child.contentWindow;
  }
  return w;
 }catch(e){return null}
}
function norm(v){return String(v||'').replace(/\s+/g,' ').trim()}
function eventText(ev){return [ev?.title,ev?.desc,ev?.line,ev?.role,ev?.targetRole,ev?.characterId].filter(Boolean).join(' ')}
function weighted(list){
 if(!list.length)return null;
 const total=list.reduce((n,x)=>n+Math.max(1,Number(x.weight)||1),0);
 let r=Math.random()*total;
 for(const x of list){r-=Math.max(1,Number(x.weight)||1);if(r<=0)return x}
 return list[list.length-1];
}
function fallbackEvent(key,item){
 const choices={
  school:[
   {text:'끝까지 집중한다',effects:{'school.grade':2,'condition.focus':2,'condition.energy':-2},result:'해야 할 일에 집중하며 하루를 보냈다.'},
   {text:'야구와 균형을 맞춘다',effects:{'school.grade':1,'stats.physical.diligence':1},result:'공부와 야구 사이의 균형을 지켰다.'},
   {text:'잠시 쉬어 간다',effects:{'condition.energy':3,'condition.stress':-2},result:'잠시 숨을 고르며 컨디션을 회복했다.'}
  ],
  team:[
   {text:'먼저 질문한다',effects:{'condition.trustCoach':2,'stats.physical.baseballIQ':1},result:'야구에 관한 조언을 구하며 배움을 얻었다.'},
   {text:'상대의 말을 끝까지 듣는다',effects:{'condition.teamStanding':2,'condition.morale':1},result:'팀 안에서 신뢰를 조금 더 쌓았다.'},
   {text:'훈련으로 보여주겠다고 말한다',effects:{'stats.physical.diligence':1,'condition.focus':2},result:'말보다 행동으로 보여주기로 했다.'}
  ],
  family:[
   {text:'솔직하게 이야기한다',effects:{'condition.morale':3,'condition.stress':-2},result:'가족과 솔직한 대화를 나눴다.'},
   {text:'함께 시간을 보낸다',effects:{'condition.morale':2,'condition.energy':1},result:'평범한 시간이 마음을 편하게 했다.'},
   {text:'다음에 더 길게 이야기한다',effects:{'condition.energy':2},result:'짧게 인사를 나누고 다음을 기약했다.'}
  ],
  friend:[
   {text:'오늘은 마음껏 즐긴다',effects:{'condition.morale':3,'condition.stress':-3,'condition.energy':-2},result:'친구와 웃으며 스트레스를 풀었다.'},
   {text:'요즘 고민을 털어놓는다',effects:{'condition.morale':2,'condition.focus':1},result:'이야기를 나누며 생각을 정리했다.'},
   {text:'짧게 만나고 돌아간다',effects:{'condition.energy':1,'condition.stress':-1},result:'부담 없이 짧은 시간을 보냈다.'}
  ],
  sns:[
   {text:'긍정적인 내용만 남긴다',effects:{'fame.fan':2,'condition.morale':1},result:'팬들과 가볍게 소통했다.'},
   {text:'반응을 차분히 살핀다',effects:{'stats.physical.calmness':1,'condition.focus':1},result:'반응에 휘둘리지 않고 필요한 부분만 확인했다.'},
   {text:'휴대폰을 내려놓는다',effects:{'condition.stress':-3,'condition.energy':2},result:'화면에서 벗어나 잠시 쉬었다.'}
  ]
 };
 return {id:'ei_'+key+'_'+Date.now(),title:item.label,category:LIFE[key].category,weight:1,cooldown:0,desc:item.desc,choices:choices[key]};
}
function chooseEvent(w,key,item){
 const state=w.Game.state;
 let pool=[];
 try{pool=w.Game.Events.eligible(state,LIFE[key].category)||[]}catch(e){pool=[]}
 const related=pool.filter(ev=>item.words.some(word=>eventText(ev).includes(word)));
 return weighted(related)||fallbackEvent(key,item);
}
function advanceAndHome(w){
 const state=w.Game.state;
 try{w.Game.Time.advancePart(state)}catch(e){}
 try{w.Game.Save.autosave(state)}catch(e){}
 try{w.checkGameOverConditions?.()}catch(e){}
 w.UI.showHub();
}
function injectStyle(w){
 const d=w.document;
 if(d.getElementById('ei-unified-style'))return;
 const s=d.createElement('style');
 s.id='ei-unified-style';
 s.textContent=`
 :root{--ei-blue:#0b3f8e;--ei-blue2:#1266bd;--ei-deep:#03183e;--ei-paper:#f7f9fc;--ei-bg:#e8f2ff;--ei-ink:#061b43;--ei-red:#ec3647;--ei-yellow:#ffd323;--ei-line:#b9d4f3}
 body.ei-game{background:linear-gradient(180deg,#d9ecff,#eef6ff 52%,#dcecff)!important;color:var(--ei-ink)!important}
 body.ei-game #app{max-width:480px;margin:0 auto;min-height:100vh;padding-bottom:94px!important;background:linear-gradient(180deg,#f7fbff,#e3effd)!important;box-shadow:0 0 35px rgba(0,27,75,.25)}
 body.ei-game .app-shell{padding:0 12px 18px!important;gap:12px!important;background:transparent!important}
 body.ei-game .status-header{position:relative;overflow:hidden;margin:0 -12px 2px;padding:18px 18px 24px!important;border-radius:0!important;background:linear-gradient(135deg,#062b67 0%,#0c4f9f 72%,#1475cb 100%)!important;border:0!important;box-shadow:0 7px 0 #fff,0 11px 0 var(--ei-red)!important;color:#fff!important}
 body.ei-game .status-header::after{content:'';position:absolute;right:-55px;bottom:-28px;width:180px;height:75px;background:#fff;transform:rotate(-18deg);opacity:.96}
 body.ei-game .ei-brand{position:relative;z-index:2;margin-bottom:11px}
 body.ei-game .ei-brand small{display:block;color:var(--ei-yellow);font-size:10px;font-weight:900;letter-spacing:.14em}
 body.ei-game .ei-brand strong{display:block;font-size:24px;line-height:1.05;font-weight:1000;letter-spacing:-.04em}
 body.ei-game .status-top,body.ei-game .status-sub,body.ei-game .status-bars{position:relative;z-index:2}
 body.ei-game .status-name{font-size:19px!important;font-weight:1000!important;color:#fff!important}
 body.ei-game .status-date{color:#d7e8ff!important;font-weight:800!important}
 body.ei-game .status-sub{color:#ffd323!important;font-weight:900!important}
 body.ei-game .stat-row{gap:8px!important;color:#fff!important}
 body.ei-game .stat-label{color:#eef6ff!important;font-weight:800!important}
 body.ei-game .stat-value{color:#fff!important;font-weight:900!important}
 body.ei-game .stat-bar-track{height:9px!important;background:#072557!important;border:1px solid rgba(255,255,255,.14)!important}
 body.ei-game .next-schedule{margin:5px 0 1px;padding:11px 13px;border:3px solid var(--ei-blue);background:#fff;color:var(--ei-ink)!important;font-weight:900!important;box-shadow:0 4px 0 var(--ei-deep)}
 body.ei-game .action-grid{grid-template-columns:1fr 1fr!important;gap:11px!important}
 body.ei-game .action-btn{position:relative;min-height:86px!important;padding:13px 12px 16px!important;border:3px solid var(--ei-blue)!important;border-radius:0!important;background:linear-gradient(155deg,#fff 0 72%,#e7f1ff 72%)!important;color:var(--ei-ink)!important;box-shadow:0 5px 0 var(--ei-deep)!important;text-align:left!important;overflow:hidden!important}
 body.ei-game .action-btn::after{content:'›';position:absolute;right:11px;bottom:5px;color:var(--ei-red);font-size:31px;font-weight:1000;line-height:1}
 body.ei-game .action-btn:active{transform:translateY(3px)!important;box-shadow:0 2px 0 var(--ei-deep)!important}
 body.ei-game .ei-action-icon{display:block;font-size:22px;line-height:1;margin-bottom:6px}
 body.ei-game .ei-action-title{display:block;font-size:16px;font-weight:1000;line-height:1.2}
 body.ei-game .ei-action-sub{display:block;margin-top:4px;padding-right:13px;color:#667896;font-size:10px;font-weight:800;line-height:1.35}
 body.ei-game .screen{min-height:calc(100vh - 94px)!important;background:linear-gradient(180deg,#f7fbff,#e4f0ff)!important;color:var(--ei-ink)!important}
 body.ei-game .screen-title{position:relative;padding:19px 18px 20px!important;border:0!important;border-bottom:8px solid #fff!important;background:linear-gradient(135deg,#062b67,#0c50a0)!important;color:#fff!important;font-family:'Noto Sans KR',system-ui!important;font-size:25px!important;font-weight:1000!important;box-shadow:0 5px 0 var(--ei-red)!important}
 body.ei-game .screen-title::before{content:'CONNECTED MENU';display:block;margin-bottom:3px;color:var(--ei-yellow);font-size:10px;letter-spacing:.14em;font-weight:900}
 body.ei-game .screen-body{padding:18px 14px!important;gap:12px!important;background:transparent!important}
 body.ei-game .screen-footer{padding:12px 14px 18px!important;border:0!important;background:transparent!important}
 body.ei-game .screen .btn:not(.nav-btn){min-height:56px;border:3px solid var(--ei-blue)!important;border-radius:0!important;background:linear-gradient(155deg,#fff 0 72%,#e7f1ff 72%)!important;color:var(--ei-ink)!important;box-shadow:0 4px 0 var(--ei-deep)!important;font-weight:900!important}
 body.ei-game .screen .btn:not(.nav-btn):active{transform:translateY(2px)!important;box-shadow:0 2px 0 var(--ei-deep)!important}
 body.ei-game .group-label{color:var(--ei-blue)!important;font-weight:1000!important;font-size:15px!important}
 body.ei-game .info-block,body.ei-game .rel-card,body.ei-game .romance-card,body.ei-game .trait-card,body.ei-game .save-slot{border:3px solid var(--ei-blue)!important;border-radius:0!important;background:#fff!important;color:var(--ei-ink)!important;box-shadow:0 4px 0 var(--ei-deep)!important}
 .ei-life-list{display:grid;gap:13px}
 .ei-life-choice{position:relative;min-height:88px!important;padding:15px 42px 16px 16px!important;text-align:left!important}
 .ei-life-choice::after{content:'›';position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--ei-red);font-size:34px;font-weight:1000}
 .ei-life-choice strong{display:block;font-size:18px;line-height:1.2}
 .ei-life-choice span{display:block;margin-top:7px;color:#657691;font-size:11px;line-height:1.45}
 .ei-life-choice[disabled],.choice-btn[disabled]{opacity:.55!important;pointer-events:none!important}
 body.ei-game .bottom-nav{position:fixed!important;left:50%!important;right:auto!important;bottom:0!important;transform:translateX(-50%)!important;width:min(100%,480px)!important;height:88px!important;padding:4px 0 calc(4px + env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(6,1fr)!important;background:linear-gradient(180deg,#0b4088,#031d51)!important;border:0!important;border-top:4px solid #fff!important;box-shadow:0 -4px 0 var(--ei-red),0 -9px 18px rgba(0,20,63,.25)!important;z-index:800!important;backdrop-filter:none!important}
 body.ei-game .nav-btn{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:1px!important;border:0!important;background:transparent!important;color:#fff!important;font-size:11px!important;font-weight:1000!important;padding:4px 1px!important}
 body.ei-game .nav-btn:not(:last-child)::after{content:'';position:absolute;right:0;top:14px;bottom:14px;width:1px;background:linear-gradient(transparent,rgba(126,185,239,.6),transparent)}
 body.ei-game .nav-icon{width:40px;height:40px;display:grid;place-items:center;font-size:0!important;filter:drop-shadow(0 2px 0 #00143d)}
 body.ei-game .nav-icon svg{width:36px;height:36px;fill:#fff;stroke:#062b68;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
 body.ei-game .nav-label{color:#fff!important;font-weight:1000!important;text-shadow:0 2px 0 #00143d}
 body.ei-game .nav-btn.active .nav-label{color:var(--ei-yellow)!important}
 body.ei-game .nav-btn.active::before{content:'';position:absolute;left:13px;right:13px;bottom:0;height:5px;border-radius:5px;background:var(--ei-yellow)}
 body.ei-game .nav-btn.active .nav-icon svg{fill:#fffdf0;stroke:#f2a51e}
 body.ei-game .overlay{background:rgba(0,16,45,.82)!important;z-index:1000000!important}
 body.ei-game .event-box,body.ei-game .result-box{width:min(100%,480px)!important;max-height:92vh!important;border:4px solid var(--ei-blue)!important;border-radius:0!important;background:var(--ei-paper)!important;color:var(--ei-ink)!important;box-shadow:0 9px 0 var(--ei-deep)!important}
 body.ei-game .overlay-scroll{padding:0!important}
 .ei-event-head{padding:16px 18px 17px;background:linear-gradient(135deg,#062b67,#0c50a0);color:#fff;border-bottom:6px solid var(--ei-yellow)}
 .ei-event-head small{display:block;color:var(--ei-yellow);font-size:10px;font-weight:900;letter-spacing:.14em}
 .ei-event-head strong{display:block;margin-top:3px;font-size:25px;font-weight:1000;line-height:1.2}
 body.ei-game .event-desc{margin:0!important;padding:18px 18px 10px!important;color:#364b6c!important;font-size:15px!important;line-height:1.7!important}
 body.ei-game .event-choices{display:grid!important;gap:11px!important;padding:10px 18px 20px!important}
 body.ei-game .choice-btn{min-height:58px!important;margin:0!important;border:3px solid var(--ei-blue)!important;border-radius:0!important;background:linear-gradient(155deg,#fff 0 72%,#e7f1ff 72%)!important;color:var(--ei-ink)!important;box-shadow:0 4px 0 var(--ei-deep)!important;font-weight:900!important}
 body.ei-game .result-lines{display:grid!important;gap:9px!important;padding:18px!important}
 body.ei-game .result-line{padding:11px 12px!important;border:2px solid var(--ei-blue)!important;border-radius:0!important;background:#e8f2ff!important;color:var(--ei-ink)!important}
 body.ei-game .overlay-sticky-footer{padding:12px 18px calc(18px + env(safe-area-inset-bottom))!important;border:0!important;background:var(--ei-paper)!important}
 body.ei-game .overlay-sticky-footer .btn{min-height:54px!important;border:3px solid var(--ei-deep)!important;border-radius:0!important;background:linear-gradient(#176bc2,#073e8b)!important;color:#fff!important;box-shadow:0 4px 0 var(--ei-deep)!important;font-weight:1000!important}
 @media(max-width:370px){body.ei-game .action-grid{grid-template-columns:1fr!important}.ei-action-sub{font-size:11px!important}}
 `;
 d.head.appendChild(s);
}
function navItems(w){
 return [
  {id:'hub',label:'홈',fn:()=>w.UI.showHub()},
  {id:'train',label:'훈련',fn:()=>w.UI.showTrainingMenu()},
  {id:'relations',label:'관계',fn:()=>w.UI.showRelations()},
  {id:'info',label:'정보',fn:()=>w.UI.showPlayerInfo()},
  {id:'endings',label:'도감',fn:()=>w.UI.showCollectionHub()},
  {id:'settings',label:'설정',fn:()=>w.UI.showSettingsScreen()}
 ];
}
function installNav(w){
 w.UI.appendNav=function(root,activeId){
  const nav=w.UI.el('div',{class:'bottom-nav'},navItems(w).map(item=>w.UI.el('button',{
   class:'nav-btn'+(item.id===activeId?' active':''),onclick:item.fn,type:'button'
  },[
   w.UI.el('div',{class:'nav-icon',html:ICONS[item.id]}),
   w.UI.el('div',{class:'nav-label'},item.label)
  ])));
  root.appendChild(nav);
 };
}
function installEventUI(w){
 w.UI.showEventModal=function(event,onClose){
  const state=w.Game.state;
  const overlay=w.UI.el('div',{class:'overlay'});
  let locked=false;
  const choiceButtons=(event.choices||[]).map((choice,index)=>w.UI.button(choice.text,()=>{
   if(locked)return;
   locked=true;
   choiceButtons.forEach(b=>b.disabled=true);
   let result;
   try{result=w.Game.Events.resolveChoice(state,event,index)}catch(e){locked=false;choiceButtons.forEach(b=>b.disabled=false);w.UI.toast('이벤트 처리 중 오류가 발생했습니다.');return}
   overlay.remove();
   w.UI.showResultOverlay(event.title,[result.text,...(result.changeLog||[])],onClose);
  },'btn choice-btn'+(choice.risky?' risky':'')));
  const box=w.UI.el('div',{class:'event-box'},[
   w.UI.el('div',{class:'overlay-scroll'},[
    w.UI.el('div',{class:'ei-event-head'},[
     w.UI.el('small',{},'CONNECTED EVENT'),
     w.UI.el('strong',{},event.title||'이벤트')
    ]),
    w.UI.el('div',{class:'event-desc'},event.desc||''),
    w.UI.el('div',{class:'event-choices'},choiceButtons)
   ])
  ]);
  overlay.appendChild(box);
  w.document.body.appendChild(overlay);
 };
 w.UI.showResultOverlay=function(title,lines,onClose){
  const overlay=w.UI.el('div',{class:'overlay'});
  let closed=false;
  const close=()=>{if(closed)return;closed=true;overlay.remove();onClose?.()};
  const box=w.UI.el('div',{class:'result-box'},[
   w.UI.el('div',{class:'overlay-scroll'},[
    w.UI.el('div',{class:'ei-event-head'},[
     w.UI.el('small',{},'EVENT RESULT'),
     w.UI.el('strong',{},title||'결과')
    ]),
    w.UI.el('div',{class:'result-lines'},(lines||[]).filter(Boolean).map(line=>w.UI.el('div',{class:'result-line'},line)))
   ]),
   w.UI.el('div',{class:'overlay-sticky-footer'},[
    w.UI.button('확인',close,'btn btn-primary btn-lg')
   ])
  ]);
  overlay.appendChild(box);
  w.document.body.appendChild(overlay);
 };
}
function showLife(w,key){
 const spec=LIFE[key];
 const root=w.UI.clear();
 w.document.body.classList.add('ei-game');
 const buttons=spec.items.map(item=>{
  const btn=w.UI.el('button',{class:'btn ei-life-choice',type:'button'},[
   w.UI.el('strong',{},item.label),w.UI.el('span',{},item.desc)
  ]);
  btn.addEventListener('click',()=>{
   if(btn.disabled)return;
   buttons.forEach(b=>b.disabled=true);
   const state=w.Game.state;
   if(key!=='team'&&state?.player?.condition&&typeof state.player.condition.gameSense==='number'){
    state.player.condition.gameSense=Math.max(0,state.player.condition.gameSense-1);
   }
   const ev=chooseEvent(w,key,item);
   w.UI.showEventModal(ev,()=>advanceAndHome(w));
  },{once:true});
  return btn;
 });
 root.appendChild(w.UI.screen(spec.title,[w.UI.el('div',{class:'ei-life-list'},buttons)],{
  footer:[w.UI.button('← 홈으로',()=>w.UI.showHub(),'btn btn-ghost')]
 }));
 w.UI.appendNav(root,'relations');
}
function decorateActions(w){
 const map=[
  {find:'훈련하기',icon:'🏆',title:'훈련하기',sub:'능력치와 경기 감각을 성장시킨다'},
  {find:'휴식하기',icon:'🛌',title:'휴식하기',sub:'체력과 컨디션을 회복한다'},
  {find:'학교생활',icon:'🏫',title:'학교생활',sub:'수업·동아리·진로·휴식'},
  {find:'팀 동료·감독',icon:'👥',title:'팀 동료·감독',sub:'감독·코치·동료·경쟁자'},
  {find:'가족과의 시간',icon:'👪',title:'가족과의 시간',sub:'가족 관계와 일상 이벤트'},
  {find:'친구 만나기',icon:'🤝',title:'친구 만나기',sub:'친구와 스트레스를 해소한다'},
  {find:'연애·데이트',icon:'💌',title:'연애·데이트',sub:'관계가 열린 인물을 만난다'},
  {find:'SNS 확인',icon:'📱',title:'SNS 확인',sub:'게시물과 팬 반응을 확인한다'},
  {find:'다음 경기까지 넘기기',icon:'⏭',title:'다음 경기까지',sub:'일정을 빠르게 진행한다'}
 ];
 const buttons=[...w.document.querySelectorAll('.action-grid .action-btn')];
 buttons.forEach(button=>{
  if(button.dataset.eiDecorated==='1')return;
  const text=norm(button.textContent);
  const item=map.find(x=>text.includes(x.find));
  if(!item)return;
  button.innerHTML=`<span class="ei-action-icon">${item.icon}</span><span class="ei-action-title">${item.title}</span><span class="ei-action-sub">${item.sub}</span>`;
  const entry=ENTRY.find(x=>x.tests.some(t=>item.title.includes(t)));
  if(entry){
   const clone=button.cloneNode(true);
   clone.dataset.eiDecorated='1';
   clone.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showLife(w,entry.key)});
   button.replaceWith(clone);
  }else{
   button.dataset.eiDecorated='1';
  }
 });
}
function decorateHome(w){
 const header=w.document.querySelector('.status-header');
 if(header&&!header.querySelector('.ei-brand')){
  const brand=w.document.createElement('div');brand.className='ei-brand';brand.innerHTML='<small>EXTRA INNINGS TAKE 2</small><strong>나의 야구 인생</strong>';header.prepend(brand);
 }
 decorateActions(w);
}
function wrapScreens(w){
 const names=['showHub','showTrainingMenu','showRestMenu','showRelations','showRomanceMenu','showPlayerInfo','showCollectionHub','showCharacterCodex','showEndingGallery','showSettingsScreen','showManualSaveSlots'];
 names.forEach(name=>{
  const original=w.UI[name];
  if(typeof original!=='function'||original.__EI_WRAPPED__)return;
  const wrapped=function(...args){
   w.document.body.classList.add('ei-game');
   const out=original.apply(this,args);
   if(name==='showHub')decorateHome(w);
   return out;
  };
  wrapped.__EI_WRAPPED__=true;
  w.UI[name]=wrapped;
 });
 const title=w.UI.showTitle;
 if(typeof title==='function'&&!title.__EI_WRAPPED__){
  const wrapped=function(...args){w.document.body.classList.remove('ei-game');return title.apply(this,args)};
  wrapped.__EI_WRAPPED__=true;w.UI.showTitle=wrapped;
 }
}
function patch(w){
 if(!w?.document?.body||!w?.UI||!w?.Game?.Events)return false;
 if(w.__EI_V094_UNIFIED__)return true;
 w.__EI_V094_UNIFIED__=true;
 injectStyle(w);
 installNav(w);
 installEventUI(w);
 wrapScreens(w);
 let scheduled=false;
 const obs=new w.MutationObserver(()=>{
  if(scheduled)return;
  scheduled=true;
  w.requestAnimationFrame(()=>{
   scheduled=false;
   if(w.Game?.state)w.document.body.classList.add('ei-game');
   const header=w.document.querySelector('.status-header');
   if(header)decorateHome(w);
  });
 });
 obs.observe(w.document.body,{childList:true,subtree:true});
 if(w.Game.state){w.document.body.classList.add('ei-game');w.UI.showHub()}
 w.document.title='EXTRA INNINGS TAKE 2 v0.9.4';
 return true;
}
function tick(){
 attempts++;
 const w=deepest();
 if(w&&patch(w)){
  status.textContent='v0.9.4 통합 UI 적용 완료';
  setTimeout(()=>status.style.opacity='0',1100);
  return;
 }
 if(attempts<700)setTimeout(tick,100);
 else status.textContent='통합 UI 적용 실패';
}
frame.addEventListener('load',()=>setTimeout(tick,250));
setTimeout(tick,400);
})();