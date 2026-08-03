Object.assign(FX,{NZD:["뉴질랜드 달러",1,"🇳🇿"],KRW:["대한민국 원",1000,"🇰🇷"]});Object.assign(CC,{NZ:"NZD",KR:"KRW"});const baseFx=fx;fx=async function(){const code=state.d.x||CC[state.d.cc];if(code!=="KRW")return baseFx();const info=FX.KRW;$("flag").textContent=info[2];$("currencyCountry").textContent=state.d.n+" 통화";$("currencyName").textContent=info[0]+" KRW";$("unit").textContent="1,000 KRW";$("code").textContent="KRW";$("amount").value=1000;state.rate=1;$("rate").textContent="1,000원";$("fxDate").textContent="대한민국 원화 기준";convert()};
(() => {
  const version = '20260803-1435';
  const loadCss = (name, marker) => {
    if (document.querySelector(`link[data-${marker}]`)) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.dataset[marker] = '1';
    css.href = `../travel-ready/${name}.css?v=${version}`;
    document.head.appendChild(css);
  };
  const loadScript = (name, marker) => {
    if (document.querySelector(`script[data-${marker}]`)) return;
    const script = document.createElement('script');
    script.dataset[marker] = '1';
    script.src = `../travel-ready/${name}.js?v=${version}`;
    script.defer = true;
    document.body.appendChild(script);
  };
  loadCss('unified-mode','unifiedMode');
  loadScript('unified-mode','unifiedMode');
  loadCss('nearby-weather','nearbyWeather');
  loadScript('nearby-weather','nearbyWeather');
})();