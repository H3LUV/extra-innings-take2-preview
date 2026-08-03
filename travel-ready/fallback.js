(() => {
  const $ = (id) => document.getElementById(id);
  const cache = new Map();
  let timer;
  let runId = 0;

  const COUNTRY_CURRENCY = {
    AE:'AED', AR:'ARS', AT:'EUR', AU:'AUD', BE:'EUR', BG:'BGN', BO:'BOB', BR:'BRL', CA:'CAD',
    CH:'CHF', CL:'CLP', CN:'CNY', CO:'COP', CR:'CRC', CZ:'CZK', DE:'EUR', DK:'DKK', DO:'DOP',
    EC:'USD', EG:'EGP', ES:'EUR', FI:'EUR', FR:'EUR', GB:'GBP', GR:'EUR', HK:'HKD', HR:'EUR',
    HU:'HUF', ID:'IDR', IE:'EUR', IL:'ILS', IN:'INR', IS:'ISK', IT:'EUR', JP:'JPY', KE:'KES',
    KH:'KHR', KR:'KRW', LA:'LAK', LK:'LKR', MA:'MAD', MM:'MMK', MO:'MOP', MX:'MXN', MY:'MYR',
    NL:'EUR', NO:'NOK', NP:'NPR', NZ:'NZD', PA:'USD', PE:'PEN', PH:'PHP', PL:'PLN', PT:'EUR',
    PY:'PYG', QA:'QAR', RO:'RON', RS:'RSD', SA:'SAR', SE:'SEK', SG:'SGD', SI:'EUR', SK:'EUR',
    TH:'THB', TR:'TRY', TW:'TWD', TZ:'TZS', UA:'UAH', US:'USD', UY:'UYU', VN:'VND', ZA:'ZAR'
  };

  const CURRENCY_NAME = {
    AED:'UAE 디르함', ARS:'아르헨티나 페소', AUD:'호주 달러', BGN:'불가리아 레프', BOB:'볼리비아 볼리비아노',
    BRL:'브라질 헤알', CAD:'캐나다 달러', CHF:'스위스 프랑', CLP:'칠레 페소', CNY:'중국 위안',
    COP:'콜롬비아 페소', CRC:'코스타리카 콜론', CZK:'체코 코루나', DKK:'덴마크 크로네', DOP:'도미니카 페소',
    EGP:'이집트 파운드', EUR:'유로', GBP:'영국 파운드', HKD:'홍콩 달러', HUF:'헝가리 포린트',
    IDR:'인도네시아 루피아', ILS:'이스라엘 셰켈', INR:'인도 루피', ISK:'아이슬란드 크로나',
    JPY:'일본 엔', KES:'케냐 실링', KHR:'캄보디아 리엘', KRW:'대한민국 원', LAK:'라오스 킵',
    LKR:'스리랑카 루피', MAD:'모로코 디르함', MMK:'미얀마 짯', MOP:'마카오 파타카', MXN:'멕시코 페소',
    MYR:'말레이시아 링깃', NOK:'노르웨이 크로네', NPR:'네팔 루피', NZD:'뉴질랜드 달러', PEN:'페루 솔',
    PHP:'필리핀 페소', PLN:'폴란드 즈워티', PYG:'파라과이 과라니', QAR:'카타르 리얄', RON:'루마니아 레우',
    RSD:'세르비아 디나르', SAR:'사우디 리얄', SEK:'스웨덴 크로나', SGD:'싱가포르 달러', THB:'태국 바트',
    TRY:'튀르키예 리라', TWD:'대만 달러', TZS:'탄자니아 실링', UAH:'우크라이나 흐리우냐', USD:'미국 달러',
    UYU:'우루과이 페소', VND:'베트남 동', ZAR:'남아프리카 랜드'
  };

  const MULTI_UNIT = new Set(['CLP','COP','CRC','HUF','IDR','ISK','JPY','KHR','KRW','LAK','MMK','PYG','VND']);

  function cityName() {
    const heading = $('title')?.textContent?.replace(/\s*여행 준비\s*$/, '').trim();
    const place = $('place')?.textContent?.split('·')[0]?.trim();
    const typed = $('q')?.value?.trim();
    return heading || place || typed || '';
  }

  function isRegisteredCity() {
    try {
      const d = typeof state !== 'undefined' ? state.d : null;
      return Boolean(d && Array.isArray(d.h) && d.h.length && Array.isArray(d.s) && d.s.length === 12);
    } catch { return false; }
  }

  function stateGeo(city) {
    try {
      const d = typeof state !== 'undefined' ? state.d : null;
      if (!d || !Number.isFinite(Number(d.la)) || !Number.isFinite(Number(d.lo))) return null;
      return {
        city,
        country: d.n || '',
        countryCode: d.cc || '',
        latitude: Number(d.la),
        longitude: Number(d.lo),
        timezone: d.tz || 'auto'
      };
    } catch { return null; }
  }

  async function geocode(city) {
    const fromState = stateGeo(city);
    if (fromState) return fromState;
    const key = `geo:${city.toLowerCase()}`;
    if (cache.has(key)) return cache.get(key);
    const queries = [city, $('place')?.textContent?.trim()].filter(Boolean);
    for (const query of queries) {
      const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
      url.search = new URLSearchParams({ name: query, count: '5', language: 'ko', format: 'json' });
      try {
        const response = await fetch(url);
        if (!response.ok) continue;
        const items = (await response.json()).results || [];
        const item = items.find((x) => x.feature_code?.startsWith('PPL')) || items[0];
        if (!item) continue;
        const result = {
          city: item.name || city,
          country: item.country || '',
          countryCode: item.country_code || '',
          latitude: Number(item.latitude),
          longitude: Number(item.longitude),
          timezone: item.timezone || 'auto'
        };
        cache.set(key, result);
        return result;
      } catch {}
    }
    throw new Error('도시 위치를 찾지 못했습니다.');
  }

  function haversine(lat1, lon1, lat2, lon2) {
    const r = 6371;
    const rad = (v) => v * Math.PI / 180;
    const dLat = rad(lat2 - lat1);
    const dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  async function fetchArchive(geo, years) {
    const endYear = new Date().getFullYear() - 1;
    const startYear = endYear - years + 1;
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.search = new URLSearchParams({
      latitude: String(geo.latitude), longitude: String(geo.longitude),
      start_date: `${startYear}-01-01`, end_date: `${endYear}-12-31`,
      daily: 'temperature_2m_mean,precipitation_sum', timezone: 'auto'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error(`기후 응답 ${response.status}`);
    const daily = (await response.json()).daily;
    if (!daily?.time?.length) throw new Error('기후 데이터 없음');
    const months = Array.from({ length: 12 }, () => ({ temp: 0, rain: 0, days: 0 }));
    daily.time.forEach((date, i) => {
      const m = Number(date.slice(5, 7)) - 1;
      const temp = Number(daily.temperature_2m_mean?.[i]);
      const rain = Number(daily.precipitation_sum?.[i]);
      if (Number.isFinite(temp)) months[m].temp += temp;
      if (Number.isFinite(rain)) months[m].rain += rain;
      if (Number.isFinite(temp) || Number.isFinite(rain)) months[m].days += 1;
    });
    return months.map((m) => ({
      temp: m.days ? m.temp / m.days : null,
      rain: m.days ? m.rain / years : null
    }));
  }

  async function loadClimate(geo) {
    const key = `climate:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    let lastError;
    for (const years of [5, 3, 1]) {
      try {
        const result = await fetchArchive(geo, years);
        if (result.filter((x) => Number.isFinite(x.temp)).length >= 10) {
          cache.set(key, result);
          return result;
        }
      } catch (error) { lastError = error; }
    }
    throw lastError || new Error('기후 데이터 없음');
  }

  function seasonScore(temp, rain) {
    if (!Number.isFinite(temp)) return 0;
    const comfort = Math.max(0, 100 - Math.abs(temp - 20) * 5.2);
    const rainPenalty = Number.isFinite(rain) ? Math.min(55, rain * 0.45) : 10;
    return Math.max(0, Math.min(100, comfort - rainPenalty));
  }

  function renderClimate(city, climate) {
    const months = $('months');
    if (!months) return;
    const scores = climate.map((m) => seasonScore(m.temp, m.rain));
    const current = new Date().getMonth();
    months.dataset.liveCity = city;
    months.innerHTML = climate.map((m, i) => {
      const score = scores[i];
      const cls = score >= 68 ? 'best' : score >= 48 ? 'good' : 'low';
      const temp = Number.isFinite(m.temp) ? `${Math.round(m.temp)}°C` : '자료 부족';
      const rain = Number.isFinite(m.rain) ? `강수 ${Math.round(m.rain)}mm` : '강수 자료 없음';
      return `<div class="climateMonth ${cls}${i === current ? ' cur' : ''}"><b>${i + 1}월</b><span>${temp}</span><small>${rain}</small></div>`;
    }).join('');
    const ranked = scores.map((score, i) => ({ score, month: i + 1 })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    const best = ranked.slice(0, 3).map((x) => `${x.month}월`).join('·');
    if ($('seasonSummary')) $('seasonSummary').textContent = best
      ? `${city}의 최근 기온과 강수량을 분석했습니다. 추천 시기는 ${best}입니다.`
      : `${city}의 월별 기후 자료가 충분하지 않습니다.`;
    if ($('seasonTip')) $('seasonTip').textContent = '기온과 강수량을 기준으로 계산한 참고 지표입니다. 태풍·몬순·고산 기후와 현지 행사는 별도로 확인해야 합니다.';
  }

  function renderClimateUnavailable(city) {
    const months = $('months');
    if (!months) return;
    const current = new Date().getMonth();
    months.dataset.liveCity = city;
    months.innerHTML = Array.from({ length: 12 }, (_, i) => `<div class="climateMonth neutral${i === current ? ' cur' : ''}"><b>${i + 1}월</b><span>자료 확인 중</span><small>기후 자료 부족</small></div>`).join('');
    if ($('seasonSummary')) $('seasonSummary').textContent = `${city}의 월별 기후 제공 범위가 제한되어 현재 자동 분석을 완료하지 못했습니다.`;
    if ($('seasonTip')) $('seasonTip').textContent = '위도·해발고도·우기 여부를 확인해 정보가 보완될 수 있도록 재조회합니다.';
  }

  async function queryOverpass(endpoint, query) {
    const body = new URLSearchParams({ data: query });
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body
    });
    if (!response.ok) throw new Error(`Overpass ${response.status}`);
    return response.json();
  }

  async function loadHotels(geo) {
    const key = `hotels:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter'
    ];
    let lastError;
    for (const radius of [12000, 25000, 45000]) {
      const query = `[out:json][timeout:35];(nwr(around:${radius},${geo.latitude},${geo.longitude})["tourism"~"hotel|resort|motel|guest_house|hostel"];);out center tags 100;`;
      for (const endpoint of endpoints) {
        try {
          const data = await queryOverpass(endpoint, query);
          const seen = new Set();
          const hotels = (data.elements || []).map((el) => {
            const tags = el.tags || {};
            const name = tags['name:ko'] || tags['name:en'] || tags.name || tags.brand;
            const lat = Number(el.lat ?? el.center?.lat);
            const lon = Number(el.lon ?? el.center?.lon);
            if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const normalized = name.toLowerCase().replace(/\s+/g, '');
            if (seen.has(normalized)) return null;
            seen.add(normalized);
            const starsRaw = String(tags.stars || tags['hotel:stars'] || '').match(/[1-5]/)?.[0];
            const stars = starsRaw ? Number(starsRaw) : null;
            const area = [tags['addr:suburb'], tags['addr:district'], tags['addr:city'], tags['addr:street']].filter(Boolean).join(' · ');
            return { name, stars, area, distance: haversine(geo.latitude, geo.longitude, lat, lon), lat, lon, type: tags.tourism || 'hotel' };
          }).filter(Boolean).sort((a, b) => {
            if (a.stars && b.stars && a.stars !== b.stars) return b.stars - a.stars;
            if (a.stars && !b.stars) return -1;
            if (!a.stars && b.stars) return 1;
            return a.distance - b.distance;
          }).slice(0, 15);
          if (hotels.length) {
            cache.set(key, hotels);
            return hotels;
          }
        } catch (error) { lastError = error; }
      }
    }
    throw lastError || new Error('호텔 데이터 없음');
  }

  function renderHotels(city, hotels) {
    const grid = $('hotelGrid');
    if (!grid) return;
    grid.dataset.liveCity = city;
    grid.innerHTML = hotels.map((h) => {
      const star = h.stars ? `${h.stars}성급` : '등급 미표기';
      const type = h.type === 'hostel' ? '호스텔' : h.type === 'guest_house' ? '게스트하우스' : h.type === 'resort' ? '리조트' : '호텔';
      const map = `https://www.openstreetmap.org/?mlat=${h.lat}&mlon=${h.lon}#map=16/${h.lat}/${h.lon}`;
      return `<article class="liveHotel" data-live-stars="${h.stars || 0}"><span>${star}</span><h3>${h.name}</h3><p>${h.area || `${city} 중심권`} · ${type}</p><small>검색 중심에서 약 ${h.distance.toFixed(1)}km</small><a href="${map}" target="_blank" rel="noopener">지도에서 위치 확인 →</a></article>`;
    }).join('');
    $('hotelEmpty')?.classList.add('hide');
  }

  function renderHotelsUnavailable(city) {
    const grid = $('hotelGrid');
    if (!grid) return;
    grid.dataset.liveCity = city;
    grid.innerHTML = `<div class="liveEmpty"><b>${city} 숙박 데이터 조회가 지연되고 있습니다.</b><span>공개 지도 서버 응답 또는 현지 호텔 등록 정보가 부족합니다. 잠시 뒤 같은 도시를 다시 검색하면 자동으로 재조회합니다.</span></div>`;
    $('hotelEmpty')?.classList.add('hide');
  }

  function bindLiveFilters() {
    document.querySelectorAll('#filters button').forEach((button) => {
      if (button.dataset.liveBound) return;
      button.dataset.liveBound = '1';
      button.addEventListener('click', () => {
        const value = button.dataset.s || 'all';
        requestAnimationFrame(() => {
          document.querySelectorAll('.liveHotel').forEach((card) => {
            card.hidden = value !== 'all' && card.dataset.liveStars !== value;
          });
        });
      });
    });
  }

  async function fetchRate(code) {
    try {
      const response = await fetch(`https://api.frankfurter.app/latest?from=${code}&to=KRW`);
      if (response.ok) {
        const json = await response.json();
        const rate = Number(json.rates?.KRW);
        if (Number.isFinite(rate)) return { rate, date: json.date || '최근', source: 'Frankfurter' };
      }
    } catch {}
    const response = await fetch(`https://open.er-api.com/v6/latest/${code}`);
    if (!response.ok) throw new Error('환율 조회 실패');
    const json = await response.json();
    const rate = Number(json.rates?.KRW);
    if (!Number.isFinite(rate)) throw new Error('환율 데이터 없음');
    return { rate, date: json.time_last_update_utc ? new Date(json.time_last_update_utc).toLocaleDateString('ko-KR') : '최근', source: 'ExchangeRate-API' };
  }

  async function updateCurrency(geo) {
    const code = COUNTRY_CURRENCY[geo.countryCode];
    if (!code) {
      if ($('fxDate')) $('fxDate').textContent = `${geo.country || '선택 지역'}의 통화 코드가 등록되지 않았습니다.`;
      return;
    }
    if (code === 'KRW') {
      if ($('currencyCountry')) $('currencyCountry').textContent = '대한민국 통화';
      if ($('currencyName')) $('currencyName').textContent = '대한민국 원 KRW';
      if ($('unit')) $('unit').textContent = '1,000 KRW';
      if ($('code')) $('code').textContent = 'KRW';
      if ($('amount')) $('amount').value = 1000;
      if ($('rate')) $('rate').textContent = '1,000원';
      if ($('won')) $('won').textContent = '1,000';
      if ($('fxDate')) $('fxDate').textContent = '대한민국 원화 기준';
      return;
    }
    if ($('fxDate')) $('fxDate').textContent = '환율 불러오는 중';
    try {
      const result = await fetchRate(code);
      const unit = MULTI_UNIT.has(code) ? 100 : 1;
      const converted = result.rate * unit;
      if ($('currencyCountry')) $('currencyCountry').textContent = `${geo.country || ''} 통화`;
      if ($('currencyName')) $('currencyName').textContent = `${CURRENCY_NAME[code] || code} ${code}`;
      if ($('unit')) $('unit').textContent = `${unit.toLocaleString('ko-KR')} ${code}`;
      if ($('code')) $('code').textContent = code;
      if ($('amount')) $('amount').value = unit;
      if ($('rate')) $('rate').textContent = `${Math.round(converted).toLocaleString('ko-KR')}원`;
      if ($('won')) $('won').textContent = Math.round(converted).toLocaleString('ko-KR');
      if ($('fxDate')) $('fxDate').textContent = `${result.date} 기준 환율`;
      try {
        if (typeof state !== 'undefined') state.rate = result.rate;
      } catch {}
    } catch {
      if ($('rate')) $('rate').textContent = '조회 지연';
      if ($('fxDate')) $('fxDate').textContent = `${code} 환율 제공처의 응답이 지연되고 있습니다.`;
    }
  }

  function needsRefresh(city) {
    const months = $('months');
    const hotels = $('hotelGrid');
    const climateReady = months?.dataset.liveCity === city && months.querySelectorAll('.climateMonth').length === 12;
    const hotelReady = hotels?.dataset.liveCity === city && (hotels.querySelector('.liveHotel') || hotels.querySelector('.liveEmpty'));
    return !climateReady || !hotelReady;
  }

  async function enhanceUnknownCity() {
    const city = cityName();
    if (!city || /불러오는 중|--/.test(city) || isRegisteredCity()) return;
    if (!needsRefresh(city)) return;
    const thisRun = ++runId;
    try {
      const geo = await geocode(city);
      if (thisRun !== runId) return;
      updateCurrency(geo);
      const [climate, hotels] = await Promise.allSettled([loadClimate(geo), loadHotels(geo)]);
      if (thisRun !== runId) return;
      if (climate.status === 'fulfilled') renderClimate(city, climate.value);
      else renderClimateUnavailable(city);
      if (hotels.status === 'fulfilled') renderHotels(city, hotels.value);
      else renderHotelsUnavailable(city);
      bindLiveFilters();
    } catch {
      if (thisRun !== runId) return;
      renderClimateUnavailable(city);
      renderHotelsUnavailable(city);
    }
  }

  function schedule(delay = 700) {
    clearTimeout(timer);
    timer = setTimeout(enhanceUnknownCity, delay);
  }

  document.addEventListener('submit', () => schedule(1000), true);
  document.addEventListener('click', () => schedule(1000), true);
  new MutationObserver(() => schedule(800)).observe(document.body, { childList: true, subtree: true, characterData: true });
  window.addEventListener('load', () => schedule(1400));
  setInterval(() => schedule(0), 15000);
})();
