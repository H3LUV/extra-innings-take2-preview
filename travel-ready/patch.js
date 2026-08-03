Object.assign(FX,{NZD:["뉴질랜드 달러",1,"🇳🇿"],KRW:["대한민국 원",1000,"🇰🇷"]});Object.assign(CC,{NZ:"NZD",KR:"KRW"});const baseFx=fx;fx=async function(){const code=state.d.x||CC[state.d.cc];if(code!=="KRW")return baseFx();const info=FX.KRW;$("flag").textContent=info[2];$("currencyCountry").textContent=state.d.n+" 통화";$("currencyName").textContent=info[0]+" KRW";$("unit").textContent="1,000 KRW";$("code").textContent="KRW";$("amount").value=1000;state.rate=1;$("rate").textContent="1,000원";$("fxDate").textContent="대한민국 원화 기준";convert()};
(() => {
  const version = '20260803-1450';
  const loadCss = (name, marker) => {
    if (document.querySelector(`link[data-${marker}]`)) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.dataset[marker] = '1';
    css.href = `../travel-ready/${name}.css?v=${version}`;
    document.head.appendChild(css);
  };
  const loadScript = (name, marker, onload) => {
    const existing = document.querySelector(`script[data-${marker}]`);
    if (existing) { if (onload) onload(); return; }
    const script = document.createElement('script');
    script.dataset[marker] = '1';
    script.src = `../travel-ready/${name}.js?v=${version}`;
    script.defer = true;
    if (onload) script.onload = onload;
    document.body.appendChild(script);
  };
  loadCss('unified-mode','unifiedMode');
  loadCss('nearby-weather','nearbyWeather');
  loadScript('fast-cache','fastCache',() => {
    loadScript('unified-mode','unifiedMode');
    loadScript('nearby-weather','nearbyWeather');
  });
})();