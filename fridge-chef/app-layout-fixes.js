'use strict';

(() => {
  const hero = document.querySelector('.hero');

  function rebuildHomeScreen() {
    if (!hero) return;

    hero.classList.add('home-screen-v2');
    hero.innerHTML = `
      <div class="home-v2-layout">
        <section class="home-v2-visual" aria-label="냉장고 속 재료를 살펴보는 냉털셰프">
          <div class="home-v2-image-wrap">
            <img src="./assets/chef-fridge.svg" alt="냉장고에서 당근을 꺼내는 귀여운 냉털셰프" />
            <span class="home-v2-speech">오늘은 뭘 만들까?</span>
            <span class="home-v2-spark spark-a">✦</span>
            <span class="home-v2-spark spark-b">✧</span>
          </div>
        </section>

        <section class="home-v2-copy">
          <p class="home-v2-kicker"><span></span> 냉장고 속 재료로 만드는 맛있는 한 끼</p>
          <h1>냉장고 털어<br><em>맛있는 요리 완성!</em></h1>
          <p class="home-v2-description">있는 재료를 고르고 취향을 알려주세요. 오늘 먹기 좋은 맞춤 레시피 세 가지를 차근차근 준비합니다.</p>

          <div class="home-v2-features" aria-label="이용 단계">
            <div><span>🧊</span><strong>재료 고르기</strong><small>최대 5개 선택</small></div>
            <div><span>🥕</span><strong>취향 맞추기</strong><small>맛과 시간 설정</small></div>
            <div><span>🍳</span><strong>레시피 완성</strong><small>자세한 3가지</small></div>
          </div>

          <button class="home-v2-start" id="homeV2Start" type="button">
            <span>레시피 시작하기</span><b aria-hidden="true">→</b>
          </button>

          <div class="home-v2-tip"><span>🌿</span><p><strong>오늘의 냉털 팁</strong> 오래된 재료부터 고르면 식비도 줄고 냉장고도 숨을 쉽니다.</p></div>
        </section>
      </div>
    `;

    hero.querySelector('#homeV2Start')?.addEventListener('click', () => {
      window.showWizardStep?.(2);
    });
  }

  function activeStepFromDom() {
    const active = document.querySelector('.wizard-screen.is-active');
    return Number(active?.dataset.wizardStep) || 1;
  }

  function isolateWizardScreens(step = activeStepFromDom()) {
    document.querySelectorAll('.wizard-screen').forEach((screen) => {
      const isActive = Number(screen.dataset.wizardStep) === Number(step);
      screen.classList.toggle('is-active', isActive);
      screen.hidden = !isActive;
      screen.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      screen.toggleAttribute('inert', !isActive);
    });

    document.body.dataset.activeWizardStep = String(step);
  }

  const originalShowWizardStep = window.showWizardStep;
  if (typeof originalShowWizardStep === 'function') {
    const safeShowWizardStep = function safeShowWizardStep(step, options = {}) {
      const result = originalShowWizardStep(step, options);
      if (result !== false) {
        isolateWizardScreens(Number(step) || activeStepFromDom());
        requestAnimationFrame(() => isolateWizardScreens(Number(step) || activeStepFromDom()));
      }
      return result;
    };

    window.showWizardStep = safeShowWizardStep;
  }

  rebuildHomeScreen();
  document.querySelectorAll('.stage-mascot').forEach((mascot) => mascot.remove());
  isolateWizardScreens();

  window.addEventListener('pageshow', () => isolateWizardScreens());
  window.addEventListener('popstate', () => requestAnimationFrame(() => isolateWizardScreens()));
})();
