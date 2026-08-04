import fs from 'node:fs/promises';

const OUTPUT = new URL('../public/data/rising.json', import.meta.url);
const FIELDS = ['GP','MIN','FGM','FGA','FTM','FTA','REB','AST','STL','BLK','TOV','PTS'];
const METHOD = {
  name:'RII',
  fullName:'Rising Impact Index',
  comparison:'최근 10경기 vs 직전 10경기',
  weights:{ productivity:45, efficiency:25, role:20, minutes:10 },
  productivity:'NBA Fantasy Points 공식 가중치를 분당 생산성으로 환산',
  efficiency:'True Shooting Percentage 변화',
  role:'FGA + 0.44×FTA + TOV를 36분 기준으로 환산한 공격 역할 변화',
  eligibility:'각 구간 최소 7경기, 최근 구간 경기당 15분 이상'
};

const now = new Date();
const month = Number(new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Seoul', month:'numeric' }).format(now));
const year = Number(new Intl.DateTimeFormat('en-US', { timeZone:'Asia/Seoul', year:'numeric' }).format(now));
const season = month >= 10 ? `${year}-${String(year + 1).slice(-2)}` : `${year - 1}-${String(year).slice(-2)}`;
const isOffseason = month >= 7 && month <= 9;

async function write(data) {
  await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive:true });
  await fs.writeFile(OUTPUT, JSON.stringify(data, null, 2), 'utf8');
}

function params(lastN) {
  const p = new URLSearchParams({
    Conference:'',Country:'',DateFrom:'',DateTo:'',Division:'',DraftPick:'',DraftYear:'',GameScope:'',GameSegment:'',Height:'',
    LastNGames:String(lastN),LeagueID:'00',Location:'',MeasureType:'Base',Month:'0',OpponentTeamID:'0',Outcome:'',PORound:'0',
    PaceAdjust:'N',PerMode:'Totals',Period:'0',PlayerExperience:'',PlayerPosition:'',PlusMinus:'N',Rank:'N',Season:season,
    SeasonSegment:'',SeasonType:'Regular Season',ShotClockRange:'',StarterBench:'',TeamID:'0',VsConference:'',VsDivision:'',Weight:''
  });
  return p;
}

async function fetchRows(lastN) {
  const url = `https://stats.nba.com/stats/leaguedashplayerstats?${params(lastN)}`;
  const response = await fetch(url, {
    headers:{
      accept:'application/json, text/plain, */*',
      origin:'https://www.nba.com',
      referer:'https://www.nba.com/',
      'user-agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
    },
    signal:AbortSignal.timeout(30000)
  });
  if (!response.ok) throw new Error(`NBA stats ${lastN} games: ${response.status}`);
  const payload = await response.json();
  const set = Array.isArray(payload.resultSets) ? payload.resultSets[0] : payload.resultSet;
  const headers = set?.headers || [];
  return (set?.rowSet || []).map(row => Object.fromEntries(headers.map((header,index) => [header,row[index]])));
}

const num = value => Number(value || 0);
const subtract = (all,recent) => Object.fromEntries(FIELDS.map(field => [field, Math.max(0, num(all[field]) - num(recent[field]))]));

function metrics(row) {
  const gp = num(row.GP), min = num(row.MIN), pts = num(row.PTS), fga = num(row.FGA), fta = num(row.FTA), tov = num(row.TOV);
  const fantasy = pts + 1.2*num(row.REB) + 1.5*num(row.AST) + 3*num(row.STL) + 3*num(row.BLK) - tov;
  return {
    gp,
    mpg:gp ? min/gp : 0,
    productivity:min ? fantasy/min*36 : 0,
    ts:(fga + 0.44*fta) ? pts/(2*(fga + 0.44*fta)) : 0,
    role:min ? (fga + 0.44*fta + tov)/min*36 : 0
  };
}

function percentile(values,value) {
  const sorted = [...values].sort((a,b)=>a-b);
  if (sorted.length <= 1) return 50;
  let below = 0, equal = 0;
  for (const v of sorted) { if (v < value) below++; else if (v === value) equal++; }
  return ((below + 0.5*equal) / sorted.length) * 100;
}

const round = (value,digits=1) => Number(value.toFixed(digits));

async function main() {
  if (isOffseason) {
    await write({
      players:[],status:'offseason',
      message:'오프시즌에는 최근 경기 표본이 없어 상승세 순위를 표시하지 않습니다. 정규시즌 개막 후 최근 10경기와 직전 10경기를 자동 비교합니다.',
      method:METHOD,updatedAt:new Date().toISOString()
    });
    console.log('NBA RII: offseason');
    return;
  }

  const [last10,last20] = await Promise.all([fetchRows(10),fetchRows(20)]);
  const recentById = new Map(last10.map(row => [String(row.PLAYER_ID),row]));
  const candidates = [];

  for (const total of last20) {
    const recent = recentById.get(String(total.PLAYER_ID));
    if (!recent) continue;
    const previousRaw = subtract(total,recent);
    const r = metrics(recent), p = metrics(previousRaw);
    if (r.gp < 7 || p.gp < 7 || r.mpg < 15) continue;
    const deltas = {
      productivity:r.productivity-p.productivity,
      efficiency:(r.ts-p.ts)*100,
      role:r.role-p.role,
      minutes:r.mpg-p.mpg
    };
    if (deltas.productivity <= 0) continue;
    candidates.push({
      id:String(total.PLAYER_ID),name:total.PLAYER_NAME,team:recent.TEAM_ABBREVIATION || total.TEAM_ABBREVIATION || '',
      recent:r,previous:p,deltas
    });
  }

  const pools = {
    productivity:candidates.map(x=>x.deltas.productivity),efficiency:candidates.map(x=>x.deltas.efficiency),
    role:candidates.map(x=>x.deltas.role),minutes:candidates.map(x=>x.deltas.minutes)
  };

  for (const c of candidates) {
    const pct = {
      productivity:percentile(pools.productivity,c.deltas.productivity),
      efficiency:percentile(pools.efficiency,c.deltas.efficiency),
      role:percentile(pools.role,c.deltas.role),minutes:percentile(pools.minutes,c.deltas.minutes)
    };
    c.score = 0.45*pct.productivity + 0.25*pct.efficiency + 0.20*pct.role + 0.10*pct.minutes;
  }

  const players = candidates.sort((a,b)=>b.score-a.score).slice(0,5).map((c,index)=>({
    rank:index+1,id:c.id,name:c.name,team:c.team,score:round(c.score),metric:'RII',
    recent:{ productivity:round(c.recent.productivity),ts:round(c.recent.ts*100),role:round(c.recent.role),mpg:round(c.recent.mpg) },
    previous:{ productivity:round(c.previous.productivity),ts:round(c.previous.ts*100),role:round(c.previous.role),mpg:round(c.previous.mpg) },
    delta:{ productivity:round(c.deltas.productivity),ts:round(c.deltas.efficiency),role:round(c.deltas.role),mpg:round(c.deltas.minutes) }
  }));

  await write({
    players,status:players.length?'active':'insufficient-sample',
    message:players.length?'':'조건을 충족한 최근 20경기 표본이 아직 충분하지 않습니다.',
    season,method:METHOD,updatedAt:new Date().toISOString()
  });
  console.log(`NBA RII updated: ${players.length}`);
}

main().catch(async error => {
  console.warn(`NBA RII update skipped: ${error.message}`);
  try {
    const current = JSON.parse(await fs.readFile(OUTPUT,'utf8'));
    current.lastError = error.message;
    current.lastCheckedAt = new Date().toISOString();
    await write(current);
  } catch {}
});
