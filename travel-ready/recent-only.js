(() => {
  const KEY = 'modetour_recent_cities_v1';
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function readRecent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(parsed) ? parsed.filter(Boolean).slice(0, 8) : [];
    } catch {
      return [];
    }
  }

  function expectedHtml() {
    const list = readRecent();
    return list.length
      ? `<span class="recentLabel">최근 검색</span>${list.map((city) => `<button type="button" data-recent-city="${escapeHtml(city)}">${escapeHtml(city)}</button>`).join('')}`
      : '<span class="recentEmpty">검색한 도시가 여기에 저장됩니다.</span>';
  }

  function enforceRecentOnly() {
    const box = document.getElementById('chips');
    if (!box) return;
    const html = expectedHtml();
    if (box.className !== 'recentCities') box.className = 'recentCities';
    if (box.innerHTML !== html) box.innerHTML = html;
  }

  document.addEventListener('click', (event) => {
    const button = event.target.closest('#chips button');
    if (!button) return;
    if (!button.hasAttribute('data-recent-city')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      enforceRecentOnly();
    }
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(enforceRecentOnly));
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('load', enforceRecentOnly);
  document.addEventListener('DOMContentLoaded', enforceRecentOnly);
  setInterval(enforceRecentOnly, 500);
})();
