import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {hash} from '../myys/store.mjs';
const create=(f,category='technical')=>f.run('student','support',{unit:'engineering',category,subject:'Ders ekranı inceleme isteği',message:'Ders ekranındaki işlem yeniden incelenmelidir.'});
const event=(f,who,ticket,type='reply',extra={})=>f.run(who,'support-event',{ticketId:ticket.id,type,expectedRevision:0,message:'Gerekçeli işlem ve izlenecek adımlar kaydedildi.',...extra});
test('destek kuyrukları kategori, kurum, birim ve MFA ile sınırlandırılır',()=>use(f=>{
 const tech=create(f),privacy=create(f,'privacy'),academic=create(f,'academic');
 const visible=who=>f.core.view(f.context(who)).support.map(x=>x.id);
 assert.deepEqual(visible('it'),[tech.id]);assert.deepEqual(visible('admin'),[privacy.id]);assert.deepEqual(visible('reviewer'),[academic.id]);assert.deepEqual(visible('teacher'),[]);assert.deepEqual(visible('other'),[]);
 assert.throws(()=>event(f,'it',privacy),e=>e.code==='not_found');
 assert.throws(()=>f.core.view({...f.context('it'),tenant:'other-tenant'}),e=>e.code==='identity_tenant');
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','it');assert.deepEqual(visible('it'),[]);
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('engineering','it');f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE session_hash=?').run(hash('it'));assert.deepEqual(visible('it'),[]);
}));
test('yanıt, çözüm ve yeniden açma değişmez tarihçeyi ve akademik kayıtları korur',()=>use(f=>{
 f.passed();const academic=f.s.db.prepare("SELECT * FROM records WHERE kind IN ('evidence','assessment','decision')").all();const t=create(f);
 event(f,'it',t);event(f,'it',t,'resolve',{expectedRevision:1});
 assert.throws(()=>event(f,'it',t,'reply',{expectedRevision:2}),e=>e.code==='support_state');
 assert.throws(()=>event(f,'it',t,'reopen',{expectedRevision:2}),e=>e.code==='forbidden');
 event(f,'student',t,'reopen',{expectedRevision:2});
 const view=f.core.view(f.context('student')).support[0];assert.equal(view.state,'open');assert.equal(view.revision,3);assert.deepEqual(view.events.map(e=>e.type),['reply','resolve','reopen']);
 assert.deepEqual(f.s.db.prepare("SELECT * FROM records WHERE kind IN ('evidence','assessment','decision')").all(),academic);
 assert.throws(()=>f.s.db.prepare("DELETE FROM records WHERE kind='support-event'").run(),/immutable/);
}));
test('eskalasyon yeni kuyruğa erişim verir; eski görevli tekrar isteğinde yetkiyi kaybeder',()=>use(f=>{
 const t=create(f),input={ticketId:t.id,type:'escalate',category:'academic',expectedRevision:0,message:'Akademik inceleme yetkilisine yönlendirilmesi gerekiyor.'};
 f.run('it','support-event',input,'escalation-001');
 assert.equal(f.core.view(f.context('it')).support.length,0);assert.equal(f.core.view(f.context('reviewer')).support[0].category,'academic');
 assert.throws(()=>f.run('it','support-event',input,'escalation-001'),e=>e.code==='forbidden');
 assert.throws(()=>event(f,'student',t,'resolve',{expectedRevision:1}),e=>e.code==='forbidden');
 event(f,'reviewer',t,'resolve',{expectedRevision:1});
}));
test('eski sürüm çakışır; yinelenen yanıt tek kayıt olur; değişen içerik reddedilir',()=>use(f=>{
 const t=create(f),input={ticketId:t.id,type:'reply',expectedRevision:0,message:'Teknik adımlar ve beklenen davranış yeniden incelendi.'};
 const a=f.run('it','support-event',input,'support-reply-001');const b=f.run('it','support-event',input,'support-reply-001');assert.equal(a.id,b.id);
 assert.throws(()=>event(f,'it',t),e=>e.code==='support_conflict');
 assert.throws(()=>f.run('it','support-event',{...input,message:'Farklı bir içerik ile yeniden gönderildi.'},'support-reply-001'),e=>e.code==='idempotency_conflict');
 assert.equal(f.s.list('test-gazi','support-event').length,1);
}));
