function bindEvents() {
  elements.categoryTabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    state.category = button.dataset.category;
    renderCategoryTabs();
    renderIngredientCloud();
  });
  elements.ingredientCloud.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ingredient]');
    if (button) toggleIngredient(button.dataset.ingredient);
  });
  elements.selectedTray.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove]');
    if (button) toggleIngredient(button.dataset.remove);
  });
  elements.addIngredientButton.addEventListener('click', addCustomIngredient);
  elements.customIngredient.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addCustomIngredient();
  });
  [elements.cuisineOptions, elements.purposeOptions, elements.spicyOptions].forEach((container) => {
    container.addEventListener('click', (event) => {
      const button = event.target.closest('[data-state-key]');
      if (!button) return;
      state[button.dataset.stateKey] = button.dataset.value;
      renderOptionButtons(elements.cuisineOptions, cuisineOptions, 'cuisine', 'choice-button');
      renderOptionButtons(elements.purposeOptions, purposeOptions, 'purpose', 'pill-choice');
      renderOptionButtons(elements.spicyOptions, spicyOptions, 'spicy', 'pill-choice');
    });
  });
  elements.maxTime.addEventListener('input', () => elements.timeOutput.textContent = `${elements.maxTime.value}분`);
  elements.generateButton.addEventListener('click', () => generateRecipes());
  elements.regenerateButton.addEventListener('click', () => generateRecipes());
  elements.recipeGrid.addEventListener('click', (event) => {
    const favorite = event.target.closest('[data-favorite]');
    const detail = event.target.closest('[data-detail]');
    if (favorite) toggleFavorite(findRecipe(favorite.dataset.favorite));
    if (detail) openRecipe(detail.dataset.detail);
  });
  elements.modalClose.addEventListener('click', () => closeModal(elements.recipeModal));
  elements.recipeModal.addEventListener('click', (event) => {
    if (event.target === elements.recipeModal) closeModal(elements.recipeModal);
    const favoriteButton = event.target.closest('[data-modal-favorite]');
    const copyButton = event.target.closest('[data-copy]');
    const shareButton = event.target.closest('[data-share]');
    if (favoriteButton) {
      const recipe = findRecipe(favoriteButton.dataset.modalFavorite);
      toggleFavorite(recipe);
      openRecipe(recipe.id);
    }
    if (copyButton) copyShoppingList(findRecipe(copyButton.dataset.copy));
    if (shareButton) shareRecipe(findRecipe(shareButton.dataset.share));
  });
  elements.favoritesButton.addEventListener('click', () => {
    renderFavorites();
    elements.favoritesModal.hidden = false;
    document.body.style.overflow = 'hidden';
  });
  elements.favoritesClose.addEventListener('click', () => closeModal(elements.favoritesModal));
  elements.favoritesModal.addEventListener('click', (event) => {
    if (event.target === elements.favoritesModal) closeModal(elements.favoritesModal);
    const open = event.target.closest('[data-favorite-open]');
    if (open) {
      closeModal(elements.favoritesModal);
      openRecipe(open.dataset.favoriteOpen);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal(elements.recipeModal);
      closeModal(elements.favoritesModal);
    }
  });
}

function init() {
  renderCategoryTabs();
  renderIngredientCloud();
  renderSelected();
  renderOptionButtons(elements.cuisineOptions, cuisineOptions, 'cuisine', 'choice-button');
  renderOptionButtons(elements.purposeOptions, purposeOptions, 'purpose', 'pill-choice');
  renderOptionButtons(elements.spicyOptions, spicyOptions, 'spicy', 'pill-choice');
  updateFavoriteCount();
  bindEvents();
  checkApiStatus();
}

init();
