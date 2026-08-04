const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

const params = new URLSearchParams(location.search);
const id = params.get('id') || '';
const state = document.querySelector('#articleState');
const content = document.querySelector('#articleContent');

function renderParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n+/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
    .map(paragraph => `<p>${esc(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

async function loadArticle() {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('올바르지 않은 기사 주소입니다.');

  const response = await fetch(`./data/articles/${encodeURIComponent(id)}.json?v=${Date.now()}`, {
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('한국어 기사 파일을 찾지 못했습니다.');

  const article = await response.json();
  const translated = article.translated || article.translation || article.bodyKo || article.summaryKo || '';
  if (!translated) throw new Error('이 기사의 한국어 본문이 아직 준비되지 않았습니다.');

  const title = article.title || article.titleKo || article.originalTitle || '오늘의 MLB 기사';
  document.title = `${title} | 오늘의 MLB`;
  document.querySelector('#articleTitle').textContent = title;
  document.querySelector('#articleOriginalTitle').textContent = article.originalTitle || '';
  document.querySelector('#articleSource').textContent = article.source || '미국 현지 읽을거리';

  const meta = [];
  if (article.author) meta.push(article.author);
  if (article.publishedAt || article.pubDate) {
    const date = new Date(article.publishedAt || article.pubDate);
    if (!Number.isNaN(date.getTime())) {
      meta.push(new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Seoul'
      }).format(date));
    }
  }
  if (article.translationType === 'summary') meta.push('한국어 핵심 번역 요약');
  else meta.push('한국어 번역문');
  document.querySelector('#articleMeta').textContent = meta.join(' · ');

  const notice = document.querySelector('#articleNotice');
  notice.textContent = article.translationType === 'summary'
    ? '원문의 핵심 주장과 주요 근거를 한국어로 정리한 번역 요약입니다.'
    : '원문의 의미와 논지를 유지한 한국어 번역문입니다.';

  document.querySelector('#articleBody').innerHTML = renderParagraphs(translated);

  const original = article.link || article.originalUrl || article.url || '';
  const originalLink = document.querySelector('#originalLink');
  if (original) originalLink.href = original;
  else originalLink.hidden = true;

  state.hidden = true;
  content.hidden = false;
}

loadArticle().catch(error => {
  state.className = 'empty';
  state.textContent = error.message || '기사를 불러오지 못했습니다.';
});