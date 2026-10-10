import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Layers3,ArrowRight,ArrowLeft,Check,CheckCircle2,Bookmark,Clock3,Search,GraduationCap,ChevronDown,Download,FileText,Target,NotebookPen,RefreshCw} from 'lucide-react';
import {LessonContent,LmsJourney} from './lesson-content.jsx';
import {curricula,lessonsFor,curriculumVersion} from './learning-data.mjs';
import {LEARNER_ID,LEGACY_KEY,LEARNING_KEY,emptyLearning,readEnrollment,readLearning,persistLearning,lessonRecord,progress,continueLesson} from './learning-model.mjs';

function Button({children,icon:Icon,primary=false,...props}) {return <button className={'learn-button'+(primary?' learn-primary':'')} {...props}>{Icon&&<Icon size={16}/>}<span>{children}</span></button>}
function Meter({value,label}) {return <div className="learn-meter" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{width:value+'%'}}/></div>}
function getInitial() {
 try {return {programs:readEnrollment(localStorage),learning:readLearning(localStorage),error:''};}
 catch(e){return {programs:[],learning:emptyLearning(),error:e.message};}
}
function selection(programs,learning) {
 const [,program,lesson]=location.hash.replace(/^#\/?/,'').split('/');
 const p=programs.find(p=>p.id===program)||programs[0];
 return {program:p?.id||'',lesson:lessonsFor(p?.id).find(l=>l.id===lesson)?.id||continueLesson(learning,LEARNER_ID,p?.id)?.id||''};
}
function downloadPlan(program,learning) {
 const rows=lessonsFor(program.id).map(l=>({modül:l.moduleTitle,ders:l.title,öğrenmeÇıktısı:l.outcome,durum:lessonRecord(learning,LEARNER_ID,program.id,l.id).completed?'Tamamlandı':'Tamamlanmadı',not:lessonRecord(learning,LEARNER_ID,program.id,l.id).note||''}));
 const data={program:program.title,içerikSürümü:curriculumVersion,kapsam:'Örnek müfredat ve kişisel çalışma takibi; akademik başarı belgesi değildir.',dersler:rows};
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='Unigo_'+program.id+'_Ogrenme_Planim.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function Learning({navigate}) {
 const [snapshot,setSnapshot]=useState(getInitial),[chosen,setChosen]=useState(()=>selection(snapshot.programs,snapshot.learning));
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[closed,setClosed]=useState({}),[message,setMessage]=useState('');
 const detail=useRef(null),programSection=useRef(null),messageTimer=useRef(null);
 const {programs,learning,error}=snapshot;
 const selected=programs.find(p=>p.id===chosen.program)||programs[0];
 const modules=curricula[selected?.id]||[],lessons=lessonsFor(selected?.id);
 const active=lessons.find(l=>l.id===chosen.lesson)||continueLesson(learning,LEARNER_ID,selected?.id);
 const record=lessonRecord(learning,LEARNER_ID,selected?.id,active?.id);
 const metrics=progress(learning,LEARNER_ID,selected?.id);
 const totals=programs.reduce((a,p)=>{const x=progress(learning,LEARNER_ID,p.id);return {total:a.total+x.total,completed:a.completed+x.completed,modules:a.modules+(curricula[p.id]?.length||0)};},{total:0,completed:0,modules:0});
 const announce=text=>{clearTimeout(messageTimer.current);setMessage(text);messageTimer.current=setTimeout(()=>setMessage(''),5000);};
 const refresh=()=>{const next=getInitial();setSnapshot(next);setChosen(c=>next.programs.some(p=>p.id===c.program)?c:selection(next.programs,next.learning));};
 useEffect(()=>{const sync=e=>{if(!e.key||[LEGACY_KEY,LEARNING_KEY].includes(e.key))refresh();};const hash=()=>setChosen(selection(readSafePrograms(),readSafeLearning()));
  function readSafePrograms(){try{return readEnrollment(localStorage)}catch{return []}}
  function readSafeLearning(){try{return readLearning(localStorage)}catch{return emptyLearning()}}
  window.addEventListener('storage',sync);window.addEventListener('hashchange',hash);
  return()=>{window.removeEventListener('storage',sync);window.removeEventListener('hashchange',hash);clearTimeout(messageTimer.current);};
 },[]);
 const save=(kind,value,lesson=active?.id,program=selected?.id)=>{
  try{const next=persistLearning(localStorage,{owner:LEARNER_ID,program,lesson,kind,value});setSnapshot(s=>({...s,learning:next,error:''}));return true;}
  catch(e){setSnapshot(s=>({...s,error:e.name==='QuotaExceededError'?'Not kaydedilemedi: tarayıcı depolama alanı dolu.':e.message}));return false;}
 };
 const choose=(p,l,scroll=false)=>{
  setChosen({program:p,lesson:l||''});history.replaceState(null,'','#/learning/'+p+(l?'/'+l:''));
  if(l)save('visit',null,l,p);
  if(scroll)requestAnimationFrame(()=>detail.current?.scrollIntoView({behavior:'instant',block:'start'}));
 };
 const chooseProgram=p=>{setQuery('');setFilter('all');setClosed({});choose(p.id,continueLesson(learning,LEARNER_ID,p.id)?.id);requestAnimationFrame(()=>programSection.current?.scrollIntoView({behavior:'instant',block:'start'}));};
 const filtered=lessons.filter(l=>{
  const r=lessonRecord(learning,LEARNER_ID,selected?.id,l.id);
  return (l.title+' '+l.moduleTitle+' '+l.outcome).toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr'))&&(filter==='all'||filter==='done'&&r.completed||filter==='todo'&&!r.completed||filter==='saved'&&r.bookmarked);
 });
 return <section className="learn" aria-label="Öğrenci öğrenme alanı">
  <div className="learn-heading"><div><p className="learn-eyebrow">ÖĞRENCİ ÇALIŞMA ALANI</p><h1>Programlarım ve derslerim</h1><p>Deniz Örnek, öğrenme yolculuğunun tamamı burada.</p></div><a className="learn-button" href="/legacy.html?workspace=learner#/catalog" onClick={navigate?e=>{e.preventDefault();navigate('catalog')}:undefined}><GraduationCap size={17}/>Program kataloğu</a></div>
  {error&&<div className="learn-error" role="alert">{error}<Button icon={RefreshCw} onClick={refresh}>Yeniden oku</Button></div>}
  <div className="learn-hero"><div className="learn-hero-copy"><span className="learn-chip">ÖĞREN · UYGULA · GELİŞ</span><h2>Bir sonraki adımın,<br/>yeni bir öğrenme çıktısı.</h2><p>Programlarını modüller halinde keşfet. Tüm dersleri incele, çalışmalarını kaydet ve kendi hızında ilerle.</p>{active&&<Button primary icon={ArrowRight} onClick={()=>choose(selected.id,continueLesson(learning,LEARNER_ID,selected.id)?.id,true)}>{totals.completed?'Öğrenmeye devam et':'İlk derse başla'}</Button>}</div><div className="learn-hero-stats"><div><GraduationCap size={21}/><strong>{programs.length}</strong><span>Planımdaki program</span></div><div><Layers3 size={21}/><strong>{totals.modules}</strong><span>Öğrenme modülü</span></div><div><CheckCircle2 size={21}/><strong>{totals.completed}<small> / {totals.total}</small></strong><span>Tamamlanan ders</span></div></div></div>
  <LmsJourney key={selected?.id} program={selected} learning={learning} onStudy={()=>choose(selected.id,active?.id,true)}/>
  <div className="learn-section-title"><h2>Öğrenme planındaki programlar</h2><span>Tüm dersler erişime açık</span></div>
  <div className="learn-programs">{programs.map((p,i)=>{const x=progress(learning,LEARNER_ID,p.id),m=curricula[p.id]||[];return <article key={p.id} className={'learn-program'+(p.id===selected?.id?' selected':'')}><div className="learn-program-top"><span className={'learn-program-icon tone-'+i%3}>{p.id==='P06'?<CheckCircle2 size={24}/>:<BookOpen size={24}/>}</span><span className="learn-status">{x.total?(x.completed===x.total?'Tamamlandı':x.completed?'Devam ediyor':'Başlamadın'):'İçerik hazırlanıyor'}</span></div><p className="learn-category">{p.category||'Mikro yeterlilik'}</p><h3>{p.title}</h3><p className="learn-unit">{p.unit}</p><div className="learn-meta"><span><Layers3 size={14}/>{m.length} modül</span><span><BookOpen size={14}/>{x.total} ders</span><span>{p.ects} AKTS önerisi</span></div><div className="learn-progress-label"><span>{x.completed} / {x.total} ders tamamlandı</span><strong>%{x.percent}</strong></div><Meter value={x.percent} label={p.title+' ilerlemesi'}/><button className="learn-program-link" onClick={()=>chooseProgram(p)} aria-label={p.title+' — dersleri gör'}>{p.id===selected?.id?'Dersler aşağıda':'Dersleri gör'}<ArrowRight size={17}/></button></article>})}</div>
  {!programs.length&&!error&&<div className="learn-empty"><BookOpen size={32}/><h2>Öğrenme planın henüz boş.</h2><p>Program kataloğundan planına eklediğin programlar ve dersleri burada görünecek.</p></div>}
  {selected&&<section ref={programSection} className="learn-curriculum" aria-label="Seçili programın dersleri"><div className="learn-program-heading"><div><p className="learn-eyebrow">PROGRAM İÇERİĞİ</p><h2>{selected.title}</h2><p>{modules.length} modül · {lessons.length} ders · {selected.hours} saat toplam program iş yükü</p></div><Button icon={Download} onClick={()=>downloadPlan(selected,learning)}>Planımı indir</Button></div><div className="learn-scope"><FileText size={16}/><p>Zenginleştirilmiş örnek müfredat · Yayıncı videoları, Türkçe sunumlar, açık eğitim kaynakları ve vaka çalışmaları içerir. Program iş yükü, bireysel çalışma ve değerlendirmeleri de kapsar. Kişisel tamamlama işaretleri akademik onay veya belge oluşturmaz.</p></div>
  {!modules.length?<div className="learn-empty"><Layers3 size={32}/><h3>Bu programın ders içeriği henüz yayımlanmadı.</h3><p>Program kaydın korunuyor. Modüller yayımlandığında burada görünecek.</p></div>:<><div className="learn-controls"><label className="learn-search"><Search size={17}/><input aria-label="Modül veya ders ara" placeholder="Modül, ders veya öğrenme çıktısı ara…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Ders durumunu filtrele" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Tüm dersler ({lessons.length})</option><option value="todo">Tamamlanmayanlar</option><option value="done">Tamamlananlar</option><option value="saved">İşaretlediklerim</option></select></div>
  <div className="learn-workspace"><div className="learn-syllabus"><div className="learn-syllabus-heading"><h3>Modüller ve dersler</h3><button onClick={()=>setClosed(Object.fromEntries(modules.map(m=>[m.id,!modules.every(m=>closed[m.id])])))}>{modules.every(m=>closed[m.id])?'Tümünü aç':'Tümünü daralt'}</button></div>{modules.map((m,i)=>{const list=filtered.filter(l=>l.moduleId===m.id),done=m.lessons.filter(l=>lessonRecord(learning,LEARNER_ID,selected.id,l.id).completed).length;if(!list.length)return null;return <section className="learn-module" key={m.id}><button className="learn-module-toggle" aria-expanded={!closed[m.id]} aria-controls={'lessons-'+m.id} onClick={()=>setClosed(c=>({...c,[m.id]:!c[m.id]}))}><span className={'learn-module-number'+(done===m.lessons.length?' done':'')}>{done===m.lessons.length?<Check size={17}/>:String(i+1).padStart(2,'0')}</span><span><strong>{m.title}</strong><small>{done} / {m.lessons.length} ders tamamlandı</small></span><ChevronDown size={17} className={closed[m.id]?'closed':''}/></button><div id={'lessons-'+m.id} hidden={!!closed[m.id]}>{list.map(l=>{const r=lessonRecord(learning,LEARNER_ID,selected.id,l.id);return <button className={'learn-lesson'+(active?.id===l.id?' active':'')} key={l.id} aria-current={active?.id===l.id?'step':undefined} onClick={()=>choose(selected.id,l.id,true)}>{r.completed?<CheckCircle2 className="learn-done" size={18}/>:<FileText size={18}/>}<span><strong>{l.title}</strong><small>{l.minutes} dk rehber çalışma · {r.completed?'Tamamlandı':'Ders ve uygulama'}</small></span>{r.bookmarked&&<Bookmark size={14}/>}<ArrowRight size={14}/></button>})}</div></section>})}{!filtered.length&&<div className="learn-empty"><Search size={24}/><h3>Bu filtreyle ders bulunamadı.</h3><Button onClick={()=>{setQuery('');setFilter('all');}}>Filtreleri temizle</Button></div>}</div>
  {active&&<article className="learn-detail" ref={detail} aria-label="Ders içeriği"><div className="learn-detail-top"><span>{active.moduleTitle}</span><button className={'learn-bookmark'+(record.bookmarked?' saved':'')} aria-label={record.bookmarked?'Ders işaretini kaldır':'Dersi işaretle'} aria-pressed={!!record.bookmarked} onClick={()=>save('bookmark',!record.bookmarked)}><Bookmark size={19}/></button></div><div className="learn-detail-body"><p className="learn-eyebrow">DERS {lessons.findIndex(l=>l.id===active.id)+1} / {lessons.length}</p><h2>{active.title}</h2><div className="learn-detail-meta"><span><Clock3 size={14}/>{active.minutes} dk rehber çalışma</span><span>{record.completed?<><CheckCircle2 size={14}/>Tamamlandı</>:'Çalışmaya hazır'}</span></div><div className="learn-outcome"><Target size={20}/><div><h3>Öğrenme çıktısı</h3><p>{active.outcome}</p></div></div><LessonContent key={'content-'+active.id} lesson={active} program={selected}/><h3>Ders özeti</h3><p className="learn-reading">{active.brief}</p><div className="learn-activity"><h3><NotebookPen size={18}/>Uygulama görevi</h3><p>{active.task}</p></div><LessonNotes key={'notes-'+active.id} initial={record.note||''} savedNote={record.note||''} save={value=>{const ok=save('note',value);if(ok)announce('Ders notun kaydedildi.');return ok;}}/>
  <div className="learn-complete"><Button primary={!record.completed} icon={record.completed?CheckCircle2:Check} onClick={()=>{if(save('complete',!record.completed))announce(record.completed?'Ders yeniden çalışılacak olarak işaretlendi.':'Ders tamamlandı. İlerlemen kaydedildi.');}}>{record.completed?'Tamamlamayı geri al':'Dersi tamamladım'}</Button><span>{metrics.completed} / {metrics.total} ders · %{metrics.percent}</span></div><div className="learn-pagination"><Button icon={ArrowLeft} disabled={lessons[0].id===active.id} onClick={()=>choose(selected.id,lessons[lessons.findIndex(l=>l.id===active.id)-1].id,true)}>Önceki ders</Button><Button icon={ArrowRight} disabled={lessons.at(-1).id===active.id} onClick={()=>choose(selected.id,lessons[lessons.findIndex(l=>l.id===active.id)+1].id,true)}>Sonraki ders</Button></div></div></article>}
  </div></>}
  </section>}
  <p className="learn-footnote">İlerleme ve notlar bu tarayıcıdaki örnek öğrenci kaydında saklanır. Mevcut program planın, başvuruların ve belgelerin korunur.</p>
  {message&&<div className="learn-toast" role="status"><CheckCircle2 size={18}/>{message}</div>}
 </section>;
}
function LessonNotes({initial,savedNote,save}) {
 const [note,setNote]=useState(initial),[dirty,setDirty]=useState(false);
 // Save on blur before a lesson/navigation click can unmount this editor.
 const persist=()=>{if(dirty&&save(note))setDirty(false);};
 useEffect(()=>{if(!dirty)setNote(savedNote);},[savedNote,dirty]);
 useEffect(()=>{if(!dirty)return;const guard=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard);},[dirty]);
 return <div className="learn-notes"><label htmlFor="lesson-note">Ders notlarım ve çalışma yanıtım</label><textarea id="lesson-note" maxLength={6000} rows={4} placeholder="Öğrendiklerini, uygulama yanıtını veya tekrar bakacağın konuları yaz…" value={note} onChange={e=>{setNote(e.target.value);setDirty(true);}} onBlur={persist}/><div><small>{note.length.toLocaleString('tr-TR')} / 6.000 · {dirty?'Kaydedilmemiş değişiklik':'Notun güncel'}</small><Button icon={Check} onClick={persist} disabled={!dirty}>Notu kaydet</Button></div></div>;
}
