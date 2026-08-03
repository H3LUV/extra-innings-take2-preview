(() => {
  const labels = { best: 'BEST', good: 'GOOD', low: 'LOW', neutral: 'LOW' };
  let queued = false;

  function normalizeClimateCards() {
    const months = document.getElementById('months');
    if (!months) return;

    const cards = [...months.querySelectorAll('.climateMonth')];
    if (cards.length !== 12) {
      months.classList.remove('liveSeasonGrid');
      return;
    }

    months.classList.add('liveSeasonGrid');
    cards.forEach((card, index) => {
      const level = ['best', 'good', 'low'].find((name) => card.classList.contains(name)) || 'low';
      const monthText = card.querySelector('b')?.textContent?.match(/\d+월/)?.[0] || `${index + 1}월`;
      const signature = `${level}-${monthText}-${card.classList.contains('cur')}`;
      if (card.dataset.seasonUi === signature) return;

      card.dataset.seasonUi = signature;
      card.classList.add('seasonTile');
      card.innerHTML = `<b>${labels[level]}</b><small>${monthText}</small>`;
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      normalizeClimateCards();
    });
  }

  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  window.addEventListener('load', schedule);
  schedule();
})();
