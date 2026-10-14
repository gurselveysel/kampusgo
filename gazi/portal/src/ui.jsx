import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X,ArrowUpRight,CheckCircle2,Info} from 'lucide-react';
// Horizontal tabs with immediate local panels: one Tab stop, arrow/Home/End selection.
export function tabKeyboard(event){
 const all=[...event.currentTarget.closest('[role="tablist"]').querySelectorAll('[role="tab"]')].filter(el=>!el.disabled),at=all.indexOf(event.currentTarget);
 let next;if(event.key==='ArrowRight')next=(at+1)%all.length;else if(event.key==='ArrowLeft')next=(at+all.length-1)%all.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=all.length-1;else return;
 event.preventDefault();all[next]?.focus();all[next]?.click();
}
export function Button({children,icon:Icon,variant='',className='',...props}){return <button className={`button ${variant} ${className}`} {...props}>{Icon&&<Icon size={17}/>}<span>{children}</span></button>}
export function Pill({children,tone='neutral',dot=false}){return <span className={`pill ${tone}`}>{dot&&<i/>}{children}</span>}
export function Card({children,className='',...props}){return <section className={`card ${className}`} {...props}>{children}</section>}
export function CardHead({title,sub,children}){return <div className="card-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{children}</div>}
export function Heading({eyebrow,title,description,children}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>}
export function Notice({children,tone=''}){return <div className={`notice ${tone}`}><Info size={17}/><div>{children}</div></div>}
export function Modal({open,onClose,title,description,children}){
 const opener=React.useRef(null);
 return <Dialog.Root open={open} onOpenChange={v=>!v&&onClose()}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content" onOpenAutoFocus={()=>{opener.current=document.activeElement;}} onCloseAutoFocus={e=>{e.preventDefault();const el=opener.current;const visible=el?.isConnected&&!el.matches(':disabled')&&!el.closest('[inert]')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';(visible&&el!==document.body?el:document.querySelector('.menu-toggle:not([inert])')?.getClientRects().length?document.querySelector('.menu-toggle'):document.getElementById('main-content'))?.focus({preventScroll:true});}}><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description||'Bu işlem yalnız etkileşimli tanıtım ortamındaki örnek kaydı değiştirir.'}</Dialog.Description><Dialog.Close className="dialog-close" aria-label="Pencereyi kapat"><X size={20}/></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>;
}
export function Field({label,children,sub}){
 const id=React.useId(),native=React.isValidElement(children)&&['input','select','textarea'].includes(children.type);
 const control=native?React.cloneElement(children,{...(!children.props['aria-label']&&!children.props['aria-labelledby']?{'aria-labelledby':id}:{}),...(sub?{'aria-describedby':[children.props['aria-describedby'],id+'-help'].filter(Boolean).join(' ')}:{})}):children;
 return <label className="field"><span id={id}>{label}</span>{control}{sub&&<small id={id+'-help'}>{sub}</small>}</label>;
}
// Keep the native file control keyboard/form behavior; localize only its visible surface.
export function FileInput({onChange,disabled=false,clearKey=0,...props}){
 const input=React.useRef(null),id=React.useId(),[name,setName]=React.useState('');
 React.useEffect(()=>{if(input.current)input.current.value='';setName('');},[clearKey]);
 React.useEffect(()=>{const form=input.current?.form;if(!form)return;const reset=e=>queueMicrotask(()=>{if(!e.defaultPrevented)setName('');});form.addEventListener('reset',reset);return()=>form.removeEventListener('reset',reset);},[]);
 return <span className={'file-picker'+(disabled?' disabled':'')}><input {...props} ref={input} className="file-picker-input" type="file" disabled={disabled} aria-describedby={[props['aria-describedby'],id+'-name'].filter(Boolean).join(' ')} onChange={e=>{setName([...e.target.files].map(f=>f.name).join(', '));onChange?.(e);}}/><span className="file-picker-action" aria-hidden="true">Dosya seç</span><span className="file-picker-name" id={id+'-name'} role="status">{name||'Dosya seçilmedi.'}</span></span>;
}
export const download=(name,data)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export const empty=<div className="empty-state"><CheckCircle2 size={30}/><h3>Bu görünümde kayıt bulunamadı.</h3><p>Arama veya filtre seçiminizi değiştirebilirsiniz.</p></div>;
