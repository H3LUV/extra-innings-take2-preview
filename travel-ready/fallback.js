(() => {
  const $ = (id) => document.getElementById(id);
  let timer;
  let currencyRequest = '';

  const currencyByCountry = {
    BR:['BRL','브라질 헤알','🇧🇷'], PE:['PEN','페루 솔','🇵🇪'], MX:['MXN','멕시코 페소','🇲🇽'],
    AR:['ARS','아르헨티나 페소','🇦🇷'], CL:['CLP','칠레 페소','🇨🇱'], CO:['COP','콜롬비아 페소','🇨🇴'],
    CN:['CNY','중국 위안','🇨🇳'], HK:['HKD','홍콩 달러','🇭🇰'], TW:['TWD','대만 달러','🇹🇼'],
    TH:['THB','태국 바트','🇹🇭'], VN:['VND','베트남 동','🇻🇳'], ID:['IDR','인도네시아 루피아','🇮🇩'],
    MY:['MYR','말레이시아 링깃','🇲🇾'], PH:['PHP','필리핀 페소','🇵🇭'], IN:['INR','인도 루피','🇮🇳'],
    AE:['AED','아랍에미리트 디르함','🇦🇪'], TR:['TRY','튀르키예 리라','🇹🇷'], ZA:['ZAR','남아프리카공화국 랜드','🇿🇦'],
    CH:['CHF','스위스 프랑','🇨🇭'], CZ:['CZK','체코 코루나','🇨🇿'], HU:['HUF','헝가리 포린트','🇭🇺'],
    PL:['PLN','폴란드 즈워티','🇵🇱'], NO:['NOK','노르웨이 크로네','🇳🇴'], SE:['SEK','스웨덴 크로나','🇸🇪'],
    DK:['DKK','덴마크 크로네','🇩🇰'], IS:['ISK','아이슬란드 크로나','🇮🇸'], NZ:['NZD','뉴질랜드 달러','🇳🇿']
  };

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

  function isRegisteredCity() {
    try { return Array.isArray(state?.d?.h) && state.d.h.length > 0; } catch { return false; }
  }

  function fillNearby(city) {
    const grid = $('nearGrid');
    if (!grid || isRegisteredCity()) return;
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
    if (!grid || isRegisteredCity()) return;
    grid.innerHTML = [
      [3, '실속형 3성급 호텔', '가격과 교통 접근성을 우선해 확인합니다.'],
      [4, '균형형 4성급 호텔', '위치·시설·서비스의 균형을 비교합니다.'],
      [5, '프리미엄 5성급 호텔', '럭셔리 호텔과 리조트를 확인합니다.']
    ].map(([star, title, desc]) => `<article class="fallbackHotel" data-star="${star}"><span>${star}성급</span><h3>${title}</h3><p>${desc}</p><a href="${mapsUrl(`${city} ${star}성급 호텔`)}" target="_blank" rel="noopener">${city} ${star}성급 호텔 검색 →</a></article>`).join('');
    $('hotelEmpty')?.classList.add('hide');
  }

  function fillLocal(city) {
    if (isRegisteredCity()) return;
    const food = $('food');
    if (food) food.innerHTML = [
      linkCard('🍽️', `${city} 대표 맛집`, '현지 인기 식당을 지도에서 확인합니다.', `${city} 맛집`),
      linkCard('☕', `${city} 카페`, '관광 동선에 넣기 좋은 카페를 확인합니다.', `${city} 카페`),
      linkCard('🥘', `${city} 전통 음식`, '지역 대표 음식과 전문점을 확인합니다.', `${city} 전통 음식 맛집`)
    ].join('');
    const shop = $('shop');
    if (shop) shop.innerHTML = [
      linkCard('🛍️', `${city} 쇼핑몰`, '대표 쇼핑몰과 백화점을 확인합니다.', `${city} 쇼핑몰`),
      linkCard('🏷️', `${city} 아울렛`, '브랜드 아울렛과 할인 매장을 확인합니다.', `${city} 아울렛`),
      linkCard('🎁', `${city} 시장·기념품`, '전통시장과 기념품 쇼핑 장소를 확인합니다.', `${city} 시장 기념품`)
    ].join('');
  }

  function fillSeason(city) {
    if (isRegisteredCity()) return;
    const months = $('months');
    if (!months) return;
    const current = new Date().getMonth();
    months.innerHTML = Array.from({ length: 12 }, (_, i) => `<span class="autoMonth${i === current ? ' cur' : ''}">${i + 1}월</span>`).join('');
    if ($('seasonSummary')) $('seasonSummary').textContent = `${city}의 상세 월별 기후 데이터는 준비 중이며, 현재는 계절별 여행 정보 검색을 제공합니다.`;
    if ($('seasonTip')) $('seasonTip').innerHTML = `<a class="seasonSearch" href="https://www.google.com/search?q=${encodeURIComponent(`${city} 여행 적기 월별 날씨`)}" target="_blank" rel="noopener">${city} 여행 적기와 월별 기후 확인하기 →</a>`;
  }

  async function ensureCurrency() {
    let d;
    try { d = state?.d; } catch { return; }
    if (!d?.cc || d.x) return;
    const info = currencyByCountry[d.cc];
    if (!info) {
      if ($('fxDate')) $('fxDate').textContent = `${d.n || '선택 국가'}의 통화 정보는 준비 중입니다.`;
      return;
    }
    const [code, name, flag] = info;
    d.x = code;
    try { CC[d.cc] = code; FX[code] = [name, 1, flag]; } catch {}
    if (currencyRequest === code) return;
    currencyRequest = code;
    if ($('flag')) $('flag').textContent = flag;
    if ($('currencyCountry')) $('currencyCountry').textContent = `${d.n || ''} 통화`;
    if ($('currencyName')) $('currencyName').textContent = `${name} ${code}`;
    if ($('unit')) $('unit').textContent = `1 ${code}`;
    if ($('code')) $('code').textContent = code;
    if ($('fxDate')) $('fxDate').textContent = '환율 불러오는 중';
    try {
      const response = await fetch(`https://open.er-api.com/v6/latest/${code}`);
      const data = await response.json();
      const rate = Number(data?.rates?.KRW);
      if (!rate) throw new Error('rate unavailable');
      state.rate = rate;
      if ($('rate')) $('rate').textContent = `${Math.round(rate).toLocaleString('ko-KR')}원`;
      if ($('fxDate')) $('fxDate').textContent = `기준 환율 · ${data.time_last_update_utc ? new Date(data.time_last_update_utc).toLocaleDateString('ko-KR') : '최신'}`;
      try { convert(); } catch {
        const amount = Number($('amount')?.value || 0);
        if ($('won')) $('won').textContent = Math.round(amount * rate).toLocaleString('ko-KR');
      }
    } catch {
      if ($('rate')) $('rate').textContent = '조회 실패';
      if ($('fxDate')) $('fxDate').textContent = '환율 제공처 응답을 확인하지 못했습니다.';
    }
  }

  function applyFallback() {
    const city = cityName();
    if (!city || /불러오는 중|--/.test(city)) return;
    fillNearby(city);
    fillHotels(city);
    fillLocal(city);
    fillSeason(city);
    ensureCurrency();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(applyFallback, 500);
  }

  document.addEventListener('submit', schedule, true);
  document.addEventListener('click', schedule, true);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', () => setTimeout(applyFallback, 900));
})();
