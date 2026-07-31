(() => {
  const files = ['./app-core.js', './app-demo.js', './app-render.js', './app-init.js'];
  const loadNext = (index) => {
    if (index >= files.length) return;
    const script = document.createElement('script');
    script.src = files[index];
    script.onload = () => loadNext(index + 1);
    script.onerror = () => {
      const badge = document.querySelector('#statusBadge');
      if (badge) badge.textContent = '사이트 로딩 오류';
    };
    document.head.appendChild(script);
  };
  loadNext(0);
})();
