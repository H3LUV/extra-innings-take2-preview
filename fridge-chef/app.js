(() => {
  const version = '20260930-ko-en-complete-v5';
  const files = [
    './app-i18n.js',
    './app-i18n-complete.js',
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

  for (const [id, file] of [['fridgeChefLanguageStyles','styles-i18n.css'], ['fridgeChefCompleteLanguageStyles','styles-i18n-complete.css']]) {
    if (!document.getElementById(id)) {
      const stylesheet = document.createElement('link');
      stylesheet.id = id;
      stylesheet.rel = 'stylesheet';
      stylesheet.href = `./${file}?v=${version}`;
      document.head.appendChild(stylesheet);
    }
  }

  const loadNext = (index) => {
    if (index >= files.length) {
      window.FridgeChefI18n?.init();
      return;
    }

    const script = document.createElement('script');
    script.src = `${files[index]}?v=${version}`;
    script.onload = () => loadNext(index + 1);
    script.onerror = () => {
      const badge = document.querySelector('#statusBadge');
      const button = document.querySelector('#generateButton');
      if (badge) badge.textContent = window.FridgeChefI18n?.t('사이트 로딩 오류') || '사이트 로딩 오류';
      if (button) button.disabled = true;
    };
    document.head.appendChild(script);
  };

  loadNext(0);
})();
