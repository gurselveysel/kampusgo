import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {localSupportPolicy,localSupportSetup} from './helpers/local-support-service.mjs';
import {supportCalendar,supportDeadline,supportTargets} from '../myys/support-service-model.mjs';
import {bindSupportPolicy,pinnedSupportPolicy} from '../myys/support-service.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {qualityReport} from '../myys/quality-report.mjs';
const reason='Sentetik destek açıklaması; akademik kayıt veya resmî kurum taahhüdü değişmez.';
const create=(f,who='student',category='technical',extra={})=>f.run(who,'support',{unit:'engineering',subject:'Sentetik destek süre incelemesi',message:reason,category,...extra});
const event=(f,actor,ticket,type,revision=0,extra={})=>f.run(actor,'support-event',{ticketId:ticket.id,type,expectedRevision:revision,message:reason,...extra});
const view=(f,who='student')=>f.core.view(f.context(who)).support[0];
const clock=(f,now)=>f.core.clock=()=>now;
test('Çalışma dakikası öğle arası, hafta sonu ve yalnız açıkça tanımlı kapalı günü atlar',()=>{
 const c=supportCalendar(localSupportPolicy.calendar);
 assert.equal(supportDeadline(c,'2026-10-14T08:59:00.000Z',1),'2026-10-14T09:00:00.000Z');
 assert.equal(supportDeadline(c,'2026-10-14T08:59:00.000Z',2),'2026-10-14T10:01:00.000Z');
 assert.equal(supportDeadline(c,'2026-10-14T09:00:00.000Z',1),'2026-10-14T10:01:00.000Z');
 assert.equal(supportDeadline(c,'2026-10-16T13:30:00.000Z',120),'2026-10-20T07:30:00.000Z');
 assert.equal(supportDeadline(c,'2026-10-14T10:50:00.000Z',240),'2026-10-15T06:50:00.000Z');
 assert.equal(supportDeadline(c,'2026-11-30T13:59:00.000Z',2),null);assert.equal(supportDeadline(c,'2026-09-30T13:59:00.000Z',2),null);
});
test('Bozuk/çakışan takvim, aşırı aralık ve keyfi kuyruk/yanıt hedefi reddedilir',()=>{
 for(const p of [{from:'2026-02-30'},{to:'2029-01-01'},{timeZone:'inferred'},{windows:[[540,780],[720,1020]]},{windows:[[1200,60]]},{weekdays:[1,1]},{excludedDays:['2028-01-01']}])assert.throws(()=>supportCalendar({...localSupportPolicy.calendar,...p}));
 for(const p of [{responseMinutes:0},{responseMinutes:480,resolutionMinutes:60},{escalateTo:['privacy','privacy']},{escalateTo:['outside-mail']}])assert.throws(()=>supportTargets({...localSupportPolicy.targets,technical:{...localSupportPolicy.targets.technical,...p}}));
});
test('Süre kuralı yokken destek açılır; kullanıcı sahte politika bağı veremez',()=>use(f=>{
 clock(f,'2026-10-14T10:50:00.000Z');const t=create(f,'student','technical',{servicePolicy:{id:'forged',version:1,digest:'0'.repeat(64)}});assert.equal(t.servicePolicy,null);assert.equal(view(f).serviceCycles[0].response.status,'unknown');assert.equal(view(f).serviceCycles[0].policy,null);
}));
test('Yönetici hazırlar, ayrı kalite inceler; başka birim/rol/MFA ve kendi incelemesi reddedilir',()=>use(f=>{
 const {policy}=localSupportSetup(f,{accepted:false});for(const actor of ['student','it','teacher','admin'])assert.throws(()=>f.run(actor,'support-policy-review',{policyId:policy.id,outcome:'accepted',reason}));
 f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","quality"]','admin');assert.throws(()=>f.run('admin','support-policy-review',{policyId:policy.id,outcome:'accepted',reason}),e=>e.code==='separation');
 assert.throws(()=>f.run('admin','support-policy',{...localSupportPolicy,unit:'other-unit'}),e=>e.code==='forbidden');
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('reviewer'));assert.throws(()=>f.run('reviewer','support-policy-review',{policyId:policy.id,outcome:'accepted',reason}));
 f.s.db.prepare('UPDATE bindings SET mfa=1 WHERE session_hash=?').run(hash('reviewer'));const r=f.run('reviewer','support-policy-review',{policyId:policy.id,outcome:'accepted',reason});assert.equal(r.official,false);
 assert.equal(f.core.view(f.context('student')).supportPolicies.length,0);assert.equal(f.core.view(f.context('it')).supportPolicies.length,1);
}));
test('Politika incelemesi exact sürüme bağlıdır; yeni taslak eski kabulü silmez, eski taslak onaylanamaz',()=>use(f=>{
 const {policy}=localSupportSetup(f);const draft=f.run('admin','support-policy',{...localSupportPolicy,previousId:policy.id,changeReason:reason});assert.equal(create(f).servicePolicy.id,policy.id);
 const newer=f.run('admin','support-policy',{...localSupportPolicy,previousId:draft.id,changeReason:reason});assert.throws(()=>f.run('reviewer','support-policy-review',{policyId:draft.id,outcome:'accepted',reason}),e=>e.code==='support_policy_changed');
 f.run('reviewer','support-policy-review',{policyId:newer.id,outcome:'accepted',reason});assert.equal(create(f,'other').servicePolicy.id,newer.id);
}));
test('Bekletme/bitme eski sürüme dönmez; geçmiş hedef ve inceleme bağı değişmez',()=>use(f=>{
 const {policy}=localSupportSetup(f);const t=create(f);const before=view(f).serviceCycles;
 f.run('reviewer','support-policy-hold',{policyId:policy.id,reason});assert.equal(create(f,'other').servicePolicy,null);assert.deepEqual(view(f).serviceCycles,before);
 assert.equal(pinnedSupportPolicy(f.s,'test-gazi','other-unit',t.servicePolicy),null);assert.equal(pinnedSupportPolicy(f.s,'test-gazi','engineering',{...t.servicePolicy,digest:'bad'}),null);
 clock(f,'2026-12-01T10:00:00.000Z');assert.equal(bindSupportPolicy(f.s,'test-gazi','engineering',f.core.clock()),null);assert.equal(view(f).serviceCycles[0].policy.id,policy.id);
}));
test('İlk insan yanıtı sahibi/eskalasyonla karşılanmaz; hedef sınırı ve gecikme kayıt kaynağından hesaplanır',()=>use(f=>{
 localSupportSetup(f);const t=create(f);event(f,'student',t,'reply');assert.equal(view(f).serviceCycles[0].response.at,null);
 clock(f,'2026-10-14T11:50:00.000Z');assert.equal(view(f).serviceCycles[0].response.status,'waiting');event(f,'it',t,'escalate',1,{category:'academic'});assert.equal(view(f).serviceCycles[0].response.at,null);
 clock(f,'2026-10-14T11:50:00.001Z');assert.equal(view(f).serviceCycles[0].response.status,'overdue');event(f,'reviewer',t,'reply',2);assert.equal(view(f).serviceCycles[0].response.status,'late');assert.equal(view(f).serviceCycles[0].response.due,'2026-10-14T11:50:00.000Z');
}));
test('İncelenmiş yönlendirme sınırı uygulanır; yeni kuyruğa geçiş süreyi sıfırlamaz',()=>use(f=>{
 localSupportSetup(f);const t=create(f);assert.throws(()=>event(f,'it',t,'escalate',0,{category:'privacy'}),e=>e.code==='support_queue');event(f,'it',t,'escalate',0,{category:'academic'});
 assert.equal(f.core.view(f.context('it')).support.length,0);assert.equal(view(f,'reviewer').category,'academic');assert.equal(view(f).serviceCycles[0].category,'technical');assert.equal(view(f).serviceCycles.length,1);
}));
test('Çözüm ayrı sahip teyidi ister; kapanış tekil, yeniden açma yeni döngü ve güncel politika bağıdır',()=>use(f=>{
 const {policy}=localSupportSetup(f);const t=create(f);event(f,'it',t,'resolve');assert.equal(view(f).state,'resolved');assert.deepEqual(view(f).allowedActions,['confirm','reopen']);
 assert.throws(()=>event(f,'it',t,'confirm',1,{confirm:true}),e=>e.code==='forbidden');assert.throws(()=>event(f,'student',t,'confirm',1),e=>e.code==='support_confirm');event(f,'student',t,'confirm',1,{confirm:true});assert.equal(view(f).state,'closed');assert.ok(view(f).serviceCycles[0].confirmedAt);assert.throws(()=>event(f,'student',t,'confirm',2,{confirm:true}),e=>e.code==='support_state');
 const next=f.run('admin','support-policy',{...localSupportPolicy,previousId:policy.id,changeReason:reason});f.run('reviewer','support-policy-review',{policyId:next.id,outcome:'accepted',reason});clock(f,'2026-10-15T08:00:00.000Z');event(f,'student',t,'reopen',2);const v=view(f);assert.equal(v.state,'open');assert.equal(v.serviceCycles.length,2);assert.equal(v.serviceCycles[0].policy.id,policy.id);assert.equal(v.serviceCycles[1].policy.id,next.id);assert.equal(v.serviceCycles[1].response.at,null);
}));
test('Teyitli kapanış kalite paydasını korur; destek olayı akademik kayıtları değiştiremez',()=>use(f=>{
 localSupportSetup(f);f.passed();const before=f.s.db.prepare("SELECT * FROM records WHERE kind IN ('evidence','assessment','decision','issuance','signed')").all();const t=create(f);event(f,'it',t,'resolve');event(f,'student',t,'confirm',1,{confirm:true});let m=qualityReport(f.core.view(f.context('student'))).metrics.find(m=>m.id==='support');assert.equal(m.numerator,1);assert.equal(m.denominator,1);event(f,'student',t,'reopen',2);m=qualityReport(f.core.view(f.context('student'))).metrics.find(m=>m.id==='support');assert.equal(m.numerator,0);assert.equal(m.denominator,1);assert.deepEqual(f.s.db.prepare("SELECT * FROM records WHERE kind IN ('evidence','assessment','decision','issuance','signed')").all(),before);
}));
test('Denetim arızasında politika ve teyit tamamen geri alınır',()=>use(f=>{
 localSupportSetup(f);const t=create(f);event(f,'it',t,'resolve');const n=f.s.list('test-gazi','support-event').length;
 f.s.db.exec("CREATE TRIGGER support_audit_fail BEFORE INSERT ON audit BEGIN SELECT RAISE(ABORT,'synthetic fault'); END");assert.throws(()=>event(f,'student',t,'confirm',1,{confirm:true}));assert.equal(f.s.list('test-gazi','support-event').length,n);assert.equal(view(f).state,'resolved');
 const p=f.s.list('test-gazi','support-policy').at(-1);assert.throws(()=>f.run('admin','support-policy',{...localSupportPolicy,previousId:p.id,changeReason:reason}));assert.equal(f.s.list('test-gazi','support-policy').length,1);
}));
test('İki depo bağlantısı aynı teyidi tek olayda tutar; değişen içerik ve eski sürüm reddedilir',()=>use(f=>{
 localSupportSetup(f);const t=create(f);event(f,'it',t,'resolve');const otherStore=new LocalAcceptanceStore(f.path),otherCore=new MyysCore(otherStore);otherCore.clock=f.core.clock;
 try{const request={...f.context('student'),action:'support-event',commandId:'support-confirm-once',input:{ticketId:t.id,type:'confirm',expectedRevision:1,message:reason,confirm:true}};const a=f.core.run(request),b=otherCore.run(request);assert.equal(a.id,b.id);assert.equal(f.s.list('test-gazi','support-event').length,2);assert.throws(()=>otherCore.run({...request,input:{...request.input,message:reason+' Different'}}),e=>e.code==='idempotency_conflict');assert.throws(()=>event(f,'student',t,'confirm',1,{confirm:true}),e=>e.code==='support_conflict');}finally{otherStore.close();}
}));
test('Saat geri giderse olay yazılmaz; güncel olmayan süre hesabı açıkça bilinmez kalır',()=>use(f=>{
 localSupportSetup(f);const t=create(f);event(f,'it',t,'reply');clock(f,'2026-10-14T10:49:59.000Z');assert.throws(()=>event(f,'it',t,'resolve',1),e=>e.code==='support_clock');assert.equal(view(f).serviceCycles[0].response.status,'unknown');
}));
