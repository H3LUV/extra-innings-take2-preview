# Today MLB Kakao Open Chat setup

## Important limitation

The official Kakao Open Chat API cannot attach to an arbitrary existing public Open Chat room. It requires a Kakao Developers service app with an approved Open Chat domain ID, and the room must be created and managed through the Open Chat API.

## Implemented

- `scripts/send-kakao-openchat.mjs`: refreshes a Kakao access token and sends the latest editorial as a text template with its dedicated column URL.
- `.github/workflows/today-mlb-kakao.yml`: runs every day at 07:00 Asia/Seoul.
- Delivery remains disabled until repository variable `KAKAO_OPENCHAT_ENABLED=true` and all required secrets exist.

## Required GitHub secrets

- `KAKAO_REST_API_KEY`
- `KAKAO_CLIENT_SECRET` (optional unless enabled in the app)
- `KAKAO_REFRESH_TOKEN`
- `KAKAO_OPENCHAT_DOMAIN_ID`
- `KAKAO_OPENCHAT_LINK_ID`

## Kakao prerequisites

1. Register a Kakao Developers app.
2. Enable Kakao Login.
3. Request and receive an Open Chat domain ID and API permission.
4. Enable the consent item for participating in and managing Kakao Open Chat.
5. Connect the owner Kakao account to the app and issue a refresh token.
6. Create a group Open Chat room through the Kakao Open Chat API.
7. Store the values above as GitHub Actions secrets and enable the repository variable.

## Message endpoint

The sender uses the external Open Chat default-template endpoint:

`POST https://kapi.kakao.com/v2/api/talk/openchat/message/default/send`

The sending Kakao user must be a member of the API-managed group room.
