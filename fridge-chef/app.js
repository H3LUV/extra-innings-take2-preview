(() => {
  const version = '20260731-neutral-copy';
  const files = ['./app-core.js', './app-render.js', './app-ai-only.js', './app-detailed-steps.js', './app-init.js'];

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
