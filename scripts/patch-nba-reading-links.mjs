import fs from 'node:fs/promises';

const FILE = new URL('../public/app.js', import.meta.url);
const source = await fs.readFile(FILE, 'utf8');
const start = source.indexOf('function renderNews(d){');
const end = source.indexOf('\n\nfunction methodBox', start);

if (start < 0 || end < 0) throw new Error('NBA renderNews block not found');

const replacement = `function renderNews(d){
  const items=(d?.items||[]).slice(0,4);
  $('#newsList').innerHTML=items.length?items.map(x=>{
    const internal=Boolean(x.articleFile&&x.id);
    const href=internal?\`./article.html?id=\${encodeURIComponent(x.id)}\`:(x.link||x.originalLink||'#');
    const attrs=internal?'':\` target="_blank" rel="noopener noreferrer"\`;
    const label=internal?'한국어 전문':'원문';
    return \`<a class="news" href="\${esc(href)}"\${attrs}><strong>\${esc(x.titleKo||x.title)}</strong><div class="sub">\${esc(x.source||'미국 현지 매체')} · \${esc(x.readingMinutes||'')}분 · \${label}</div></a>\`;
  }).join(''):\`<div class="empty">\${esc(d?.message||'선정된 읽을거리가 없습니다.')}</div>\`;
}`;

const updated = `${source.slice(0, start)}${replacement}${source.slice(end)}`;
await fs.writeFile(FILE, updated, 'utf8');
console.log('NBA reading cards now open internal Korean full articles');