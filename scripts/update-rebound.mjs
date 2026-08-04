import fs from "node:fs/promises";
const OUT=new URL("../public/data/column.json",import.meta.url),KST="Asia/Seoul";
const ymd=(d=new Date())=>new Intl.DateTimeFormat("en-CA",{timeZone:KST,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const shift=(s,n)=>{const d=new Date(`${s}T00:00:00+09:00`);d.setUTCDate(d.getUTCDate()+n);return ymd(d)};
const today=ymd(),season=Number(today.slice(0,4)),recentEnd=shift(today,-1),recentStart=shift(recentEnd,-13),previousEnd=shift(recentStart,-1),previousStart=shift(previousEnd,-13);
const get=async url=>{const r=await fetch(url,{headers:{"user-agent":"today-mlb/1.0"}});if(!r.ok)throw new Error(`${r.status} ${url}`);return r.json()};
const statsUrl=(stats,start,end)=>{const p=new URLSearchParams({stats,group:"hitting",sportIds:"1",gameType:"R",hydrate:"person,team",limit:"2000"});if(stats==="season")p.set("season",String(season));else{p.set("startDate",start);p.set("endDate",end)}return`https://statsapi.mlb.com/api/v1/stats?${p}`};
const [seasonRaw,recentRaw,previousRaw]=await Promise.all([get(statsUrl("season")),get(statsUrl("byDateRange",recentStart,recentEnd)),get(statsUrl("byDateRange",previousStart,previousEnd))]);
const mapStats=raw=>{const m=new Map();for(const s of raw?.stats?.[0]?.splits||[]){const st=s.stat||{},id=s.player?.id||s.person?.id;if(!id)continue;const obp=Number(st.obp??st.onBasePercentage??0),slg=Number(st.slg??st.sluggingPercentage??0);m.set(id,{id,name:s.player?.fullName||s.person?.fullName||"",team:s.team?.name||"",pa:Number(st.plateAppearances||0),avg:Number(st.avg||0),obp,slg,ops:Number(st.ops||obp+slg)})}return m};
const sm=mapStats(seasonRaw),rm=mapStats(recentRaw),pm=mapStats(previousRaw),players=[];
for(const [id,r] of rm){const s=sm.get(id),p=pm.get(id);if(!s||!p||s.pa<180||r.pa<28||p.pa<28||r.ops<.700)continue;players.push({id,name:r.name,team:r.team||s.team,seasonPa:s.pa,recentPa:r.pa,previousPa:p.pa,recentAvg:r.avg,recentObp:r.obp,recentSlg:r.slg,recentOps:r.ops,previousOps:p.ops,opsDelta:r.ops-p.ops})}
players.sort((a,b)=>b.opsDelta-a.opsDelta);
const result={type:"rebound-list",title:"최근 14일 반등 선수",dek:"직전 14일 대비 OPS 상승폭 상위 5명",players:players.slice(0,5),method:"시즌 180타석 이상, 최근·직전 14일 각각 28타석 이상, 최근 OPS 0.700 이상인 타자 대상. 원인이나 지속 가능성은 추론하지 않습니다.",range:{recentStart,recentEnd,previousStart,previousEnd},updatedAt:new Date().toISOString(),source:"MLB Stats API"};
await fs.writeFile(OUT,JSON.stringify(result,null,2));console.log(`Updated rebound list: ${result.players.length}`);