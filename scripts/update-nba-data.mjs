import fs from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DATA_DIR = new URL('../public/data/', import.meta.url);
const KST = 'Asia/Seoul';
const ymd = () => new Intl.DateTimeFormat('en-CA', { timeZone: KST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const espnDate = () => ymd().replaceAll('-', '');

async function getJSON(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'today-nba/1.0'
    },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function write(name, data) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(new URL(name, DATA_DIR), JSON.stringify(data, null, 2), 'utf8');
}

function gamesFromEspn(data) {
  return (data?.events || []).map(event => {
    const competition = event.competitions?.[0] || {};
    const teams = competition.competitors || [];
    const away = teams.find(team => team.homeAway === 'away') || {};
    const home = teams.find(team => team.homeAway === 'home') || {};
    return {
      id: event.id,
      gameDate: event.date,
      status: event.status?.type?.shortDetail || event.status?.type?.detail || '',
      venue: competition.venue?.fullName || '',
      away: { name: away.team?.displayName || '', score: away.score ?? '-' },
      home: { name: home.team?.displayName || '', score: home.score ?? '-' }
    };
  });
}

function statValue(entry, name) {
  const stat = (entry?.stats || []).find(item => item.name === name || item.abbreviation === name);
  return stat?.displayValue ?? stat?.value ?? '-';
}

function standingsFromEspn(data) {
  const groups = data?.children || data?.groups || [];
  return groups.map(group => ({
    name: group.name || group.abbreviation || '콘퍼런스',
    teams: (group.standings?.entries || group.entries || []).map((entry, index) => ({
      seed: Number(statValue(entry, 'playoffseed')) || index + 1,
      name: entry.team?.displayName || entry.team?.name || '',
      w: statValue(entry, 'wins'),
      l: statValue(entry, 'losses'),
      gb: statValue(entry, 'gamesbehind')
    }))
  })).filter(group => group.teams.length);
}

const updatedAt = new Date().toISOString();

try {
  const scoreboard = await getJSON(`https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${espnDate()}`);
  const games = gamesFromEspn(scoreboard);
  await write('schedule.json', {
    league: 'NBA',
    status: games.length ? 'active' : 'offseason',
    games,
    message: games.length ? '' : '오늘 예정된 NBA 경기가 없습니다.',
    updatedAt
  });
  console.log(`NBA games updated: ${games.length}`);
} catch (error) {
  console.warn(`NBA schedule update failed: ${error.message}`);
}

try {
  const standingsRaw = await getJSON('https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?region=us&lang=en&contentorigin=espn&type=0&level=2&sort=playoffseed%3Aasc');
  const conferences = standingsFromEspn(standingsRaw);
  if (conferences.length) {
    await write('standings.json', {
      league: 'NBA',
      status: 'active',
      conferences,
      message: '',
      updatedAt
    });
  }
  console.log(`NBA standings groups updated: ${conferences.length}`);
} catch (error) {
  console.warn(`NBA standings update failed: ${error.message}`);
}

for (const script of ['update-nba-transactions.mjs','update-nba-news.mjs','update-nba-rising.mjs']) {
  const path = fileURLToPath(new URL(`./${script}`, import.meta.url));
  const result = spawnSync(process.execPath, [path], { stdio:'inherit', env:process.env });
  if (result.status !== 0) console.warn(`${script} exited with ${result.status}`);
}
