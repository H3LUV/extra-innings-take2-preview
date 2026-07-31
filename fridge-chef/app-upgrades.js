'use strict';

(() => {
  const saltyOptions = ['상관없음', '싱겁게', '보통', '짭짤하게'];
  const sweetOptions = ['상관없음', '단맛 없이', '은은하게', '달콤하게'];

  state.salty = state.salty || '상관없음';
  state.sweet = state.sweet || '상관없음';

  function buildTasteField(id, legend) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'choice-group compact-choice extra-taste-field';
    fieldset.innerHTML = `<legend>${legend}</legend><div class="pill-options" id="${id}"></div>`;
    return fieldset;
  }

  const spicyFieldset = elements.spicyOptions?.closest('fieldset');
  if (spicyFieldset) {
    const saltyField = buildTasteField('saltyOptions', '짠맛');
    const sweetField = buildTasteField('sweetOptions', '단맛');
    spicyFieldset.after(saltyField, sweetField);
    elements.saltyOptions = saltyField.querySelector('#saltyOptions');
    elements.sweetOptions = sweetField.querySelector('#sweetOptions');
  }

  function renderExtraTasteOptions() {
    renderOptionButtons(elements.saltyOptions, saltyOptions, 'salty', 'pill-choice');
    renderOptionButtons(elements.sweetOptions, sweetOptions, 'sweet', 'pill-choice');
  }

  [elements.saltyOptions, elements.sweetOptions].forEach((container) => {
    if (!container) return;
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-state-key]');
      if (!button) return;
      state[button.dataset.stateKey] = button.dataset.value;
      renderExtraTasteOptions();
    });
  });

  renderExtraTasteOptions();

  const originalGetFormData = getFormData;
  getFormData = function getFormDataWithTaste() {
    return {
      ...originalGetFormData(),
      salty: state.salty,
      sweet: state.sweet
    };
  };

  function resetRecipeBuilder() {
    state.selected = [];
    state.category = '인기';
    state.cuisine = '상관없음';
    state.purpose = '일상 한 끼';
    state.spicy = '상관없음';
    state.salty = '상관없음';
    state.sweet = '상관없음';
    state.recipes = [];

    if (elements.customIngredient) elements.customIngredient.value = '';
    if (elements.difficulty) elements.difficulty.value = '상관없음';
    if (elements.servings) elements.servings.value = '2';
    if (elements.maxTime) elements.maxTime.value = '30';
    if (elements.timeOutput) elements.timeOutput.textContent = '30분';

    elements.resultsSection.hidden = true;
    elements.resultSummary.innerHTML = '';
    elements.recipeGrid.innerHTML = '';

    renderCategoryTabs();
    renderSelected();
    renderOptionButtons(elements.cuisineOptions, cuisineOptions, 'cuisine', 'choice-button');
    renderOptionButtons(elements.purposeOptions, purposeOptions, 'purpose', 'pill-choice');
    renderOptionButtons(elements.spicyOptions, spicyOptions, 'spicy', 'pill-choice');
    renderExtraTasteOptions();
    if (typeof updateWizardSelectionState === 'function') updateWizardSelectionState();
  }

  function goToFreshHome() {
    if (typeof closeModal === 'function') {
      closeModal(elements.recipeModal);
      closeModal(elements.favoritesModal);
    }
    resetRecipeBuilder();
    showWizardStep(1, { force: true, replace: location.hash === '#home' });
  }

  const headerActions = document.querySelector('.header-actions');
  if (headerActions && !document.querySelector('#homeResetButton')) {
    const homeButton = document.createElement('button');
    homeButton.id = 'homeResetButton';
    homeButton.type = 'button';
    homeButton.className = 'header-home-button';
    homeButton.innerHTML = '<span aria-hidden="true">⌂</span><b>메인</b>';
    homeButton.setAttribute('aria-label', '선택을 초기화하고 메인으로 돌아가기');
    homeButton.addEventListener('click', goToFreshHome);
    headerActions.prepend(homeButton);
  }

  const brand = document.querySelector('.site-header .brand');
  if (brand) {
    brand.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      goToFreshHome();
    }, true);
  }

  const mainProgressButton = document.querySelector('[data-wizard-jump="1"]');
  if (mainProgressButton) {
    mainProgressButton.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      goToFreshHome();
    }, true);
  }

  const resultsToolbar = document.querySelector('.wizard-results-toolbar');
  if (resultsToolbar && !resultsToolbar.querySelector('.wizard-results-ingredients')) {
    const ingredientButton = document.createElement('button');
    ingredientButton.type = 'button';
    ingredientButton.className = 'wizard-results-back wizard-results-ingredients';
    ingredientButton.textContent = '← 재료 다시 선택하기';
    ingredientButton.addEventListener('click', () => showWizardStep(2));
    resultsToolbar.prepend(ingredientButton);
  }

  window.resetFridgeChef = goToFreshHome;
})();
