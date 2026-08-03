Object.assign(FX,{NZD:["뉴질랜드 달러",1,"🇳🇿"],KRW:["대한민국 원",1000,"🇰🇷"]});Object.assign(CC,{NZ:"NZD",KR:"KRW"});const baseFx=fx;fx=async function(){const code=state.d.x||CC[state.d.cc];if(code!=="KRW")return baseFx();const info=FX.KRW;$("flag").textContent=info[2];$("currencyCountry").textContent=state.d.n+" 통화";$("currencyName").textContent=info[0]+" KRW";$("unit").textContent="1,000 KRW";$("code").textContent="KRW";$("amount").value=1000;state.rate=1;$("rate").textContent="1,000원";$("fxDate").textContent="대한민국 원화 기준";convert()};
(() => {
  const version = '20260803-1348';
  if (!document.querySelector('link[data-unified-mode]')) {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.dataset.unifiedMode = '1';
    css.href = `../travel-ready/unified-mode.css?v=${version}`;
    document.head.appendChild(css);
  }
  if (!document.querySelector('script[data-unified-mode]')) {
    const script = document.createElement('script');
    script.dataset.unifiedMode = '1';
    script.src = `../travel-ready/unified-mode.js?v=${version}`;
    script.defer = true;
    document.body.appendChild(script);
  }
})();