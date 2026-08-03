(() => {
  const $ = (id) => document.getElementById(id);
  const cache = new Map();
  let timer;
  let runToken = 0;

  const WEATHER = {
    0:['맑음','☀️'], 1:['대체로 맑음','🌤️'], 2:['구름 조금','⛅'], 3:['흐림','☁️'],
    45:['안개','🌫️'], 48:['서리 안개','🌫️'], 51:['약한 이슬비','🌦️'], 53:['이슬비','🌦️'],
    55:['강한 이슬비','🌧️'], 61:['약한 비','🌦️'], 63:['비','🌧️'], 65:['강한 비','🌧️'],
    71:['약한 눈','🌨️'], 73:['눈','🌨️'], 75:['강한 눈','❄️'], 80:['소나기','🌦️'],
    81:['소나기','🌧️'], 82:['강한 소나기','⛈️'], 95:['뇌우','⛈️'], 96:['우박성 뇌우','⛈️'], 99:['강한 우박성 뇌우','⛈️']
  };

  function cityName() {
    return $('title')?.textContent?.replace(/\s*여행 준비\s*$/, '').trim()
      || $('place')?.textContent?.split('·')[0]?.trim()
      || $('q')?.value?.trim()
      || '';
  }

  function geoFromState(city) {
    try {
      const d = typeof state !== 'undefined' ? state.d : null;
      if (!d || !Number.isFinite(Number(d.la)) || !Number.isFinite(Number(d.lo))) return null;
      return { city, latitude:Number(d.la), longitude:Number(d.lo), countryCode:d.cc || '' };
    } catch { return null; }
  }

  async function geocode(city) {
    const fromState = geoFromState(city);
    if (fromState) return fromState;
    const key = `geo:${city.toLowerCase()}`;
    if (cache.has(key)) return cache.get(key);
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({ name:city, count:'5', language:'ko', format:'json' });
    const response = await fetch(url);
    if (!response.ok) throw new Error('geocode');
    const items = (await response.json()).results || [];
    const item = items.find(x => String(x.feature_code || '').startsWith('PPL')) || items[0];
    if (!item) throw new Error('geocode-empty');
    const result = { city:item.name || city, latitude:Number(item.latitude), longitude:Number(item.longitude), countryCode:item.country_code || '' };
    cache.set(key, result);
    return result;
  }

  function distance(lat1, lon1, lat2, lon2) {
    const r = 6371;
    const rad = v => v * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function normalizeName(value) {
    return String(value || '').toLowerCase().replace(/[\s\-_.]/g, '');
  }

  async function overpass(endpoint, query) {
    const response = await fetch(endpoint, {
      method:'POST',
      headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},
      body:new URLSearchParams({data:query})
    });
    if (!response.ok) throw new Error(`overpass-${response.status}`);
    return response.json();
  }

  async function loadNearbyCities(geo) {
    const key = `nearby-cities:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.nchc.org.tw/api/interpreter'
    ];
    const originName = normalizeName(geo.city);
    let lastError;

    for (const radius of [80000, 160000, 300000]) {
      const query = `[out:json][timeout:35];(node(around:${radius},${geo.latitude},${geo.longitude})[place~"city|town"][name];);out tags;`;
      for (const endpoint of endpoints) {
        try {
          const data = await overpass(endpoint, query);
          const seen = new Set();
          const cities = (data.elements || []).map(el => {
            const t = el.tags || {};
            const name = t['name:ko'] || t['name:en'] || t.name;
            const lat = Number(el.lat), lon = Number(el.lon);
            if (!name || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
            const normalized = normalizeName(name);
            if (!normalized || normalized === originName || seen.has(normalized)) return null;
            seen.add(normalized);
            const km = distance(geo.latitude, geo.longitude, lat, lon);
            if (km < 8) return null;
            const population = Number(String(t.population || '').replace(/\D/g, '')) || 0;
            const importance = (t.capital ? 3 : 0) + (t.place === 'city' ? 2 : 0) + Math.log10(Math.max(population, 1));
            return { name, lat, lon, km, population, importance };
          }).filter(Boolean)
            .sort((a,b) => (b.importance - a.importance) || (a.km - b.km))
            .slice(0, 8);
          if (cities.length >= 4) {
            cache.set(key, cities);
            return cities;
          }
        } catch (error) { lastError = error; }
      }
    }
    throw lastError || new Error('nearby-cities-empty');
  }

  async function loadWeather(city) {
    const key = `weather:${city.lat.toFixed(3)},${city.lon.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.search = new URLSearchParams({
      latitude:String(city.lat), longitude:String(city.lon),
      current:'temperature_2m,apparent_temperature,weather_code,wind_speed_10m',
      hourly:'precipitation_probability', forecast_days:'1', timezone:'auto'
    });
    const response = await fetch(url);
    if (!response.ok) throw new Error('weather');
    const json = await response.json();
    const current = json.current || {};
    const now = current.time;
    let rain = null;
    if (now && Array.isArray(json.hourly?.time)) {
      const idx = json.hourly.time.indexOf(now.slice(0,13) + ':00');
      if (idx >= 0) rain = Number(json.hourly.precipitation_probability?.[idx]);
    }
    const result = {
      ...city,
      temp:Number(current.temperature_2m),
      feel:Number(current.apparent_temperature),
      code:Number(current.weather_code),
      wind:Number(current.wind_speed_10m),
      rain:Number.isFinite(rain) ? rain : null
    };
    cache.set(key, result);
    return result;
  }

  function render(city, items) {
    const grid = $('nearGrid');
    if (!grid) return;
    grid.dataset.nearbyWeatherCity = city;
    grid.className = 'nearGrid nearbyWeatherGrid';
    grid.innerHTML = items.map(item => {
      const [label, icon] = WEATHER[item.code] || ['날씨 정보','🌤️'];
      const rain = Number.isFinite(item.rain) ? `강수 ${Math.round(item.rain)}%` : `바람 ${Math.round(item.wind || 0)}km/h`;
      return `<article class="nearbyWeatherCard"><div class="nearbyWeatherTop"><span class="nearbyWeatherIcon">${icon}</span><small>${item.km.toFixed(0)}km</small></div><h3>${item.name}</h3><div class="nearbyWeatherTemp">${Math.round(item.temp)}<b>°C</b></div><p>${label} · 체감 ${Math.round(item.feel)}°</p><span>${rain}</span></article>`;
    }).join('');
    if ($('nearText')) $('nearText').textContent = `${city}에서 이동 가능한 주변 주요 도시의 현재 날씨입니다.`;
    $('nearEmpty')?.classList.add('hide');
  }

  function renderError(city) {
    const grid = $('nearGrid');
    if (!grid) return;
    grid.dataset.nearbyWeatherCity = city;
    grid.innerHTML = `<div class="liveEmpty">${city} 주변 주요 도시의 날씨를 불러오지 못했습니다. 잠시 뒤 자동으로 다시 조회합니다.</div>`;
  }

  async function update() {
    const city = cityName();
    if (!city || /불러오는 중|--/.test(city)) return;
    const grid = $('nearGrid');
    if (grid?.dataset.nearbyWeatherCity === city && grid.querySelector('.nearbyWeatherCard')) return;
    const token = ++runToken;
    try {
      const geo = await geocode(city);
      const nearby = await loadNearbyCities(geo);
      const weather = await Promise.allSettled(nearby.slice(0,6).map(loadWeather));
      if (token !== runToken) return;
      const ready = weather.filter(x => x.status === 'fulfilled').map(x => x.value);
      if (!ready.length) throw new Error('weather-empty');
      render(city, ready);
    } catch {
      if (token !== runToken) return;
      renderError(city);
    }
  }

  function schedule(delay = 900) {
    clearTimeout(timer);
    timer = setTimeout(update, delay);
  }

  document.addEventListener('submit', () => schedule(1300), true);
  document.addEventListener('click', () => schedule(1200), true);
  new MutationObserver(() => schedule(1000)).observe(document.body, {childList:true, subtree:true, characterData:true});
  window.addEventListener('load', () => schedule(1800));
  setInterval(() => schedule(0), 60000);
})();
