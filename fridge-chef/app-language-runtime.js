'use strict';

(() => {
  const dictionary = window.FridgeChefDictionary || {};
  const hangul = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;
  const languageKey = 'fridgeChefLanguage';
  const cacheKey = 'fridgeChefTranslationsV4';
  const originals = new WeakMap();
  const attributeSources = new WeakMap();
  const cache = new Map();
  const jobs = new Map();
  const attributes = ['placeholder', 'aria-label', 'aria-description', 'alt', 'title'];
  const normalize = value => String(value ?? '').normalize('NFC').replace(/\s+/g, ' ').trim();
  const translationKey = (text, lang) => `${lang}\u0000${normalize(text)}`;
  let language = 'ko';
  let initialized = false;
  let loading = false;
  let observer;
  let timer;
  let flushing = false;
  let status;

  try {
    language = localStorage.getItem(languageKey) === 'en' ? 'en' : 'ko';
    const saved = JSON.parse(sessionStorage.getItem(cacheKey) || '[]');
    if (Array.isArray(saved)) saved.slice(-500).forEach(entry => {
      if (Array.isArray(entry) && entry.length === 2 && entry.every(v => typeof v === 'string')) cache.set(...entry);
    });
  } catch { /* Storage is optional; rendering must also work without it. */ }
  const initialLanguage = new URLSearchParams(location.search).get('lang');
  if (initialLanguage === 'en' || initialLanguage === 'ko') language = initialLanguage;
  document.documentElement.lang = language;

  function translateKnown(value) {
    const plain = normalize(value);
    if (Object.prototype.hasOwnProperty.call(dictionary, plain)) return dictionary[plain];
    const patterns = [
      [/^취향 선택으로\s*·\s*(\d+)개$/, (_, n) => `Next: preferences · ${n}`],
      [/^(\d+)개 재료를 골랐습니다\.$/, (_, n) => `${n} ingredient${n === '1' ? '' : 's'} selected.`],
      [/^재료 일치\s*(\d+)%$/, (_, n) => `${n}% ingredient match`],
      [/^내 재료\s*(\d+)개 활용$/, (_, n) => `Uses ${n} of your ingredients`],
      [/^(\d+)분 이내$/, (_, n) => `Up to ${n} min`],
      [/^(\d+)(?:인분|명)$/, (_, n) => `${n} serving${n === '1' ? '' : 's'}`],
      [/^(\d+)단계$/, (_, n) => `${n} steps`],
      [/^최대\s*(\d+)개$/, (_, n) => `Up to ${n}`],
      [/^레시피 생성 실패\s*\((\d+)\)$/, (_, n) => `Recipe generation failed (${n})`],
      [/^(.+)\s+(삭제|제거)$/, (_, name) => `${translateKnown(name)} · Remove`]
    ];
    for (const [pattern, format] of patterns) if (pattern.test(plain)) return plain.replace(pattern, format);
    if (/^(?:\d+(?:\.\d+)?(?:\s*[~–-]\s*\d+(?:\.\d+)?)?\s*(?:시간|분|초)\s*)+(?:휴지|휴식|조리|식히기)?$/.test(plain)) {
      return plain.replace(/시간/g, ' hr').replace(/분/g, ' min').replace(/초/g, ' sec')
        .replace(/휴지|휴식/g, ' rest').replace(/조리/g, ' cooking').replace(/식히기/g, ' cooling');
    }
    if (/^(?:약\s*)?\d+(?:[./~–-]\d+)?\s*(?:개|큰술|작은술|컵|장|쪽|대|공기|꼬집|봉지|팩|캔|줌)(?:\s*\([^)]*\))?$/.test(plain)) {
      const units = {'큰술':'tbsp','작은술':'tsp','개':'pcs','컵':'cups','장':'slices','쪽':'cloves','대':'stalks','공기':'bowls','꼬집':'pinches','봉지':'packs','팩':'packs','캔':'cans','줌':'handfuls'};
      return plain.replace(/^약\s*/, 'about ').replace(/큰술|작은술|꼬집|봉지|공기|개|컵|장|쪽|대|팩|캔|줌/g, unit => ` ${units[unit]}`);
    }
    if (/\s[·|•]\s/.test(plain)) return plain.split(/(\s+[·|•]\s+)/).map((part, i) => i % 2 ? part : translateKnown(part)).join('');
    const decorated = plain.match(/^([^\p{L}\p{N}]*)([\s\S]*?[\p{L}\p{N}%.)])([^\p{L}\p{N}]*)$/u);
    if (decorated && (decorated[1] || decorated[3])) {
      const inner = decorated[2].trim();
      const translated = translateKnown(inner);
      if (translated !== inner) return `${decorated[1]}${translated}${decorated[3]}`;
    }
    return plain;
  }

  function t(value, lang = language) {
    const source = String(value ?? '');
    if (lang !== 'en') return source;
    const plain = normalize(source);
    const translated = translateKnown(plain);
    const result = hangul.test(translated) ? cache.get(translationKey(source, lang)) || translated : translated;
    return result === plain ? source : source.replace(source.trim(), result);
  }

  function saveCache() {
    while (cache.size > 500) cache.delete(cache.keys().next().value);
    try { sessionStorage.setItem(cacheKey, JSON.stringify([...cache])); } catch { /* Memory-only cache. */ }
  }

  function queueTranslation(source, lang) {
    const text = normalize(source);
    const key = translationKey(text, lang);
    if (cache.has(key) || jobs.has(key) || !text || text.length > 1800) return;
    jobs.set(key, { text, lang, state: 'pending', attempts: 0 });
    if (!timer && !flushing) timer = setTimeout(flush, 60);
  }

  async function flush() {
    clearTimeout(timer);
    timer = null;
    if (flushing) return;
    flushing = true;
    try {
      while (true) {
        const first = [...jobs.values()].find(job => job.state === 'pending');
        if (!first) break;
        const batch = [];
        let size = 0;
        for (const [key, job] of jobs) {
          if (job.state !== 'pending' || job.lang !== first.lang) continue;
          if (batch.length >= 16 || size + job.text.length > 9000) break;
          size += job.text.length;
          job.state = 'loading';
          batch.push([key, job]);
        }
        updateStatus();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        try {
          const response = await fetch('/api/translate-ui', {
            method: 'POST', cache: 'no-store', signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language: first.lang, texts: batch.map(([, job]) => job.text) })
          });
          const data = await response.json();
          if (!response.ok || !Array.isArray(data.translations) || data.translations.length !== batch.length) throw new Error('Translation response unavailable');
          data.translations.forEach((text, i) => {
            if (typeof text !== 'string' || !text.trim() || (first.lang === 'en' && hangul.test(text))) throw new Error('Incomplete translation');
            const numbers = batch[i][1].text.match(/\d+(?:\.\d+)?/g) || [];
            const translatedNumbers = text.match(/\d+(?:\.\d+)?/g) || [];
            if (numbers.join('|') !== translatedNumbers.join('|')) throw new Error('Translation changed a quantity');
          });
          batch.forEach(([key], i) => { cache.set(key, data.translations[i].trim()); jobs.delete(key); });
          saveCache();
        } catch {
          // Never replace cooking directions with guessed content or retry endlessly.
          batch.forEach(([, job]) => { job.state = 'failed'; job.attempts += 1; });
        } finally {
          clearTimeout(timeout);
          localize();
        }
      }
    } finally {
      flushing = false;
      updateStatus();
      if ([...jobs.values()].some(job => job.state === 'pending')) timer = setTimeout(flush, 60);
    }
  }

  function isExcluded(element) {
    return !element || Boolean(element.closest('script,style,noscript,textarea,[contenteditable="true"],.fc-language-switch,.fc-translation-status'));
  }

  function isRecipeProse(element) {
    return Boolean(element.closest('#modalTitle,.recipe-body > h3,.recipe-body > p,.modal-title-wrap > p,.favorite-row h3,.steps-list h4,.step-row p,.tip-box,.safety-box,.ingredient-row em')) && !element.closest('strong,.need');
  }

  function displayText(source, lang, prose = false, active = true) {
    const plain = normalize(source);
    const known = t(source, lang);
    const needsEnglish = lang === 'en' && hangul.test(known);
    const needsKorean = lang === 'ko' && prose && !hangul.test(plain) && /[A-Za-z]{2}/.test(plain);
    if (!needsEnglish && !needsKorean) return known;
    const key = translationKey(source, lang);
    if (cache.has(key)) return source.replace(source.trim(), cache.get(key));
    if (!active) return known;
    queueTranslation(source, lang);
    const failed = jobs.get(key)?.state === 'failed' || plain.length > 1800;
    return lang === 'en' ? (failed ? 'Translation unavailable.' : 'Translating…') : (failed ? '번역하지 못했습니다.' : '번역 중…');
  }

  function updateNode(node, source) {
    let rendered = displayText(source, language, isRecipeProse(node.parentElement), node.parentElement.getClientRects().length > 0);
    if (language === 'en' && normalize(source) === '보통' && node.parentElement.closest('#saltyOptions')) rendered = 'Regular';
    if (node.nodeValue !== rendered) node.nodeValue = rendered;
    originals.set(node, { source, rendered });
  }

  function localizeControls() {
    const steps = {1:'메인',2:'재료',3:'취향',4:'레시피'};
    document.querySelectorAll('[data-category],[data-state-key][data-value],[data-wizard-jump],[data-ingredient],[data-remove]').forEach(control => {
      const source = control.dataset.category || control.dataset.value || steps[control.dataset.wizardJump] || control.dataset.ingredient || control.dataset.remove;
      if (!source) return;
      const label = control.matches('[data-ingredient],[data-remove]') ? control.querySelector('span:not(.ingredient-icon)') || control : control;
      const node = [...label.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
      if (node) updateNode(node, source);
    });
  }

  function localize() {
    if (!initialized || !document.body) return;
    observer?.disconnect();
    try {
      document.querySelectorAll('select option:not([value])').forEach(option => option.value = option.textContent);
      document.querySelectorAll('.fc-original-language-note').forEach(note => note.remove());
      localizeControls();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue.trim() || isExcluded(node.parentElement)) continue;
        const prior = originals.get(node);
        const source = prior && node.nodeValue === prior.rendered ? prior.source : node.nodeValue;
        updateNode(node, source);
      }
      document.querySelectorAll('[placeholder],[aria-label],[aria-description],img[alt],[title]').forEach(element => {
        if (isExcluded(element)) return;
        const saved = attributeSources.get(element) || {};
        attributes.forEach(name => {
          if (!element.hasAttribute(name)) return;
          const current = element.getAttribute(name);
          const prior = saved[name];
          const source = prior && current === prior.rendered ? prior.source : current;
          const rendered = displayText(source, language, false, element.getClientRects().length > 0);
          if (rendered !== current) element.setAttribute(name, rendered);
          saved[name] = {source, rendered};
        });
        attributeSources.set(element, saved);
      });
    } finally {
      observer?.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:[...attributes,'hidden','class','aria-hidden']});
      updateStatus();
    }
  }

  function updateStatus() {
    if (!status) return;
    const currentJobs = [...jobs.values()].filter(job => job.lang === language);
    const busy = currentJobs.some(job => job.state !== 'failed');
    const failed = currentJobs.some(job => job.state === 'failed');
    const shouldHide = !busy && !failed;
    if (status.hidden !== shouldHide) status.hidden = shouldHide;
    const label = status.querySelector('span');
    const text = language === 'en'
      ? (busy ? 'Translating recipe text…' : 'Translation could not be completed.')
      : (busy ? '레시피를 번역하고 있습니다…' : '번역을 완료하지 못했습니다.');
    if (label.textContent !== text) label.textContent = text;
    const retry = status.querySelector('button');
    if (retry.hidden !== !failed) retry.hidden = !failed;
    const retryText = language === 'en' ? 'Retry translation' : '번역 다시 시도';
    if (retry.textContent !== retryText) retry.textContent = retryText;
  }

  function applyLanguage(lang) {
    language = lang === 'en' ? 'en' : 'ko';
    try { localStorage.setItem(languageKey, language); } catch { /* Memory-only mode. */ }
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', language);
      history.replaceState(history.state, '', url);
    } catch { /* Limited browser environment. */ }
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
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('Clipboard unavailable');
  }

  async function translateText(value, lang) {
    const source = String(value ?? '');
    if (!source.trim()) return source;
    const known = t(source, lang);
    if (lang === 'en' && !hangul.test(known)) return known;
    if (lang === 'ko' && (hangul.test(source) || !/[A-Za-z]{2}/.test(source))) return source;
    const key = translationKey(source, lang);
    if (cache.has(key)) return cache.get(key);
    queueTranslation(source, lang);
    const deadline = Date.now() + 65000;
    while (Date.now() < deadline) {
      if (cache.has(key)) return cache.get(key);
      if (jobs.get(key)?.state === 'failed') throw new Error('Translation unavailable');
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    throw new Error('Translation timed out');
  }

  async function localizedRecipe(recipe, lang) {
    // Translate a copy; IDs, ownership flags and saved original recipes remain unchanged.
    const result = JSON.parse(JSON.stringify(recipe));
    const work = [];
    const convert = (object, key) => { if (typeof object[key] === 'string') work.push(translateText(object[key], lang).then(text => { object[key] = text; })); };
    ['title','dishName','subtitle','tip','storage','allergyNote'].forEach(key => convert(result, key));
    (result.ingredients || []).forEach(item => ['name','amount'].forEach(key => convert(item,key)));
    (result.steps || []).forEach(step => ['title','description','heat','duration','checkpoint'].forEach(key => convert(step,key)));
    await Promise.all(work);
    result.cuisine = t(result.cuisine, lang);
    result.difficulty = t(result.difficulty, lang);
    return result;
  }

  function init() {
    if (initialized) return;
    initialized = true;
    const switcher = document.createElement('div');
    switcher.className = 'fc-language-switch';
    switcher.setAttribute('role','group');
    switcher.innerHTML = '<button type="button" data-fc-language="ko">한국어</button><button type="button" data-fc-language="en">English</button>';
    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-fc-language]');
      if (button && !loading) applyLanguage(button.dataset.fcLanguage);
    });
    document.querySelector('.header-actions')?.appendChild(switcher);
    elements.favoritesButton.setAttribute('aria-label','저장한 레시피');
    elements.favoritesButton.setAttribute('title','저장한 레시피');
    document.body.classList.add('fc-language-ready');

    status = document.createElement('div');
    status.className = 'fc-translation-status';
    status.hidden = true;
    status.setAttribute('role','status');
    status.innerHTML = '<span></span><button type="button" hidden></button>';
    status.style.cssText = 'position:fixed;bottom:12px;left:12px;right:12px;z-index:3000;padding:10px 14px;background:#fffdf7;color:#304c37;border:1px solid #b5c5ac;border-radius:12px;font-size:12px;box-shadow:0 4px 14px #0002';
    status.querySelector('button').style.cssText = 'margin-left:10px;padding:5px 8px;border-radius:8px;border:1px solid currentColor;background:transparent;color:inherit';
    status.querySelector('button').addEventListener('click', () => {
      jobs.forEach(job => { if (job.lang === language && job.state === 'failed') job.state = 'pending'; });
      if (!flushing) { clearTimeout(timer); timer = setTimeout(flush, 0); }
      localize();
    });
    document.body.appendChild(status);

    const originalGetFormData = getFormData;
    getFormData = () => ({...originalGetFormData(), language});
    const previousAdd = addCustomIngredient;
    addCustomIngredient = function addLocalizedIngredient() {
      const raw = elements.customIngredient.value.trim().replace(/\s+/g,' ').slice(0,60);
      if (!raw) return;
      const catalog = [...new Set(Object.values(ingredientCatalog).flat())];
      const name = catalog.find(item => item === raw || dictionary[item]?.toLowerCase() === raw.toLowerCase()) || raw;
      if (state.selected.includes(name)) showToast('이미 선택한 재료입니다.');
      else if (state.selected.length >= 5) showToast('재료는 최대 5개까지 선택할 수 있어요.');
      else {state.selected.push(name); elements.customIngredient.value = ''; renderSelected();}
    };
    elements.customIngredient.maxLength = 60;
    elements.addIngredientButton.removeEventListener('click',previousAdd);
    elements.addIngredientButton.addEventListener('click',addCustomIngredient);

    const previousLoading = setLoading;
    setLoading = function localizedLoading(value) {
      loading = Boolean(value);
      switcher.querySelectorAll('button').forEach(button => button.disabled = loading);
      const result = previousLoading(value);
      localize();
      return result;
    };
    // Translate immediately after a render, plus after later asynchronous DOM updates.
    ['renderCategoryTabs','renderIngredientCloud','renderSelected','renderOptionButtons','updateWizardSelectionState','showWizardStep','renderResults','openRecipe','renderFavorites','renderAiError','showToast'].forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function') return;
      window[name] = function localizedRenderer(...args) {
        const result = previous.apply(this,args);
        if (name === 'renderSelected') window.updateWizardSelectionState?.();
        localize();
        return result;
      };
    });
    const previousError = publicErrorMessage;
    publicErrorMessage = message => {
      const translated = t(previousError(message));
      return language === 'en' && hangul.test(translated) ? 'The recipe service is temporarily unavailable. Please try again shortly.' : translated;
    };

    shareRecipe = async function shareLocalizedRecipe(recipe) {
      if (!recipe) return;
      const lang = language;
      let r;
      try { r = await localizedRecipe(recipe,lang); }
      catch { showToast('번역을 완료하지 못했습니다. 다시 시도해 주세요.'); return; }
      const label = value => t(value,lang);
      const steps = (r.steps || []).map((step,i) => `${i+1}. ${step.title}\n${[step.heat,step.duration].filter(Boolean).join(' · ')}\n${step.description}${step.checkpoint ? `\n${label('완료 기준')}: ${step.checkpoint}` : ''}`).join('\n\n');
      const text = [`[${label('냉털셰프')}] ${r.title}`,r.subtitle,`${label(`${r.timeMinutes}분`)} · ${r.difficulty} · ${label(`${r.servings}인분`)}`,'',label('준비 재료'),(r.ingredients||[]).map(item=>`- ${item.name}: ${item.amount}`).join('\n'),'',label('상세 조리 순서'),steps,'',`${label('셰프의 한 수')}: ${r.tip}`,`${label('보관:')} ${r.storage}`,`${label('주의:')} ${r.allergyNote}`].join('\n');
      const url = new URL(location.pathname,location.origin);
      url.searchParams.set('lang',lang);
      if (navigator.share) {
        try {await navigator.share({title:`${r.title} | ${label('냉털셰프')}`,text,url:url.href}); showToast('레시피를 공유했습니다.'); return;}
        catch(error) {if(error.name === 'AbortError') return;}
      }
      try {await copyText(`${text}\n\n${url.href}`); showToast('레시피 내용을 복사했습니다.');}
      catch {showToast('공유 기능을 사용할 수 없습니다.');}
    };
    copyShoppingList = async function copyLocalizedShoppingList(recipe) {
      if (!recipe) return;
      const lang = language;
      try {
        const title = await translateText(recipe.title,lang);
        const extras = await Promise.all((recipe.ingredients || []).filter(item=>!item.owned).map(async item=>`- ${await translateText(item.name,lang)}: ${await translateText(item.amount,lang)}`));
        const heading = lang === 'en' ? 'Shopping list' : '장보기 목록';
        const empty = lang === 'en' ? 'No additional ingredients needed.' : '추가로 살 재료가 없습니다.';
        await copyText(`[${title} — ${heading}]\n${extras.length ? extras.join('\n') : empty}`);
        showToast('장보기 목록을 복사했습니다.');
      } catch {showToast('번역을 완료하지 못했습니다. 다시 시도해 주세요.');}
    };

    observer = new MutationObserver(records => {
      if (records.every(record => isExcluded(record.target.nodeType === Node.ELEMENT_NODE ? record.target : record.target.parentElement))) return;
      localize();
    });
    window.addEventListener('pageshow',localize);
    window.addEventListener('popstate',() => requestAnimationFrame(localize));
    applyLanguage(language);
  }

  window.FridgeChefI18n = {init,t,getLanguage:()=>language,setLanguage:lang=>{if(initialized&&!loading)applyLanguage(lang);},refresh:localize,translateText,localizedRecipe};
})();
