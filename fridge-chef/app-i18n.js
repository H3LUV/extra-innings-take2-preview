'use strict';

// Translate presentation only. Canonical option values and saved recipe prose stay intact.
(() => {
  const storageKey = 'fridgeChefLanguage';
  const translations = {
    '냉털셰프': 'Fridge Chef', '냉털셰프 홈': 'Fridge Chef home', '바로가기': 'Quick actions',
    '저장한 레시피': 'Saved recipes', '메인': 'Home', '재료': 'Ingredients', '취향': 'Preferences', '레시피': 'Recipes',
    '모드 확인 중': 'Checking service', '레시피 서비스 준비됨': 'Recipe service ready', '레시피 준비 완료': 'Ready to cook',
    '서비스 연결 필요': 'Service unavailable', '사이트 로딩 오류': 'Unable to load the app',
    '선택을 초기화하고 메인으로 돌아가기': 'Clear selections and return home', '레시피 만들기 단계': 'Recipe steps',
    '냉장고 재료로 맛있는 한 끼': 'From your fridge to your table',
    '냉장고 속 재료로 만드는 맛있는 한 끼': 'A delicious meal with what you have',
    '냉털셰프와 함께': 'With Fridge Chef,', '맛있는 요리 시작!': 'let’s get cooking!',
    '냉장고 털어': 'Open your fridge,', '맛있는 요리 완성!': 'discover your next meal!',
    '오늘은 뭘 만들까?': 'What shall we cook?', '오늘은 냉장고 안에서 찾아볼까요?': 'What’s waiting in your fridge?',
    '있는 재료를 고르고 취향을 알려주세요. 오늘 먹기 좋은 맞춤 레시피 세 가지를 차근차근 준비합니다.': 'Choose your ingredients and preferences. We’ll prepare three recipes with clear, step-by-step instructions.',
    '있는 재료를 고르고 취향을 알려주세요. 오늘 먹기 좋은 레시피 세 가지를 보기 좋게 준비합니다.': 'Choose your ingredients and preferences. We’ll prepare three recipes for your next meal.',
    '있는 재료를 최대 5개 고르고, 원하는 맛과 조리시간을 알려주세요. 어떤 요리인지 한눈에 알 수 있는 자세한 레시피 세 가지를 준비합니다.': 'Choose up to five ingredients, your preferred flavors and cooking time. Get three clearly named recipes with detailed instructions.',
    '오늘도 냉장고 앞에서 멈췄다면': 'Wondering what to cook?', '있는 재료로,': 'With what you have,', '근사한 한 끼.': 'make a delicious meal.',
    '재료를 최대 5개 고르고 원하는 요리 스타일을 선택하세요. 냉장고의 애매한 잔여물이 오늘 저녁의 주인공으로 승진합니다.': 'Choose up to five ingredients and a cuisine. Turn your leftovers into tonight’s dinner.',
    '최대 재료': 'Ingredients max.', '고민할 이유': 'Reasons to worry', '요리 재료 일러스트': 'Cooking ingredients illustration',
    '냉장고 구조대': 'Fridge rescue', '오늘 뭐 먹지?': 'What’s for dinner?',
    '01 · 재료 조합': '01 · INGREDIENTS', '오늘 가진 재료를 알려주세요': 'Tell us what ingredients you have',
    '최대 5개까지 선택할 수 있습니다. 기본 양념은 셰프가 눈치껏 챙깁니다.': 'Choose up to five ingredients. We’ll suggest the basic seasonings.',
    '재료 고르기': 'Pick ingredients', '취향 맞추기': 'Set preferences', '레시피 완성': 'Get recipes',
    '최대 5개 선택': 'Up to 5 ingredients', '맛·시간 설정': 'Flavor & time', '맛과 시간 설정': 'Flavor & time',
    '자세한 3가지': '3 detailed recipes', '레시피 시작하기': 'Let’s get cooking', '냉장고 열어보기': 'Open my fridge',
    '이용 단계': 'How it works', '오늘의 냉털 팁': 'Today’s fridge tip',
    '유통기한이 가까운 재료부터 고르면 냉장고도 식비도 한결 가벼워집니다.': 'Use ingredients nearing their use-by date first to reduce waste and grocery costs.',
    '오래된 재료부터 고르면 식비도 줄고 냉장고도 숨을 쉽니다.': 'Use older ingredients first to save money and make room in your fridge.',
    '냉장고 안을 살펴보는 냉털셰프': 'Fridge Chef looking inside the fridge',
    '열린 냉장고 안의 재료를 살펴보는 귀여운 냉털셰프': 'A little chef looking at ingredients in an open fridge',
    '냉장고를 살펴보는 냉털셰프': 'Fridge Chef checking the fridge',
    '냉장고 속 재료를 꺼내는 귀여운 냉털셰프': 'A little chef checking the ingredients',
    '냉장고에서 당근을 꺼내는 귀여운 냉털셰프': 'A little chef at the fridge',
    '냉장고 속 재료를 살펴보는 냉털셰프': 'Fridge Chef looking inside the fridge',
    '냉장고 속 재료를 골라주세요': 'What’s in your fridge?',
    '최대 5개까지 선택할 수 있습니다. 직접 입력도 가능합니다.': 'Choose up to five ingredients, or add your own.',
    '최대 5개까지 선택하거나 직접 입력할 수 있습니다.': 'Choose up to five ingredients, or add your own.',
    '구체적인 재료를 넣으면 더 정확한 레시피를 제공합니다.': 'Be specific about ingredients for more accurate recipes.',
    '예시) 신라면, 목살, 칵테일새우, 먹다 남은 후라이드치킨': 'Examples: Shin Ramyun, pork neck, cocktail shrimp, leftover fried chicken',
    '재료 선택': 'Choose ingredients', '아직 선택한 재료가 없어요': 'No ingredients selected yet',
    '재료 직접 입력 (예: 애호박)': 'Add an ingredient (e.g. zucchini)', '추가': 'Add', '재료 분류': 'Ingredient categories',
    '인기': 'Popular', '육류': 'Meat', '해산물': 'Seafood', '채소': 'Vegetables', '탄수화물': 'Carbs', '기타': 'Other',
    '계란': 'Eggs', '김치': 'Kimchi', '돼지고기': 'Pork', '두부': 'Tofu', '양파': 'Onion', '대파': 'Green onion',
    '감자': 'Potato', '닭고기': 'Chicken', '참치캔': 'Canned tuna', '버섯': 'Mushrooms', '소고기': 'Beef',
    '베이컨': 'Bacon', '햄': 'Ham', '소시지': 'Sausage', '다짐육': 'Ground meat', '오리고기': 'Duck',
    '오징어': 'Squid', '새우': 'Shrimp', '고등어': 'Mackerel', '연어': 'Salmon', '바지락': 'Clams',
    '어묵': 'Fish cake', '명란': 'Pollock roe', '애호박': 'Zucchini', '당근': 'Carrot', '배추': 'Napa cabbage',
    '양배추': 'Cabbage', '가지': 'Eggplant', '브로콜리': 'Broccoli', '밥': 'Cooked rice', '우동면': 'Udon noodles',
    '소면': 'Thin wheat noodles', '파스타면': 'Pasta', '떡': 'Rice cakes', '식빵': 'Sliced bread', '라면': 'Instant noodles',
    '또띠아': 'Tortilla', '치즈': 'Cheese', '우유': 'Milk', '콩나물': 'Soybean sprouts', '옥수수수': 'Corn', '옥수수': 'Corn',
    '토마토': 'Tomato', '카레가루': 'Curry powder', '만두': 'Dumplings',
    '오늘 먹고 싶은 방향을 정해주세요': 'How would you like it?',
    '스타일, 난이도, 인원과 조리시간을 고르면 됩니다.': 'Choose a cuisine, difficulty, serving size and cooking time.',
    '요리 취향': 'Your preferences', '선택 사항': 'Optional', '요리 스타일': 'Cuisine',
    '상관없음': 'Any', '한식': 'Korean', '일식': 'Japanese', '중식': 'Chinese', '양식': 'Western',
    '동남아': 'Southeast Asian', '분식': 'Korean street food', '퓨전': 'Fusion',
    '난이도': 'Difficulty', '쉬움': 'Easy', '보통': 'Medium', '어려움': 'Advanced', '인원': 'Servings',
    '최대 조리시간': 'Maximum cooking time', '오늘의 목적': 'Occasion', '일상 한 끼': 'Everyday meal',
    '냉장고 털이': 'Use up leftovers', '아이와 함께': 'Family-friendly', '술안주': 'With drinks', '다이어트': 'Lighter meal',
    '매운맛': 'Spiciness', '짠맛': 'Saltiness', '단맛': 'Sweetness', '안 매운맛': 'Not spicy',
    '살짝 매콤': 'Mildly spicy', '화끈하게': 'Hot', '싱겁게': 'Lightly salted', '짭짤하게': 'Savory',
    '단맛 없이': 'Not sweet', '은은하게': 'Lightly sweet', '달콤하게': 'Sweet',
    '레시피 3개 만들기': 'Make 3 recipes', '맞춤 레시피를 준비하고 있어요': 'Preparing your personalized recipes',
    '선택한 조건으로 맞춤 레시피를 만들어요': 'Recipes tailored to your choices',
    '레시피 서비스 연결 상태 확인 중...': 'Connecting to the recipe service…',
    '레시피 서비스 연결을 확인해 주세요': 'Please check the recipe service connection',
    '서비스 설정을 확인해 주세요': 'Please check the service settings', '온라인 배포 주소에서 이용해 주세요': 'Please open the online app',
    '레시피 서비스 연결에 실패했습니다': 'Unable to connect to the recipe service', '온라인 서비스 연결 후 이용할 수 있어요': 'An internet connection is required',
    '← 메인': '← Home', '← 재료': '← Ingredients', '취향 선택으로': 'Next: preferences',
    '재료를 1개 이상 골라주세요.': 'Choose at least one ingredient.',
    '← 재료 다시 선택하기': '← Change ingredients', '← 취향 다시 고르기': '← Edit preferences',
    '재료 다시 선택하기': 'Change ingredients', '취향 다시 고르기': 'Edit preferences',
    '02 · 오늘의 추천': '02 · YOUR RECIPES', '이 조합이라면 이렇게 먹어보세요': 'Here’s what you can cook',
    '다른 조합 다시 받기 ↻': 'Try another combination ↻', '다른 조합 다시 받기': 'Try another combination',
    '맞춤 레시피': 'Personalized recipes', '맞춤 추천': 'For you',
    '재료의 운명을 재배치하는 중...': 'Finding delicious ways to use your ingredients…',
    '냉털셰프가 조합을 고민 중이에요': 'Fridge Chef is working on your recipes',
    '맛있는 아이디어를 볶고 있습니다': 'Cooking up some tasty ideas', '재료와 취향에 따라 잠시 시간이 걸릴 수 있어요.': 'This may take a moment, depending on your choices.',
    '레시피 자세히 보기': 'View recipe', '즐겨찾기': 'Save recipe', '닫기': 'Close', '준비 재료': 'Ingredients',
    '추가 필요': 'To buy', '셰프의 한 수': 'Chef’s tips', '조리 순서': 'Directions', '상세 조리 순서': 'Step-by-step directions',
    '완료 기준': 'Ready when', '보관:': 'Storage:', '주의:': 'Safety:', '내 레시피에 저장': 'Save recipe',
    '저장 취소': 'Remove from saved', '장보기 목록 복사': 'Copy shopping list', '레시피 공유하기': 'Share recipe',
    '보기 ↗': 'View ↗', '보기': 'View', '아직 저장한 레시피가 없습니다.': 'No saved recipes yet.', '마음에 드는 요리에 하트를 눌러보세요.': 'Tap the heart on a recipe to save it.',
    '내 레시피에 저장했습니다.': 'Recipe saved.', '저장한 레시피에서 삭제했습니다.': 'Recipe removed from saved.',
    '저장한 레시피에서 삭제했습니다. 이별은 늘 이렇게 간단하군요.': 'Recipe removed from saved.',
    '레시피를 공유했습니다.': 'Recipe shared.', '레시피 내용을 복사했습니다.': 'Recipe copied.', '공유 기능을 사용할 수 없습니다.': 'Sharing is unavailable.',
    '장보기 목록을 복사했습니다.': 'Shopping list copied.', '복사 권한이 없어 목록을 복사하지 못했습니다.': 'Unable to copy. Please check clipboard permissions.',
    '재료는 최대 5개까지 선택할 수 있어요.': 'You can select up to five ingredients.',
    '이미 선택한 재료입니다.': 'This ingredient is already selected.', '재료를 하나 이상 선택해 주세요.': 'Please select at least one ingredient.',
    '먼저 재료를 하나 이상 선택해 주세요. 공기로는 레시피가 안 나옵니다.': 'Please select at least one ingredient first.',
    '재료는 최대 5개까지 선택할 수 있어요. 냉장고도 정원이 있습니다.': 'You can select up to five ingredients.',
    '이미 선택한 재료입니다. 재료도 중복 출근은 사양합니다.': 'This ingredient is already selected.',
    '먼저 재료를 하나 이상 선택해 주세요. 빈 냉장고도 아니고 빈 선택으로는 어렵습니다.': 'Please select at least one ingredient first.',
    '취향을 고른 뒤 레시피를 만들어 주세요. 결과는 소환 전에는 나타나지 않습니다.': 'Choose your preferences, then create your recipes.',
    '앞 단계부터 차례로 진행해 주세요. 순서를 만든 데에는 드물게 이유가 있습니다.': 'Please complete the previous steps first.',
    '레시피 생성 실패': 'Couldn’t create recipes', '레시피를 만들지 못했습니다.': 'We couldn’t create your recipes.',
    '샘플 레시피로 대체하지 않습니다. 잠시 후 다시 시도해 주세요.': 'No sample recipes are substituted. Please try again shortly.',
    '연결 확인 후 다시 시도': 'Check connection and retry',
    '레시피 생성에 실패했습니다. 샘플로 대체하지 않습니다.': 'Recipe generation failed. No sample recipes were substituted.',
    '레시피 생성 서비스가 연결되지 않았습니다. 잠시 후 다시 시도해 주세요.': 'The recipe service is unavailable. Please try again shortly.',
    '레시피 응답 형식이 올바르지 않습니다.': 'The recipe response was incomplete. Please try again.',
    '레시피 생성 시간이 초과되었습니다. 다시 시도해 주세요.': 'The request timed out. Please try again.',
    '레시피 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.': 'The request timed out. Please try again shortly.',
    '레시피 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.': 'Unable to create recipes. Please try again shortly.',
    '레시피 서비스 설정이 완료되지 않았습니다.': 'The recipe service is not configured yet.',
    '알 수 없는 오류가 발생했습니다.': 'An unexpected error occurred.',
    '불 사용 안 함': 'No heat', '약불': 'Low heat', '중약불': 'Medium-low heat', '중불': 'Medium heat',
    '중강불': 'Medium-high heat', '강불': 'High heat', '불 세기 확인': 'Check heat level', '상태를 보며 조절': 'Adjust as needed',
    '냉장고를 비우면': 'Empty your fridge,', '식탁은 더 풍성해집니다.': 'fill your table.',
    '불필요한 장보기를 줄이고, 잊혀가던 식재료를 먼저 사용하세요. 거창한 철학 같지만 사실은 양파가 썩기 전에 먹자는 이야기입니다.': 'Shop less and use the ingredients you already have before they go to waste.',
    '추천 레시피는 조리 환경에 따라 달라질 수 있습니다. 알레르기와 식품 안전은 직접 확인해 주세요.': 'Results may vary with your cooking setup. Always check allergens and food safety.'
  };
  let language = 'ko';
  try { language = localStorage.getItem(storageKey) === 'en' ? 'en' : 'ko'; } catch { /* Memory-only mode. */ }
  const queryLanguage = new URLSearchParams(location.search).get('lang');
  if (queryLanguage === 'ko' || queryLanguage === 'en') language = queryLanguage;
  document.documentElement.lang = language;
  let initialized = false;
  let loading = false;
  let observer;
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const observedAttributes = ['placeholder', 'aria-label', 'alt', 'title'];

  function translatePlain(plain) {
    if (Object.prototype.hasOwnProperty.call(translations, plain)) return translations[plain];
    const patterns = [
      [/^취향 선택으로\s*·\s*(\d+)개$/, (_, n) => `Next: preferences · ${n}`],
      [/^(\d+)개 재료를 골랐습니다\.$/, (_, n) => `${n} ingredient${n === '1' ? '' : 's'} selected.`],
      [/^재료 일치\s*(\d+)%$/, (_, n) => `${n}% ingredient match`],
      [/^내 재료\s*(\d+)개 활용$/, (_, n) => `Uses ${n} of your ingredients`],
      [/^(\d+)분 이내$/, (_, n) => `Up to ${n} min`],
      [/^(\d+)(?:인분|명)$/, (_, n) => `${n} serving${n === '1' ? '' : 's'}`],
      [/^(\d+)단계$/, (_, n) => `${n} steps`],
      [/^최대\s*(\d+)개$/, (_, n) => `Up to ${n}`],
      [/^레시피 생성 실패\s*\((\d+)\)$/, (_, code) => `Recipe generation failed (${code})`]
    ];
    for (const [pattern, format] of patterns) {
      if (pattern.test(plain)) return plain.replace(pattern, format);
    }
    // Durations are UI metadata, not prose. Handle ranges and minutes/seconds together.
    if (/^(?:\d+(?:\.\d+)?(?:\s*[~–-]\s*\d+(?:\.\d+)?)?\s*(?:시간|분|초)\s*)+(?:휴지|휴식|조리|식히기)?$/.test(plain)) {
      return plain.replace(/(\d)\s*시간/g, '$1 hr').replace(/(\d)\s*분/g, '$1 min')
        .replace(/(\d)\s*초/g, '$1 sec').replace(/휴지|휴식/g, 'rest')
        .replace(/조리/g, 'cooking').replace(/식히기/g, 'cooling');
    }
    // Mixed-language metadata (e.g. "Korean · 재료 일치 100%") needs field-wise translation.
    if (/\s[·|]\s/.test(plain)) return plain.split(/(\s+[·|]\s+)/).map((part, index) => index % 2 ? part : translatePlain(part)).join('');
    // Decorations may be attached with or without a space: ⏱2~3분, 🌶️ 매운맛, 보기 ↗.
    const decorated = plain.match(/^([^\p{L}\p{N}]*)([\s\S]*?[\p{L}\p{N}%.)])([^\p{L}\p{N}]*)$/u);
    if (decorated && (decorated[1] || decorated[3])) {
      const inner = decorated[2].trim();
      const translated = translatePlain(inner);
      if (translated !== inner) return `${decorated[1]}${translated}${decorated[3]}`;
    }
    return plain;
  }

  function t(value, lang = language) {
    const text = String(value ?? '');
    if (lang !== 'en') return text;
    const trimmed = text.trim();
    const plain = trimmed.normalize('NFC').replace(/\s+/g, ' ');
    const translated = translatePlain(plain);
    return translated === plain ? text : text.replace(trimmed, translated);
  }

  // Do not rewrite user-entered names or generated/saved instructions with a UI dictionary.
  function isRecipeContent(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    if (parent.closest('[data-i18n-keep],script,style,textarea,.fc-language-switch,[contenteditable="true"]')) return true;
    if (parent.closest('#modalTitle,.recipe-body > h3,.recipe-body > p,.modal-title-wrap > p,.favorite-row h3,.steps-list h4,.ingredient-row em')) return true;
    if (parent.closest('.step-row p') && !parent.closest('strong')) return true;
    if (parent.closest('.tip-box,.safety-box') && !parent.closest('strong')) return true;
    return false;
  }

  function updateTextNode(node, source) {
    let rendered = t(source);
    if (language === 'en' && source.trim() === '보통' && node.parentElement.closest('#saltyOptions')) rendered = source.replace('보통', 'Regular');
    if (rendered !== node.nodeValue) node.nodeValue = rendered;
    originals.set(node, { source, rendered });
  }

  function localizeControls() {
    // Read stable data keys, never the already-translated label, when controls are rebuilt.
    document.querySelectorAll('[data-category],[data-state-key][data-value],[data-wizard-jump]').forEach(control => {
      const source = control.dataset.category || control.dataset.value || ({ 1:'메인', 2:'재료', 3:'취향', 4:'레시피' })[control.dataset.wizardJump];
      if (!source) return;
      const node = [...control.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
      if (node) updateTextNode(node, source);
    });
    document.querySelectorAll('[data-ingredient],[data-remove]').forEach(control => {
      // Raw buttons also need translation; decoration may run after this render.
      const source = control.dataset.ingredient || control.dataset.remove;
      const label = control.querySelector('span:not(.ingredient-icon)') || control;
      const node = [...label.childNodes].find(child => child.nodeType === Node.TEXT_NODE && child.nodeValue.trim());
      if (node) updateTextNode(node, source);
    });
  }

  function localize() {
    if (!document.body) return;
    observer?.disconnect();
    try {
      // Freeze option values before translating labels so request payloads remain canonical.
      document.querySelectorAll('select option:not([value])').forEach(option => option.value = option.textContent);
      localizeControls();
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (!node.nodeValue.trim() || isRecipeContent(node)) continue;
        const previous = originals.get(node);
        const source = previous && node.nodeValue === previous.rendered ? previous.source : node.nodeValue;
        updateTextNode(node, source);
      }
      document.querySelectorAll('[placeholder],[aria-label],img[alt],[title]').forEach(element => {
        if (element.closest('.fc-language-switch,[data-i18n-keep]')) return;
        const saved = attributes.get(element) || {};
        for (const name of observedAttributes) {
          if (!element.hasAttribute(name)) continue;
          const current = element.getAttribute(name);
          const last = saved[name];
          const source = last && current === last.rendered ? last.source : current;
          const rendered = t(source);
          if (rendered !== current) element.setAttribute(name, rendered);
          saved[name] = { source, rendered };
        }
        attributes.set(element, saved);
      });
    } finally {
      observer?.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: observedAttributes });
    }
  }

  function recipeLanguage(recipe) {
    return recipe?.language === 'en' ? 'en' : recipe?.language === 'ko' ? 'ko' : /[가-힣]/.test(recipe?.title || '') ? 'ko' : 'en';
  }

  function addOriginalLanguageNote(container, recipes) {
    if (!container) return;
    const existing = container.querySelector('.fc-original-language-note');
    if (!recipes?.some(recipe => recipeLanguage(recipe) !== language)) { existing?.remove(); return; }
    const note = existing || document.createElement('p');
    note.className = 'fc-original-language-note';
    note.dataset.i18nKeep = 'true';
    const text = language === 'en'
      ? 'Existing recipes keep their original language. Newly created recipes will be in English.'
      : '기존 레시피는 작성된 언어로 유지됩니다. 새로 만드는 레시피는 한국어로 제공됩니다.';
    if (note.textContent !== text) note.textContent = text;
    if (!existing) container.appendChild(note);
  }

  function refreshRecipeLabels() {
    document.querySelectorAll('#recipeGrid .recipe-card').forEach((card, index) => {
      const recipe = state.recipes[index];
      if (!recipe) return;
      card.querySelectorAll('.used-chip').forEach((chip, i) => {
        const inputName = recipe.usedIngredients?.[i];
        const ingredient = recipe.ingredients?.find(item => item.inputName === inputName);
        if (ingredient && recipeLanguage(recipe) === 'en') {
          chip.dataset.i18nKeep = 'true';
          if (chip.textContent !== ingredient.name) chip.textContent = ingredient.name;
        }
      });
    });
    addOriginalLanguageNote(elements.resultSummary, state.recipes);
    if (!elements.recipeModal.hidden) {
      const id = elements.modalContent.querySelector('[data-modal-favorite]')?.dataset.modalFavorite;
      const recipe = findRecipe(id);
      addOriginalLanguageNote(elements.modalContent.querySelector('.modal-title-wrap'), recipe ? [recipe] : []);
    }
    addOriginalLanguageNote(elements.favoritesList, state.favorites);
  }

  function applyLanguage(lang, persist = true) {
    language = lang === 'en' ? 'en' : 'ko';
    if (persist) {
      try { localStorage.setItem(storageKey, language); } catch { /* Memory-only mode. */ }
      try {
        const url = new URL(location.href);
        url.searchParams.set('lang', language);
        history.replaceState(history.state, '', url);
      } catch { /* file:// and restricted history are supported. */ }
    }
    document.documentElement.lang = language;
    document.title = language === 'en' ? 'Fridge Chef | Cook with what you have' : '냉털셰프 | 있는 재료로 근사한 한 끼';
    document.querySelectorAll('[data-fc-language]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.fcLanguage === language));
      button.disabled = loading;
    });
    document.querySelector('.fc-language-switch')?.setAttribute('aria-label', language === 'en' ? 'App language' : '앱 언어');
    refreshRecipeLabels();
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

  function init() {
    if (initialized) return;
    initialized = true;
    const actions = document.querySelector('.header-actions');
    const switcher = document.createElement('div');
    switcher.className = 'fc-language-switch';
    switcher.setAttribute('role', 'group');
    switcher.innerHTML = '<button type="button" lang="ko" data-fc-language="ko">한국어</button><button type="button" lang="en" data-fc-language="en">English</button>';
    switcher.addEventListener('click', event => {
      const button = event.target.closest('[data-fc-language]');
      if (button && !loading) applyLanguage(button.dataset.fcLanguage);
    });
    actions?.appendChild(switcher);
    elements.favoritesButton.setAttribute('aria-label', '저장한 레시피');
    elements.favoritesButton.setAttribute('title', '저장한 레시피');
    document.body.classList.add('fc-language-ready');

    const originalGetFormData = getFormData;
    getFormData = () => ({ ...originalGetFormData(), language });
    const previousAdd = addCustomIngredient;
    addCustomIngredient = function addLocalizedIngredient() {
      const raw = elements.customIngredient.value.trim().replace(/\s+/g, ' ').slice(0, 60);
      if (!raw) return;
      const catalog = [...new Set(Object.values(ingredientCatalog).flat())];
      const name = catalog.find(item => item === raw || translations[item]?.toLowerCase() === raw.toLowerCase()) || raw;
      if (state.selected.includes(name)) showToast('이미 선택한 재료입니다.');
      else if (state.selected.length >= 5) showToast('재료는 최대 5개까지 선택할 수 있어요.');
      else { state.selected.push(name); elements.customIngredient.value = ''; renderSelected(); }
    };
    elements.customIngredient.maxLength = 60;
    elements.addIngredientButton.removeEventListener('click', previousAdd);
    elements.addIngredientButton.addEventListener('click', addCustomIngredient);

    const previousLoading = setLoading;
    setLoading = function setLocalizedLoading(value) {
      loading = Boolean(value);
      switcher.querySelectorAll('button').forEach(button => button.disabled = loading);
      previousLoading(value);
      localize();
    };
    // Renderers rebuild controls after a click or screen transition. Translate immediately,
    // and keep the observer for later async loaders, toast changes and accessibility labels.
    const renderers = ['renderCategoryTabs', 'renderIngredientCloud', 'renderSelected', 'renderOptionButtons', 'updateWizardSelectionState', 'showWizardStep', 'renderResults', 'openRecipe', 'renderFavorites', 'renderAiError', 'showToast'];
    renderers.forEach(name => {
      const previous = window[name];
      if (typeof previous !== 'function') return;
      window[name] = function localizedRender(...args) {
        const result = previous.apply(this, args);
        // Do not wait for the selected-count observer to refresh the next-step labels.
        if (name === 'renderSelected') window.updateWizardSelectionState?.();
        if (name === 'renderResults' || name === 'openRecipe' || name === 'renderFavorites') refreshRecipeLabels();
        localize();
        return result;
      };
    });
    const previousPublicError = publicErrorMessage;
    publicErrorMessage = function localizedError(message) {
      const translated = t(previousPublicError(message));
      return language === 'en' && /[가-힣]/.test(translated)
        ? 'The recipe service is temporarily unavailable. Please try again shortly.' : translated;
    };

    shareRecipe = async function shareLocalizedRecipe(recipe) {
      if (!recipe) return;
      const lang = recipeLanguage(recipe);
      const label = value => t(value, lang);
      const steps = (recipe.steps || []).map((step, i) => `${i + 1}. ${step.title}\n${[label(step.heat), label(step.duration)].filter(Boolean).join(' · ')}\n${step.description}${step.checkpoint ? `\n${label('완료 기준')}: ${step.checkpoint}` : ''}`).join('\n\n');
      const text = [
        `[${label('냉털셰프')}] ${recipe.title}`, recipe.subtitle,
        `${label(`${recipe.timeMinutes}분`)} · ${label(recipe.difficulty)} · ${label(`${recipe.servings}인분`)}`,
        '', label('준비 재료'), (recipe.ingredients || []).map(item => `- ${item.name}: ${item.amount}`).join('\n'),
        '', label('상세 조리 순서'), steps,
        '', `${label('셰프의 한 수')}: ${recipe.tip}`, `${label('보관:')} ${recipe.storage}`, `${label('주의:')} ${recipe.allergyNote}`
      ].join('\n');
      const url = new URL(location.pathname, location.origin);
      url.searchParams.set('lang', lang);
      if (navigator.share) {
        try { await navigator.share({ title: `${recipe.title} | ${label('냉털셰프')}`, text, url: url.href }); showToast('레시피를 공유했습니다.'); return; }
        catch (error) { if (error.name === 'AbortError') return; }
      }
      try { await copyText(`${text}\n\n${url.href}`); showToast('레시피 내용을 복사했습니다.'); }
      catch { showToast('공유 기능을 사용할 수 없습니다.'); }
    };
    copyShoppingList = async function copyLocalizedShoppingList(recipe) {
      if (!recipe) return;
      const extra = (recipe.ingredients || []).filter(item => !item.owned);
      const heading = language === 'en' ? 'Shopping list' : '장보기 목록';
      const empty = language === 'en' ? 'No additional ingredients needed.' : '추가로 살 재료가 없습니다.';
      const text = `[${recipe.title} — ${heading}]\n${extra.length ? extra.map(item => `- ${item.name}: ${item.amount}`).join('\n') : empty}`;
      try { await copyText(text); showToast('장보기 목록을 복사했습니다.'); }
      catch { showToast('복사 권한이 없어 목록을 복사하지 못했습니다.'); }
    };

    observer = new MutationObserver(localize);
    applyLanguage(language);
  }

  window.FridgeChefI18n = { init, t, getLanguage: () => language, setLanguage: lang => { if (initialized && !loading) applyLanguage(lang); } };
})();
