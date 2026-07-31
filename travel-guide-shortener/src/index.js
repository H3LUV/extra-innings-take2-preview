const ALLOWED_ORIGIN = 'https://h3luv.github.io';
const TARGET_ORIGIN = 'https://h3luv.github.io';
const TARGET_PATH_PREFIX = '/extra-innings-take2-preview/travel-guide/';
const ID_LENGTH = 9;
const MAX_TTL_SECONDS = 60 * 60 * 24 * 366;
const MIN_TTL_SECONDS = 60;

function json(data, status = 200, origin = ALLOWED_ORIGIN) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'cache-control': 'no-store'
    }
  });
}

function expiredPage() {
  return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>여행 안내 종료</title><style>body{font-family:system-ui,-apple-system,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f6;color:#1e2524}.box{max-width:420px;padding:32px;text-align:center;background:#fff;border:1px solid #e2e9e7;border-radius:18px;box-shadow:0 12px 28px rgba(22,62,53,.09)}h1{font-size:24px;margin:12px 0 8px}p{color:#687271;line-height:1.6}</style><body><div class="box"><div style="font-size:48px">⌛</div><h1>여행 안내 서비스가 종료되었습니다</h1><p>해당 안내 링크의 보관 기간이 지났습니다.<br>필요한 사항은 담당 여행사로 문의해 주세요.</p></div></body></html>`, {
    status: 410,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }
  });
}

function randomId(length = ID_LENGTH) {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function isAllowedTarget(value) {
  try {
    const url = new URL(value);
    return url.origin === TARGET_ORIGIN && url.pathname.startsWith(TARGET_PATH_PREFIX) && url.searchParams.has('d');
  } catch {
    return false;
  }
}

function corsOrigin(request) {
  const origin = request.headers.get('origin');
  return origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = corsOrigin(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': origin,
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
          'access-control-max-age': '86400'
        }
      });
    }

    if (url.pathname === '/health') {
      return json({ ok: true, service: 'modetour-guide-shortener' }, 200, origin);
    }

    if (request.method === 'POST' && url.pathname === '/api/guides') {
      if (request.headers.get('origin') !== ALLOWED_ORIGIN) {
        return json({ error: '허용되지 않은 요청 출처입니다.' }, 403, origin);
      }

      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: '요청 형식이 올바르지 않습니다.' }, 400, origin);
      }

      const longUrl = String(body?.url || '');
      if (!isAllowedTarget(longUrl)) {
        return json({ error: '허용되지 않은 안내 주소입니다.' }, 400, origin);
      }
      if (longUrl.length > 5000) {
        return json({ error: '안내 주소가 너무 깁니다. 입력 내용을 줄여 주세요.' }, 413, origin);
      }

      const expiresAt = new Date(body?.expiresAt || 0);
      const ttl = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
      if (!Number.isFinite(ttl) || ttl < MIN_TTL_SECONDS) {
        return json({ error: '링크 유효기간이 올바르지 않습니다.' }, 400, origin);
      }
      const expirationTtl = Math.min(ttl, MAX_TTL_SECONDS);

      let id = '';
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = randomId();
        const existing = await env.GUIDES.get(candidate);
        if (!existing) {
          id = candidate;
          break;
        }
      }
      if (!id) return json({ error: '단축 주소 생성에 실패했습니다.' }, 503, origin);

      await env.GUIDES.put(id, longUrl, { expirationTtl });
      return json({ id, url: `${url.origin}/g/${id}`, expiresAt: expiresAt.toISOString() }, 201, origin);
    }

    if (request.method === 'GET' && url.pathname.startsWith('/g/')) {
      const id = url.pathname.slice(3);
      if (!/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{9}$/.test(id)) return expiredPage();
      const target = await env.GUIDES.get(id);
      if (!target) return expiredPage();
      return Response.redirect(target, 302);
    }

    return json({ error: 'Not found' }, 404, origin);
  }
};
