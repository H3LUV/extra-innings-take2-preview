'use strict';

(() => {
  const ingredientEmoji = {
    '계란': '🥚', '김치': '🥬', '돼지고기': '🥩', '소고기': '🥩', '닭고기': '🍗',
    '두부': '⬜', '양파': '🧅', '대파': '🌿', '감자': '🥔', '당근': '🥕',
    '참치캔': '🐟', '버섯': '🍄', '오징어': '🦑', '새우': '🦐', '고등어': '🐟',
    '연어': '🐟', '바지락': '🐚', '어묵': '🍢', '명란': '🐟', '애호박': '🥒',
    '배추': '🥬', '양배추': '🥬', '가지': '🍆', '브로콜리': '🥦', '밥': '🍚',
    '우동면': '🍜', '소면': '🍜', '파스타면': '🍝', '떡': '🍡', '식빵': '🍞',
    '라면': '🍜', '또띠아': '🫓', '치즈': '🧀', '우유': '🥛', '콩나물': '🌱',
    '옥수수': '🌽', '토마토': '🍅', '카레가루': '🍛', '만두': '🥟', '베이컨': '🥓',
    '햄': '🍖', '소시지': '🌭', '다짐육': '🥩', '오리고기': '🍗'
  };

  const titleFamilies = {
    pasta: ['바다의 낭만 크림 파스타', '노을빛 소스의 산책 파스타', '포근한 정원의 한입 파스타'],
    noodle: ['달빛 아래 호로록 면 한 그릇', '향긋한 바람을 담은 국수', '따뜻한 오후의 면 요리'],
    stir: ['불맛 벨벳 볶음', '팬 위에서 피어난 달밤 볶음', '매콤한 유혹의 한 접시'],
    stew: ['포근한 숲속 스튜', '보글보글 저녁의 위로', '따뜻한 냄비의 작은 정원'],
    soup: ['속을 달래는 구름 수프', '맑은 아침의 따뜻한 국물', '한 숟갈 포근한 위로'],
    rice: ['노을빛 한 그릇 덮밥', '숟가락을 부르는 작은 축제', '든든한 오후의 한 그릇'],
    egg: ['폭신한 햇살 계란말이', '노란 구름을 품은 한 접시', '아침을 깨우는 폭신한 달걀 요리'],
    bread: ['햇살을 품은 바삭 토스트', '바삭한 오후의 한입', '구름처럼 포근한 브런치'],
    grill: ['노릇한 향기가 춤추는 구이', '불향을 입은 황금빛 한 접시', '바삭한 저녁의 작은 선물'],
    salad: ['초록 바람이 머문 샐러드', '아삭한 정원의 한 접시', '햇살 가득 싱그러운 한입'],
    curry: ['황금빛 향신료의 여행', '노을을 닮은 포근한 커리', '향긋한 오후의 커리 한 그릇'],
    default: ['냉장고의 작은 축제', '오늘 저녁의 맛있는 발견', '한입에 피어나는 행복']
  };

  const poeticSignal = /(바다|노을|달빛|햇살|정원|구름|산책|축제|위로|멜로디|유혹|선물|춤|포근|불꽃|낭만|향기|행복|벨벳)/;

  function textHash(value) {
    return [...String(value)].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) >>> 0, 2166136261);
  }

  function recipeFamily(recipe) {
    const source = `${recipe.originalTitle || recipe.title || ''} ${recipe.subtitle || ''} ${(recipe.usedIngredients || []).join(' ')}`;
    if (/파스타|스파게티|마카로니|크림면/.test(source)) return 'pasta';
    if (/우동|국수|라면|면|소바/.test(source)) return 'noodle';
    if (/볶음|볶아|잡채/.test(source)) return 'stir';
    if (/찌개|전골|스튜|조림/.test(source)) return 'stew';
    if (/국|탕|수프|스프/.test(source)) return 'soup';
    if (/밥|덮밥|리소토|죽/.test(source)) return 'rice';
    if (/계란|달걀|오믈렛|오믈렛|스크램블/.test(source)) return 'egg';
    if (/토스트|샌드위치|빵|브런치/.test(source)) return 'bread';
    if (/구이|스테이크|로스트|그릴/.test(source)) return 'grill';
    if (/샐러드|무침|냉채/.test(source)) return 'salad';
    if (/카레|커리/.test(source)) return 'curry';
    return 'default';
  }

  function makeCreativeTitle(recipe, index) {
    const original = String(recipe.title || '').trim();
    if (poeticSignal.test(original) && original.length <= 30) return original;
    const family = recipeFamily({ ...recipe, originalTitle: original });
    const choices = titleFamilies[family] || titleFamilies.default;
    const seed = textHash(`${original}|${(recipe.usedIngredients || []).join('|')}|${index}`);
    return choices[seed % choices.length];
  }

  function enhanceRecipeData() {
    if (!Array.isArray(state.recipes)) return;
    state.recipes = state.recipes.map((recipe, index) => {
      if (recipe._cuteTitleApplied) return recipe;
      return {
        ...recipe,
        originalTitle: recipe.originalTitle || recipe.title,
        title: makeCreativeTitle(recipe, index),
        _cuteTitleApplied: true
      };
    });
  }

  function getGarnishes(recipe) {
    const ingredients = [...(recipe.usedIngredients || []), ...(recipe.extraIngredients || [])];
    const found = ingredients.map((item) => ingredientEmoji[item]).filter(Boolean);
    return [found[0] || '🌿', found[1] || '✨'];
  }

  function dishMainEmoji(family) {
    return {
      pasta: '🍝', noodle: '🍜', stir: '🥘', stew: '🍲', soup: '🥣', rice: '🍛',
      egg: '🍳', bread: '🥪', grill: '🍽️', salad: '🥗', curry: '🍛', default: '🍽️'
    }[family] || '🍽️';
  }

  function decorateRecipeCards() {
    const cards = [...document.querySelectorAll('#recipeGrid .recipe-card')];
    cards.forEach((card, index) => {
      const recipe = state.recipes[index];
      const visual = card.querySelector('.recipe-visual');
      if (!recipe || !visual || visual.dataset.cuteDecorated === 'true') return;

      const oldEmoji = visual.querySelector('.recipe-emoji');
      if (oldEmoji) oldEmoji.remove();

      const family = recipeFamily(recipe);
      const [garnishA, garnishB] = getGarnishes(recipe);
      const seed = textHash(`${recipe.originalTitle || recipe.title}|${index}`);
      const art = document.createElement('div');
      art.className = `dish-art dish-${family} dish-palette-${seed % 8}`;
      art.setAttribute('aria-hidden', 'true');
      art.innerHTML = `
        <span class="dish-table-shadow"></span>
        <span class="dish-plate"></span>
        <span class="dish-main">${dishMainEmoji(family)}</span>
        <span class="dish-garnish dish-garnish-a">${garnishA}</span>
        <span class="dish-garnish dish-garnish-b">${garnishB}</span>
        <span class="dish-steam steam-one"></span>
        <span class="dish-steam steam-two"></span>
      `;
      visual.appendChild(art);
      visual.dataset.cuteDecorated = 'true';
      card.dataset.dishFamily = family;
    });
  }

  function renderCuteLoader() {
    if (!elements.recipeGrid?.querySelector('.loading-card')) return;
    elements.recipeGrid.innerHTML = `
      <div class="cute-recipe-loader" aria-live="polite">
        <img src="./assets/chef-fridge.svg" alt="냉장고를 살펴보는 냉털셰프" />
        <div class="cute-loader-copy">
          <span>냉털셰프가 조합을 고민 중이에요</span>
          <strong>맛있는 아이디어를 볶고 있습니다</strong>
          <div class="cute-loader-bar"><i></i></div>
          <small>재료와 취향에 따라 잠시 시간이 걸릴 수 있어요.</small>
        </div>
      </div>
    `;
  }

  function decorateIngredients() {
    document.querySelectorAll('.ingredient-button').forEach((button) => {
      if (button.dataset.cuteDecorated === 'true') return;
      const name = button.textContent.trim();
      const icon = ingredientEmoji[name] || '🥣';
      button.innerHTML = `<span class="ingredient-icon" aria-hidden="true">${icon}</span><span>${escapeHtml(name)}</span>`;
      button.dataset.cuteDecorated = 'true';
    });
  }

  function decoratePreferenceLegends() {
    const iconMap = { '요리 스타일': '🍳', '오늘의 목적': '🍚', '매운맛': '🌶️', '짠맛': '🧂', '단맛': '🍬' };
    document.querySelectorAll('.preference-panel legend').forEach((legend) => {
      const plain = legend.textContent.trim();
      if (!iconMap[plain] || legend.dataset.cuteDecorated === 'true') return;
      legend.innerHTML = `<span class="legend-icon" aria-hidden="true">${iconMap[plain]}</span>${plain}`;
      legend.dataset.cuteDecorated = 'true';
    });
  }

  function buildHero() {
    const hero = document.querySelector('.hero');
    const copy = hero?.querySelector('.hero-copy');
    const art = hero?.querySelector('.hero-art');
    if (!hero || !copy || !art) return;

    hero.classList.add('cute-home-hero');
    const eyebrow = copy.querySelector('.eyebrow');
    const title = copy.querySelector('h1');
    const description = copy.querySelector(':scope > p');
    const facts = copy.querySelector('.hero-facts');
    const startButton = copy.querySelector('.wizard-home-start');

    if (eyebrow) eyebrow.innerHTML = '<span>냉장고 속 재료로 만드는 맛있는 한 끼</span>';
    if (title) title.innerHTML = '냉장고 털어<br><em>맛있는 요리 완성!</em>';
    if (description) description.textContent = '있는 재료를 고르고 취향을 알려주세요. 오늘 먹기 좋은 레시피 세 가지를 보기 좋게 준비합니다.';
    if (facts) {
      facts.innerHTML = `
        <div><strong>🧊</strong><span>재료 고르기</span></div>
        <div><strong>🥕</strong><span>취향 맞추기</span></div>
        <div><strong>🍳</strong><span>레시피 완성</span></div>
      `;
    }
    if (startButton) startButton.innerHTML = '<span>레시피 시작하기</span><span>→</span>';

    art.innerHTML = `
      <div class="hero-image-frame">
        <img src="./assets/chef-fridge.svg" alt="냉장고 속 재료를 꺼내는 귀여운 냉털셰프" />
        <span class="hero-speech">오늘은 뭘 만들까?</span>
        <span class="hero-spark hero-spark-one">✦</span>
        <span class="hero-spark hero-spark-two">✧</span>
      </div>
    `;
  }

  function updateBrand() {
    const mark = document.querySelector('.site-header .brand-mark');
    const brandText = document.querySelector('.site-header .brand > span:last-child');
    if (mark) mark.innerHTML = '<img src="./assets/chef-fridge.svg" alt="" />';
    if (brandText) {
      const small = brandText.querySelector('small');
      if (small) small.textContent = '냉장고 재료로 맛있는 한 끼';
    }
    if (elements.statusBadge) {
      elements.statusBadge.classList.remove('ai');
      elements.statusBadge.innerHTML = '<i></i> 레시피 준비 완료';
    }
  }

  function addStepMascots() {
    document.querySelectorAll('.wizard-stage-heading').forEach((heading) => {
      if (heading.querySelector('.stage-mascot')) return;
      const mascot = document.createElement('img');
      mascot.className = 'stage-mascot';
      mascot.src = './assets/chef-fridge.svg';
      mascot.alt = '';
      heading.prepend(mascot);
    });
  }

  if (typeof renderResults === 'function') {
    const originalRenderResults = renderResults;
    renderResults = function cuteRenderResults(input, source) {
      enhanceRecipeData();
      originalRenderResults(input, '맞춤 추천');
      requestAnimationFrame(decorateRecipeCards);
    };
  }

  buildHero();
  updateBrand();
  addStepMascots();
  decorateIngredients();
  decoratePreferenceLegends();
  decorateRecipeCards();

  const observer = new MutationObserver(() => {
    decorateIngredients();
    decoratePreferenceLegends();
    renderCuteLoader();
    decorateRecipeCards();
  });

  [elements.ingredientCloud, elements.recipeGrid, document.querySelector('.preference-panel')]
    .filter(Boolean)
    .forEach((target) => observer.observe(target, { childList: true, subtree: true }));
})();
