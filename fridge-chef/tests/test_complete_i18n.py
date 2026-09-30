"""Run against the actual static app. Network AI calls are deterministic fixtures."""
import copy
import functools
import http.server
import json
import os
import re
import threading
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('TEST_OUTPUT', '/tmp/fridge-i18n-tests'))
OUT.mkdir(parents=True, exist_ok=True)
HANGUL = re.compile(r'[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]')
PAIRS = {
    '포근한 집밥 김치찌개': 'Comforting Home-style Kimchi Stew',
    '깊은 국물이 좋은 따뜻한 한 끼': 'A warming meal with a rich broth',
    '재료 손질': 'Prepare the ingredients',
    '냄비에 김치 200g과 물 400ml를 넣고 저어주세요.': 'Add 200g of kimchi and 400ml of water to a pot and stir.',
    '김치가 부드러워지고 국물이 끓으면 다음 단계로 넘어가세요.': 'Continue when the kimchi is soft and the broth is boiling.',
    '국물이 줄면 물을 보충하고 마지막에 간을 맞추세요.': 'Add water if the broth reduces, and adjust the seasoning at the end.',
    '밀폐 용기에 담아 냉장 보관하세요.': 'Refrigerate in a sealed container.',
    '제품의 알레르기 표시를 확인하세요.': 'Check the product labels for allergens.',
    '재료를 얇게 썰어주세요.': 'Slice the ingredients thinly.',
    '냄비를 확인하세요.': 'Check the pot.',
}
LEGACY = {
    'id': 'legacy-ko', 'language': 'ko', 'dishName': '김치찌개', 'title': '포근한 집밥 김치찌개',
    'subtitle': '깊은 국물이 좋은 따뜻한 한 끼', 'cuisine': '한식', 'difficulty': '쉬움',
    'timeMinutes': 20, 'servings': 2, 'matchScore': 100, 'emoji': '🍲',
    'usedIngredients': ['김치'], 'extraIngredients': ['소금'],
    'ingredients': [{'name':'김치','inputName':'김치','amount':'200g','owned':True}, {'name':'소금','inputName':'','amount':'1작은술','owned':False}],
    'steps': [{'title':'재료 손질','description':'냄비에 김치 200g과 물 400ml를 넣고 저어주세요.','heat':'중불','duration':'2~3분','checkpoint':'김치가 부드러워지고 국물이 끓으면 다음 단계로 넘어가세요.'} for _ in range(5)],
    'tip':'국물이 줄면 물을 보충하고 마지막에 간을 맞추세요.',
    'storage':'밀폐 용기에 담아 냉장 보관하세요.', 'allergyNote':'제품의 알레르기 표시를 확인하세요.'
}
EN = copy.deepcopy(LEGACY)
EN.update(language='en', title='Comforting Kimchi Stew', dishName='Kimchi Stew', subtitle='A comforting meal made with your ingredients', tip='Add water as needed.', storage='Refrigerate promptly.', allergyNote='Check allergen labels.')
EN['ingredients'] = [{'name':'Kimchi','inputName':'김치','amount':'200g','owned':True},{'name':'Salt','inputName':'','amount':'1 tsp','owned':False}]
EN['steps'] = [{'title':'Prepare ingredients','description':'Add 200g of kimchi and 400ml of water to a pot and stir.','heat':'Medium heat','duration':'2–3 min','checkpoint':'Continue when the broth boils.'} for _ in range(5)]

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width':390,'height':844})
    context.add_init_script("""if (!localStorage.getItem('fridgeChefFavorites')) localStorage.setItem('fridgeChefFavorites',JSON.stringify(%s));
    window.sharedData=null; window.copiedText=null;
    Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedData=data;}});
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedText=text;}}});""" % json.dumps([LEGACY],ensure_ascii=False))
    page = context.new_page()
    errors, unknown, batches, payloads, checkpoints = [], [], [], [], []
    fail_translation = [False]
    page.on('pageerror',lambda e:errors.append(str(e)))

    def network(route):
        request = route.request
        url = urlparse(request.url)
        # The external H3 intro is not part of localization. Mock its completion,
        # not the app DOM or its labels; simply aborting leaves its overlay forever.
        if url.hostname == 'cdn.jsdelivr.net' and url.path.endswith('/h3works-intro.js'):
            route.fulfill(content_type='application/javascript',body="document.getElementById('h3LaunchSplash')?.remove();document.body.classList.remove('h3-intro-running');")
            return
        if url.hostname != '127.0.0.1':
            route.abort(); return
        if url.path == '/api/status':
            route.fulfill(json={'aiEnabled':True}); return
        if url.path == '/api/translate-text':
            texts = request.post_data_json['texts']; batches.append(texts)
            if fail_translation[0]: route.fulfill(status=503,json={'error':'Temporary failure'}); return
            for text in texts:
                if text not in PAIRS: unknown.append(text)
            route.fulfill(json={'translations':[PAIRS.get(text,'UNMAPPED TEST STRING') for text in texts]}); return
        if url.path == '/api/generate-recipe':
            payloads.append(request.post_data_json)
            recipes=[]
            for i in range(3):
                r=copy.deepcopy(EN); r['title']=f'Comforting Kimchi Stew {i+1}'; recipes.append(r)
            route.fulfill(json={'recipes':recipes,'source':'gemini'}); return
        if url.path.startswith('/api/'):
            route.fulfill(status=204); return
        route.continue_()

    page.route('**/*',network)

    def settle():
        page.wait_for_timeout(160)
        page.evaluate('() => FridgeChefI18n.whenIdle()')
        page.wait_for_timeout(100)

    def english_check(label):
        settle()
        leftovers = page.evaluate("""() => {
          const h=/[\\u1100-\\u11ff\\u3130-\\u318f\\uac00-\\ud7af]/, bad=[];
          const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
          let n; while(n=walk.nextNode()) {
            const e=n.parentElement;
            if(e && !e.closest('script,style,textarea') && e.getClientRects().length && h.test(n.nodeValue)) bad.push(n.nodeValue);
          }
          document.querySelectorAll('select option').forEach(e=>{if(h.test(e.textContent))bad.push(e.textContent);});
          document.querySelectorAll('[placeholder],[aria-label],img[alt],[title]').forEach(e=>{
            if(!e.getClientRects().length)return;
            for(const a of ['placeholder','aria-label','alt','title']) if(h.test(e.getAttribute(a)||''))bad.push(a+': '+e.getAttribute(a));
          });
          document.querySelectorAll('body *').forEach(e=>{if(e.getClientRects().length)for(const p of ['::before','::after']){const c=getComputedStyle(e,p).content;if(h.test(c))bad.push(c);}});
          return bad;
        }""")
        assert not leftovers, (label,leftovers)
        assert page.evaluate('document.documentElement.lang') == 'en', label
        assert not page.locator('body').inner_text().count('Translating…'), label
        assert not errors, errors
        checkpoints.append(label)
        print('PASS',label,flush=True)

    try:
        page.goto(base+'/index.html?lang=en')
        page.wait_for_selector('.fc-language-ready')
        english_check('home')
        page.locator('#homeFinalStart').click()
        english_check('ingredient screen')
        for category in page.evaluate('Object.keys(ingredientCatalog)'):
            page.locator(f'[data-category="{category}"]').click()
            english_check('category '+category)
        page.locator('[data-category="인기"]').click()
        for ingredient in ['계란','김치','돼지고기','두부','양파']:
            page.locator(f'[data-ingredient="{ingredient}"]').click()
            english_check('select '+ingredient)
        page.evaluate("toggleIngredient('감자')")
        english_check('ingredient limit toast')
        page.locator('[data-remove="양파"]').click()
        page.locator('#customIngredient').fill('목살')
        page.locator('#addIngredientButton').click()
        english_check('custom ingredient')
        assert 'Pork neck' in page.locator('#selectedTray').inner_text()
        page.locator('#wizardIngredientNext').click()
        english_check('preferences')
        choices = page.locator('[data-state-key]').evaluate_all('(els)=>els.map(e=>[e.dataset.stateKey,e.dataset.value])')
        for state_key,value in choices:
            page.locator(f'[data-state-key="{state_key}"][data-value="{value}"]').click()
        page.locator('#difficulty').select_option('보통')
        page.locator('#servings').select_option('2')
        page.locator('#maxTime').fill('40')
        english_check('all preference options and time slider')
        page.locator('#generateButton').click()
        page.wait_for_selector('#recipeGrid .recipe-card')
        english_check('English results')
        assert payloads[-1]['language']=='en'
        assert payloads[-1]['difficulty']=='보통'
        assert '계란' in payloads[-1]['ingredients']
        for i in range(3):
            page.locator('[data-detail]').nth(i).click()
            english_check('English detail '+str(i))
            page.locator('[data-share]').click()
            page.wait_for_function('window.sharedData !== null')
            assert not HANGUL.search(json.dumps(page.evaluate('window.sharedData'),ensure_ascii=False))
            page.locator('[data-copy]').click()
            page.wait_for_function('window.copiedText !== null')
            assert not HANGUL.search(page.evaluate('window.copiedText'))
            page.locator('#modalClose').click()
        page.locator('#favoritesButton').click()
        english_check('saved Korean recipe title')
        page.locator('[data-favorite-open="legacy-ko"]').click()
        english_check('saved Korean recipe full detail')
        assert '400ml' in page.locator('.steps-list').inner_text()
        page.locator('[data-share]').click()
        settle()
        assert 'Comforting Home-style Kimchi Stew' in page.evaluate('window.sharedData.text')
        assert not HANGUL.search(page.evaluate('window.sharedData.text'))
        assert page.evaluate("JSON.parse(localStorage.getItem('fridgeChefFavorites'))[0].title") == LEGACY['title']
        page.evaluate("closeModal(elements.recipeModal);closeModal(elements.favoritesModal)")
        page.locator('#homeResetButton').click()
        english_check('home reset retains English')
        assert page.evaluate('state.selected.length')==0
        page.locator('[data-fc-language="ko"]').click()
        assert '냉털셰프' in page.locator('.brand').first.inner_text()
        page.locator('[data-fc-language="en"]').click()
        english_check('round-trip language switch')
        page.evaluate("document.body.insertAdjacentHTML('beforeend','<p id=lateText>재료를 얇게 썰어주세요.</p>')")
        english_check('late asynchronous text')
        assert page.locator('#lateText').inner_text()==PAIRS['재료를 얇게 썰어주세요.']
        fail_translation[0]=True
        page.evaluate("document.querySelector('#lateText').textContent='냄비를 확인하세요.'")
        settle()
        assert page.locator('#fcTranslationNotice').is_visible()
        assert page.locator('#lateText').inner_text()=='Translation unavailable'
        fail_translation[0]=False
        page.locator('#fcTranslationNotice button').click()
        english_check('translation failure and explicit retry')
        assert page.locator('#lateText').inner_text()==PAIRS['냄비를 확인하세요.']
        page.reload(); page.wait_for_selector('.fc-language-ready')
        english_check('reload persists English')
        for width in [320,768,1280]:
            page.set_viewport_size({'width':width,'height':844})
            english_check('viewport '+str(width))
        assert not unknown, 'Static strings missing dictionary: '+repr(unknown)
        assert not errors, errors
        page.screenshot(path=str(OUT/'english-home.png'),full_page=True)
        (OUT/'report.json').write_text(json.dumps({'passed':True,'checkpoints':checkpoints,'translationBatches':len(batches),'consoleErrors':errors},ensure_ascii=False,indent=2))
        print(json.dumps({'passed':True,'checkpoints':checkpoints,'translationBatches':len(batches)},ensure_ascii=False))
    except Exception:
        page.screenshot(path=str(OUT/'failure.png'),full_page=True)
        (OUT/'failure.json').write_text(json.dumps({'errors':errors,'unknown':unknown,'batches':batches,'checkpoints':checkpoints},ensure_ascii=False,indent=2))
        print('UNMAPPED',json.dumps(unknown,ensure_ascii=False)); print('ERRORS',errors)
        raise
    finally:
        browser.close();server.shutdown()
