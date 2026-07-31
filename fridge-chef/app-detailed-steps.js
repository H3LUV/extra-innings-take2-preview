'use strict';

(function enableDetailedCookingSteps() {
  const style = document.createElement('style');
  style.id = 'detailedStepStyles';
  style.textContent = `
    .step-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: 8px 0 10px;
    }
    .step-meta span {
      display: inline-flex;
      align-items: center;
      padding: 5px 9px;
      border-radius: 999px;
      background: rgba(32, 91, 67, .08);
      color: #285b46;
      font-size: .78rem;
      font-weight: 700;
    }
    .step-checkpoint {
      margin-top: 10px !important;
      padding: 10px 12px;
      border-left: 3px solid #d98b47;
      border-radius: 0 10px 10px 0;
      background: rgba(217, 139, 71, .08);
      color: #5e4a38 !important;
      line-height: 1.65 !important;
    }
    .step-checkpoint strong {
      color: #9a5a26;
    }
    .step-row > div > p:not(.step-checkpoint) {
      line-height: 1.78;
    }
    .modal-actions [data-share] {
      background: #255b43;
      border-color: #255b43;
      color: #fff;
    }
  `;
  document.head.appendChild(style);

  function buildRecipeShareText(recipe) {
    const ingredients = Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((item) => `- ${item.name}: ${item.amount}`).join('\n')
      : '';

    const steps = Array.isArray(recipe.steps)
      ? recipe.steps.map((step, index) => {
          const meta = [step.heat, step.duration].filter(Boolean).join(' · ');
          return `${index + 1}. ${step.title}${meta ? ` (${meta})` : ''}\n${step.description}`;
        }).join('\n\n')
      : '';

    return [
      `[냉털셰프] ${recipe.title}`,
      recipe.subtitle || '',
      `${recipe.timeMinutes}분 · ${recipe.difficulty} · ${recipe.servings}인분`,
      '',
      '준비 재료',
      ingredients,
      '',
      '조리 순서',
      steps,
      '',
      recipe.tip ? `셰프의 한 수: ${recipe.tip}` : ''
    ].filter((line, index, lines) => line || (index > 0 && lines[index - 1])).join('\n').trim();
  }

  function copyTextFallback(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  }

  shareRecipe = async function shareDetailedRecipe(recipe) {
    if (!recipe) return;

    const siteUrl = `${location.origin}${location.pathname}`;
    const text = buildRecipeShareText(recipe);
    const shareData = {
      title: `${recipe.title} | 냉털셰프`,
      text,
      url: siteUrl
    };

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share(shareData);
        showToast('레시피를 공유했습니다.');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    const clipboardText = `${text}\n\n${siteUrl}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(clipboardText);
      } else if (!copyTextFallback(clipboardText)) {
        throw new Error('copy failed');
      }
      showToast('레시피 내용을 복사했습니다.');
    } catch {
      showToast('공유 기능을 사용할 수 없습니다.');
    }
  };

  openRecipe = function openDetailedRecipe(id) {
    const recipe = findRecipe(id);
    if (!recipe) return;

    const steps = Array.isArray(recipe.steps) ? recipe.steps : [];

    elements.modalContent.innerHTML = `
      <div class="modal-hero">
        <div class="modal-emoji">${escapeHtml(recipe.emoji || '🍳')}</div>
        <div class="modal-title-wrap">
          <div class="modal-kicker">${escapeHtml(recipe.cuisine)} · 재료 일치 ${recipe.matchScore}%</div>
          <h2 id="modalTitle">${escapeHtml(recipe.title)}</h2>
          <p>${escapeHtml(recipe.subtitle)}</p>
          <div class="modal-meta"><span>◷ ${recipe.timeMinutes}분</span><span>${escapeHtml(recipe.difficulty)}</span><span>${recipe.servings}인분</span><span>${steps.length}단계</span></div>
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
          <h3>상세 조리 순서</h3>
          <div class="steps-list">
            ${steps.map((step, index) => {
              const heat = step.heat || '불 세기 확인';
              const duration = step.duration || '상태를 보며 조절';
              const checkpoint = step.checkpoint || '재료의 색과 질감을 확인한 뒤 다음 단계로 넘어가세요.';
              return `
                <div class="step-row">
                  <span class="step-number">${index + 1}</span>
                  <div>
                    <h4>${escapeHtml(step.title)}</h4>
                    <div class="step-meta">
                      <span>🔥 ${escapeHtml(heat)}</span>
                      <span>⏱ ${escapeHtml(duration)}</span>
                    </div>
                    <p>${escapeHtml(step.description)}</p>
                    <p class="step-checkpoint"><strong>완료 기준</strong><br>${escapeHtml(checkpoint)}</p>
                  </div>
                </div>`;
            }).join('')}
          </div>
          <div class="safety-box"><strong>보관:</strong> ${escapeHtml(recipe.storage)}<br><strong>주의:</strong> ${escapeHtml(recipe.allergyNote)}</div>
        </section>
      </div>
      <div class="modal-actions">
        <button type="button" data-share="${recipe.id}">레시피 공유하기</button>
        <button type="button" data-modal-favorite="${recipe.id}" class="primary">${isFavorite(recipe) ? '저장 취소' : '내 레시피에 저장'}</button>
        <button type="button" data-copy="${recipe.id}">장보기 목록 복사</button>
      </div>`;

    elements.recipeModal.hidden = false;
    document.body.style.overflow = 'hidden';
  };
})();
