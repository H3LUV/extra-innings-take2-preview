'use strict';

let wizardCurrentStep = 1;

const wizardStepMeta = {
  1: { label: '메인', hash: 'home' },
  2: { label: '재료', hash: 'ingredients' },
  3: { label: '취향', hash: 'preferences' },
  4: { label: '레시피', hash: 'recipes' }
};

function wizardStepFromHash() {
  const hash = location.hash.replace(/^#/, '');
  const match = Object.entries(wizardStepMeta).find(([, meta]) => meta.hash === hash);
  return match ? Number(match[0]) : 1;
}

function updateWizardProgress(step) {
  document.querySelectorAll('[data-wizard-jump]').forEach((button) => {
    const buttonStep = Number(button.dataset.wizardJump);
    button.classList.toggle('is-active', buttonStep === step);
    button.classList.toggle('is-complete', buttonStep < step);
    button.setAttribute('aria-current', buttonStep === step ? 'step' : 'false');
  });
}

function updateWizardSelectionState() {
  const note = document.querySelector('#wizardSelectionNote');
  const nextButton = document.querySelector('#wizardIngredientNext');
  const count = state.selected.length;

  if (note) {
    note.textContent = count
      ? `${count}개 재료를 골랐습니다.`
      : '재료를 1개 이상 골라주세요.';
    note.classList.toggle('is-ready', count > 0);
  }

  if (nextButton) {
    nextButton.textContent = count ? `취향 선택으로 · ${count}개` : '취향 선택으로';
  }
}

function showWizardStep(step, options = {}) {
  const target = Math.min(4, Math.max(1, Number(step) || 1));
  const { force = false, replace = false, fromPop = false } = options;

  if (target >= 3 && !state.selected.length && !force) {
    showToast('먼저 재료를 하나 이상 선택해 주세요. 빈 냉장고도 아니고 빈 선택으로는 어렵습니다.');
    return false;
  }

  if (target === 4 && elements.resultsSection.hidden && !state.recipes.length && !force) {
    showToast('취향을 고른 뒤 레시피를 만들어 주세요. 결과는 소환 전에는 나타나지 않습니다.');
    return false;
  }

  if (target === 4 && force) {
    elements.resultsSection.hidden = false;
  }

  document.querySelectorAll('.wizard-screen').forEach((screen) => {
    screen.classList.toggle('is-active', Number(screen.dataset.wizardStep) === target);
  });

  wizardCurrentStep = target;
  updateWizardProgress(target);
  updateWizardSelectionState();

  const activeScreen = document.querySelector(`.wizard-screen[data-wizard-step="${target}"]`);
  if (activeScreen) activeScreen.scrollTop = 0;

  if (!fromPop) {
    const url = new URL(location.href);
    url.hash = wizardStepMeta[target].hash;
    const method = replace ? 'replaceState' : 'pushState';
    history[method]({ wizardStep: target }, '', url);
  }

  return true;
}

window.showWizardStep = showWizardStep;

function buildWizardScreen(step, kicker, title, description, panel) {
  const screen = document.createElement('section');
  screen.className = 'wizard-screen wizard-form-screen shell';
  screen.dataset.wizardStep = String(step);
  screen.setAttribute('aria-labelledby', `wizardStepTitle${step}`);

  const heading = document.createElement('div');
  heading.className = 'wizard-stage-heading';
  heading.innerHTML = `
    <span>${escapeHtml(kicker)}</span>
    <h2 id="wizardStepTitle${step}">${escapeHtml(title)}</h2>
    <p>${escapeHtml(description)}</p>
  `;

  screen.appendChild(heading);
  screen.appendChild(panel);
  return screen;
}

function buildWizardNavigation() {
  const navigation = document.createElement('nav');
  navigation.className = 'wizard-progress';
  navigation.setAttribute('aria-label', '레시피 만들기 단계');
  navigation.innerHTML = `
    <div class="wizard-progress-inner">
      ${Object.entries(wizardStepMeta).map(([step, meta]) => `
        <button type="button" class="wizard-step-button" data-wizard-jump="${step}" data-number="${step}">${meta.label}</button>
      `).join('')}
    </div>
  `;
  document.querySelector('.site-header').after(navigation);

  navigation.addEventListener('click', (event) => {
    const button = event.target.closest('[data-wizard-jump]');
    if (!button) return;
    const target = Number(button.dataset.wizardJump);
    if (target <= wizardCurrentStep || target === 1) showWizardStep(target);
    else if (target === wizardCurrentStep + 1) showWizardStep(target);
    else showToast('앞 단계부터 차례로 진행해 주세요. 순서를 만든 데에는 드물게 이유가 있습니다.');
  });
}

function initializeWizard() {
  const main = document.querySelector('main');
  const hero = document.querySelector('.hero');
  const builder = document.querySelector('.builder-section');
  const ingredientPanel = document.querySelector('.ingredient-panel');
  const preferencePanel = document.querySelector('.preference-panel');
  const emptyPromise = document.querySelector('.empty-promise');
  const footer = document.querySelector('.site-footer');

  if (!main || !hero || !builder || !ingredientPanel || !preferencePanel || !elements.resultsSection) return;

  document.body.classList.add('wizard-ready');
  buildWizardNavigation();

  hero.classList.add('wizard-screen');
  hero.dataset.wizardStep = '1';

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'wizard-home-start';
  startButton.innerHTML = '<span>냉장고 열어보기</span><span>→</span>';
  startButton.addEventListener('click', () => showWizardStep(2));
  hero.querySelector('.hero-copy').appendChild(startButton);

  const ingredientActions = document.createElement('div');
  ingredientActions.className = 'wizard-panel-actions';
  ingredientActions.innerHTML = `
    <button type="button" class="wizard-back-button" data-wizard-back="1">← 메인</button>
    <button type="button" class="wizard-next-button" id="wizardIngredientNext">취향 선택으로</button>
    <span class="wizard-selection-note" id="wizardSelectionNote">재료를 1개 이상 골라주세요.</span>
  `;
  ingredientPanel.appendChild(ingredientActions);

  const preferenceActions = document.createElement('div');
  preferenceActions.className = 'wizard-panel-actions wizard-preference-actions';
  const preferenceBack = document.createElement('button');
  preferenceBack.type = 'button';
  preferenceBack.className = 'wizard-back-button';
  preferenceBack.textContent = '← 재료';
  preferenceBack.addEventListener('click', () => showWizardStep(2));
  preferenceActions.appendChild(preferenceBack);
  preferenceActions.appendChild(elements.generateButton);
  preferencePanel.appendChild(preferenceActions);

  const ingredientScreen = buildWizardScreen(
    2,
    'STEP 2 · INGREDIENTS',
    '냉장고 속 재료를 골라주세요',
    '최대 5개까지 선택할 수 있습니다. 직접 입력도 가능합니다.',
    ingredientPanel
  );

  const preferenceScreen = buildWizardScreen(
    3,
    'STEP 3 · PREFERENCES',
    '오늘 먹고 싶은 방향을 정해주세요',
    '스타일, 난이도, 인원과 조리시간을 고르면 됩니다.',
    preferencePanel
  );

  main.insertBefore(ingredientScreen, builder);
  main.insertBefore(preferenceScreen, builder);
  builder.remove();

  elements.resultsSection.classList.add('wizard-screen');
  elements.resultsSection.dataset.wizardStep = '4';

  const resultToolbar = document.createElement('div');
  resultToolbar.className = 'wizard-results-toolbar';
  resultToolbar.innerHTML = '<button type="button" class="wizard-results-back">← 취향 다시 고르기</button>';
  elements.resultsSection.prepend(resultToolbar);
  resultToolbar.querySelector('button').addEventListener('click', () => showWizardStep(3));

  ingredientActions.querySelector('[data-wizard-back]').addEventListener('click', () => showWizardStep(1));
  ingredientActions.querySelector('#wizardIngredientNext').addEventListener('click', () => showWizardStep(3));

  const brand = document.querySelector('.brand');
  if (brand) {
    brand.addEventListener('click', (event) => {
      event.preventDefault();
      showWizardStep(1);
    });
  }

  if (emptyPromise) emptyPromise.hidden = true;
  if (footer) footer.hidden = true;

  const selectedObserver = new MutationObserver(updateWizardSelectionState);
  selectedObserver.observe(elements.selectedCount, { childList: true, characterData: true, subtree: true });

  window.addEventListener('popstate', (event) => {
    if (!elements.recipeModal.hidden) closeModal(elements.recipeModal);
    if (!elements.favoritesModal.hidden) closeModal(elements.favoritesModal);

    let target = Number(event.state?.wizardStep) || wizardStepFromHash();
    if (target === 4 && elements.resultsSection.hidden && !state.recipes.length) target = state.selected.length ? 3 : 1;
    showWizardStep(target, { fromPop: true, force: target === 4 });
  });

  const initialStep = wizardStepFromHash();
  const safeInitialStep = initialStep === 4 && !state.recipes.length
    ? (state.selected.length ? 3 : 1)
    : initialStep;
  showWizardStep(safeInitialStep, { replace: true, force: safeInitialStep === 4 });
}

initializeWizard();
