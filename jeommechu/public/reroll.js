(() => {
  const nativeFetch = window.fetch.bind(window);
  let activeSignature = '';
  let cycleSeen = new Set();
  let lastShown = new Set();

  function itemId(item) {
    return String(item?.id || `${item?.name || ''}:${item?.address || ''}`);
  }

  function shuffleByQuality(items) {
    return [...items]
      .map((item) => ({
        item,
        rank: Math.random() * 12 + Number(item.score || 0) / 18,
      }))
      .sort((a, b) => b.rank - a.rank)
      .map(({ item }) => item);
  }

  function diversify(items, signature) {
    const pool = items.slice(0, 20);
    if (signature !== activeSignature) {
      activeSignature = signature;
      cycleSeen = new Set();
      lastShown = new Set();
    }

    let available = pool.filter((item) => !cycleSeen.has(itemId(item)));
    if (available.length < Math.min(5, pool.length)) {
      cycleSeen = new Set(lastShown);
      available = pool.filter((item) => !cycleSeen.has(itemId(item)));
    }

    const selected = shuffleByQuality(available).slice(0, Math.min(5, available.length));
    if (selected.length < Math.min(5, pool.length)) {
      const selectedIds = new Set(selected.map(itemId));
      const supplement = shuffleByQuality(
        pool.filter((item) => !selectedIds.has(itemId(item)) && !lastShown.has(itemId(item))),
      ).slice(0, 5 - selected.length);
      selected.push(...supplement);
    }

    const selectedIds = new Set(selected.map(itemId));
    lastShown = selectedIds;
    for (const id of selectedIds) cycleSeen.add(id);

    return [
      ...selected,
      ...pool.filter((item) => !selectedIds.has(itemId(item))),
      ...items.slice(20),
    ];
  }

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === 'string' || input instanceof URL
      ? new URL(input, location.origin)
      : new URL(input.url, location.origin);
    const method = String(init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();

    if (requestUrl.pathname !== '/api/restaurants' || method !== 'POST') {
      return nativeFetch(input, init);
    }

    let requestBody = {};
    try {
      const rawBody = init.body || (input instanceof Request ? await input.clone().text() : '');
      requestBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      requestBody = {};
    }

    const signature = JSON.stringify({
      coords: requestBody.coords || null,
      locationText: requestBody.locationText || '',
      categories: requestBody.categories || [],
      hangover: Boolean(requestBody.hangover),
      budget: requestBody.budget || '',
      companion: requestBody.companion || '',
    });

    const response = await nativeFetch(input, init);
    if (!response.ok) return response;

    let data;
    try {
      data = await response.clone().json();
    } catch {
      return response;
    }

    if (!Array.isArray(data.items) || data.items.length <= 1) return response;

    data.items = diversify(data.items, signature);
    data.reroll = {
      enabled: true,
      poolSize: data.items.length,
      shownIds: data.items.slice(0, 5).map(itemId),
    };

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-store');
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
})();
