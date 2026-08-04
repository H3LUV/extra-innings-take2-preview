import fs from 'node:fs/promises';

const required = [
  'KAKAO_REST_API_KEY',
  'KAKAO_REFRESH_TOKEN',
  'KAKAO_OPENCHAT_DOMAIN_ID',
  'KAKAO_OPENCHAT_LINK_ID',
];

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required secret: ${name}`);
}

const editorial = JSON.parse(
  await fs.readFile(new URL('../public/data/editorial.json', import.meta.url), 'utf8'),
);

if (!editorial?.slug || !editorial?.title) {
  throw new Error('Latest editorial data is incomplete.');
}

const columnUrl = `https://today-mlb.pages.dev/columns/${encodeURIComponent(editorial.slug)}/`;
const shortDescription = String(editorial.thesis || editorial.dek || '')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 180);

const refreshBody = new URLSearchParams({
  grant_type: 'refresh_token',
  client_id: process.env.KAKAO_REST_API_KEY,
  refresh_token: process.env.KAKAO_REFRESH_TOKEN,
});
if (process.env.KAKAO_CLIENT_SECRET) {
  refreshBody.set('client_secret', process.env.KAKAO_CLIENT_SECRET);
}

const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
  body: refreshBody,
});
const tokenData = await tokenResponse.json();
if (!tokenResponse.ok || !tokenData.access_token) {
  throw new Error(`Kakao token refresh failed: ${JSON.stringify(tokenData)}`);
}

const templateObject = {
  object_type: 'text',
  text: `[오늘의 MLB 칼럼]\n${editorial.title}\n\n${shortDescription}`.slice(0, 200),
  link: {
    web_url: columnUrl,
    mobile_web_url: columnUrl,
  },
  button_title: '칼럼 읽기',
};

const sendBody = new URLSearchParams({
  domain_id: process.env.KAKAO_OPENCHAT_DOMAIN_ID,
  link_id: process.env.KAKAO_OPENCHAT_LINK_ID,
  template_object: JSON.stringify(templateObject),
});

const sendResponse = await fetch(
  'https://kapi.kakao.com/v2/api/talk/openchat/message/default/send',
  {
    method: 'POST',
    headers: {
      authorization: `Bearer ${tokenData.access_token}`,
      'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
    },
    body: sendBody,
  },
);
const sendData = await sendResponse.json();
if (!sendResponse.ok || sendData.result_code !== 0) {
  throw new Error(`Kakao open chat send failed: ${JSON.stringify(sendData)}`);
}

console.log(`Kakao open chat column sent: ${columnUrl}`);
if (tokenData.refresh_token) {
  console.warn('Kakao issued a new refresh token. Update KAKAO_REFRESH_TOKEN before the old token expires.');
}
