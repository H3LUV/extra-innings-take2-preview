# MODETOUR 여행 안내 단축 링크 Worker

외부 단축 URL 서비스 대신 Cloudflare Workers와 Workers KV를 사용해 여행 안내 링크를 직접 발급합니다.

## Cloudflare Dashboard 배포

1. Cloudflare Dashboard에서 **Workers & Pages > Create application > Import a repository**를 선택합니다.
2. GitHub 저장소 `H3LUV/extra-innings-take2-preview`를 선택합니다.
3. Root directory를 `travel-guide-shortener`로 지정합니다.
4. Worker 이름을 `modetour-guide-shortener`로 설정하고 배포합니다.
5. **Storage & Databases > KV**에서 `modetour-guide-links` 네임스페이스를 생성합니다.
6. 배포한 Worker의 **Settings > Bindings > Add > KV Namespace**에서 변수 이름을 `GUIDES`로 지정하고 위 네임스페이스를 연결합니다.
7. 다시 배포한 뒤 `https://<계정서브도메인>.workers.dev/health`에서 `ok: true`를 확인합니다.

## API

### 링크 생성

`POST /api/guides`

```json
{
  "url": "https://h3luv.github.io/extra-innings-take2-preview/travel-guide/?d=...",
  "expiresAt": "2026-10-31T00:00:00.000Z"
}
```

응답:

```json
{
  "id": "Ab3Cd5Ef7",
  "url": "https://modetour-guide-shortener.<account>.workers.dev/g/Ab3Cd5Ef7",
  "expiresAt": "2026-10-31T00:00:00.000Z"
}
```

KV 레코드는 유효기간이 지나면 자동 삭제됩니다. Worker는 모두투어 여행 안내 고객 페이지 주소만 저장하도록 제한되어 있어 임의의 외부 사이트 단축기로 악용할 수 없습니다.
