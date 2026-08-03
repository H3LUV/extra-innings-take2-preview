(() => {
  async function readGuideData() {
    const token = new URLSearchParams(location.search).get('d');
    if (!token || typeof decodeData !== 'function') return null;
    try { return await decodeData(token); } catch { return null; }
  }

  function makeAccordion(section, open = false) {
    if (!section || section.dataset.accordionReady === '1') return;
    section.dataset.accordionReady = '1';
    section.classList.add('accordionSection');
    if (open) section.classList.add('is-open');

    const head = section.querySelector('.sectionHead');
    if (!head) return;
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.setAttribute('aria-expanded', String(open));

    const toggleLabel = document.createElement('span');
    toggleLabel.className = 'accordionToggle';
    head.append(toggleLabel);

    const updateLabel = () => {
      const expanded = section.classList.contains('is-open');
      toggleLabel.textContent = expanded ? '접기 ▲' : '펼쳐보기 ▼';
      head.setAttribute('aria-expanded', String(expanded));
    };

    const body = document.createElement('div');
    body.className = 'accordionBody';
    [...section.children].filter((child) => child !== head).forEach((child) => body.appendChild(child));
    section.appendChild(body);

    const toggle = () => {
      section.classList.toggle('is-open');
      updateLabel();
    };
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });

    updateLabel();
  }

  async function enhance() {
    const app = document.getElementById('app');
    if (!app) return;
    const data = await readGuideData();
    if (!data) return;

    const labels = (data.cities || []).map((city) => city.label || city).filter(Boolean);
    const title = String(data.productName || '').trim();
    const heroTitle = document.getElementById('heroTitle');
    if (heroTitle) heroTitle.textContent = title ? `${title}\n여행 준비 안내` : `${labels.join(' · ')}\n여행 준비 안내`;

    if (title && labels.length && !document.getElementById('heroCities')) {
      const cities = document.createElement('p');
      cities.id = 'heroCities';
      cities.className = 'heroCities';
      cities.textContent = `여행지  ${labels.join(' · ')}`;
      heroTitle?.insertAdjacentElement('afterend', cities);
    }

    const sections = [...document.querySelectorAll('main > section')];
    makeAccordion(sections[0], false);
    makeAccordion(sections[2], false);
    makeAccordion(sections[5], false);
    if (sections[6] && !sections[6].hidden) makeAccordion(sections[6], false);
  }

  const observer = new MutationObserver(() => {
    const app = document.getElementById('app');
    if (app && !app.hidden && !document.body.dataset.guideV8Ready) {
      document.body.dataset.guideV8Ready = '1';
      enhance();
    }
  });

  observer.observe(document.documentElement, { attributes: true, childList: true, subtree: true });
  if (document.getElementById('app') && !document.getElementById('app').hidden) enhance();
})();