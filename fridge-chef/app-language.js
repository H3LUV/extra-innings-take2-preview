'use strict';

// Own the locale for the whole session. app-i18n.js supplies the static dictionary,
// but its old DOM observer/init is intentionally NOT started.
(() => {
  const dictionary = window.FridgeChefI18n;
  const KEY = 'fridgeChefLanguage';
  const CACHE_KEY = 'fridgeChefTranslationsV4';
  const hangul = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
  const extra = {
    '앱 언어': 'App language', '한국어': 'Korean', '영어': 'English',
    '재료 추가': 'Add ingredient', '직접 입력': 'Add your own', '재료를 입력해주세요': 'Enter an ingredient',
    '재료를 입력해 주세요.': 'Please enter an ingredient.', '선택한 재료': 'Selected ingredients',
    '재료 선택 완료': 'Ingredients selected', '다음': 'Next', '이전': 'Back', '초기화': 'Reset',
    '다시 만들기': 'Make new recipes', '다시 조합하기': 'Try another combination',
    '레시피 생성하기': 'Create recipes', '레시피 생성': 'Create recipes', '메인으로': 'Home',
    '레시피 공유': 'Share recipe', '공유하기': 'Share', '공유': 'Share', '복사': 'Copy',
    '레시피 내용을 복사했습니다.': 'Recipe text copied.', '공유 기능을 사용할 수 없습니다.': 'Sharing is unavailable.',
    '신라면': 'Shin Ramyun', '목살': 'Pork neck', '칵테일새우': 'Cocktail shrimp',
    '먹다남은후라이드치킨': 'Leftover fried chicken', '먹다 남은 후라이드치킨': 'Leftover fried chicken',
    '적당량': 'As needed', '약간': 'A little', '취향껏': 'To taste',
    '소금': 'Salt', '후추': 'Black pepper', '설탕': 'Sugar', '간장': 'Soy sauce',
    '진간장': 'Soy sauce', '국간장': 'Soup soy sauce', '식용유': 'Cooking oil',
    '참기름': 'Sesame oil', '올리브유': 'Olive oil', '다진 마늘': 'Minced garlic',
    '마늘': 'Garlic', '고춧가루': 'Chili flakes', '고추장': 'Gochujang', '된장': 'Doenjang',
    '물': 'Water', '육수': 'Stock', '버터': 'Butter', '깨': 'Sesame seeds',
    '맛술': 'Cooking wine', '식초': 'Vinegar', '굴소스': 'Oyster sauce', '전분': 'Starch',
    '준비': 'Preparation', '손질': 'Prep ingredients', '예열': 'Preheat', '조리': 'Cook', '마무리': 'Finish',
    '불 세기': 'Heat level', '소요 시간': 'Duration', '조리 시간': 'Cooking time',
    '보관': 'Storage', '주의': 'Safety', '알레르기 안내': 'Allergen information',
    '색과 질감을 확인하고 다음 단계로 넘어가세요.': 'Check the color and texture before continuing.',
    '재료의 색과 질감을 확인한 뒤 다음 단계로 넘어가세요.': 'Check the color and texture before continuing.',
    '맞춤 레시피를 준비하고 있어요.': 'Preparing your personalized recipes.',
    '요리 준비 중': 'Preparing recipes', '생성 중': 'Creating recipes', '레시피 생성 중': 'Creating recipes',
    '잠시만 기다려 주세요.': 'Please wait a moment.', '잠시만 기다려주세요': 'Please wait a moment.',
    '다시 시도': 'Try again', '재시도': 'Retry', '확인': 'OK', '취소': 'Cancel',
    '네트워크 오류': 'Network error', '연결 오류': 'Connection error',
    '레시피 생성에 실패했습니다.': 'Unable to create recipes.',
    '레시피 생성 서비스에 연결할 수 없습니다.': 'Unable to connect to the recipe service.',
    '충분한 조리 단계를 만들지 못했습니다.': 'The recipe has too few cooking steps.',
    '선택한 재료의 활용 정보를 확인하지 못했습니다.': 'The selected ingredients could not be verified.',
    '레시피 3개가 완성되지 않았습니다.': 'Not all three recipes were completed.',
    '레시피 생성 결과를 해석하지 못했습니다.': 'The recipe response could not be read.',
    '서비스 설정을 확인해 주세요': 'Please check the service settings',
    '개인정보처리방침': 'Privacy policy', '이용약관': 'Terms of use',
    '저장된 레시피가 없습니다.': 'No saved recipes yet.', '삭제': 'Delete', '저장': 'Save'
  };
  let language = dictionary?.getLanguage() === 'en' ? 'en' : 'ko';
  let initialized = false;
  let loading = false;
  let observing = false;
  let scheduled = false;
  let timer = null;
  let running = null;
  let errors = false;
  const sourceNodes = new WeakMap();
  const sourceAttributes = new WeakMap();
  const queue = new Map();
  const failed = new Set();
  const inFlight = new Set();
  const cache = new Map();
  const attrs = ['placeholder', 'aria-label', 'alt', 'title'];
  try {
    const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
    if (Array.isArray(saved)) saved.slice(-500).forEach(([key, value]) => {
      if (typeof key === 'string' && typeof value === 'string') cache.set(key, value);
    });
  } catch { /* Translation remains available when local storage is disabled. */ }

  const normalize = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const cacheKey = (text, target) => `${target}\u0000${normalize(text)}`;
  const label = (ko, en) => language === 'en' ? en : ko;
  const recipeLang = recipe => recipe?.language || (hangul.test(recipe?.title || '') ? 'ko' : 'en');

  function t(value, target = language) {
    const raw = String(value ?? '');
    const plain = normalize(raw);
    if (!plain) return raw;
    let result = plain;
    if (target === 'en') {
      result = extra[plain] || dictionary?.t(plain, 'en') || plain;
      if (result === plain && hangul.test(plain)) {
        const parts = plain.split(/(\s*[·•|]\s*)/);
        if (parts.length > 1) result = parts.map((part, i) => i % 2 ? part : t(part, target)).join('');
        else {
          const decorated = plain.match(/^([^\p{L}\p{N}]*)(.*?[\p{L}\p{N}%.)])([^\p{L}\p{N}]*)$/u);
          if (decorated && (decorated[1] || decorated[3])) {
            const inner = decorated[2].trim();
            const translated = extra[inner] || dictionary?.t(inner, 'en') || inner;
            if (translated !== inner) result = decorated[1] + translated + decorated[3];
          }
        }
        if (result === plain) {
          const quantity = plain.match(/^(약\s*)?([\d.,/½¼¾~–\-\s]+)\s*(큰술|작은술|개|장|쪽|컵|봉지|봉|팩|인분|명|분|초|시간)(.*)$/);
          if (quantity && !hangul.test(quantity[4])) {
            const units = {큰술:'tbsp',작은술:'tsp',개:'pcs',장:'slices',쪽:'cloves',컵:'cups',봉지:'packets',봉:'packets',팩:'packs',인분:'servings',명:'servings',분:'min',초:'sec',시간:'hr'};
            result = `${quantity[1] ? 'About ' : ''}${quantity[2].trim()} ${units[quantity[3]]}${quantity[4]}`;
          }
        }
      }
    }
    const translated = cache.get(cacheKey(plain, target));
    if (translated) result = translated;
    return result === plain ? raw : raw.replace(raw.trim(), result);
  }

  function remember(text, target, result) {
    cache.set(cacheKey(text, target), result);
    while (cache.size > 500) cache.delete(cache.keys().next().value);
    try { localStorage.setItem(CACHE_KEY, JSON.stringify([...cache])); } catch { /* Memory cache is sufficient. */ }
  }

  function requestTranslation(text, target) {
    const source = normalize(text);
    const key = cacheKey(source, target);
    if (!source || cache.has(key) || failed.has(key) || inFlight.has(key)) return;
    queue.set(key, { source, target });
    if (!timer && !running) timer = setTimeout(() => { timer = null; flushQueue(); }, 120);
  }

  function status() {
    const element = document.querySelector('#fcTranslationStatus');
    if (!element) return;
    element.hidden = !errors && !running && !queue.size;
    const message = errors
      ? label('일부 내용을 번역하지 못했습니다. 원문을 유지합니다.', 'Some text could not be translated. The original is preserved.')
      : label('레시피 내용을 번역하고 있어요…', 'Translating recipe text…');
    element.querySelector('span').textContent = message;
    const retry = element.querySelector('button');
    retry.hidden = !errors;
    retry.textContent = label('번역 다시 시도', 'Retry translation');
  }

  async function flushQueue() {
    if (running) return running;
    const items = [];
    let size = 0;
    // Stale-locale work is not started; an in-flight result may only populate its own cache.
    for (const [key, item] of queue) {
      if (item.target !== language || cache.has(key)) { queue.delete(key); continue; }
      if (items.length >= 48 || size + item.source.length > 16000) break;
      queue.delete(key); inFlight.add(key); items.push(item); size += item.source.length;
    }
    if (!items.length) { status(); return; }
    const target = items[0].target;
    running = (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 38000);
      try {
        const response = await fetch('/api/translate-text', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, cache: 'no-store',
          signal: controller.signal, body: JSON.stringify({ language: target, texts: items.map(item => item.source) })
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.translations) || data.translations.length !== items.length) throw new Error('Translation incomplete');
        data.translations.forEach((value, i) => {
          if (typeof value !== 'string' || !value.trim() || (target === 'en' && hangul.test(value))) throw new Error('Translation language mismatch');
        });
        data.translations.forEach((value, i) => remember(items[i].source, target, value));
      } catch {
        items.forEach(item => failed.add(cacheKey(item.source, target)));
        if (target === language) errors = true;
      } finally { clearTimeout(timeout); items.forEach(item => inFlight.delete(cacheKey(item.source, target))); }
    })();
    status();
    await running;
    running = null;
    localize();
    status();
    if (queue.size) timer = setTimeout(() => { timer = null; flushQueue(); }, 30);
  }

  const proseSelector = '#modalTitle,.recipe-body>h3,.recipe-body>p,.modal-title-wrap>p,.favorite-row h3,.steps-list h4,.step-row p,.ingredient-row,.tip-box,.safety-box,.step-meta';
  function needsRemote(source, node, rendered) {
    if (language === 'en') return hangul.test(rendered);
    const parent = node.parentElement;
    return parent?.closest('[data-fc-source-language="en"]') && parent.closest(proseSelector)
      && !hangul.test(source) && /[A-Za-z]/.test(source) && !parent.closest('strong,.need');
  }
  function setNode(node, source) {
    let rendered = t(source);
    if (language === 'en' && source.trim() === '보통' && node.parentElement.closest('#saltyOptions')) rendered = 'Regular';
    if (needsRemote(source, node, rendered) && !cache.has(cacheKey(source, language))) requestTranslation(source, language);
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
    sourceNodes.set(node, { source, rendered });
  }
  function canonicalControls() {
    document.querySelectorAll('[data-category],[data-state-key][data-value],[data-wizard-jump],[data-ingredient],[data-remove]').forEach(control => {
      const source = control.dataset.category || control.dataset.value || control.dataset.ingredient || control.dataset.remove
        || ({1:'메인',2:'재료',3:'취향',4:'레시피'})[control.dataset.wizardJump];
      const holder = control.querySelector('span:not(.ingredient-icon)') || control;
      const node = [...holder.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
      if (node && source) setNode(node, source);
    });
  }
  function markRecipes() {
    document.querySelectorAll('#recipeGrid .recipe-card').forEach((card, index) => {
      const recipe = state.recipes[index];
      if (!recipe) return;
      card.dataset.fcSourceLanguage = recipeLang(recipe);
      card.querySelectorAll('.used-chip').forEach((chip, i) => {
        const key = recipe.usedIngredients?.[i];
        const ingredient = recipe.ingredients?.find(item => item.inputName === key);
        const source = language === 'en' && recipeLang(recipe) === 'en' && ingredient ? ingredient.name : key;
        if (source && chip.firstChild?.nodeType === Node.TEXT_NODE) setNode(chip.firstChild, source);
      });
    });
    document.querySelectorAll('.favorite-row').forEach((row, index) => row.dataset.fcSourceLanguage = recipeLang(state.favorites[index]));
    const id = elements.modalContent.querySelector('[data-modal-favorite]')?.dataset.modalFavorite;
    if (id) elements.modalContent.dataset.fcSourceLanguage = recipeLang(findRecipe(id));
  }
  function localize() {
    if (!initialized || !document.body) return;
    observer.disconnect();
    observing = false;
    try {
      document.documentElement.lang = language;
      document.querySelectorAll('select option:not([value])').forEach(option => option.value = option.textContent);
      canonicalControls();
      markRecipes();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || !node.nodeValue.trim() || parent.closest('script,style,textarea,input,[contenteditable="true"],.fc-language-switch,#fcTranslationStatus')) continue;
        const previous = sourceNodes.get(node);
        setNode(node, previous && previous.rendered === node.nodeValue ? previous.source : node.nodeValue);
      }
      document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(element => {
        if (element.closest('.fc-language-switch,#fcTranslationStatus')) return;
        const saved = sourceAttributes.get(element) || {};
        attrs.forEach(name => {
          if (!element.hasAttribute(name)) return;
          const current = element.getAttribute(name);
          const previous = saved[name];
          const source = previous && previous.rendered === current ? previous.source : current;
          const rendered = t(source);
          if (language === 'en' && hangul.test(rendered)) requestTranslation(source, language);
          if (rendered !== current) element.setAttribute(name, rendered);
          saved[name] = { source, rendered };
        });
        sourceAttributes.set(element, saved);
      });
      status();
    } finally {
      observer.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: attrs });
      observing = true;
    }
  }
  const observer = new MutationObserver(() => {
    if (scheduled || !observing) return;
    scheduled = true;
    queueMicrotask(() => { scheduled = false; localize(); });
  });
  function applyLanguage(next) {
    language = next === 'en' ? 'en' : 'ko';
    errors = false;
    failed.clear();
    queue.clear();
    try { localStorage.setItem(KEY, language); } catch { /* Memory-only locale. */ }
    try {
      const url = new URL(location.href); url.searchParams.set('lang', language);
      history.replaceState(history.state, '', url);
    } catch { /* Restricted history. */ }
    document.documentElement.lang = language;
    document.title = label('냉털셰프 | 있는 재료로 근사한 한 끼', 'Fridge Chef | Cook with what you have');
    document.querySelectorAll('[data-fc-language]').forEach(button => {
      button.textContent = button.dataset.fcLanguage === 'en' ? 'English' : label('한국어', 'Korean');
      button.setAttribute('aria-pressed', String(button.dataset.fcLanguage === language));
      button.disabled = loading;
    });
    document.querySelector('.fc-language-switch')?.setAttribute('aria-label', label('앱 언어', 'App language'));
    localize();
  }
  async function idle() {
    for (let i = 0; i < 20; i += 1) {
      localize();
      if (timer) { clearTimeout(timer); timer = null; }
      if (!queue.size && !running) return;
      await (running || flushQueue());
    }
    throw new Error('Translation did not settle');
  }
  function audit() {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent && !parent.closest('script,style,textarea,[hidden],[aria-hidden="true"]') && parent.getClientRects().length && hangul.test(node.nodeValue)) results.push(node.nodeValue.trim());
    }
    document.querySelectorAll('[placeholder],[aria-label],[alt],[title]').forEach(element => {
      if (!element.getClientRects().length || element.closest('[hidden],[aria-hidden="true"]')) return;
      attrs.forEach(name => { if (hangul.test(element.getAttribute(name) || '')) results.push(`${name}: ${element.getAttribute(name)}`); });
    });
    return [...new Set(results)];
  }
  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement('textarea'); area.value = text;
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area); area.select();
    const copied = document.execCommand('copy'); area.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }
  async function localizedRecipe(recipe) {
    const target = language;
    // Translate display strings only; identity, source keys, quantities and recipe structure are never regenerated.
    const strings = [];
    function collect(value) {
      if (typeof value === 'string') strings.push(value);
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
        if (!['id','language','inputName','originalTitle','usedIngredients','_cuteTitleApplied'].includes(key)) collect(item);
      });
    }
    collect(recipe);
    strings.forEach(text => {
      if (target === 'en' ? hangul.test(t(text, target)) : recipeLang(recipe) === 'en' && /[A-Za-z]/.test(text)) requestTranslation(text, target);
    });
    await idle();
    if (target !== language) throw new Error('Language changed');
    function convert(value, key = '') {
      if (['id','language','inputName','originalTitle','usedIngredients','_cuteTitleApplied'].includes(key)) return value;
      if (typeof value === 'string') return t(value, target);
      if (Array.isArray(value)) return value.map(item => convert(item));
      if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,convert(v,k)]));
      return value;
    }
    return convert(recipe);
  }
  function init() {
    if (initialized) return;
    initialized = true;
    document.body.classList.add('fc-language-ready');
    const switcher = document.createElement('div');
    switcher.className = 'fc-language-switch'; switcher.setAttribute('role', 'group');
    switcher.innerHTML = '<button type="button" data-fc-language="ko">Korean</button><button type="button" data-fc-language="en">English</button>';
    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-fc-language]');
      if (button && !loading) applyLanguage(button.dataset.fcLanguage);
    });
    document.querySelector('.header-actions')?.appendChild(switcher);
    const notice = document.createElement('div'); notice.id = 'fcTranslationStatus'; notice.hidden = true;
    notice.setAttribute('role', 'status'); notice.style.cssText = 'font-size:12px;line-height:1.5;padding:6px 16px;flex:0 0 auto';
    notice.innerHTML = '<span></span> <button type="button"></button>';
    notice.querySelector('button').addEventListener('click', () => { failed.clear(); errors = false; localize(); });
    document.querySelector('.wizard-progress')?.after(notice);
    elements.favoritesButton.setAttribute('aria-label', '저장한 레시피');
    elements.favoritesButton.setAttribute('title', '저장한 레시피');
    const originalData = getFormData;
    getFormData = () => ({ ...originalData(), language });
    const previousAdd = addCustomIngredient;
    addCustomIngredient = function addLocalizedIngredient() {
      const raw = elements.customIngredient.value.trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!raw) return;
      const catalog = [...new Set(Object.values(ingredientCatalog).flat())];
      const name = catalog.find(item => item === raw || t(item, 'en').toLowerCase() === raw.toLowerCase()) || raw;
      if (state.selected.includes(name)) showToast('이미 선택한 재료입니다.');
      else if (state.selected.length >= 5) showToast('재료는 최대 5개까지 선택할 수 있어요.');
      else { state.selected.push(name); elements.customIngredient.value = ''; renderSelected(); }
      localize();
    };
    elements.customIngredient.maxLength = 60;
    elements.addIngredientButton.removeEventListener('click', previousAdd);
    elements.addIngredientButton.addEventListener('click', addCustomIngredient);
    const previousLoading = setLoading;
    setLoading = function setLocalizedLoading(value) {
      loading = Boolean(value); switcher.querySelectorAll('button').forEach(button => button.disabled = loading);
      const result = previousLoading(value); localize(); return result;
    };
    ['renderCategoryTabs','renderIngredientCloud','renderSelected','renderOptionButtons','updateWizardSelectionState','showWizardStep','renderResults','openRecipe','renderFavorites','renderAiError','showToast'].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function') return;
      window[name] = function localizedRender(...args) {
        const result = previous.apply(this, args);
        if (name === 'renderSelected') window.updateWizardSelectionState?.();
        localize(); return result;
      };
    });
    const originalError = publicErrorMessage;
    publicErrorMessage = message => t(originalError(message));
    shareRecipe = async function shareLocalizedRecipe(recipe) {
      if (!recipe) return;
      const r = await localizedRecipe(recipe);
      const steps = (r.steps || []).map((step, i) => `${i + 1}. ${step.title}\n${[step.heat, step.duration].filter(Boolean).join(' · ')}\n${step.description}\n${t('완료 기준')}: ${step.checkpoint || ''}`).join('\n\n');
      const text = [`[${t('냉털셰프')}] ${r.title}`,r.subtitle,`${t(`${r.timeMinutes}분`)} · ${r.difficulty} · ${t(`${r.servings}인분`)}`,'',t('준비 재료'),r.ingredients.map(item => `- ${item.name}: ${item.amount}`).join('\n'),'',t('상세 조리 순서'),steps,'',`${t('셰프의 한 수')}: ${r.tip}`,`${t('보관:')} ${r.storage}`,`${t('주의:')} ${r.allergyNote}`].join('\n');
      const url = new URL(location.pathname, location.origin); url.searchParams.set('lang', language);
      if (navigator.share) {
        try { await navigator.share({ title: `${r.title} | ${t('냉털셰프')}`, text, url: url.href }); showToast('레시피를 공유했습니다.'); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try { await copyText(`${text}\n\n${url.href}`); showToast('레시피 내용을 복사했습니다.'); }
      catch { showToast('공유 기능을 사용할 수 없습니다.'); }
    };
    copyShoppingList = async function copyLocalizedShoppingList(recipe) {
      if (!recipe) return;
      const r = await localizedRecipe(recipe);
      const extras = r.ingredients.filter(item => !item.owned);
      const text = `[${r.title} — ${label('장보기 목록', 'Shopping list')}]\n${extras.length ? extras.map(item => `- ${item.name}: ${item.amount}`).join('\n') : label('추가로 살 재료가 없습니다.', 'No additional ingredients needed.')}`;
      try { await copyText(text); showToast('장보기 목록을 복사했습니다.'); }
      catch { showToast('복사 권한이 없어 목록을 복사하지 못했습니다.'); }
    };
    applyLanguage(language);
  }
  window.FridgeChefI18n = { init, t, getLanguage: () => language, setLanguage: lang => { if (initialized && !loading) applyLanguage(lang); }, refresh: localize, idle, audit };
})();
