const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
    res.setHeader('Content-Type', mime[path.extname(file)] || 'text/plain');
    res.end(fs.readFileSync(file));
  } catch { res.writeHead(404).end(); }
});
const HANGUL = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
const koToEn = {
  '포근한 집밥 김치찌개':'Comforting Kimchi Stew', '김치찌개':'Kimchi Stew',
  '김치를 푹 끓인 든든한 한 끼':'A hearty meal of simmered kimchi',
  '재료 손질하기':'Prepare the ingredients',
  '김치 200g을 3cm 크기로 썰어 냄비에 담으세요.':'Cut 200g kimchi into 3cm pieces and put it in a pot.',
  '김치가 부드러워지면 다음 단계로 넘어가세요.':'Continue when the kimchi is tender.',
  '김치가 타면 불을 낮추고 물 20ml를 넣으세요.':'Lower the heat and add 20ml water if the kimchi starts to burn.',
  '밀폐 용기에 넣어 냉장 2일 보관하세요.':'Keep in a covered container in the refrigerator for 2 days.',
  '김치의 젓갈 알레르기를 확인하세요.':'Check for seafood allergens in the kimchi.',
  '새로운 부위의 돼지고기':'A different cut of pork'
};
const report = [];
let activePage;
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    for (const width of [390, 768]) {
      const context = await browser.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage(); activePage = page;
      const errors = []; const requests = []; const translations = [];
      let failGeneration = false;
      page.on('pageerror', error => errors.push(error.message));
      // The external intro normally removes this overlay. Mock completion, not a blank script
      // that leaves its static overlay blocking every real click in the test.
      await page.route('**/h3works-intro.js', route => route.fulfill({ contentType:'application/javascript', body:"document.getElementById('h3LaunchSplash')?.remove();document.body.classList.remove('h3-intro-running');" }));
      await page.route('**/api/status', route => route.fulfill({ json:{ aiEnabled:true } }));
      await page.route('**/api/hero-image*', route => route.fulfill({contentType:'image/svg+xml', body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640"/>'}));
      await page.route('**/api/translate-text', async route => {
        const input = route.request().postDataJSON(); translations.push(input);
        const result = input.texts.map(text => input.language === 'en' ? koToEn[text] : Object.entries(koToEn).find(([,en]) => en === text)?.[0]);
        if (result.some(text => !text)) {
          console.log('MISSING_TRANSLATION', input.language, JSON.stringify(input.texts.filter((_,i) => !result[i])));
          await route.fulfill({ status:502, json:{ error:'Unmapped fixture' } }); return;
        }
        await route.fulfill({ json:{ translations:result, language:input.language } });
      });
      await page.route('**/api/generate-recipe', async route => {
        const input = route.request().postDataJSON(); requests.push(input);
        if (failGeneration) { await route.fulfill({ status:502, json:{error:'레시피 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.'} }); return; }
        const recipes = Array.from({length:3}, (_,i) => ({
          language:'en', title:`Comforting Kimchi Stew ${i+1}`, dishName:'Kimchi Stew', subtitle:'A hearty meal with clear cooking instructions.',
          cuisine:'한식',difficulty:'쉬움',timeMinutes:20,servings:2,matchScore:100,emoji:'🍲',
          usedIngredients:input.ingredients, extraIngredients:['Salt'],
          ingredients:[...input.ingredients.map(name => ({inputName:name,name: name === '김치' ? 'Kimchi' : name === '계란' ? 'Eggs' : name === '두부' ? 'Tofu' : name,amount:'200 g',owned:true})),{name:'Salt',inputName:'',amount:'1 tsp',owned:false}],
          steps:Array.from({length:5},(_,j)=>({title:`Step ${j+1}`,description:'Put 200 g kimchi in a pot and stir gently for 2 minutes.',heat:'Medium heat',duration:'2 min',checkpoint:'Continue when the kimchi is tender.'})),
          tip:'Lower the heat if the pan gets too hot.',storage:'Refrigerate promptly in a covered container.',allergyNote:'Check the ingredient labels for allergens.'
        }));
        await route.fulfill({json:{recipes}});
      });
      async function check(name, allowTranslation = false) {
        await page.evaluate(() => FridgeChefI18n.idle());
        const untranslated = await page.evaluate(() => FridgeChefI18n.audit());
        const pseudo = await page.evaluate(() => [...document.body.querySelectorAll('*')].filter(e => e.getClientRects().length && !e.closest('[hidden],[aria-hidden="true"]')).flatMap(e => ['::before','::after'].map(p => getComputedStyle(e,p).content)).filter(s => /[가-힣]/.test(s)));
        assert.deepEqual(untranslated, [], `${width}/${name}: untranslated DOM`);
        assert.deepEqual(pseudo, [], `${width}/${name}: untranslated CSS`);
        assert.equal(await page.locator('html').getAttribute('lang'), 'en', name);
        assert.equal(await page.evaluate(()=>FridgeChefI18n.getLanguage()),'en', name);
        assert.deepEqual(errors, [], 'Uncaught JavaScript errors');
        if (!allowTranslation) assert.equal(translations.length, 0, `${name}: fixed UI must translate locally`);
        report.push(`${width}px: ${name}`); console.log('PASS', report.at(-1));
      }
      await page.goto(base + '/?lang=en'); await page.waitForSelector('.fc-language-switch');
      await check('home');
      await page.click('#homeFinalStart'); await check('ingredients empty');
      for (const category of ['육류','해산물','채소','탄수화물','기타','인기']) {
        await page.locator(`[data-category="${category}"]`).click(); await check(`category ${category}`);
      }
      await page.locator('[data-ingredient="계란"]').click(); await check('select first ingredient');
      await page.locator('[data-ingredient="김치"]').click(); await page.locator('[data-ingredient="두부"]').click();
      await check('select and rerender ingredients');
      assert.deepEqual(await page.evaluate(()=>state.selected), ['계란','김치','두부']);
      await page.locator('[data-remove="계란"]').click(); await check('remove ingredient');
      await page.fill('#customIngredient','Eggs'); await page.click('#addIngredientButton');
      assert.equal(await page.evaluate(()=>state.selected.includes('계란')),true);
      await check('custom English catalog ingredient');
      await page.fill('#customIngredient','신라면'); await page.click('#addIngredientButton');
      await check('specific Korean ingredient display');
      await page.locator('[data-remove="신라면"]').click();
      await page.click('#wizardIngredientNext'); await check('preferences');
      for (const id of ['cuisineOptions','purposeOptions','spicyOptions','saltyOptions','sweetOptions']) {
        const values = await page.locator(`#${id} [data-value]`).evaluateAll(nodes=>nodes.map(node=>node.dataset.value));
        for (const value of values) { await page.locator(`#${id} [data-value="${value}"]`).click(); await check(`${id}/${value}`); }
      }
      await page.selectOption('#difficulty','보통'); await page.selectOption('#servings','3');
      await page.locator('#maxTime').evaluate(e=>{e.value='45';e.dispatchEvent(new Event('input',{bubbles:true}));});
      await check('dropdown and time changes');
      assert.equal(await page.evaluate(()=>getFormData().difficulty),'보통');
      await page.click('#generateButton'); await page.waitForSelector('.recipe-card');
      await check('generated English recipes');
      assert.equal(requests.at(-1).language,'en');
      assert.deepEqual(requests.at(-1).ingredients,['김치','두부','계란']);
      await page.locator('[data-detail]').first().click(); await check('recipe detail units and checkpoints');
      await page.locator('[data-modal-favorite]').click(); await check('save recipe');
      await page.evaluate(()=>{window.__shared=null;Object.defineProperty(navigator,'share',{configurable:true,value:async value=>{window.__shared=value;}});});
      await page.locator('[data-share]').click(); await page.waitForFunction(()=>Boolean(window.__shared));
      assert.equal(HANGUL.test(await page.evaluate(()=>window.__shared.text)),false,'Shared English recipe');
      await page.click('#modalClose'); await page.click('#favoritesButton'); await check('saved recipes list');
      await page.click('#favoritesClose'); await page.click('#homeResetButton');
      await check('reset home preserves locale'); assert.deepEqual(await page.evaluate(()=>state.selected),[]);
      await page.click('[data-fc-language="ko"]'); assert.equal(await page.locator('html').getAttribute('lang'),'ko');
      await page.click('[data-fc-language="en"]'); await check('toggle Korean then English');
      await page.reload(); await page.waitForSelector('.fc-language-switch'); await check('reload preserves English');
      await page.click('#homeFinalStart'); await page.locator('[data-ingredient="김치"]').click();
      await page.click('#wizardIngredientNext'); failGeneration = true;
      await page.click('#generateButton'); await page.waitForSelector('.ai-error-panel'); await check('generation failure and retry');
      await page.evaluate(() => {
        state.recipes=[{id:'ko-test',language:'ko',dishName:'김치찌개',title:'포근한 집밥 김치찌개',subtitle:'김치를 푹 끓인 든든한 한 끼',cuisine:'한식',difficulty:'쉬움',timeMinutes:20,servings:2,matchScore:100,emoji:'🍲',usedIngredients:['김치'],extraIngredients:['소금'],ingredients:[{inputName:'김치',name:'김치',amount:'200g',owned:true},{name:'소금',amount:'1작은술',owned:false}],steps:Array.from({length:5},()=>({title:'재료 손질하기',description:'김치 200g을 3cm 크기로 썰어 냄비에 담으세요.',heat:'중불',duration:'2~3분',checkpoint:'김치가 부드러워지면 다음 단계로 넘어가세요.'})),tip:'김치가 타면 불을 낮추고 물 20ml를 넣으세요.',storage:'밀폐 용기에 넣어 냉장 2일 보관하세요.',allergyNote:'김치의 젓갈 알레르기를 확인하세요.'}];
        renderResults(getFormData(),'맞춤 레시피'); showWizardStep(4,{force:true});
      });
      await check('existing Korean recipe card', true);
      await page.locator('[data-detail]').first().click(); await check('existing Korean recipe full translation',true);
      assert.equal(await page.evaluate(()=>state.recipes[0].steps[0].description),'김치 200g을 3cm 크기로 썰어 냄비에 담으세요.');
      assert.equal(await page.evaluate(()=>state.recipes[0].ingredients[0].amount),'200g');
      await page.click('#modalClose'); await page.screenshot({path:`language-qa-${width}.png`,fullPage:true});
      await context.close(); activePage = null;
    }
    console.log(JSON.stringify({passed:true,checks:report.length,report},null,2));
    fs.writeFileSync('language-qa-result.json',JSON.stringify({passed:true,checks:report.length,report},null,2));
  } catch(error) {
    fs.writeFileSync('language-qa-result.json', JSON.stringify({passed:false,checks:report.length,report,error:error.message},null,2));
    if (activePage && !activePage.isClosed()) await activePage.screenshot({path:'language-qa-failure.png',fullPage:true}).catch(()=>{});
    throw error;
  } finally { await browser.close(); server.close(); }
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
