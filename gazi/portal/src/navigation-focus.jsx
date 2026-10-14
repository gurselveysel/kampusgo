import {useEffect,useLayoutEffect,useRef,useState} from 'react';

// Mirrors the existing responsive breakpoint; presentation navigation is not authorization.
export function useNavigationFocus({open,setOpen,main}){
 const [narrow,setNarrow]=useState(()=>matchMedia('(max-width:760px)').matches);
 const sidebar=useRef(null),toggle=useRef(null);
 const close=reason=>{setOpen(false);if(reason==='dismiss')requestAnimationFrame(()=>toggle.current?.focus());};
 useEffect(()=>{const query=matchMedia('(max-width:760px)');const changed=()=>{if(query.matches&&sidebar.current?.contains(document.activeElement))toggle.current?.focus();setNarrow(query.matches);if(!query.matches)setOpen(false);};query.addEventListener('change',changed);return()=>query.removeEventListener('change',changed);},[setOpen]);
 useLayoutEffect(()=>{
  if(!open||!narrow)return;
  const node=sidebar.current,bodyOverflow=document.body.style.overflow;
  const items=()=>[...node.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')].filter(e=>e.tabIndex>=0&&!e.matches(':disabled')&&!e.closest('[inert]')&&e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden');
  const first=()=>items()[0]||node;
  first().focus();document.body.style.overflow='hidden';
  const focus=e=>{if(!node.contains(e.target))first().focus();};
  const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close('dismiss');return;}if(e.key!=='Tab')return;const targets=items(),a=targets[0],b=targets.at(-1);if(!a){e.preventDefault();node.focus();}else if(e.shiftKey&&(document.activeElement===a||document.activeElement===node)){e.preventDefault();b.focus();}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a.focus();}};
  document.addEventListener('keydown',key);document.addEventListener('focusin',focus);
  return()=>{document.body.style.overflow=bodyOverflow;document.removeEventListener('keydown',key);document.removeEventListener('focusin',focus);};
 },[open,narrow]);
 return {narrow,sidebar,toggle,close,focusMain:()=>requestAnimationFrame(()=>main.current?.focus({preventScroll:true}))};
}
