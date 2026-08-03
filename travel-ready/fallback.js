(() => {
  const $ = (id) => document.getElementById(id);
  const cache = new Map();
  let activeKey = '';
  let timer;

  const COUNTRY_CURRENCY = {
    AR:'ARS', AU:'AUD', BR:'BRL', CA:'CAD', CH:'CHF', CL:'CLP', CN:'CNY', CO:'COP', CZ:'CZK',
    DK:'DKK', EG:'EGP', GB:'GBP', HK:'HKD', HU:'HUF', ID:'IDR', IN:'INR', IS:'ISK', JP:'JPY',
    KR:'KRW', MA:'MAD', MX:'MXN', MY:'MYR', NO:'NOK', NZ:'NZD', PE:'PEN', PH:'PHP', PL:'PLN',
    SE:'SEK', SG:'SGD', TH:'THB', TR:'TRY', TW:'TWD', US:'USD', VN:'VND', ZA:'ZAR',
    AT:'EUR', BE:'EUR', DE:'EUR', ES:'EUR', FI:'EUR', FR:'EUR', GR:'EUR', IE:'EUR', IT:'EUR',
    NL:'EUR', PT:'EUR', SK:'EUR'
  };

  const CURRENCY_NAME = {
    ARS:'아르헨티나 페소', AUD:'호주 달러', BRL:'브라질 헤알', CAD:'캐나다 달러', CHF:'스위스 프랑',
    CLP:'칠레 페소', CNY:'중국 위안', COP:'콜롬비아 페소', CZK:'체코 코루나', DKK:'덴마크 크로네',
    EGP:'이집트 파운드', EUR:'유로', GBP:'영국 파운드', HKD:'홍콩 달러', HUF:'헝가리 포린트',
    IDR:'인도네시아 루피아', INR:'인도 루피', ISK:'아이슬란드 크로나', JPY:'일본 엔', KRW:'대한민국 원',
    MAD:'모로코 디르함', MXN:'멕시코 페소', MYR:'말레이시아 링깃', NOK:'노르웨이 크로네',
    NZD:'뉴질랜드 달러', PEN:'페루 솔', PHP:'필리핀 페소', PLN:'폴란드 즈워티', SEK:'스웨덴 크로나',
    SGD:'싱가포르 달러', THB:'태국 바트', TRY:'튀르키예 리라', TWD:'대만 달러', USD:'미국 달러',
    VND:'베트남 동', ZAR:'남아프리카 랜드'
  };

  function cityName() {
    const title = $('title')?.textContent?.replace(/\s*여행 준비\s*$/, '').trim();
    const place = $('place')?.textContent?.split('·')[0]?.trim();
    return title || place || $('q')?.value?.trim() || '';
  }

  function isRegisteredCity() {
    try {
      const d = typeof state !== 'undefined' ? state.d : null;
      return Boolean(d && Array.isArray(d.h) && d.h.length && Array.isArray(d.s) && d.s.length === 12);
    } catch { return false; }
  }

  async function geocode(city) {
    if (cache.has(`geo:${city}`)) return cache.get(`geo:${city}`);
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name: city, count: '1', language: 'ko', format: 'json' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('도시 위치 조회 실패');
    const item = (await response.json()).results?.[0];
    if (!item) throw new Error('도시 위치를 찾지 못했습니다.');
    const result = {
      city: item.name || city,
      country: item.country || '',
      countryCode: item.country_code || '',
      latitude: item.latitude,
      longitude: item.longitude,
      timezone: item.timezone || 'auto'
    };
    cache.set(`geo:${city}`, result);
    return result;
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const r = 6371;
    const toRad = (v) => v * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function loadClimate(geo) {
    const key = `climate:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const now = new Date();
    const endYear = now.getFullYear() - 1;
    const startYear = endYear - 4;
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.search = new URLSearchParams({
      latitude: String(geo.latitude), longitude: String(geo.longitude),
      start_date: `${startYear}-01-01`, end_date: `${endYear}-12-31`,
      daily: 'temperature_2m_mean,precipitation_sum', timezone: 'auto'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error('기후 데이터 조회 실패');
    const daily = (await response.json()).daily;
    if (!daily?.time?.length) throw new Error('기후 데이터 없음');
    const months = Array.from({ length: 12 }, () => ({ temp: 0, rain: 0, days: 0 }));
    daily.time.forEach((date, i) => {
      const month = Number(date.slice(5, 7)) - 1;
      const temp = Number(daily.temperature_2m_mean?.[i]);
      const rain = Number(daily.precipitation_sum?.[i]);
      if (Number.isFinite(temp)) months[month].temp += temp;
      if (Number.isFinite(rain)) months[month].rain += rain;
      months[month].days += 1;
    });
    const result = months.map((m) => ({ temp: m.days ? m.temp / m.days : 0, rain: m.rain / 5 }));
    cache.set(key, result);
    return result;
  }

  function seasonScore(temp, rain) {
    const comfort = Math.max(0, 100 - Math.abs(temp - 20) * 5.2);
    const rainPenalty = Math.min(55, rain * 0.45);
    return Math.max(0, Math.min(100, comfort - rainPenalty));
  }

  function renderClimate(city, climate) {
    const months = $('months');
    if (!months) return;
    const scores = climate.map((m) => seasonScore(m.temp, m.rain));
    const current = new Date().getMonth();
    months.innerHTML = climate.map((m, i) => {
      const score = scores[i];
      const cls = score >= 68 ? 'best' : score >= 48 ? 'good' : 'low';
      return `<div class="climateMonth ${cls}${i === current ? ' cur' : ''}"><b>${i + 1}월</b><span>${Math.round(m.temp)}°C</span><small>강수 ${Math.round(m.rain)}mm</small></div>`;
    }).join('');
    const ranked = scores.map((score, i) => ({ score, month: i + 1 })).sort((a, b) => b.score - a.score);
    const best = ranked.slice(0, 3).map((x) => `${x.month}월`).join('·');
    if ($('seasonSummary')) $('seasonSummary').textContent = `${city}의 최근 5년 평균 기온과 강수량을 분석했습니다. 추천 시기는 ${best}입니다.`;
    if ($('seasonTip')) $('seasonTip').textContent = '기온 20°C 전후와 월 강수량을 기준으로 계산한 참고 지표입니다. 축제·성수기·미세기후는 별도로 확인하세요.';
  }

  async function loadHotels(geo) {
    const key = `hotels:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const query = `[out:json][timeout:25];(nwr(around:18000,${geo.latitude},${geo.longitude})["tourism"="hotel"];nwr(around:18000,${geo.latitude},${geo.longitude})["tourism"="resort"];);out center tags 60;`;
    const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
    let data;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`);
        if (response.ok) { data = await response.json(); break; }
      } catch {}
    }
    if (!data?.elements) throw new Error('호텔 데이터 조회 실패');
    const seen = new Set();
    const hotels = data.elements.map((el) => {
      const tags = el.tags || {};
      const name = tags['name:ko'] || tags.name || tags.brand;
      const lat = el.lat ?? el.center?.lat;
      const lon = el.lon ?? el.center?.lon;
      if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      const normalized = name.toLowerCase();
      if (seen.has(normalized)) return null;
      seen.add(normalized);
      const starsRaw = String(tags.stars || tags['hotel:stars'] || '').match(/[1-5]/)?.[0];
      const stars = starsRaw ? Number(starsRaw) : null;
      const area = [tags['addr:suburb'], tags['addr:city'], tags['addr:street']].filter(Boolean).join(' · ');
      return { name, stars, area, distance: haversine(geo.latitude, geo.longitude, lat, lon), lat, lon };
    }).filter(Boolean).sort((a, b) => {
      if (a.stars && b.stars && a.stars !== b.stars) return b.stars - a.stars;
      if (a.stars && !b.stars) return -1;
      if (!a.stars && b.stars) return 1;
      return a.distance - b.distance;
    }).slice(0, 12);
    cache.set(key, hotels);
    return hotels;
  }

  function renderHotels(city, hotels) {
    const grid = $('hotelGrid');
    if (!grid) return;
    if (!hotels.length) {
      grid.innerHTML = `<div class="liveEmpty">${city} 주변에서 공개 호텔 데이터를 찾지 못했습니다.</div>`;
      $('hotelEmpty')?.classList.add('hide');
      return;
    }
    grid.innerHTML = hotels.map((h) => {
      const star = h.stars ? `${h.stars}성급` : '등급 미표기';
      const map = `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`;
      return `<article class="liveHotel" data-live-stars="${h.stars || 0}"><span>${star}</span><h3>${h.name}</h3><p>${h.area || `${city} 중심에서 약 ${h.distance.toFixed(1)}km`}</p><small>도심 기준 약 ${h.distance.toFixed(1)}km</small><a href="${map}" target="_blank" rel="noopener">지도에서 위치 확인 →</a></article>`;
    }).join('');
    $('hotelEmpty')?.classList.add('hide');
  }

  function bindLiveFilters() {
    document.querySelectorAll('#filters button').forEach((button) => {
      if (button.dataset.liveBound) return;
      button.dataset.liveBound = '1';
      button.addEventListener('click', () => {
        const value = button.dataset.s || 'all';
        setTimeout(() => {
          document.querySelectorAll('.liveHotel').forEach((card) => {
            card.hidden = value !== 'all' && card.dataset.liveStars !== value;
          });
        }, 0);
      });
    });
  }

  async function updateCurrency(geo) {
    const code = COUNTRY_CURRENCY[geo.countryCode];
    if (!code || code === 'KRW') return;
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${code}&to=KRW`);
      if (!response.ok) return;
      const json = await response.json();
      const value = Number(json.rates?.KRW);
      if (!Number.isFinite(value)) return;
      const unit = ['JPY','IDR','VND','KRW'].includes(code) ? 100 : 1;
      if ($('currencyCountry')) $('currencyCountry').textContent = `${geo.country} 통화`;
      if ($('currencyName')) $('currencyName').textContent = `${CURRENCY_NAME[code] || code} ${code}`;
      if ($('unit')) $('unit').textContent = `${unit.toLocaleString('ko-KR')} ${code}`;
      if ($('code')) $('code').textContent = code;
      if ($('amount')) $('amount').value = unit;
      if ($('rate')) $('rate').textContent = `${Math.round(value * unit).toLocaleString('ko-KR')}원`;
      if ($('won')) $('won').textContent = Math.round(value * unit).toLocaleString('ko-KR');
      if ($('fxDate')) $('fxDate').textContent = `${json.date || '최근'} 기준 환율`;
    } catch {}
  }

  async function enhanceUnknownCity() {
    const city = cityName();
    if (!city || /불러오는 중|--/.test(city) || isRegisteredCity()) return;
    const key = city.toLowerCase();
    if (activeKey === key) return;
    activeKey = key;
    try {
      const geo = await geocode(city);
      updateCurrency(geo);
      const [climate, hotels] = await Promise.allSettled([loadClimate(geo), loadHotels(geo)]);
      if (climate.status === 'fulfilled') renderClimate(city, climate.value);
      else if ($('seasonSummary')) $('seasonSummary').textContent = `${city}의 기후 데이터를 불러오지 못했습니다.`;
      if (hotels.status === 'fulfilled') renderHotels(city, hotels.value);
      else {
        const grid = $('hotelGrid');
        if (grid) grid.innerHTML = `<div class="liveEmpty">호텔 공개 데이터를 불러오지 못했습니다. 잠시 후 다시 검색해 주세요.</div>`;
      }
      bindLiveFilters();
    } catch {
      activeKey = '';
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhanceUnknownCity, 900);
  }

  document.addEventListener('submit', schedule, true);
  document.addEventListener('click', schedule, true);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', () => setTimeout(enhanceUnknownCity, 1600));
})();
