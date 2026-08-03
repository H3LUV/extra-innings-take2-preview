# 오늘의 MLB — Cloudflare 이전판

## 구조

- `public/`: Cloudflare Pages에 배포되는 정적 사이트
- `scripts/build-daily.mjs`: MLB·미국 현지 심층 기사·트랜잭션·순위·칼럼을 생성
- 데이터는 GitHub Actions가 매일 오전 7시(KST)에 생성

## Cloudflare Pages 설정

- Production branch: `today-mlb-cloudflare`
- Build command: 비워두기
- Build output directory: `public`

데이터 갱신은 GitHub Actions가 담당하므로 Cloudflare에서 서버 함수나 환경변수는 필요하지 않습니다.
