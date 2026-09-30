const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(process.argv[2] || 'fridge-chef');
const hangul = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const report = [];
const server = http.createServer((req,res) => {
  const pathname = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file = path.join(root, pathname === '/' ? 'index.html' : pathname);
  if (!file.startsWith(root + path.sep)) {res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,body)=>{
    if(error) {res.writeHead(404);res.end();return;}
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');
    res.end(body);
  });
});

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox']});
  try {
    const context = await browser.newContext({viewport:{width:390,height:844}});
    await context.addInitScript(()=>{
      window.__shared = null;
      window.__copied = null;
      Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.__shared=data;}});
      Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
    });
    const page = await context.newPage();
    const errors = [];
    let translateCalls = 0;
    let generateCalls = 0;
    let failTranslation = false;
    let failGeneration = false;
    const ko = {
      language:'ko',id:'saved-ko',dishName:'김치찌개',title:'포근한 집밥 김치찌개',subtitle:'따뜻하게 끓인 집밥 한 그릇',cuisine:'한식',difficulty:'쉬움',timeMinutes:20,servings:2,matchScore:100,emoji:'🍲',usedIngredients:['김치'],extraIngredients:['소금'],
      ingredients:[{inputName:'김치',name:'김치',amount:'200 g',owned:true},{inputName:'',name:'소금',amount:'1 작은술',owned:false}],
      steps:Array.from({length:5},(_,i)=>({title:`재료 준비 ${i+1}`,description:'김치 200 g을 냄비에 넣고 물 500 ml를 부으세요.',heat:'중불',duration:'2~3분',checkpoint:'김치가 부드러워지면 다음 단계로 넘어가세요.'})),
      tip:'국물이 졸아들면 물 50 ml를 넣으세요.',storage:'밀폐해 냉장 보관하세요.',allergyNote:'알레르기 표시를 확인하세요.'
    };
    const translations = {'포근한 집밥 김치찌개':'Comforting Homestyle Kimchi Stew','따뜻하게 끓인 집밥 한 그릇':'A warming bowl of homestyle stew','김치 200 g을 냄비에 넣고 물 500 ml를 부으세요.':'Place 200 g of kimchi in a pot and add 500 ml of water.','김치가 부드러워지면 다음 단계로 넘어가세요.':'Continue when the kimchi is tender.','국물이 졸아들면 물 50 ml를 넣으세요.':'If the broth reduces, add 50 ml of water.','밀폐해 냉장 보관하세요.':'Refrigerate in a sealed container.','알레르기 표시를 확인하세요.':'Check the allergen labels.','처음 보는 상태 알림':'A new status notification','번역 실패를 테스트합니다':'Testing translation recovery'};
    await page.route('**/*',async route=>{
      const url = route.request().url();
      if (!url.startsWith(origin)) {await route.abort();return;}
      if(url.includes('/api/status')) {await route.fulfill({json:{aiEnabled:true}});return;}
      if(url.includes('/api/hero-image')) {await route.fulfill({status:204});return;}
      if(url.includes('/api/translate-ui')) {
        translateCalls++;
        const body = route.request().postDataJSON();
        if(failTranslation) {await route.fulfill({status:503,json:{error:'Unavailable'}});return;}
        const result = body.texts.map(text=>translations[text] || (/^재료 준비 \d+$/.test(text)?`Preparation ${text.match(/\d+/)[0]}`:null));
        assert(result.every(Boolean),`Missing mock translations: ${body.texts.filter((_,i)=>!result[i]).join(' / ')}`);
        await route.fulfill({json:{translations:result}});return;
      }
      if(url.includes('/api/generate-recipe')) {
        generateCalls++;
        assert.equal(route.request().postDataJSON().language,'en');
        if(failGeneration) {await route.fulfill({status:502,json:{error:'일시적으로 요청을 처리하지 못했습니다.'}});return;}
        await new Promise(resolve=>setTimeout(resolve,100));
        const recipes = Array.from({length:3},(_,i)=>({...ko,id:`result-${i}`,language:'en',dishName:'Kimchi Stew',title:`Homestyle Kimchi Stew ${i+1}`,subtitle:'A warming meal',tip:'Avoid over-reducing the broth.',storage:'Keep refrigerated.',allergyNote:'Check allergens.',steps:ko.steps.map((step,j)=>({...step,title:`Prepare ${j+1}`,description:'Add 200 g kimchi and 500 ml water.',heat:'Medium heat',duration:'2–3 min',checkpoint:'Continue when tender.'}))}));
        await route.fulfill({json:{recipes}});return;
      }
      await route.continue();
    });
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${origin}/?lang=ko`);
    await page.waitForSelector('.fc-language-switch');
    await page.click('[data-fc-language="en"]');
    async function english(label) {
      await page.waitForTimeout(150);
      await page.waitForFunction(()=>!document.body.innerText.includes('Translating…')&&!document.body.innerText.includes('Translating recipe text…'),null,{timeout:8000});
      const text = await page.locator('body').innerText();
      assert(!hangul.test(text),`${label}: untranslated visible text: ${text.split('\n').filter(line=>hangul.test(line)).join(' / ')}`);
      const attrs = await page.locator('[aria-label],[placeholder],img[alt],[title]').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).flatMap(node=>['aria-label','placeholder','alt','title'].map(key=>node.getAttribute(key)||'')));
      assert(!attrs.some(value=>hangul.test(value)),`${label}: untranslated accessible labels`);
      const pseudo = await page.locator('body *').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length).flatMap(node=>['::before','::after'].map(part=>getComputedStyle(node,part).content)));
      assert(!pseudo.some(value=>hangul.test(value)),`${label}: untranslated CSS generated content`);
      report.push(label);
    }
    await english('English home and accessibility labels');
    await page.evaluate(()=>showWizardStep(2));
    await english('Ingredients screen');
    for(const category of ['인기','육류','해산물','채소','탄수화물','기타']) {
      await page.click(`[data-category="${category}"]`);
      const first = page.locator('[data-ingredient]').first();
      const key = await first.getAttribute('data-ingredient');
      await first.click();
      await english(`Select ingredient in ${category}`);
      assert((await page.evaluate(()=>getFormData())).ingredients.includes(key));
      await page.click(`[data-remove="${key}"]`);
      await english(`Remove ingredient in ${category}`);
    }
    assert.equal(translateCalls,0,'Built-in menus must not need model translation');
    await page.fill('#customIngredient','Shin Ramyun');
    await page.click('#addIngredientButton');
    await english('Custom ingredient');
    await page.evaluate(()=>showWizardStep(3));
    for(const id of ['cuisineOptions','purposeOptions','spicyOptions','saltyOptions','sweetOptions']) {
      for(const button of await page.locator(`#${id} button`).all()) {await button.click(); await english(`${id} option`);}
    }
    await page.selectOption('#difficulty','보통');
    assert.equal((await page.evaluate(()=>getFormData())).difficulty,'보통');
    await page.evaluate(()=>{elements.maxTime.value='45';elements.maxTime.dispatchEvent(new Event('input'));});
    await english('Time slider');
    await page.click('#generateButton');
    await page.waitForSelector('.recipe-card');
    await english('Generated recipe results');
    await page.locator('[data-detail]').first().click();
    await english('English recipe details and quantities');
    await page.click('[data-share]');
    await page.waitForFunction(()=>window.__shared);
    assert(!hangul.test(await page.evaluate(()=>window.__shared.text)),'Shared text contains Korean');
    await page.click('[data-copy]');
    await page.waitForFunction(()=>window.__copied);
    assert(!hangul.test(await page.evaluate(()=>window.__copied)),'Shopping list contains Korean');
    await page.click('#modalClose');
    await page.evaluate(recipe=>{state.favorites=[recipe];saveFavorites(state.favorites);},ko);
    await page.click('#favoritesButton');
    await english('Saved Korean recipe translated into English');
    await page.click('[data-favorite-open="saved-ko"]');
    await english('All saved recipe instructions, tips, storage and safety translated');
    assert.equal(await page.evaluate(()=>state.favorites[0].title),ko.title,'Original saved recipe was modified');
    await page.evaluate(()=>window.__shared=null);
    await page.click('[data-share]');
    await page.waitForFunction(()=>window.__shared);
    assert(!hangul.test(await page.evaluate(()=>window.__shared.text)));
    await page.click('#modalClose');
    await page.evaluate(()=>resetFridgeChef());
    await english('Return home resets selection, not language');
    assert.deepEqual(await page.evaluate(()=>state.selected),[]);
    await page.click('[data-fc-language="ko"]');
    assert((await page.locator('body').innerText()).includes('냉털셰프'));
    await page.click('[data-fc-language="en"]');
    await english('Repeated Korean/English switching');
    await page.goto(origin);
    await page.waitForSelector('.fc-language-switch');
    await english('Language preserved on reload');
    const before = translateCalls;
    await page.evaluate(()=>{const element=document.createElement('p');element.id='new-message';element.textContent='처음 보는 상태 알림';document.body.appendChild(element);});
    await english('Asynchronous unknown message is translated');
    assert.equal(translateCalls,before+1);
    await page.evaluate(()=>document.getElementById('new-message').textContent='처음 보는 상태 알림');
    await english('Repeated text uses translation cache');
    assert.equal(translateCalls,before+1);
    failTranslation=true;
    await page.evaluate(()=>document.getElementById('new-message').textContent='번역 실패를 테스트합니다');
    await page.waitForSelector('.fc-translation-status button:not([hidden])');
    assert((await page.locator('body').innerText()).includes('Translation unavailable.'));
    failTranslation=false;
    await page.click('.fc-translation-status button');
    await english('Translation failure retry');
    failGeneration=true;
    await page.evaluate(()=>{showWizardStep(2);toggleIngredient('김치');showWizardStep(3);});
    await page.click('#generateButton');
    await page.waitForSelector('.ai-error-panel');
    await english('Generation errors remain in English');
    assert.equal(errors.length,0,errors.join('\n'));
    assert.equal(generateCalls,2);
    console.log(JSON.stringify({passed:true,checks:report,translateCalls,generateCalls,note:'Real app scripts; mocked recipe and translation API responses.'},null,2));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
