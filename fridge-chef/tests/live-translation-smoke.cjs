// One small, non-personal translation verifies the deployed service, not a mocked response.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'https://fridge-chef-ai-tan.vercel.app';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  let ready = false;
  for (let attempt = 0; attempt < 18; attempt++) {
    const response = await fetch(`${base}/app.js?language-smoke=${Date.now()}`, { signal: AbortSignal.timeout(10000), headers: {'Cache-Control':'no-cache'} }).catch(() => null);
    const script = response?.ok ? await response.text() : '';
    if (script.includes('./app-language.js') && script.includes('20260930-ko-en-v6')) { ready = true; break; }
    await pause(5000);
  }
  assert.ok(ready, 'The tested language controller has not reached the production alias.');
  const texts = ['김치 200g을 3cm 크기로 썰어 냄비에 담으세요.', '신라면'];
  const response = await fetch(`${base}/api/translate-text`, {
    method:'POST', signal:AbortSignal.timeout(42000), headers:{'Content-Type':'application/json',Origin:base},
    body:JSON.stringify({language:'en',texts})
  });
  const data = await response.json();
  assert.equal(response.status,200,JSON.stringify(data));
  assert.equal(data.translations?.length,texts.length);
  assert.ok(data.translations.every(text=>typeof text==='string' && text.trim() && !/[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/.test(text)));
  assert.deepEqual((data.translations[0].match(/\d+/g)||[]).sort(), ['200','3']);
  const result = {passed:true,production:base,version:'20260930-ko-en-v6',translations:data.translations};
  fs.writeFileSync('language-live-result.json',JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})().catch(error=>{
  fs.writeFileSync('language-live-result.json',JSON.stringify({passed:false,error:error.message},null,2));
  console.error(error); process.exitCode=1;
});
