import test from 'node:test';
import assert from 'node:assert/strict';
import {use} from './helpers/myys-fixture.mjs';
import {sourcePacketFixture} from './helpers/local-source-packet.mjs';
import {hash} from '../myys/store.mjs';
import {myysRoute} from '../myys/http.mjs';
const routes=['kaynak-al','kaynak-isle','kaynak-guveni'];
const snapshot=f=>JSON.stringify(['records','commands','audit'].map(t=>f.s.db.prepare('SELECT * FROM '+t).all()));
async function invoke(f,h,name,context,input={},options={}){
 let result;const path='/api/myys/'+name;
 await myysRoute({req:{method:'POST',url:path},path,b:{tenant:context.tenant,contractId:h.config.id,...input},sessionHash:context.sessionHash,core:f.core,sourceAdapter:h.adapter,json:(r,status,data)=>result={status,data},...options});return result;
}
for(const name of routes)test('B09 HTTP kapsamı '+name+': olumlu kontrol ve başka rol/birim/geçerli kurum reddi',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),accepted=await h.adapter.accept(f.context('it'),token),input={token,eventId:accepted.id};const yes=await invoke(f,h,name,f.context('it'),input);assert.equal(yes.status,name==='kaynak-al'?202:200);const saved=snapshot(f);
 for(const who of ['student','other','teacher','admin']){const r=await invoke(f,h,name,f.context(who),input);assert.equal(r.status,403);assert.ok(!JSON.stringify(r).includes(token));assert.equal(snapshot(f),saved);}
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('other-unit','it');assert.equal((await invoke(f,h,name,f.context('it'),input)).status,403);assert.equal(snapshot(f),saved);f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('engineering','it');
 const tenant='source-tenant-b',sessionHash=hash('source-http-other-tenant');f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(tenant,'it','engineering','["it"]','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(sessionHash,'it','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(sessionHash,tenant,'scope-http',f.core.clock());assert.equal((await invoke(f,h,name,{tenant,sessionHash},input)).status,403);assert.equal((await invoke(f,h,name,{tenant,sessionHash:hash('it')},input)).status,403);assert.equal(snapshot(f),saved);
}));
test('B09 bütün kaynak HTTP uçları oturumsuz/kapalı çekirdek/bağsız adaptör halinde kapalıdır',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token();for(const name of routes){const context=f.context('it');assert.equal((await invoke(f,h,name,{...context,sessionHash:null},{token})).status,401);assert.equal((await invoke(f,h,name,context,{token},{core:null})).status,503);assert.equal((await invoke(f,h,name,context,{token},{sourceAdapter:null})).status,503);assert.equal((await invoke(f,h,name,context,{token,contractId:'unknown'})).status,403);}
}));
test('B09 kaynak görünümü ve açık güven ihracı sadece uygun kapsamı gösterir; kişi eşlemesi çıkmaz',()=>use(async f=>{
 const h=await sourcePacketFixture(f);for(const who of ['it','student']){let r;await myysRoute({req:{method:'GET',url:'/api/myys/calisma?kurum=test-gazi'},path:'/api/myys/calisma',sessionHash:hash(who),core:f.core,sourceAdapter:h.adapter,json:(res,status,data)=>r={status,data}});assert.equal(r.status,200);assert.equal(r.data.sourceContracts.length,who==='it'?1:0);assert.ok(!JSON.stringify(r.data.sourceContracts).includes('source-student'));}
 const trust=await invoke(f,h,'kaynak-guveni',f.context('it'));assert.equal(trust.data.format,'myys-source-trust/1');assert.equal(trust.data.subjects,undefined);assert.equal(trust.data.keys[0].jwk.d,undefined);
}));
test('B09 asenkron imza denetlenirken yetki kaldırılırsa HTTP alımı atomik kayda geçemez',()=>use(async f=>{
 const h=await sourcePacketFixture(f),token=await h.token(),before=snapshot(f),pending=invoke(f,h,'kaynak-al',f.context('it'),{token});f.s.db.prepare('UPDATE memberships SET active=0 WHERE person=?').run('it');const r=await pending;assert.equal(r.status,403);assert.equal(snapshot(f),before);
}));
