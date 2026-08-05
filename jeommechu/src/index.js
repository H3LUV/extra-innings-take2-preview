const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalizeCategory(raw = '') {
  if (raw.includes('한식')) return '한식';
  if (raw.includes('중식')) return '중식';
  if (raw.includes('일식') || raw.includes('초밥') || raw.includes('돈까스')) return '일식';
  if (raw.includes('양식') || raw.includes('이탈리안') || raw.includes('패밀리레스토랑')) return '양식';
  if (raw.includes('분식')) return '분식';
  return '기타';
}

function mapPlace(place, index) {
  const category = normalizeCategory(place.category_name);
  return {
    id: place.id || `k${index}`,
    name: place.place_name,
    category,
    menu: category,
    address: place.road_address_name || place.address_name,
    lat: Number(place.y),
    lng: Number(place.x),
    distance_m: Number(place.distance || 0),
    price: null,
    spicy: false,
    solo: true,
    group: true,
    business: false,
  };
}

async function kakaoFetch(url, key) {
  const response = await fetch(url, {
    headers: { Authorization: `KakaoAK ${key}` },
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Kakao Local API ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ''}`);
  }

  return response.json();
}

async function handleStatus(env) {
  const keyConfigured = Boolean(env.KAKAO_REST_API_KEY);
  if (!keyConfigured) {
    return json({ ok: false, keyConfigured: false, message: 'KAKAO_REST_API_KEY가 등록되지 않았습니다.' }, 503);
  }

  try {
    const params = new URLSearchParams({ query: '서울 음식점', size: '1' });
    await kakaoFetch(`https://dapi.kakao.com/v2/local/search/keyword.json?${params}`, env.KAKAO_REST_API_KEY);
    return json({ ok: true, keyConfigured: true, kakaoApi: 'connected' });
  } catch (error) {
    return json({
      ok: false,
      keyConfigured: true,
      kakaoApi: 'error',
      message: error instanceof Error ? error.message : '카카오 API 연결에 실패했습니다.',
    }, 502);
  }
}

async function handleRestaurants(request, env) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { allow: 'POST, OPTIONS', 'cache-control': 'no-store' },
    });
  }

  if (request.method !== 'POST') {
    return json({ message: 'POST 요청만 지원합니다.' }, 405);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ message: '요청 본문은 JSON 형식이어야 합니다.' }, 400);
  }

  const key = env.KAKAO_REST_API_KEY;
  const { coords, locationText = '', categories = [] } = body || {};

  if (!key) {
    return json({
      mode: 'error',
      code: 'KAKAO_KEY_MISSING',
      message: '카카오 REST API 키가 Cloudflare Worker에 등록되지 않았습니다.',
      items: [],
    }, 503);
  }

  try {
    let data;

    if (coords?.lat && coords?.lng) {
      const params = new URLSearchParams({
        category_group_code: 'FD6',
        x: String(coords.lng),
        y: String(coords.lat),
        radius: '2000',
        size: '15',
        sort: 'distance',
      });

      data = await kakaoFetch(
        `https://dapi.kakao.com/v2/local/search/category.json?${params}`,
        key,
      );
    } else {
      const query = `${locationText || '서울'} ${categories[0] || ''} 맛집`.trim();
      const params = new URLSearchParams({ query, size: '15' });
      data = await kakaoFetch(
        `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
        key,
      );
    }

    const items = (data.documents || []).map(mapPlace);
    return json({
      mode: 'kakao',
      source: coords?.lat && coords?.lng ? 'gps' : 'text',
      receivedCoords: Boolean(coords?.lat && coords?.lng),
      items,
    });
  } catch (error) {
    return json({
      mode: 'error',
      code: 'KAKAO_API_ERROR',
      message: error instanceof Error ? error.message : '식당 검색에 실패했습니다.',
      items: [],
    }, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/status') {
      return handleStatus(env);
    }

    if (url.pathname === '/api/restaurants') {
      return handleRestaurants(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
