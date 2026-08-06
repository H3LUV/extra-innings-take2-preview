(() => {
  const nativeFetch = window.fetch.bind(window);
  const placeMap = new Map();
  let cleanupQueued = false;

  function keyFor(item = {}) {
    return `${String(item.name || '').trim()}|${String(item.address || '').trim()}`;
  }

  function fallbackKakaoUrl(item = {}) {
    if (item.kakaoUrl) return item.kakaoUrl;
    if (item.id) return `https://place.map.kakao.com/${encodeURIComponent(item.id)}`;
    const query = [item.name, item.address].filter(Boolean).join(' ');
    return `https://map.kakao.com/link/search/${encodeURIComponent(query)}`;
  }

  function remember(items = []) {
    for (const item of items) {
      const key = keyFor(item);
      if (!key) continue;
      placeMap.set(key, fallbackKakaoUrl(item));
    }
  }

  function patchLinks() {
    cleanupQueued = false;
    document.querySelectorAll('.result-card').forEach((card) => {
      const name = card.querySelector('.result-title strong')?.textContent?.trim() || '';
      const address = card.querySelector('.result-title span')?.textContent?.trim() || '';
      const link = card.querySelector('.map-button');
      if (!link || !name) return;

      const direct = placeMap.get(`${name}|${address}`);
      const loose = [...placeMap.entries()].find(([key]) => key.startsWith(`${name}|`))?.[1];
      const target = direct || loose || `https://map.kakao.com/link/search/${encodeURIComponent(`${name} ${address}`.trim())}`;

      link.href = target;
      link.textContent = '카카오맵 보기';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-label', `${name} 카카오맵에서 보기`);
    });
  }

  function queuePatch() {
    if (cleanupQueued) return;
    cleanupQueued = true;
    queueMicrotask(patchLinks);
  }

  new MutationObserver(queuePatch).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener('DOMContentLoaded', queuePatch, { once: true });

  window.fetch = async (input, init = {}) => {
    const response = await nativeFetch(input, init);
    let url;
    try {
      url = typeof input === 'string' || input instanceof URL
        ? new URL(input, location.origin)
        : new URL(input.url, location.origin);
    } catch {
      return response;
    }

    if (url.pathname !== '/api/restaurants' || !response.ok) return response;

    try {
      const data = await response.clone().json();
      if (Array.isArray(data.items)) {
        remember(data.items);
        queuePatch();
      }
    } catch {
      // Keep the original response when parsing fails.
    }

    return response;
  };
})();
