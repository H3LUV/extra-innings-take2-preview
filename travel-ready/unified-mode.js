(() => {
  const $ = (id) => document.getElementById(id);
  const RECENT_KEY = 'modetour_recent_cities_v1';
  const cache = new Map();
  let timer;
  let lastCity = '';
  let runToken = 0;

  const COUNTRY_CURRENCY = {
    AE:'AED', AR:'ARS', AT:'EUR', AU:'AUD', BE:'EUR', BG:'BGN', BO:'BOB', BR:'BRL', CA:'CAD', CH:'CHF',
    CL:'CLP', CN:'CNY', CO:'COP', CR:'CRC', CZ:'CZK', DE:'EUR', DK:'DKK', DO:'DOP', EC:'USD', EG:'EGP',
    ES:'EUR', FI:'EUR', FR:'EUR', GB:'GBP', GR:'EUR', HK:'HKD', HR:'EUR', HU:'HUF', ID:'IDR', IE:'EUR',
    IL:'ILS', IN:'INR', IS:'ISK', IT:'EUR', JP:'JPY', KE:'KES', KH:'KHR', KR:'KRW', LA:'LAK', LK:'LKR',
    MA:'MAD', MM:'MMK', MO:'MOP', MX:'MXN', MY:'MYR', NL:'EUR', NO:'NOK', NP:'NPR', NZ:'NZD', PA:'USD',
    PE:'PEN', PH:'PHP', PL:'PLN', PT:'EUR', PY:'PYG', QA:'QAR', RO:'RON', RS:'RSD', SA:'SAR', SE:'SEK',
    SG:'SGD', SI:'EUR', SK:'EUR', TH:'THB', TR:'TRY', TW:'TWD', TZ:'TZS', UA:'UAH', US:'USD', UY:'UYU',
    VN:'VND', ZA:'ZAR'
  };
  const MULTI_UNIT = new Set(['CLP','COP','CRC','HUF','IDR','ISK','JPY','KHR','KRW','LAK','MMK','PYG','VND']);

  function cityName() {
    const heading = $('title')?.textContent?.replace(/\s*여행 준비\s*$/, '').trim();
    const place = $('place')?.textContent?.split('·')[0]?.trim();
    return heading || place || $('q')?.value?.trim() || '';
  }

  function stateGeo(city) {
    try {
      const d = typeof state !== 'undefined' ? state.d : null;
      if (!d || !Number.isFinite(Number(d.la)) || !Number.isFinite(Number(d.lo))) return null;
      return { city, country:d.n||'', countryCode:d.cc||'', latitude:Number(d.la), longitude:Number(d.lo), timezone:d.tz||'auto' };
    } catch { return null; }
  }

  async function geocode(city) {
    const fromState = stateGeo(city);
    if (fromState) return fromState;
    const key = `geo:${city.toLowerCase()}`;
    if (cache.has(key)) return cache.get(key);
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.search = new URLSearchParams({name:city,count:'8',language:'ko',format:'json'});
    const response = await fetch(url);
    if (!response.ok) throw new Error('geocode');
    const items = (await response.json()).results || [];
    const item = items.find(x => String(x.feature_code||'').startsWith('PPL')) || items[0];
    if (!item) throw new Error('geocode-empty');
    const result = {city:item.name||city,country:item.country||'',countryCode:item.country_code||'',latitude:Number(item.latitude),longitude:Number(item.longitude),timezone:item.timezone||'auto'};
    cache.set(key,result);
    return result;
  }

  function readRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]').filter(Boolean).slice(0,8); }
    catch { return []; }
  }

  function writeRecent(city) {
    const list = [city, ...readRecent().filter(x => x !== city)].slice(0,8);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    renderRecent();
  }

  function renderRecent() {
    const box = $('chips');
    if (!box) return;
    const list = readRecent();
    box.className = 'recentCities';
    box.innerHTML = list.length
      ? `<span class="recentLabel">최근 검색</span>${list.map(city => `<button type="button" data-recent-city="${city.replace(/"/g,'&quot;')}">${city}</button>`).join('')}`
      : '<span class="recentEmpty">검색한 도시가 여기에 저장됩니다.</span>';
  }

  async function loadClimate(geo) {
    const key = `climate:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if (cache.has(key)) return cache.get(key);
    const endYear = new Date().getFullYear() - 1;
    let lastError;
    for (const years of [5,3,1]) {
      try {
        const startYear = endYear - years + 1;
        const url = new URL('https://archive-api.open-meteo.com/v1/archive');
        url.search = new URLSearchParams({latitude:String(geo.latitude),longitude:String(geo.longitude),start_date:`${startYear}-01-01`,end_date:`${endYear}-12-31`,daily:'temperature_2m_mean,precipitation_sum',timezone:'auto'});
        const response = await fetch(url);
        if (!response.ok) throw new Error('climate');
        const daily = (await response.json()).daily;
        if (!daily?.time?.length) throw new Error('climate-empty');
        const months = Array.from({length:12},()=>({temp:0,rain:0,days:0}));
        daily.time.forEach((date,i)=>{
          const m=Number(date.slice(5,7))-1;
          const t=Number(daily.temperature_2m_mean?.[i]);
          const r=Number(daily.precipitation_sum?.[i]);
          if(Number.isFinite(t)) months[m].temp+=t;
          if(Number.isFinite(r)) months[m].rain+=r;
          if(Number.isFinite(t)||Number.isFinite(r)) months[m].days++;
        });
        const result=months.map(m=>({temp:m.days?m.temp/m.days:null,rain:m.days?m.rain/years:null}));
        if(result.filter(x=>Number.isFinite(x.temp)).length<10) throw new Error('climate-short');
        cache.set(key,result); return result;
      } catch(e){ lastError=e; }
    }
    throw lastError || new Error('climate-failed');
  }

  function seasonScore(temp,rain){
    if(!Number.isFinite(temp)) return 0;
    const comfort=Math.max(0,100-Math.abs(temp-20)*5.2);
    const rainPenalty=Number.isFinite(rain)?Math.min(55,rain*.42):10;
    return Math.max(0,Math.min(100,comfort-rainPenalty));
  }

  function renderClimate(city,climate){
    const months=$('months'); if(!months) return;
    const scores=climate.map(m=>seasonScore(m.temp,m.rain));
    const current=new Date().getMonth();
    months.className='liveSeasonGrid';
    months.innerHTML=scores.map((score,i)=>{
      const cls=score>=68?'best':score>=48?'good':'low';
      const label=cls==='best'?'BEST':cls==='good'?'GOOD':'LOW';
      return `<div class="climateMonth seasonTile ${cls}${i===current?' cur':''}"><b>${label}</b><small>${i+1}월</small></div>`;
    }).join('');
    const best=scores.map((score,i)=>({score,month:i+1})).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>`${x.month}월`).join('·');
    if($('seasonSummary')) $('seasonSummary').textContent=`${city}의 최근 기온과 강수량을 같은 기준으로 분석했습니다. 추천 시기는 ${best}입니다.`;
    if($('seasonTip')) $('seasonTip').textContent='모든 도시는 동일한 기온·강수 기준으로 계산합니다. 축제·성수기·태풍·고산 기후는 별도로 확인하세요.';
  }

  async function queryPlaces(geo){
    const key=`places:${geo.latitude.toFixed(3)},${geo.longitude.toFixed(3)}`;
    if(cache.has(key)) return cache.get(key);
    const query=`[out:json][timeout:35];(nwr(around:25000,${geo.latitude},${geo.longitude})[tourism~"hotel|resort|motel|guest_house|hostel|attraction|museum|viewpoint"];nwr(around:18000,${geo.latitude},${geo.longitude})[amenity~"restaurant|cafe"];nwr(around:18000,${geo.latitude},${geo.longitude})[shop~"mall|department_store|souvenir"];);out center tags 180;`;
    const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter','https://overpass.nchc.org.tw/api/interpreter'];
    let lastError;
    for(const endpoint of endpoints){
      try{
        const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:new URLSearchParams({data:query})});
        if(!response.ok) throw new Error(String(response.status));
        const elements=(await response.json()).elements||[];
        cache.set(key,elements); return elements;
      }catch(e){lastError=e;}
    }
    throw lastError||new Error('places');
  }

  function distance(lat1,lon1,lat2,lon2){
    const R=6371,rad=v=>v*Math.PI/180,dLat=rad(lat2-lat1),dLon=rad(lon2-lon1);
    const a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }

  function normalizePlaces(geo,elements){
    const seen=new Set();
    return elements.map(el=>{
      const t=el.tags||{},name=t['name:ko']||t['name:en']||t.name||t.brand;
      const lat=Number(el.lat??el.center?.lat),lon=Number(el.lon??el.center?.lon);
      if(!name||!Number.isFinite(lat)||!Number.isFinite(lon)) return null;
      const id=name.toLowerCase().replace(/\s+/g,''); if(seen.has(id)) return null; seen.add(id);
      return {name,lat,lon,distance:distance(geo.latitude,geo.longitude,lat,lon),tourism:t.tourism||'',amenity:t.amenity||'',shop:t.shop||'',stars:Number(String(t.stars||t['hotel:stars']||'').match(/[1-5]/)?.[0]||0),area:[t['addr:suburb'],t['addr:district'],t['addr:city'],t['addr:street']].filter(Boolean).join(' · ')};
    }).filter(Boolean);
  }

  function osmLink(p){return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lon}#map=16/${p.lat}/${p.lon}`;}

  function renderPlaces(city,places){
    const hotels=places.filter(p=>/hotel|resort|motel|guest_house|hostel/.test(p.tourism)).sort((a,b)=>(b.stars-a.stars)||(a.distance-b.distance)).slice(0,12);
    const attractions=places.filter(p=>/attraction|museum|viewpoint/.test(p.tourism)).sort((a,b)=>a.distance-b.distance).slice(0,8);
    const foods=places.filter(p=>/restaurant|cafe/.test(p.amenity)).sort((a,b)=>a.distance-b.distance).slice(0,6);
    const shops=places.filter(p=>/mall|department_store|souvenir/.test(p.shop)).sort((a,b)=>a.distance-b.distance).slice(0,6);

    const hotelGrid=$('hotelGrid');
    if(hotelGrid){
      hotelGrid.innerHTML=hotels.length?hotels.map(p=>`<article class="liveHotel" data-live-stars="${p.stars||0}"><span>${p.stars?`${p.stars}성급`:'등급 미표기'}</span><h3>${p.name}</h3><p>${p.area||`${city} 중심권`}</p><small>검색 중심에서 약 ${p.distance.toFixed(1)}km</small><a href="${osmLink(p)}" target="_blank" rel="noopener">지도에서 위치 확인 →</a></article>`).join(''):`<div class="liveEmpty">${city} 주변의 공개 숙박시설 데이터가 충분하지 않습니다.</div>`;
      $('hotelEmpty')?.classList.add('hide');
    }
    const near=$('nearGrid');
    if(near){
      near.innerHTML=attractions.length?attractions.map(p=>`<a class="fallbackLink" href="${osmLink(p)}" target="_blank" rel="noopener"><i>📍</i><span><b>${p.name}</b><small>${city} 중심에서 약 ${p.distance.toFixed(1)}km</small></span><em>지도 보기 →</em></a>`).join(''):`<div class="liveEmpty">${city} 주변의 공개 관광명소 데이터가 충분하지 않습니다.</div>`;
      if($('nearText')) $('nearText').textContent=`${city} 중심 좌표를 기준으로 실제 등록 관광명소를 표시합니다.`;
      $('nearEmpty')?.classList.add('hide');
    }
    const food=$('food'); if(food) food.innerHTML=foods.length?foods.map(p=>`<a class="fallbackLink" href="${osmLink(p)}" target="_blank" rel="noopener"><i>${p.amenity==='cafe'?'☕':'🍽️'}</i><span><b>${p.name}</b><small>약 ${p.distance.toFixed(1)}km</small></span></a>`).join(''):'<div class="liveEmpty">공개 맛집 데이터가 충분하지 않습니다.</div>';
    const shop=$('shop'); if(shop) shop.innerHTML=shops.length?shops.map(p=>`<a class="fallbackLink" href="${osmLink(p)}" target="_blank" rel="noopener"><i>🛍️</i><span><b>${p.name}</b><small>약 ${p.distance.toFixed(1)}km</small></span></a>`).join(''):'<div class="liveEmpty">공개 쇼핑 데이터가 충분하지 않습니다.</div>';
  }

  async function updateCurrency(geo){
    const code=COUNTRY_CURRENCY[geo.countryCode]; if(!code) return;
    if(code==='KRW') return;
    let rate,date='최근';
    try{const r=await fetch(`https://api.frankfurter.app/latest?from=${code}&to=KRW`);if(r.ok){const j=await r.json();rate=Number(j.rates?.KRW);date=j.date||date;}}catch{}
    if(!Number.isFinite(rate)){try{const r=await fetch(`https://open.er-api.com/v6/latest/${code}`);if(r.ok){const j=await r.json();rate=Number(j.rates?.KRW);}}catch{}}
    if(!Number.isFinite(rate)) return;
    const unit=MULTI_UNIT.has(code)?100:1,converted=rate*unit;
    if($('currencyCountry')) $('currencyCountry').textContent=`${geo.country||''} 통화`;
    if($('currencyName')) $('currencyName').textContent=code;
    if($('unit')) $('unit').textContent=`${unit.toLocaleString('ko-KR')} ${code}`;
    if($('code')) $('code').textContent=code;
    if($('amount')) $('amount').value=unit;
    if($('rate')) $('rate').textContent=`${Math.round(converted).toLocaleString('ko-KR')}원`;
    if($('won')) $('won').textContent=Math.round(converted).toLocaleString('ko-KR');
    if($('fxDate')) $('fxDate').textContent=`${date} 기준 환율`;
  }

  function bindRecentClicks(){
    document.addEventListener('click',e=>{
      const button=e.target.closest('[data-recent-city]'); if(!button) return;
      const city=button.dataset.recentCity; if(!city) return;
      $('q').value=city;
      $('form')?.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
    });
  }

  async function run(){
    const city=cityName();
    if(!city||/불러오는 중|--/.test(city)||city===lastCity) return;
    lastCity=city; writeRecent(city);
    const token=++runToken;
    try{
      const geo=await geocode(city); if(token!==runToken) return;
      updateCurrency(geo);
      const [climate,places]=await Promise.allSettled([loadClimate(geo),queryPlaces(geo)]); if(token!==runToken) return;
      if(climate.status==='fulfilled') renderClimate(city,climate.value);
      if(places.status==='fulfilled') renderPlaces(city,normalizePlaces(geo,places.value));
      else renderPlaces(city,[]);
    }catch{}
  }

  function schedule(delay=900){clearTimeout(timer);timer=setTimeout(run,delay);}
  renderRecent(); bindRecentClicks();
  document.addEventListener('submit',()=>{lastCity='';schedule(1300)},true);
  new MutationObserver(()=>schedule(900)).observe(document.body,{childList:true,subtree:true,characterData:true});
  window.addEventListener('load',()=>schedule(1600));
})();
