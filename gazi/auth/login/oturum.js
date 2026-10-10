(()=>{if(window.self!==window.top)return;let expiry=0,timer,checking=false;
 const go=()=>location.replace('/giris?next='+encodeURIComponent(location.pathname+location.hash));
 const chip=document.createElement('div');chip.style.cssText='display:flex;gap:8px;align-items:center;justify-content:space-between;padding:8px 0;font:10px Arial,sans-serif;color:inherit;';
 const label=document.createElement('span'),logout=document.createElement('button');logout.textContent='Çıkış';logout.style.cssText='background:transparent;border:1px solid currentColor;border-radius:5px;color:inherit;padding:5px 8px;cursor:pointer;font:inherit;';chip.append(label,logout);
 const place=()=>{const anchor=document.querySelector('.platform-signature');if(anchor&&!chip.isConnected)anchor.append(chip);};
 const observer=new MutationObserver(place);observer.observe(document.body,{childList:true,subtree:true});place();
 const draw=()=>{label.textContent='Güvenli oturum · '+Math.max(0,Math.ceil((expiry-Date.now())/60000))+' dk';};
 async function check(){if(checking)return;checking=true;try{const r=await fetch('/api/erisim/oturum',{cache:'no-store',credentials:'same-origin'});if(!r.ok)return go();const data=await r.json();expiry=Date.parse(data.expires);if(!(expiry>Date.now()))return go();clearTimeout(timer);timer=setTimeout(go,expiry-Date.now());draw();}catch{go();}finally{checking=false;}}
 logout.addEventListener('click',async()=>{logout.disabled=true;try{const r=await fetch('/api/erisim/cikis',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(!r.ok)throw Error();go();}catch{logout.disabled=false;logout.textContent='Yeniden dene';}});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});window.addEventListener('pageshow',check);setInterval(check,45000);check();
})();
