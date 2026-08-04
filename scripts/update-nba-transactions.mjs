import fs from 'node:fs/promises';

const SOURCE = 'https://stats.nba.com/js/data/playermovement/NBA_Player_Movement.json';
const OUTPUT = new URL('../public/data/transactions.json', import.meta.url);

const TEAM_KO = {
  'Atlanta Hawks':'애틀랜타 호크스','Boston Celtics':'보스턴 셀틱스','Brooklyn Nets':'브루클린 네츠',
  'Charlotte Hornets':'샬럿 호네츠','Chicago Bulls':'시카고 불스','Cleveland Cavaliers':'클리블랜드 캐벌리어스',
  'Dallas Mavericks':'댈러스 매버릭스','Denver Nuggets':'덴버 너기츠','Detroit Pistons':'디트로이트 피스턴스',
  'Golden State Warriors':'골든스테이트 워리어스','Houston Rockets':'휴스턴 로키츠','Indiana Pacers':'인디애나 페이서스',
  'LA Clippers':'LA 클리퍼스','Los Angeles Clippers':'LA 클리퍼스','Los Angeles Lakers':'LA 레이커스',
  'Memphis Grizzlies':'멤피스 그리즐리스','Miami Heat':'마이애미 히트','Milwaukee Bucks':'밀워키 벅스',
  'Minnesota Timberwolves':'미네소타 팀버울브스','New Orleans Pelicans':'뉴올리언스 펠리컨스','New York Knicks':'뉴욕 닉스',
  'Oklahoma City Thunder':'오클라호마시티 선더','Orlando Magic':'올랜도 매직','Philadelphia 76ers':'필라델피아 세븐티식서스',
  'Phoenix Suns':'피닉스 선스','Portland Trail Blazers':'포틀랜드 트레일블레이저스','Sacramento Kings':'새크라멘토 킹스',
  'San Antonio Spurs':'샌안토니오 스퍼스','Toronto Raptors':'토론토 랩터스','Utah Jazz':'유타 재즈','Washington Wizards':'워싱턴 위저즈'
};
const POS_KO = { guard:'가드', forward:'포워드', center:'센터', 'guard-forward':'가드-포워드', 'forward-center':'포워드-센터' };
const TYPE_KO = { Signing:'계약', Trade:'트레이드', Waive:'방출', Assignment:'G리그 배정', Recall:'복귀', 'Status Change':'신분 변경' };

const teamKo = name => TEAM_KO[name] || name;
const contractKo = value => ({
  'Contract':'계약','Two-Way Contract':'투웨이 계약','Rookie Scale Contract':'루키 스케일 계약',
  'Veteran Extension':'베테랑 연장계약','Rookie Scale Extension':'루키 스케일 연장계약',
  'Contract Extension':'연장계약','NBA Contract':'NBA 정규계약'
}[value] || value);

function personKo(raw) {
  const match = raw.match(/^(guard-forward|forward-center|guard|forward|center)\s+(.+)$/i);
  return match ? `${POS_KO[match[1].toLowerCase()] || match[1]} ${match[2]}` : raw;
}

function translateDescription(text) {
  let m;
  if ((m = text.match(/^(.+?) re-signed (.+?) to a (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${personKo(m[2])}와 ${contractKo(m[3])}을 체결했습니다.`;
  if ((m = text.match(/^(.+?) signed (.+?) to a (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${personKo(m[2])}와 ${contractKo(m[3])}을 체결했습니다.`;
  if ((m = text.match(/^(.+?) waived (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${personKo(m[2])}를 방출했습니다.`;
  if ((m = text.match(/^(.+?) converted the contract of (.+?) to an? (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${personKo(m[2])}의 계약을 ${contractKo(m[3])}으로 전환했습니다.`;
  if ((m = text.match(/^(.+?) received (.+?) from (.+?)\.$/))) {
    const asset = m[2] === 'draft consideration' ? '드래프트 자산' : personKo(m[2]);
    return `${teamKo(m[1])}가 ${teamKo(m[3])}로부터 ${asset}을 받았습니다.`;
  }
  if ((m = text.match(/^(.+?) assigned (.+?) to the (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${personKo(m[2])}를 ${m[3]}에 배정했습니다.`;
  if ((m = text.match(/^(.+?) recalled (.+?) from the (.+?)\.$/)))
    return `${teamKo(m[1])}가 ${m[3]}에서 ${personKo(m[2])}를 불러올렸습니다.`;
  return text;
}

const fmtDate = iso => new Intl.DateTimeFormat('ko-KR', { timeZone:'Asia/Seoul', month:'long', day:'numeric' }).format(new Date(iso));

async function main() {
  const response = await fetch(SOURCE, { headers: { accept:'application/json', 'user-agent':'today-nba/1.0' }, signal:AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`NBA transaction feed ${response.status}`);
  const data = await response.json();
  const rows = data?.NBA_Player_Movement?.rows || [];
  if (!rows.length) throw new Error('NBA transaction feed returned no rows');

  const grouped = new Map();
  for (const row of rows) {
    const key = row.Transaction_Type === 'Trade' ? row.GroupSort : `${row.GroupSort}-${row.TEAM_ID}-${row.PLAYER_ID}`;
    if (!grouped.has(key)) grouped.set(key, { date:row.TRANSACTION_DATE, type:row.Transaction_Type, rows:[] });
    grouped.get(key).rows.push(row);
  }

  const items = [...grouped.values()]
    .sort((a,b) => new Date(b.date) - new Date(a.date))
    .slice(0, 18)
    .map((group, index) => ({
      id: `${group.type.toLowerCase().replace(/\s+/g,'-')}-${group.date.slice(0,10)}-${index}`,
      type: group.type,
      typeKo: TYPE_KO[group.type] || group.type,
      date: group.date,
      dateKo: fmtDate(group.date),
      title: `${TYPE_KO[group.type] || group.type} · ${fmtDate(group.date)}`,
      descriptionKo: group.rows.map(row => translateDescription(row.TRANSACTION_DESCRIPTION)).join(' '),
      descriptions: group.rows.map(row => row.TRANSACTION_DESCRIPTION),
      source: 'NBA.com',
      sourceLink: 'https://www.nba.com/players/transactions'
    }));

  await fs.mkdir(new URL('../public/data/', import.meta.url), { recursive:true });
  await fs.writeFile(OUTPUT, JSON.stringify({
    items,
    message: '',
    source: 'NBA 공식 Player Movement 데이터',
    updatedAt: new Date().toISOString()
  }, null, 2), 'utf8');
  console.log(`NBA transactions updated: ${items.length}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
