import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {X,ArrowUpRight,CheckCircle2,Info} from 'lucide-react';
export function Button({children,icon:Icon,variant='',className='',...props}){return <button className={`button ${variant} ${className}`} {...props}>{Icon&&<Icon size={17}/>}<span>{children}</span></button>}
export function Pill({children,tone='neutral',dot=false}){return <span className={`pill ${tone}`}>{dot&&<i/>}{children}</span>}
export function Card({children,className='',...props}){return <section className={`card ${className}`} {...props}>{children}</section>}
export function CardHead({title,sub,children}){return <div className="card-head"><div><h2>{title}</h2>{sub&&<p>{sub}</p>}</div>{children}</div>}
export function Heading({eyebrow,title,description,children}){return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div><div className="heading-actions">{children}</div></div>}
export function Notice({children,tone=''}){return <div className={`notice ${tone}`}><Info size={17}/><div>{children}</div></div>}
export function Modal({open,onClose,title,description,children}){return <Dialog.Root open={open} onOpenChange={v=>!v&&onClose()}><Dialog.Portal><Dialog.Overlay className="dialog-overlay"/><Dialog.Content className="dialog-content"><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description||'Bu işlem yalnız etkileşimli tanıtım ortamındaki örnek kaydı değiştirir.'}</Dialog.Description><Dialog.Close className="dialog-close" aria-label="Pencereyi kapat"><X size={20}/></Dialog.Close>{children}</Dialog.Content></Dialog.Portal></Dialog.Root>}
export function Field({label,children,sub}){return <label className="field"><span>{label}</span>{children}{sub&&<small>{sub}</small>}</label>}
export const download=(name,data)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
export const empty=<div className="empty-state"><CheckCircle2 size={30}/><h3>Bu görünümde kayıt bulunamadı.</h3><p>Arama veya filtre seçiminizi değiştirebilirsiniz.</p></div>;
