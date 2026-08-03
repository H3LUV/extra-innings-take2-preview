(() => {
  const $ = (id) => document.getElementById(id);
  let lastCity = '';
  let timer;

  function cityName() {
    const title = $('title')?.textContent?.replace(/\s*여행 준비\s*$/, '').trim();
    if (title) return title;
    const place = $('place')?.textContent?.split('·')[0]?.trim();
    return place || $('q')?.value?.trim() || '';
  }

  function mapsUrl(query) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function linkCard(icon, title, description, query) {
    return `<a class="fallbackLink" href="${mapsUrl(query)}" target="_blank" rel="noopener"><i>${icon}</i><span><b>${title}</b><small>${description}</small></span><em>지도에서 보기 →</em></a>`;
  }

  function hasRealChildren(el) {
    if (!el) return false;
    return [...el.children].some((child) => !child.classList.contains('empty') && !child.classList.contains('hide'));
  }

  function fillNearby(city) {
    const grid = $('nearGrid');
    if (!grid || hasRealChildren(grid)) return;
    grid.innerHTML = [
      linkCard('📍', `${city} 대표 관광명소`, '도심 핵심 명소를 지도에서 확인합니다.', `${city} 관광명소`),
      linkCard('🗺️', `${city} 근교 여행지`, '당일치기와 근교 이동 후보를 확인합니다.', `${city} 근교 여행지`),
      linkCard('🏛️', `${city} 박물관·문화시설`, '박물관과 문화시설 위치를 확인합니다.', `${city} 박물관 문화시설`),
      linkCard('🌳', `${city} 공원·전망대`, '산책과 야경에 적합한 장소를 확인합니다.', `${city} 공원 전망대`)
    ].join('');
    $('nearEmpty')?.classList.add('hide');
    if ($('nearText')) $('nearText').textContent = `${city}의 대표 관광명소와 근교 여행지를 지도 검색으로 연결했습니다.`;
  }

  function fillHotels(city) {
    const grid = $('hotelGrid');
    if (!grid || hasRealChildren(grid)) return;
    grid.innerHTML = [
      [3, '실속형 3성급 호텔', '가격과 교통 접근성을 우선해 확인합니다.'],
      [4, '균형형 4성급 호텔', '위치·시설·서비스의 균형을 비교합니다.'],
      [5, '프리미엄 5성급 호텔', '럭셔리 호텔과 리조트를 확인합니다.']
    ].map(([star, title, desc]) => `<article class="fallbackHotel"><span>${star}성급</span><h3>${title}</h3><p>${desc}</p><a href="${mapsUrl(`${city} ${star}성급 호텔`)}" target="_blank" rel="noopener">${city} ${star}성급 호텔 검색 →</a></article>`).join('');
    $('hotelEmpty')?.classList.add('hide');
  }

  function fillLocal(city) {
    const food = $('food');
    if (food && !food.children.length) {
      food.innerHTML = [
        linkCard('🍽️', `${city} 대표 맛집`, '현지 인기 식당을 지도에서 확인합니다.', `${city} 맛집`),
        linkCard('☕', `${city} 카페`, '관광 동선에 넣기 좋은 카페를 확인합니다.', `${city} 카페`),
        linkCard('🥘', `${city} 전통 음식`, '지역 대표 음식과 전문점을 확인합니다.', `${city} 전통 음식 맛집`)
      ].join('');
    }
    const shop = $('shop');
    if (shop && !shop.children.length) {
      shop.innerHTML = [
        linkCard('🛍️', `${city} 쇼핑몰`, '대표 쇼핑몰과 백화점을 확인합니다.', `${city} 쇼핑몰`),
        linkCard('🏷️', `${city} 아울렛`, '브랜드 아울렛과 할인 매장을 확인합니다.', `${city} 아울렛`),
        linkCard('🎁', `${city} 시장·기념품`, '전통시장과 기념품 쇼핑 장소를 확인합니다.', `${city} 시장 기념품`)
      ].join('');
    }
  }

  function fillSeason(city) {
    const months = $('months');
    if (!months || months.children.length) return;
    const current = new Date().getMonth();
    months.innerHTML = Array.from({ length: 12 }, (_, i) => `<span class="autoMonth${i === current ? ' cur' : ''}">${i + 1}월</span>`).join('');
    if ($('seasonSummary')) $('seasonSummary').textContent = `${city}의 월별 상세 여행 적기는 도시 데이터가 추가되기 전까지 현지 기후 자료를 함께 확인해 주세요.`;
    if ($('seasonTip')) $('seasonTip').innerHTML = `<a class="seasonSearch" href="${mapsUrl(`${city} 여행 적기`)}" target="_blank" rel="noopener">${city} 여행 적기와 계절별 여행 정보를 확인하기 →</a>`;
  }

  function applyFallback() {
    const city = cityName();
    if (!city || /불러오는 중|--/.test(city)) return;
    if (city !== lastCity) lastCity = city;
    fillNearby(city);
    fillHotels(city);
    fillLocal(city);
    fillSeason(city);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(applyFallback, 1200);
  }

  document.addEventListener('submit', schedule, true);
  document.addEventListener('click', schedule, true);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', () => setTimeout(applyFallback, 1800));
})();
