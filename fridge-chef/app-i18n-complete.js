'use strict';

// One presentation owner. The previous module supplies the static dictionary only;
// its DOM observer is deliberately not started. Never translate canonical data keys.
(() => {
  const dictionary = window.FridgeChefI18n;
  const key = 'fridgeChefLanguage';
  const cacheKey = 'fridgeChefEnglishTextV1';
  const hangul = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
  const extra = {
    '한국어': 'Korean', '영어': 'English', '앱 언어': 'App language',
    'STEP 2 · INGREDIENTS': 'STEP 2 · INGREDIENTS',
    'STEP 3 · PREFERENCES': 'STEP 3 · PREFERENCES',
    '맛·시간 설정': 'Flavor & time', '맛 · 시간 설정': 'Flavor & time',
    '선택 완료': 'Selection complete', '선택한 재료': 'Selected ingredients',
    '재료 추가': 'Add ingredient', '직접 입력': 'Enter an ingredient',
    '다시 선택하기': 'Choose again', '다시 조합하기': 'Try another combination',
    '재료를 골라주세요': 'Choose ingredients', '선택한 재료가 없습니다.': 'No ingredients selected.',
    '요리를 준비하고 있어요': 'Preparing your recipes', '생성 중': 'Creating recipes',
    '보관': 'Storage', '주의': 'Safety', '불 세기': 'Heat', '조리시간': 'Cooking time',
    '확인': 'OK', '취소': 'Cancel', '삭제': 'Delete', '저장': 'Save', '공유': 'Share',
    '다시 시도': 'Retry', '홈으로': 'Go home', '메인으로 돌아가기': 'Return home',
    '장보기 목록': 'Shopping list', '추가로 살 재료가 없습니다.': 'No additional ingredients needed.',
    '선택한 재료를 활용한 한 끼': 'A meal using your ingredients',
    '오늘의 냉장고 요리': 'Today’s fridge-to-table recipe', '냉장고 한 끼': 'Fridge-to-table meal',
    '적당량': 'As needed', '약간': 'A little', '취향껏': 'To taste',
    '신라면': 'Shin Ramyun', '목살': 'Pork neck', '칵테일새우': 'Cocktail shrimp',
    '먹다남은후라이드치킨': 'Leftover fried chicken', '먹다 남은 후라이드치킨': 'Leftover fried chicken',
    '소금': 'Salt', '후추': 'Black pepper', '설탕': 'Sugar', '간장': 'Soy sauce',
    '진간장': 'Soy sauce', '국간장': 'Soup soy sauce', '고춧가루': 'Korean chili flakes',
    '고추장': 'Gochujang', '된장': 'Doenjang', '다진 마늘': 'Minced garlic',
    '참기름': 'Sesame oil', '식용유': 'Cooking oil', '올리브유': 'Olive oil',
    '마늘': 'Garlic', '버터': 'Butter', '깨': 'Sesame seeds', '물': 'Water',
    '김치찌개': 'Kimchi Stew', '돼지김치두루치기': 'Pork and Kimchi Stir-Fry',
    '재료의 색과 질감을 확인한 뒤 다음 단계로 넘어가세요.': 'Check the color and texture before moving to the next step.',
    '색과 질감을 확인하고 다음 단계로 넘어가세요.': 'Check the color and texture before continuing.',
    '재료는 최대 5개까지 선택할 수 있어요.': 'You can choose up to five ingredients.',
    '재료는 최대 5개까지 선택할 수 있어요. 냉장고도 정원이 있습니다.': 'You can choose up to five ingredients.',
    '이미 선택한 재료입니다.': 'This ingredient is already selected.',
    '이미 선택한 재료입니다. 재료도 중복 출근은 사양합니다.': 'This ingredient is already selected.',
    '먼저 재료를 하나 이상 선택해 주세요. 공기로는 레시피가 안 나옵니다.': 'Choose at least one ingredient first.',
    '먼저 재료를 하나 이상 선택해 주세요. 빈 냉장고도 아니고 빈 선택으로는 어렵습니다.': 'Choose at least one ingredient first.',
    '취향을 고른 뒤 레시피를 만들어 주세요. 결과는 소환 전에는 나타나지 않습니다.': 'Choose your preferences, then create recipes.',
    '앞 단계부터 차례로 진행해 주세요. 순서를 만든 데에는 드물게 이유가 있습니다.': 'Please complete the previous step first.',
    '기존 레시피는 작성된 언어로 유지됩니다. 새로 만드는 레시피는 한국어로 제공됩니다.': 'Recipe translations are available when you switch to English.'
  };
  const originals = new WeakMap();
  const attrs = new WeakMap();
  const translated = new Map();
  const pending = new Set();
  const activeSources = new Set();
  const failed = new Set();
  const watched = ['placeholder', 'aria-label', 'alt', 'title'];
  let language = 'ko';
  try { language = localStorage.getItem(key) === 'en' ? 'en' : 'ko'; } catch {}
  const queryLanguage = new URLSearchParams(location.search).get('lang');
  if (queryLanguage === 'ko' || queryLanguage === 'en') language = queryLanguage;
  try {
    const cache = JSON.parse(localStorage.getItem(cacheKey) || '[]');
    if (Array.isArray(cache)) cache.slice(-600).forEach(pair => {
      if (Array.isArray(pair) && pair.length === 2 && typeof pair[0] === 'string' && typeof pair[1] === 'string' && !hangul.test(pair[1])) translated.set(...pair);
    });
  } catch {}
  let initialized = false, loading = false, observer, timer, activeRequest = null;
  let localizing = false, rerun = false;
  document.documentElement.lang = language;
  const normalize = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();

  function english(value) {
    const plain = normalize(value);
    if (Object.prototype.hasOwnProperty.call(extra, plain)) return extra[plain];
    const known = dictionary.t(plain, 'en');
    if (!hangul.test(known)) return known;
    if (translated.has(plain)) return translated.get(plain);
    const parts = plain.split(/(\s*[·•|]\s*)/);
    if (parts.length > 1) {
      const converted = parts.map((part, i) => i % 2 ? part : english(part));
      if (converted.every(part => part !== null)) return converted.join('');
    }
    const count = plain.match(/^(?:총\s*)?(\d+)개(?:\s*선택)?$/);
    if (count) return `${count[1]} selected`;
    const step = plain.match(/^(\d+)단계$/);
    if (step) return `${step[1]} steps`;
    const quantity = plain.match(/^(\d+(?:\.\d+)?(?:\s*[~–-]\s*\d+(?:\.\d+)?)?)\s*(큰술|작은술|개|장|컵|줌|쪽|팩|봉지)$/);
    if (quantity) return `${quantity[1]} ${{ '큰술':'tbsp', '작은술':'tsp', '개':'pcs', '장':'slices', '컵':'cups', '줌':'handfuls', '쪽':'cloves', '팩':'packs', '봉지':'bags' }[quantity[2]]}`;
    return null;
  }

  function enqueue(source) {
    const text = normalize(source);
    if (text.length > 3000) { failed.add(text); return; }
    if (hangul.test(text) && !translated.has(text) && !failed.has(text) && !activeSources.has(text) && text.length <= 3000) {
      pending.add(text);
      if (!activeRequest && !timer) timer = setTimeout(flush, 60);
    }
  }

  function t(value, lang = language) {
    const source = String(value ?? '');
    if (lang !== 'en' || !hangul.test(source)) return source;
    const result = english(source);
    if (result !== null) return source.replace(source.trim(), result);
    enqueue(source);
    return failed.has(normalize(source)) ? 'Translation unavailable' : 'Translating…';
  }

  function saveCache() {
    while (translated.size > 600) translated.delete(translated.keys().next().value);
    try {
      const entries = [...translated];
      while (entries.length && JSON.stringify(entries).length > 250000) entries.shift();
      localStorage.setItem(cacheKey, JSON.stringify(entries));
    } catch {}
  }

  async function flush() {
    clearTimeout(timer); timer = null;
    if (activeRequest || !pending.size) return activeRequest;
    const batch = [];
    let characters = 0;
    for (const text of pending) {
      if (batch.length >= 50 || characters + text.length > 16000) break;
      batch.push(text); characters += text.length;
    }
    batch.forEach(text => { pending.delete(text); activeSources.add(text); });
    activeRequest = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 35000);
      try {
        const response = await fetch('/api/translate-text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          cache: 'no-store', signal: controller.signal,
          body: JSON.stringify({ texts: batch, language: 'en' })
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.translations) || data.translations.length !== batch.length) throw new Error('Translation failed');
        if (data.translations.some(text => typeof text !== 'string' || !text.trim() || hangul.test(text))) throw new Error('Incomplete translation');
        batch.forEach((source, i) => { translated.set(source, data.translations[i]); failed.delete(source); });
        saveCache();
      } catch {
        batch.forEach(text => failed.add(text));
      } finally { clearTimeout(timeout); }
    })();
    try { await activeRequest; }
    finally {
      activeRequest = null;
      batch.forEach(text => { activeSources.delete(text); pending.delete(text); });
      localize();
      if (pending.size) timer = setTimeout(flush, 60);
    }
  }

  async function translateAll(values, lang) {
    if (lang !== 'en') return values.map(value => String(value ?? ''));
    values.forEach(value => { if (hangul.test(String(value)) && english(value) === null) enqueue(value); });
    while (activeRequest || pending.size) {
      if (activeRequest) await activeRequest; else await flush();
    }
    const result = values.map(value => hangul.test(String(value)) ? english(value) : String(value ?? ''));
    if (result.some(value => value === null)) throw new Error('Translation unavailable');
    return result;
  }

  function setText(node, source) {
    let rendered = t(source);
    if (language === 'en' && normalize(source) === '보통' && node.parentElement.closest('#saltyOptions')) rendered = 'Regular';
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
    originals.set(node, { source, rendered });
  }

  function controls() {
    document.querySelectorAll('[data-category],[data-state-key][data-value],[data-wizard-jump],[data-ingredient],[data-remove]').forEach(control => {
      const source = control.dataset.category || control.dataset.value || control.dataset.ingredient || control.dataset.remove || ({1:'메인',2:'재료',3:'취향',4:'레시피'})[control.dataset.wizardJump];
      const label = control.querySelector('span:not(.ingredient-icon)') || control;
      const node = [...label.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
      if (source && node) setText(node, source);
    });
  }

  function statusNotice() {
    let note = document.querySelector('#fcTranslationNotice');
    const needsNotice = language === 'en' && failed.size > 0;
    if (!needsNotice) { note?.remove(); return; }
    if (!note) {
      note = document.createElement('div');
      note.id = 'fcTranslationNotice';
      note.setAttribute('role', 'status');
      note.innerHTML = '<span>Some content could not be translated.</span> <button type="button">Retry translation</button>';
      note.querySelector('button').addEventListener('click', () => {
        const retry = [...failed]; failed.clear(); retry.forEach(enqueue); localize();
      });
      document.body.appendChild(note);
    }
  }

  function localize() {
    if (!document.body) return;
    if (localizing) { rerun = true; return; }
    localizing = true;
    observer?.disconnect();
    try {
      document.querySelectorAll('select option:not([value])').forEach(option => option.value = option.textContent);
      controls();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue.trim() || !node.parentElement || node.parentElement.closest('script,style,textarea,.fc-language-switch,#fcTranslationNotice,[contenteditable="true"]')) continue;
        const previous = originals.get(node);
        const source = previous && node.nodeValue === previous.rendered ? previous.source : node.nodeValue;
        setText(node, source);
      }
      document.querySelectorAll('[placeholder],[aria-label],img[alt],[title]').forEach(element => {
        if (element.closest('.fc-language-switch,#fcTranslationNotice,script,style')) return;
        const saved = attrs.get(element) || {};
        watched.forEach(name => {
          if (!element.hasAttribute(name)) return;
          const current = element.getAttribute(name), last = saved[name];
          const source = last && last.rendered === current ? last.source : current;
          const rendered = t(source);
          if (rendered !== current) element.setAttribute(name, rendered);
          saved[name] = { source, rendered };
        });
        attrs.set(element, saved);
      });
      document.querySelectorAll('.fc-original-language-note').forEach(note => note.remove());
      statusNotice();
    } finally {
      localizing = false;
      observer?.observe(document.body, { childList:true, characterData:true, subtree:true, attributes:true, attributeFilter:watched });
    }
    if (rerun) { rerun = false; queueMicrotask(localize); }
  }

  function applyLanguage(lang) {
    language = lang === 'en' ? 'en' : 'ko';
    try { localStorage.setItem(key, language); } catch {}
    try {
      const url = new URL(location.href); url.searchParams.set('lang', language);
      history.replaceState(history.state, '', url);
    } catch {}
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Fridge Chef | Cook with what you have' : '냉털셰프 | 있는 재료로 근사한 한 끼';
    document.querySelectorAll('[data-fc-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.fcLanguage === language));
      button.disabled = loading;
      if (button.dataset.fcLanguage === 'ko') button.textContent = language === 'en' ? 'Korean' : '한국어';
    });
    document.querySelector('.fc-language-switch')?.setAttribute('aria-label', language === 'en' ? 'App language' : '앱 언어');
    localize();
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return; }
    const area = document.createElement('textarea');
    area.value = text; area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area); area.select();
    const copied = document.execCommand('copy'); area.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }

  async function displayedRecipe(recipe, lang) {
    const clone = JSON.parse(JSON.stringify(recipe));
    const fields = [];
    const add = (object, field) => { if (typeof object?.[field] === 'string') fields.push([object, field]); };
    ['dishName','title','subtitle','cuisine','difficulty','tip','storage','allergyNote'].forEach(field => add(clone, field));
    (clone.ingredients || []).forEach(item => ['name','amount'].forEach(field => add(item, field)));
    (clone.steps || []).forEach(step => ['title','description','heat','duration','checkpoint'].forEach(field => add(step, field)));
    const values = await translateAll(fields.map(([object, field]) => object[field]), lang);
    fields.forEach(([object, field], i) => object[field] = values[i]);
    return clone;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const switcher = document.createElement('div');
    switcher.className = 'fc-language-switch'; switcher.setAttribute('role','group');
    switcher.innerHTML = '<button type="button" data-fc-language="ko">한국어</button><button type="button" data-fc-language="en">English</button>';
    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-fc-language]');
      if (button && !loading) applyLanguage(button.dataset.fcLanguage);
    });
    document.querySelector('.header-actions')?.appendChild(switcher);
    document.body.classList.add('fc-language-ready');
    elements.favoritesButton.setAttribute('aria-label','저장한 레시피');
    elements.favoritesButton.setAttribute('title','저장한 레시피');
    const originalGetFormData = getFormData;
    getFormData = () => ({ ...originalGetFormData(), language });
    const previousAdd = addCustomIngredient;
    addCustomIngredient = function addLocalizedIngredient() {
      const raw = elements.customIngredient.value.trim().replace(/\s+/g,' ').slice(0,60);
      if (!raw) return;
      const catalog = [...new Set(Object.values(ingredientCatalog).flat())];
      const name = catalog.find(item => item === raw || dictionary.t(item,'en').toLowerCase() === raw.toLowerCase()) || raw;
      if (state.selected.includes(name)) showToast('이미 선택한 재료입니다.');
      else if (state.selected.length >= 5) showToast('재료는 최대 5개까지 선택할 수 있어요.');
      else { state.selected.push(name); elements.customIngredient.value = ''; renderSelected(); }
    };
    elements.customIngredient.maxLength = 60;
    elements.addIngredientButton.removeEventListener('click', previousAdd);
    elements.addIngredientButton.addEventListener('click', addCustomIngredient);
    const previousLoading = setLoading;
    setLoading = function localizedLoading(value) {
      loading = Boolean(value);
      switcher.querySelectorAll('button').forEach(button => button.disabled = loading);
      const result = previousLoading(value); localize(); return result;
    };
    ['renderCategoryTabs','renderIngredientCloud','renderSelected','renderOptionButtons','updateWizardSelectionState','showWizardStep','renderResults','openRecipe','renderFavorites','renderAiError','showToast','updateFavoriteCount'].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function') return;
      window[name] = function localizedRender(...args) {
        const result = previous.apply(this, args);
        if (name === 'renderSelected') window.updateWizardSelectionState?.();
        localize(); return result;
      };
    });
    const previousPublicError = publicErrorMessage;
    publicErrorMessage = message => {
      const source = previousPublicError(message);
      const result = language === 'en' ? english(source) : source;
      return result === null ? 'The recipe service is temporarily unavailable. Please try again shortly.' : result;
    };
    shareRecipe = async function shareLocalizedRecipe(recipe) {
      if (!recipe) return;
      const lang = language;
      try {
        const r = await displayedRecipe(recipe, lang), label = value => t(value, lang);
        const steps = (r.steps || []).map((s,i) => `${i+1}. ${s.title}\n${[s.heat,s.duration].filter(Boolean).join(' · ')}\n${s.description}${s.checkpoint ? `\n${label('완료 기준')}: ${s.checkpoint}` : ''}`).join('\n\n');
        const text = [`[${label('냉털셰프')}] ${r.title}`,r.subtitle,`${label(`${r.timeMinutes}분`)} · ${r.difficulty} · ${label(`${r.servings}인분`)}`,'',label('준비 재료'),(r.ingredients||[]).map(i=>`- ${i.name}: ${i.amount}`).join('\n'),'',label('상세 조리 순서'),steps,'',`${label('셰프의 한 수')}: ${r.tip}`,`${label('보관:')} ${r.storage}`,`${label('주의:')} ${r.allergyNote}`].join('\n');
        const url = new URL(location.pathname,location.origin); url.searchParams.set('lang',lang);
        if (navigator.share) {
          try { await navigator.share({title:`${r.title} | ${label('냉털셰프')}`,text,url:url.href}); showToast('레시피를 공유했습니다.'); return; }
          catch(error) { if(error.name === 'AbortError') return; }
        }
        await copyText(`${text}\n\n${url.href}`); showToast('레시피 내용을 복사했습니다.');
      } catch { showToast(language === 'en' ? 'Unable to translate or share this recipe. Please retry.' : '공유 기능을 사용할 수 없습니다.'); }
    };
    copyShoppingList = async function copyLocalizedShoppingList(recipe) {
      if (!recipe) return;
      const lang = language;
      try {
        const r = await displayedRecipe(recipe,lang), label = value => t(value,lang);
        const extra = (r.ingredients || []).filter(item=>!item.owned);
        await copyText(`[${r.title} — ${label('장보기 목록')}]\n${extra.length ? extra.map(i=>`- ${i.name}: ${i.amount}`).join('\n') : label('추가로 살 재료가 없습니다.')}`);
        showToast('장보기 목록을 복사했습니다.');
      } catch { showToast(language === 'en' ? 'Unable to translate or copy the list. Please retry.' : '복사 권한이 없어 목록을 복사하지 못했습니다.'); }
    };
    observer = new MutationObserver(localize);
    applyLanguage(language);
  }

  window.FridgeChefI18n = {
    init, t, refresh:localize, getLanguage:()=>language,
    setLanguage:lang=>{if(!loading) applyLanguage(lang);},
    whenIdle:async()=>{while(activeRequest || pending.size){if(activeRequest) await activeRequest; else await flush();}},
    audit:()=>({language,pending:pending.size,failed:failed.size})
  };
})();
