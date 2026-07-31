'use strict';

(() => {
  const heroAsset = '/api/hero-image?v=20260801-3';

  const dishNames = [
    '돼지김치두루치기', '김치두루치기', '제육볶음', '김치찌개', '된장찌개', '순두부찌개',
    '부대찌개', '청국장찌개', '닭볶음탕', '감자탕', '갈비찜', '김치볶음밥', '새우볶음밥',
    '계란볶음밥', '오므라이스', '비빔밥', '덮밥', '볶음밥', '리소토', '죽',
    '크림파스타', '토마토파스타', '오일파스타', '파스타', '우동', '국수', '라면', '소바',
    '계란말이', '오믈렛', '스크램블에그', '계란찜', '전', '부침개', '두부조림', '고등어조림',
    '생선구이', '스테이크', '그라탱', '오븐구이', '구이', '카레', '커리', '샐러드',
    '샌드위치', '토스트', '수프', '국', '탕', '전골', '찌개', '조림', '볶음', '무침'
  ].sort((a, b) => b.length - a.length);

  function inferDishName(recipe) {
    const explicit = String(recipe?.dishName || '').trim();
    if (explicit) return explicit.slice(0, 24);

    const ingredients = Array.isArray(recipe?.usedIngredients) ? recipe.usedIngredients : [];
    const source = `${recipe?.originalTitle || ''} ${recipe?.title || ''} ${recipe?.subtitle || ''}`.replace(/\s+/g, ' ');
    const found = dishNames.find((name) => source.includes(name));
    if (found) return found;

    const hasKimchi = ingredients.includes('김치') || source.includes('김치');
    const hasPork = ingredients.some((item) => /돼지고기|삼겹살|목살|앞다리살/.test(item)) || /돼지고기|삼겹살|목살|앞다리살/.test(source);
    if (hasKimchi && hasPork && /볶|두루치기/.test(source)) return '돼지김치두루치기';
    if (hasKimchi && /찌개|보글|국물/.test(source)) return '김치찌개';

    if (/파스타|스파게티|마카로니/.test(source)) return '파스타';
    if (/볶음밥|밥을 볶/.test(source)) return '볶음밥';
    if (/덮밥|밥 위/.test(source)) return '덮밥';
    if (/찌개|보글/.test(source)) return '찌개';
    if (/볶음|볶아/.test(source)) return '볶음';
    if (/조림|졸여/.test(source)) return '조림';
    if (/구이|굽/.test(source)) return '구이';
    if (/국|탕|수프|스프/.test(source)) return '국물요리';
    return '냉장고 한 끼';
  }

  function finalRecipeTitle(recipe) {
    const dishName = inferDishName(recipe);
    const current = String(recipe?.title || '').replace(/\s+/g, ' ').trim();

    if (current.includes(dishName)) return current.slice(0, 36);

    const original = String(recipe?.originalTitle || '').replace(/\s+/g, ' ').trim();
    if (original.includes(dishName)) return original.slice(0, 36);

    const prefix = current
      .replace(/(한 접시|한 그릇|작은 정원|작은 축제|맛있는 발견|행복)$/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const safePrefix = prefix && prefix !== dishName ? prefix.slice(0, 18) : '오늘의 맛있는';
    return `${safePrefix} ${dishName}`.replace(/\s+/g, ' ').trim().slice(0, 36);
  }

  function normalizeRecipeTitles() {
    if (!Array.isArray(state.recipes)) return;
    state.recipes = state.recipes.map((recipe) => ({
      ...recipe,
      dishName: inferDishName(recipe),
      title: finalRecipeTitle(recipe),
      _cuteTitleApplied: true
    }));
  }

  if (typeof renderResults === 'function') {
    const previousRenderResults = renderResults;
    renderResults = function renderFinalResults(input, source) {
      normalizeRecipeTitles();
      previousRenderResults(input, source);
    };
  }

  function rebuildIntegratedHome() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    hero.className = `${hero.className} home-final-screen`.replace(/\s+/g, ' ').trim();
    hero.innerHTML = `
      <div class="home-final-shell">
        <div class="home-final-art" aria-label="냉장고 안을 살펴보는 냉털셰프">
          <span class="home-final-glow glow-one"></span>
          <span class="home-final-glow glow-two"></span>
          <img class="home-final-image" src="${heroAsset}" alt="열린 냉장고 안의 재료를 살펴보는 귀여운 냉털셰프" />
          <span class="home-final-note">오늘은 냉장고 안에서 찾아볼까요?</span>
        </div>

        <div class="home-final-copy">
          <p class="home-final-kicker"><i></i> 냉장고 속 재료로 만드는 맛있는 한 끼</p>
          <h1>냉털셰프와 함께<br><em>맛있는 요리 시작!</em></h1>
          <p class="home-final-description">있는 재료를 최대 5개 고르고, 원하는 맛과 조리시간을 알려주세요. 어떤 요리인지 한눈에 알 수 있는 자세한 레시피 세 가지를 준비합니다.</p>

          <div class="home-final-features">
            <div><span>🧊</span><strong>재료 고르기</strong><small>최대 5개 선택</small></div>
            <div><span>🥕</span><strong>취향 맞추기</strong><small>맛·시간 설정</small></div>
            <div><span>🍳</span><strong>레시피 완성</strong><small>자세한 3가지</small></div>
          </div>

          <button class="home-final-start" id="homeFinalStart" type="button">
            <span>레시피 시작하기</span><b aria-hidden="true">→</b>
          </button>

          <div class="home-final-tip"><span>🌿</span><p><strong>오늘의 냉털 팁</strong>유통기한이 가까운 재료부터 고르면 냉장고도 식비도 한결 가벼워집니다.</p></div>
        </div>
      </div>
    `;

    hero.querySelector('#homeFinalStart')?.addEventListener('click', () => window.showWizardStep?.(2));
  }

  function replaceMascotAssets() {
    document.querySelectorAll('img[src*="chef-fridge"]').forEach((image) => {
      if (!image.src.includes('/api/hero-image')) image.src = heroAsset;
    });

    const mark = document.querySelector('.site-header .brand-mark');
    const currentMark = mark?.querySelector('img');
    if (mark && (!currentMark || !currentMark.src.includes('/api/hero-image'))) {
      mark.innerHTML = `<img src="${heroAsset}" alt="" />`;
    }
  }

  rebuildIntegratedHome();
  replaceMascotAssets();

  const observer = new MutationObserver(() => replaceMascotAssets());
  observer.observe(document.body, { childList: true, subtree: true });
})();
