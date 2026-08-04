const $=selector=>document.querySelector(selector);
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const getJSON=async url=>{const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(String(response.status));return response.json()};
const fmtDate=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(new Date(iso));

(async()=>{
  const id=new URLSearchParams(location.search).get('id');
  if(!id)throw new Error('기사 ID가 없습니다.');
  const news=await getJSON(`./data/news.json?v=${Date.now()}`);
  const item=(news.items||[]).find(article=>article.id===id);
  if(!item?.articleFile)throw new Error('한국어 기사 파일을 찾을 수 없습니다.');
  const article=await getJSON(`${item.articleFile}?v=${Date.now()}`);
  if(!article?.available||!article?.translated)throw new Error('번역된 기사 본문이 없습니다.');

  document.title=`${article.title||item.titleKo||'오늘의 NBA 기사'} | 오늘의 NBA`;
  $('#articleTitle').textContent=article.title||item.titleKo||item.title||'';
  $('#articleOriginalTitle').textContent=`원문 제목: ${article.originalTitle||item.title||''}`;
  $('#articleSource').textContent=`${article.source||item.source||'NBA.com'} · 한국어 전문`;
  $('#articleMeta').textContent=`${article.pubDate?fmtDate(article.pubDate):''}${article.translatedAt?` · 번역 ${fmtDate(article.translatedAt)}`:''}`;
  $('#originalLink').href=article.link||item.link||'#';
  const paragraphs=String(article.translated||'').split(/\n\s*\n+/).map(text=>text.trim()).filter(Boolean);
  $('#articleBody').innerHTML=paragraphs.map(text=>`<p>${esc(text)}</p>`).join('');
  $('#articleState').hidden=true;
  $('#articleContent').hidden=false;
})().catch(error=>{
  $('#articleState').textContent=`기사를 불러오지 못했습니다: ${error.message}`;
});