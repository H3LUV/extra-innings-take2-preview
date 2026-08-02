(() => {
  const version = '20260802-ingredient-guide-v1';
  const files = [
    './app-core.js',
    './app-render.js',
    './app-ai-only.js',
    './app-detailed-steps.js',
    './app-wizard.js',
    './app-ingredient-tip.js',
    './app-wizard-bridge.js',
    './app-init.js',
    './app-upgrades.js',
    './app-cute-upgrades.js',
    './app-layout-fixes.js',
    './app-final-polish.js'
  ];

  const loadNext = (index) => {
    if (index >= files.length) return;

    const script = document.createElement('script');
    script.src = `${files[index]}?v=${version}`;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => {
      const badge = document.querySelector('#statusBadge');
      const button = document.querySelector('#generateButton');
      if (badge) badge.textContent = '사이트 로딩 오류';
      if (button) button.disabled = true;
    };
    document.head.appendChild(script);
  };

  loadNext(0);
})();
