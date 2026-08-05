const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=iso=>{const d=new Date(iso);if(Number.isNaN(d.getTime()))return '';try{return new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',year:'numeric',month:'long',day:'numeric'}).format(d)}catch{return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}};
const COLUMN_BYLINE='오늘의 MLB 편집부';
(async()=>{
  const slug=document.body.dataset.slug;
  if(!slug)throw Error('칼럼 주소가 없습니다.');
  const safeSlug=encodeURIComponent(slug);
  let r=await fetch(`/data/editorials/${safeSlug}.json`,{cache:'no-store'});
  if(!r.ok&&document.body.dataset.latest==='true')r=await fetch('/data/editorial.json',{cache:'no-store'});
  if(!r.ok)throw Error(`칼럼 데이터 오류 (${r.status})`);
  const d=await r.json();
  document.querySelector('#article').innerHTML=`<div class="kicker">${esc(d.eyebrow||"TODAY'S COLUMN")}</div><h1 class="title">${esc(d.title)}</h1><p class="dek">${esc(d.dek)}</p><div class="meta">${esc(COLUMN_BYLINE)}${d.publishedAt?` · ${fmt(d.publishedAt)}`:''}</div>${d.thesis?`<div class="thesis">${esc(d.thesis)}</div>`:''}<div class="body">${(d.body||[]).map(p=>`<p>${esc(p)}</p>`).join('')}</div>${d.takeaways?.length?`<section class="takeaways"><h2>핵심 정리</h2><ul>${d.takeaways.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></section>`:''}<div class="share"><button class="primary" id="copy">칼럼 주소 복사</button><a class="secondary" href="../">지난 칼럼</a><a class="secondary" href="../../">오늘의 MLB 홈</a></div>`;
  const copy=document.querySelector('#copy');
  if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(location.href.split('?')[0]);copy.textContent='복사 완료'}catch{copy.textContent='주소창에서 복사해주세요'}};
})().catch(e=>{document.querySelector('#article').innerHTML='<h1>칼럼을 불러오지 못했습니다.</h1><p>'+esc(e?.message||'알 수 없는 오류')+'</p>'});
