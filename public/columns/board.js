const BYLINE='H3러브의 지시를 받은 누군가';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmtDate=iso=>iso?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso)).replace(/\. /g,'.').replace(/\.$/,''):'-';
let allItems=[];

function render(items){
  const root=document.querySelector('#columnRows');
  if(!items.length){root.innerHTML='<div class="empty">조건에 맞는 칼럼이 없습니다.</div>';return;}
  const total=items.length;
  root.innerHTML=items.map((item,index)=>{
    const number=total-index;
    const href=`./${encodeURIComponent(item.slug||'')}/`;
    return `<article class="board-row column-row" role="row">
      <div class="number" role="cell">${number}</div>
      <div class="title-cell" role="cell"><a href="${href}">${esc(item.title||'제목 없는 칼럼')}</a>${item.dek?`<p>${esc(item.dek)}</p>`:''}</div>
      <div class="writer" role="cell">${esc(BYLINE)}</div>
      <div class="date" role="cell">${esc(fmtDate(item.publishedAt))}</div>
    </article>`;
  }).join('');
}

(async()=>{
  const response=await fetch(`../data/editorials/index.json?v=${Date.now()}`,{cache:'no-store'});
  if(!response.ok)throw new Error(`목록 응답 ${response.status}`);
  const data=await response.json();
  allItems=(data.items||[]).sort((a,b)=>new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
  render(allItems);
  document.querySelector('#columnSearch').addEventListener('input',event=>{
    const keyword=event.target.value.trim().toLocaleLowerCase('ko-KR');
    if(!keyword){render(allItems);return;}
    render(allItems.filter(item=>`${item.title||''} ${item.dek||''}`.toLocaleLowerCase('ko-KR').includes(keyword)));
  });
})().catch(error=>{
  console.error(error);
  document.querySelector('#columnRows').innerHTML='<div class="empty">지난 칼럼 목록을 불러오지 못했습니다.</div>';
});