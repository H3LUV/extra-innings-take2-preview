window.renderNews=function renderNews(d){
  const items=(d?.items||[]).slice(0,4);
  const target=document.querySelector('#newsList');
  if(!target)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  target.innerHTML=items.length?items.map(item=>{
    const internal=Boolean(item.articleFile&&item.id);
    const href=internal?`./article.html?id=${encodeURIComponent(item.id)}`:(item.link||item.originalLink||'#');
    const attrs=internal?'':` target="_blank" rel="noopener noreferrer"`;
    const label=internal?'한국어 전문':'원문';
    return `<a class="news" href="${esc(href)}"${attrs}><strong>${esc(item.titleKo||item.title)}</strong><div class="sub">${esc(item.source||'NBA.com')} · ${esc(item.readingMinutes||'')}분 · ${label}</div></a>`;
  }).join(''):`<div class="empty">${esc(d?.message||'선정된 읽을거리가 없습니다.')}</div>`;
};