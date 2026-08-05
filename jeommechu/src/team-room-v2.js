import { TeamRoom as BaseTeamRoom } from './team-room.js';
import { aggregateTeamPreferences, findRestaurants } from './recommendations.js';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

export class TeamRoom extends BaseTeamRoom {
  constructor(ctx, env) {
    super(ctx, env);
    this.forwardedKakaoKey = '';
  }

  async prepareCandidates(room) {
    const aggregation = aggregateTeamPreferences(room.participants);
    const key = this.forwardedKakaoKey || this.env.KAKAO_REST_API_KEY || '';

    if (!key) {
      throw new Error('카카오 REST API 키가 팀 방 실행 환경에 전달되지 않았습니다.');
    }

    const result = await findRestaurants({
      key,
      coords: room.coords,
      locationText: room.locationText,
      categories: aggregation.categories,
      hangoverStrength: aggregation.hangoverStrength,
      limit: 8,
    });

    const excluded = aggregation.excludedMenus.map((value) => value.toLowerCase());
    const candidates = result.items
      .filter((item) => !excluded.some((menu) => `${item.name} ${item.categoryRaw || ''}`.toLowerCase().includes(menu)))
      .slice(0, 5);

    if (candidates.length < 2) {
      throw new Error('팀 조건에 맞는 식당 후보가 부족합니다. 조건을 완화해 주세요.');
    }

    room.status = 'voting';
    room.aggregation = aggregation;
    room.weather = result.weather;
    room.appliedSignals = result.appliedSignals;
    room.candidates = candidates;
    room.lastError = '';
    for (const participant of room.participants) participant.vote = null;
    await this.putRoom(room);
    return room;
  }

  async fetch(request) {
    this.forwardedKakaoKey = request.headers.get('x-jeommechu-internal-kakao-key') || '';
    const action = new URL(request.url).pathname.split('/').filter(Boolean).pop() || 'state';

    if (action === 'status' && request.method === 'GET') {
      const direct = Boolean(this.env.KAKAO_REST_API_KEY);
      const forwarded = Boolean(this.forwardedKakaoKey);
      return json({
        ok: direct || forwarded,
        durableObjectSecret: direct,
        forwardedSecret: forwarded,
      }, direct || forwarded ? 200 : 503);
    }

    try {
      return await super.fetch(request);
    } finally {
      this.forwardedKakaoKey = '';
    }
  }
}
