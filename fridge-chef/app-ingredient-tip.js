'use strict';

(() => {
  const description = document.querySelector(
    '.wizard-screen[data-wizard-step="2"] .wizard-stage-heading p'
  );

  if (!description) return;

  description.innerHTML = `
    최대 5개까지 선택하거나 직접 입력할 수 있습니다.<br>
    <strong>구체적인 재료를 넣으면 더 정확한 레시피를 제공합니다.</strong><br>
    <span>예시) 신라면, 목살, 칵테일새우, 먹다 남은 후라이드치킨</span>
  `;
  description.classList.add('ingredient-specific-guide');
})();
