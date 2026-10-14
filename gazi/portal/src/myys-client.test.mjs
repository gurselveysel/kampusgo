import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMyysClient} from './myys-client.mjs';
const epoch=Date.parse('2026-10-14T10:00:00Z');
const session=(patch={})=>({active:true,official:false,scope:'isolated-sql-acceptance',personId:'student',tenant:'gazi',expires:new Date(epoch+300000).toISOString(),csrf:'synthetic-csrf',memberships:[{unit:'engineering',roles:['learner'],private:'excluded'}],...patch});
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('Kimlik ve akademik istekler yanıt gövdesi bitene kadar aynı sırada; CSRF güncel yanıttan gelir',async()=>{
 const gate=deferred(),calls=[];let n=0;
 const client=createMyysClient({now:()=>epoch,fetcher:async(url,options)=>{calls.push({url,options});return n++===0?{ok:true,status:200,json:()=>gate.promise}:response({id:'saved'});}});
 const first=client.refresh(),next=client.request('islem',{action:'evidence'});await Promise.resolve();assert.equal(calls.length,1);gate.resolve(session());await Promise.all([first,next]);assert.equal(calls.length,2);assert.equal(calls[1].options.headers['X-MYYS-CSRF'],'synthetic-csrf');assert.equal(calls[1].options.credentials,'same-origin');
 const value=client.getSnapshot();assert.equal(value.personId,'student');assert.equal('csrf'in value,false);assert.equal('private'in value.memberships[0],false);assert.equal(Object.isFrozen(value.memberships[0].roles),true);
});
test('İptal edilmiş çalışan istek sunucu yanıtı bitmeden sonraki işlemi başlatmaz',async()=>{
 const gate=deferred(),calls=[],controller=new AbortController();let n=0;
 const client=createMyysClient({now:()=>epoch,fetcher:async(url,options)=>{calls.push({url,options});return n++===0?{ok:true,status:200,json:()=>gate.promise}:response({id:'saved'});}});
 const first=client.request('kimlik/oturum',null,controller.signal);const rejected=assert.rejects(first,{name:'AbortError'});await Promise.resolve();controller.abort();const next=client.request('islem',{action:'evidence'});await Promise.resolve();assert.equal(calls.length,1);assert.equal('signal'in calls[0].options,false);gate.resolve(session());await rejected;await next;assert.equal(calls.length,2);
});
test('Sırada iptal edilen istek gönderilmez; yeni isteğin sırası bozulmaz',async()=>{
 const gate=deferred(),calls=[],controller=new AbortController();
 const client=createMyysClient({fetcher:async url=>{calls.push(url);return calls.length===1?{ok:true,status:200,json:()=>gate.promise}:response({});}});
 const first=client.request('calisma'),aborted=client.request('calisma',null,controller.signal);const rejected=assert.rejects(aborted,{name:'AbortError'});controller.abort();const next=client.request('islem',{});gate.resolve({});await first;await rejected;await next;assert.deepEqual(calls,['/api/myys/calisma','/api/myys/islem']);
});
test('Eşzamanlı oturum yenilemeleri tek okuma yapar; sonraki açık istek yeniden okur',async()=>{
 const gate=deferred();let count=0;
 const client=createMyysClient({now:()=>epoch,fetcher:async()=>{count++;return {ok:true,status:200,json:()=>gate.promise};}});
 const a=client.refresh(),b=client.refresh();assert.equal(a,b);gate.resolve(session());await a;await client.refresh();assert.equal(count,2);
});
test('Aynı SQL kişi/kurum/üyelik gösterilir; serbest ad, sunum rolü ve diğer yanıt alanları alınmaz',async()=>{
 const info=session(),client=createMyysClient({now:()=>epoch,fetcher:async()=>response({personId:info.personId,identitySession:info,memberships:info.memberships,displayName:'Sahte ad',presentationRole:'admin'})});
 await client.request('calisma?kurum=gazi');assert.deepEqual(Object.keys(client.getSnapshot()).sort(),['expires','memberships','personId','scope','status','tenant']);assert.deepEqual(client.getSnapshot().memberships[0].roles,['learner']);
});
test('Bilinmeyen kapsam/rol, eksik kurum, uzun süre veya uyuşmayan kişi doğrulanmış gösterilmez',async()=>{
 for(const patch of [{scope:'production'},{tenant:''},{expires:new Date(epoch+900001).toISOString()},{memberships:[{unit:'engineering',roles:['superuser']}]},{expires:new Date(epoch).toISOString()},{active:false},{official:true}]){
  const client=createMyysClient({now:()=>epoch,fetcher:async()=>response(session(patch))});await client.refresh();assert.equal(client.getSnapshot().status,'unavailable');
 }
 const client=createMyysClient({now:()=>epoch,fetcher:async()=>response({personId:'other',identitySession:session(),memberships:session().memberships})});await client.request('calisma');assert.equal(client.getSnapshot().status,'unavailable');
});
test('Süre dolunca kişi ve CSRF silinir; sonraki işlem eski CSRF taşımaz',async()=>{
 let time=epoch;const calls=[];const client=createMyysClient({now:()=>time,fetcher:async(url,options)=>{calls.push(options);return response(calls.length===1?session():{});}});
 await client.refresh();time+=300000;client.expire();assert.deepEqual(client.getSnapshot(),{status:'expired'});await client.request('islem',{});assert.equal(calls[1].headers['X-MYYS-CSRF'],undefined);
});
test('Çıkış, 401 ve checkpoint hatası eski kişiyi temizler; checkpoint giriş bağlantısı sunmaz',async()=>{
 for(const mode of ['logout','closed','blocked']){
  let n=0;const client=createMyysClient({now:()=>epoch,fetcher:async()=>n++===0?response(session()):mode==='logout'?response({}):response({error:'Kapalı',code:mode==='blocked'?'identity_checkpoint':'session_required',scope:'isolated-sql-acceptance',loginPath:'/__identity/login'},mode==='blocked'?503:401)});
  await client.refresh();if(mode==='logout')await client.request('kimlik/cikis',{});else await assert.rejects(client.request('islem',{}),e=>mode==='blocked'?!e.loginPath:e.loginPath==='/__identity/login');assert.equal(client.getSnapshot().status,mode==='blocked'?'blocked':'closed');assert.equal(client.getSnapshot().personId,undefined);
 }
});
test('Kayıp yanıt ve bozuk JSON işlemi otomatik yinelemez; eski kişi güvenli olarak kapanır',async()=>{
 for(const jsonError of [false,true,'null','array','string']){
  let n=0;const client=createMyysClient({now:()=>epoch,fetcher:async()=>{if(n++===0)return response(session());if(jsonError==='null')return response(null);if(jsonError==='array')return response([]);if(jsonError==='string')return response('invalid');if(jsonError)return {ok:true,status:200,json:async()=>{throw Error('bad json');}};throw Error('lost response');}});
  await client.refresh();await assert.rejects(client.request('islem',{}));assert.equal(n,2);assert.deepEqual(client.getSnapshot(),{status:'unavailable'});
 }
});
test('Dinleyici kaldırılır; haricî ve üst dizin yolları veri/CSRF gönderemez',async()=>{
 let requests=0,updates=0;const client=createMyysClient({now:()=>epoch,fetcher:async()=>{requests++;return response(session());}}),stop=client.subscribe(()=>updates++);
 await client.refresh();stop();await client.refresh();assert.equal(updates,1);for(const url of ['https://example.invalid','//example.invalid','../outside','/kimlik/oturum'])await assert.rejects(client.request(url,{}));assert.equal(requests,2);
});
test('Süre veya checkpoint kapanışından sonra geç gelen başarısız okuma kapanış gerekçesini değiştirmez',async()=>{
 let time=epoch,n=0;const gate=deferred();
 const client=createMyysClient({now:()=>time,fetcher:async()=>n++===0?response(session()):{ok:true,status:200,json:()=>gate.promise}});
 await client.refresh();const late=client.refresh();await Promise.resolve();time+=300000;client.expire();gate.resolve(session());await late;assert.deepEqual(client.getSnapshot(),{status:'expired'});
 let count=0;const blocked=createMyysClient({now:()=>epoch,fetcher:async()=>count++===0?response({code:'identity_checkpoint'},503):response({code:'session_required'},401)});
 await assert.rejects(blocked.request('calisma'));await blocked.refresh();assert.deepEqual(blocked.getSnapshot(),{status:'blocked'});
});
