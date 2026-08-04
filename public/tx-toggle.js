document.addEventListener('DOMContentLoaded',()=>{
  const list=document.getElementById('txList');
  if(!list)return;

  let expanded=false;
  let toggle=null;

  const sync=()=>{
    const items=[...list.querySelectorAll('.tx')];
    if(!items.length){
      toggle?.remove();
      toggle=null;
      return;
    }

    items.forEach((item,index)=>{
      item.hidden=!expanded&&index>=4;
    });

    if(items.length<=4){
      toggle?.remove();
      toggle=null;
      return;
    }

    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='btn alt';
      toggle.style.display='flex';
      toggle.style.margin='16px auto 0';
      toggle.setAttribute('aria-controls','txList');
      list.insertAdjacentElement('afterend',toggle);
      toggle.addEventListener('click',()=>{
        expanded=!expanded;
        sync();
        if(!expanded){
          document.getElementById('transactions')?.scrollIntoView({behavior:'smooth',block:'start'});
        }
      });
    }

    toggle.setAttribute('aria-expanded',String(expanded));
    toggle.textContent=expanded
      ?'이적 현황 접기'
      :`전체 이적 현황 펼쳐보기 (${items.length-4}건 더)`;
  };

  new MutationObserver(sync).observe(list,{childList:true,subtree:false});
  sync();
});
