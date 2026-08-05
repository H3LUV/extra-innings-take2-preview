const DEMO_RESTAURANTS = [
  { id:'api1', name:'정동밥상', category:'한식', menu:'제육백반', address:'서울 중구 정동길', lat:37.5666, lng:126.9726, distance_m:280, price:9500, spicy:true, solo:true, group:true, business:false },
  { id:'api2', name:'광화문 국수연구소', category:'한식', menu:'들깨칼국수', address:'서울 종로구 새문안로', lat:37.5702, lng:126.9749, distance_m:410, price:11000, spicy:false, solo:true, group:true, business:false },
  { id:'api3', name:'호호반점', category:'중식', menu:'유니짜장', address:'서울 중구 세종대로', lat:37.5647, lng:126.9755, distance_m:340, price:9000, spicy:false, solo:true, group:true, business:false },
  { id:'api4', name:'하루소바', category:'일식', menu:'냉소바 세트', address:'서울 종로구 신문로', lat:37.5701, lng:126.9710, distance_m:390, price:11500, spicy:false, solo:true, group:true, business:false },
  { id:'api5', name:'오후의 파스타', category:'양식', menu:'라구 파스타', address:'서울 중구 덕수궁길', lat:37.5660, lng:126.9742, distance_m:250, price:16000, spicy:false, solo:true, group:true, business:true },
  { id:'api6', name:'포 사이공', category:'기타', menu:'양지 쌀국수', address:'서울 종로구 종로5길', lat:37.5714, lng:126.9819, distance_m:840, price:12000, spicy:false, solo:true, group:true, business:false },
];

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
  if (raw.includes('일식')) return '일식';
  if (raw.includes('양식')) return '양식';
  if (raw.includes('분식')) return '분식';
  return '기타';
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
  const { coords, locationText = '광화문', categories = [] } = body || {};

  if (!key) {
    return json({ mode: 'demo', items: DEMO_RESTAURANTS });
  }

  try {
    const params = new URLSearchParams({
      query: `${locationText} ${categories[0] || ''} 맛집`,
      size: '15',
      sort: 'distance',
    });

    if (coords?.lat && coords?.lng) {
      params.set('x', String(coords.lng));
      params.set('y', String(coords.lat));
      params.set('radius', '2000');
    }

    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?${params}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    );

    if (!response.ok) throw new Error(`Kakao Local API ${response.status}`);

    const data = await response.json();
    const items = (data.documents || []).map((place, index) => ({
      id: place.id || `k${index}`,
      name: place.place_name,
      category: normalizeCategory(place.category_name),
      menu: normalizeCategory(place.category_name),
      address: place.road_address_name || place.address_name,
      lat: Number(place.y),
      lng: Number(place.x),
      distance_m: Number(place.distance || 0),
      price: categories.includes('양식') ? 16000 : 12000,
      spicy: false,
      solo: true,
      group: true,
      business: false,
    }));

    return json({ mode: 'kakao', items });
  } catch (error) {
    return json({
      mode: 'fallback',
      warning: error instanceof Error ? error.message : '식당 검색에 실패했습니다.',
      items: DEMO_RESTAURANTS,
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/restaurants') {
      return handleRestaurants(request, env);
    }

    return env.ASSETS.fetch(request);
  },
};
