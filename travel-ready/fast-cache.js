(() => {
  if (window.__MODETOUR_FAST_FETCH__) return;
  window.__MODETOUR_FAST_FETCH__ = true;

  const nativeFetch = window.fetch.bind(window);
  const PREFIX = 'modetour_api_cache_v2:';
  const MAX_BODY = 1800000;

  function hash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
  }

  function policy(url) {
    if (/archive-api\.open-meteo\.com/.test(url)) return { ttl: 30 * 86400000, timeout: 9000 };
    if (/geocoding-api\.open-meteo\.com/.test(url)) return { ttl: 7 * 86400000, timeout: 6000 };
    if (/api\.open-meteo\.com/.test(url)) return { ttl: 10 * 60000, timeout: 6500 };
    if (/frankfurter\.app|open\.er-api\.com/.test(url)) return { ttl: 6 * 3600000, timeout: 6500 };
    if (/overpass/.test(url)) return { ttl: 7 * 86400000, timeout: 7000 };
    return null;
  }

  function read(key) {
    try {
      const item = JSON.parse(localStorage.getItem(PREFIX + key) || 'null');
      if (!item || item.expires < Date.now()) {
        localStorage.removeItem(PREFIX + key);
        return null;
      }
      return item;
    } catch { return null; }
  }

  function write(key, body, contentType, ttl) {
    if (!body || body.length > MAX_BODY) return;
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify({ body, contentType, expires: Date.now() + ttl }));
    } catch {
      try {
        Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).slice(0, 8).forEach(k => localStorage.removeItem(k));
      } catch {}
    }
  }

  window.fetch = async function fastFetch(input, init = {}) {
    const request = input instanceof Request ? input : null;
    const url = request ? request.url : String(input);
    const method = String(init.method || request?.method || 'GET').toUpperCase();
    const p = policy(url);
    if (!p || !['GET', 'POST'].includes(method)) return nativeFetch(input, init);

    const bodyText = method === 'POST' ? String(init.body || '') : '';
    const key = hash(`${method}|${url}|${bodyText}`);
    const cached = read(key);
    if (cached) {
      return new Response(cached.body, {
        status: 200,
        headers: { 'Content-Type': cached.contentType || 'application/json;charset=UTF-8', 'X-Modetour-Cache': 'HIT' }
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), p.timeout);
    const sourceSignal = init.signal || request?.signal;
    if (sourceSignal) {
      if (sourceSignal.aborted) controller.abort();
      else sourceSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    try {
      const response = await nativeFetch(input, { ...init, signal: controller.signal });
      if (response.ok) {
        const clone = response.clone();
        clone.text().then(text => write(key, text, response.headers.get('content-type'), p.ttl)).catch(() => {});
      }
      return response;
    } finally {
      clearTimeout(timer);
    }
  };
})();