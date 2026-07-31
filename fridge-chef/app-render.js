async function generateRecipes({ forceDemo = false } = {}) {
  const input = getFormData();
  if (!input.ingredients.length) {
    showToast('먼저 재료를 하나 이상 선택해 주세요. 공기로는 레시피가 안 나옵니다.');
    return;
  }

  setLoading(true);
  let source = 'demo';
  try {
    if (state.aiEnabled && !forceDemo) {
      const response = await fetch('/api/generate-recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI 호출 실패');
      state.recipes = data.recipes.map((recipe, index) => ({ ...recipe, id: `ai-${Date.now()}-${index}` }));
      source = 'Gemini AI';
    } else {
      await new Promise((resolve) => setTimeout(resolve, 650));
      state.recipes = buildDemoRecipes(input);
      source = '스마트 데모';
    }
  } catch (error) {
    state.recipes = buildDemoRecipes(input);
    source = '스마트 데모';
    showToast(`${error.message} 데모 레시피로 대신 준비했습니다.`);
  } finally {
    setLoading(false);
  }
  renderResults(input, source);
}

function setLoading(loading) {
  elements.generateButton.disabled = loading;
  elements.regenerateButton.disabled = loading;
  if (loading) {
    elements.resultsSection.hidden = false;
    elements.recipeGrid.innerHTML = '<div class="loading-card"></div><div class="loading-card"></div><div class="loading-card"></div>';
    elements.resultSummary.innerHTML = '<span class="summary-chip">재료의 운명을 재배치하는 중...</span>';
    elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function renderResults(input, source) {
  elements.resultsSection.hidden = false;
  elements.resultSummary.innerHTML = [
    ...input.ingredients.map((item) => `<span class="summary-chip">${escapeHtml(item)}</span>`),
    `<span class="summary-chip">${escapeHtml(input.cuisine)}</span>`,
    `<span class="summary-chip">${input.maxTime}분 이내</span>`,
    `<span class="summary-chip mode">${source}</span>`
  ].join('');
  const palettes = [
    ['#f2c14e', '#f5e6b6'], ['#a8c49a', '#e2ead8'], ['#e9a183', '#f4d6c8']
  ];
  elements.recipeGrid.innerHTML = state.recipes.map((recipe, index) => {
    const favorite = isFavorite(recipe);
    const [a, b] = palettes[index % palettes.length];
    return `
      <article class="recipe-card">
        <div class="recipe-visual" style="--card-a:${a};--card-b:${b}">
          <span class="score-badge">재료 일치 ${recipe.matchScore}%</span>
          <button type="button" class="favorite-icon ${favorite ? 'active' : ''}" data-favorite="${recipe.id}" aria-label="즐겨찾기">${favorite ? '♥' : '♡'}</button>
          <span class="recipe-emoji">${escapeHtml(recipe.emoji || '🍳')}</span>
        </div>
        <div class="recipe-body">
          <div class="recipe-meta"><span>◷ ${recipe.timeMinutes}분</span><span>• ${escapeHtml(recipe.difficulty)}</span><span>• ${recipe.servings}인분</span></div>
          <h3>${escapeHtml(recipe.title)}</h3>
          <p>${escapeHtml(recipe.subtitle)}</p>
          <div class="ingredient-usage">
            <strong>내 재료 ${recipe.usedIngredients.length}개 활용</strong>
            <div class="used-chips">${recipe.usedIngredients.map((item) => `<span class="used-chip">${escapeHtml(item)}</span>`).join('')}</div>
          </div>
          <button type="button" class="detail-button" data-detail="${recipe.id}">레시피 자세히 보기</button>
        </div>
      </article>`;
  }).join('');
  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function findRecipe(id) {
  return state.recipes.find((recipe) => recipe.id === id) || state.favorites.find((recipe) => recipe.id === id);
}

function openRecipe(id) {
  const recipe = findRecipe(id);
  if (!recipe) return;
  elements.modalContent.innerHTML = `
    <div class="modal-hero">
      <div class="modal-emoji">${escapeHtml(recipe.emoji || '🍳')}</div>
      <div class="modal-title-wrap">
        <div class="modal-kicker">${escapeHtml(recipe.cuisine)} · 재료 일치 ${recipe.matchScore}%</div>
        <h2 id="modalTitle">${escapeHtml(recipe.title)}</h2>
        <p>${escapeHtml(recipe.subtitle)}</p>
        <div class="modal-meta"><span>◷ ${recipe.timeMinutes}분</span><span>${escapeHtml(recipe.difficulty)}</span><span>${recipe.servings}인분</span></div>
      </div>
    </div>
    <div class="modal-columns">
      <section class="modal-section">
        <h3>준비 재료</h3>
        <div class="ingredient-list">
          ${recipe.ingredients.map((item) => `<div class="ingredient-row"><span>${escapeHtml(item.name)} ${item.owned ? '' : '<b class="need">추가 필요</b>'}</span><em>${escapeHtml(item.amount)}</em></div>`).join('')}
        </div>
        <div class="tip-box"><strong>셰프의 한 수</strong><br>${escapeHtml(recipe.tip)}</div>
      </section>
      <section class="modal-section">
        <h3>조리 순서</h3>
        <div class="steps-list">
          ${recipe.steps.map((step, index) => `<div class="step-row"><span class="step-number">${index + 1}</span><div><h4>${escapeHtml(step.title)}</h4><p>${escapeHtml(step.description)}</p></div></div>`).join('')}
        </div>
        <div class="safety-box"><strong>보관:</strong> ${escapeHtml(recipe.storage)}<br><strong>주의:</strong> ${escapeHtml(recipe.allergyNote)}</div>
      </section>
    </div>
    <div class="modal-actions">
      <button type="button" data-modal-favorite="${recipe.id}" class="primary">${isFavorite(recipe) ? '저장 취소' : '내 레시피에 저장'}</button>
      <button type="button" data-copy="${recipe.id}">장보기 목록 복사</button>
    </div>`;
  elements.recipeModal.hidden = false;
  document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
  modal.hidden = true;
  if (elements.recipeModal.hidden && elements.favoritesModal.hidden) document.body.style.overflow = '';
}

function isFavorite(recipe) {
  return state.favorites.some((item) => item.title === recipe.title);
}

function toggleFavorite(recipe) {
  const index = state.favorites.findIndex((item) => item.title === recipe.title);
  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast('저장한 레시피에서 삭제했습니다. 이별은 늘 이렇게 간단하군요.');
  } else {
    state.favorites.unshift(JSON.parse(JSON.stringify(recipe)));
    state.favorites = state.favorites.slice(0, 30);
    showToast('내 레시피에 저장했습니다.');
  }
  saveFavorites(state.favorites);
  updateFavoriteCount();
  if (!elements.resultsSection.hidden) renderResults(getFormData(), state.aiEnabled ? 'Gemini AI' : '스마트 데모');
}

function renderFavorites() {
  elements.favoritesList.innerHTML = state.favorites.length ? state.favorites.map((recipe) => `
    <div class="favorite-row">
      <span class="mini-emoji">${escapeHtml(recipe.emoji || '🍳')}</span>
      <div><h3>${escapeHtml(recipe.title)}</h3><p>${recipe.timeMinutes}분 · ${escapeHtml(recipe.cuisine)} · ${recipe.servings}인분</p></div>
      <button type="button" data-favorite-open="${recipe.id}">보기 ↗</button>
    </div>
  `).join('') : '<div class="empty-favorites">아직 저장한 레시피가 없습니다.<br>마음에 드는 요리에 하트를 눌러보세요.</div>';
}

async function copyShoppingList(recipe) {
  const extras = recipe.ingredients.filter((item) => !item.owned);
  const text = extras.length
    ? `[${recipe.title} 장보기 목록]\n${extras.map((item) => `- ${item.name}: ${item.amount}`).join('\n')}`
    : `[${recipe.title}] 추가로 살 재료가 없습니다.`;
  try {
    await navigator.clipboard.writeText(text);
    showToast('장보기 목록을 복사했습니다.');
  } catch {
    showToast('복사 권한이 없어 목록을 복사하지 못했습니다.');
  }
}
