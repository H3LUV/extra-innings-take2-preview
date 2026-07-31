'use strict';

function getFormData() {
  return {
    ingredients: [...state.selected],
    cuisine: state.cuisine,
    difficulty: elements.difficulty.value,
    servings: Number(elements.servings.value),
    maxTime: Number(elements.maxTime.value),
    purpose: state.purpose,
    spicy: state.spicy
  };
}

function injectAiOnlyStyles() {
  if (document.querySelector('#aiOnlyStyles')) return;
  const style = document.createElement('style');
  style.id = 'aiOnlyStyles';
  style.textContent = `
    .ai-error-panel {
      grid-column: 1 / -1;
      padding: 34px;
      border: 1px solid rgba(90, 70, 50, .16);
      border-radius: 24px;
      background: rgba(255, 255, 255, .78);
      text-align: center;
    }
    .ai-error-panel strong {
      display: block;
      margin-bottom: 10px;
      font-size: 1.15rem;
    }
    .ai-error-panel p {
      margin: 0;
      line-height: 1.7;
      color: #685e52;
    }
    .ai-error-panel button {
      margin-top: 18px;
      padding: 11px 18px;
      border: 1px solid rgba(90, 70, 50, .18);
      border-radius: 999px;
      background: #fff;
      cursor: pointer;
    }
  `;
  document.head.appendChild(style);
}

function setAiReady(model) {
  state.aiEnabled = true;
  elements.statusBadge.classList.add('ai');
  elements.statusBadge.innerHTML = '<i></i> Gemini AI 연결됨';
  elements.generateModeText.textContent = `${model || 'Gemini'}가 실시간으로 만들어요`;
  elements.generateButton.disabled = false;
  elements.regenerateButton.disabled = false;
}

function setAiUnavailable(message = 'Gemini 연결을 확인해 주세요') {
  state.aiEnabled = false;
  elements.statusBadge.classList.remove('ai');
  elements.statusBadge.innerHTML = '<i></i> AI 연결 필요';
  elements.generateModeText.textContent = message;
  elements.generateButton.disabled = true;
  elements.regenerateButton.disabled = true;
}

checkApiStatus = async function checkApiStatusAiOnly() {
  if (location.protocol === 'file:') {
    setAiUnavailable('온라인 배포 주소에서 이용해 주세요');
    return;
  }

  elements.generateButton.disabled = true;
  elements.regenerateButton.disabled = true;
  elements.generateModeText.textContent = 'Gemini 연결 상태 확인 중...';

  try {
    const response = await fetch('/api/status', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.aiEnabled) {
      setAiUnavailable('Vercel 환경변수를 확인해 주세요');
      return;
    }

    setAiReady(data.model);
  } catch {
    setAiUnavailable('AI 서버 연결에 실패했습니다');
  }
};

setDemoStatus = function disableDemoStatus() {
  setAiUnavailable('Gemini 연결 후 이용할 수 있어요');
};

function renderAiError(input, message) {
  elements.resultsSection.hidden = false;
  elements.resultSummary.innerHTML = [
    ...input.ingredients.map((item) => `<span class="summary-chip">${escapeHtml(item)}</span>`),
    `<span class="summary-chip">${escapeHtml(input.cuisine)}</span>`,
    '<span class="summary-chip mode">Gemini 생성 실패</span>'
  ].join('');

  elements.recipeGrid.innerHTML = `
    <div class="ai-error-panel">
      <strong>AI 레시피를 만들지 못했습니다.</strong>
      <p>${escapeHtml(message)}<br>샘플 레시피로 대체하지 않습니다. 잠시 후 다시 시도해 주세요.</p>
      <button type="button" id="retryAiButton">연결 확인 후 다시 시도</button>
    </div>
  `;

  const retryButton = document.querySelector('#retryAiButton');
  if (retryButton) {
    retryButton.addEventListener('click', async () => {
      await checkApiStatus();
      if (state.aiEnabled) generateRecipes();
    }, { once: true });
  }

  elements.resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

generateRecipes = async function generateRecipesAiOnly() {
  const input = getFormData();

  if (!input.ingredients.length) {
    showToast('먼저 재료를 하나 이상 선택해 주세요. 공기로는 레시피가 안 나옵니다.');
    return;
  }

  if (!state.aiEnabled) {
    await checkApiStatus();
    if (!state.aiEnabled) {
      renderAiError(input, 'Gemini API가 연결되지 않았습니다. Vercel 환경변수와 최신 배포 상태를 확인하세요.');
      return;
    }
  }

  setLoading(true);

  try {
    const response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(input)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (response.status === 503) setAiUnavailable('Vercel 환경변수를 확인해 주세요');
      throw new Error(data.error || `AI 호출 실패 (${response.status})`);
    }

    if (!Array.isArray(data.recipes) || data.recipes.length !== 3) {
      throw new Error('Gemini 응답 형식이 올바르지 않습니다.');
    }

    state.recipes = data.recipes.map((recipe, index) => ({
      ...recipe,
      id: `ai-${Date.now()}-${index}`
    }));

    renderResults(input, 'Gemini AI');
  } catch (error) {
    state.recipes = [];
    const message = error?.message || '알 수 없는 오류가 발생했습니다.';
    renderAiError(input, message);
    showToast('AI 레시피 생성에 실패했습니다. 샘플로 대체하지 않습니다.');
  } finally {
    setLoading(false);
    if (!state.aiEnabled) {
      elements.generateButton.disabled = true;
      elements.regenerateButton.disabled = true;
    }
  }
};

toggleFavorite = function toggleFavoriteAiOnly(recipe) {
  if (!recipe) return;
  const index = state.favorites.findIndex((item) => item.title === recipe.title);

  if (index >= 0) {
    state.favorites.splice(index, 1);
    showToast('저장한 레시피에서 삭제했습니다.');
  } else {
    state.favorites.unshift(JSON.parse(JSON.stringify(recipe)));
    state.favorites = state.favorites.slice(0, 30);
    showToast('내 레시피에 저장했습니다.');
  }

  saveFavorites(state.favorites);
  updateFavoriteCount();

  if (!elements.resultsSection.hidden && state.recipes.length) {
    renderResults(getFormData(), 'Gemini AI');
  }
};

injectAiOnlyStyles();
elements.generateButton.disabled = true;
elements.regenerateButton.disabled = true;
