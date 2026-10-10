// Explicit invocation; configuration is read only from private files outside the repository.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {generateSync} from 'otplib';
import {jwtVerify,importJWK,decodeJwt} from 'jose';
import {draftFor} from '../lib/badge-model.mjs';
const gate=JSON.parse(await readFile(process.argv[2])),keys=JSON.parse(await readFile(process.argv[3]));
const remote=process.argv[4],scope=remote?'production':(process.env.SMOKE_SCOPE||'preview'),base=remote||(scope==='production'?'https://gazi.unigoturkiye.com':'https://preview.invalid');
Object.assign(process.env,{VERCEL_ENV:scope,VERCEL_URL:'preview.invalid',GAZI_GATE_STORE_TOKEN:gate.gateway,GAZI_TOTP_SECRET:gate[scope],GAZI_GATE_IP_KEY:gate.ip_key,GAZI_BADGE_SIGNING_JWK:JSON.stringify(keys[scope])});
const {default:handler}=await import('../api/gateway.mjs');let cookie='',record;
const parse=t=>{try{return JSON.parse(t);}catch{return t;}};
async function req(path,data,auth=true,origin=base){
 const method=data===undefined?'GET':'POST',headers={host:new URL(base).host,origin,'content-type':'application/json',...(auth?{cookie}:{})};
 if(remote){const r=await fetch(base+path,{method,headers,body:data===undefined?undefined:JSON.stringify(data),redirect:'manual',signal:AbortSignal.timeout(20000)});return {status:r.status,body:parse(await r.text()),headers:Object.fromEntries(r.headers.entries())};}
 const r=Readable.from(data===undefined?[]:[JSON.stringify(data)]);Object.assign(r,{url:path,method,headers});const out={statusCode:200,headers:{},setHeader(k,v){this.headers[k.toLowerCase()]=v;},end(v){this.raw=v?.toString()||'';}};await handler(r,out);return {status:out.statusCode,body:parse(out.raw),headers:out.headers};
}
try{
 assert.equal((await req('/api/rozet/uret',{draft:draftFor('universite'),requestId:randomUUID()},false)).status,401);
 assert.equal((await req('/portal.js',undefined,false)).status,303);
 const login=await req('/api/erisim/giris',{code:generateSync({secret:gate[scope]})},false);assert.equal(login.status,200,JSON.stringify(login.body));cookie=login.headers['set-cookie'].split(';')[0];
 assert.equal((await req('/api/rozet/uret',{},true,'https://other.invalid')).status,403);
 const bad=draftFor('universite');bad.quality='';assert.equal((await req('/api/rozet/uret',{draft:bad,requestId:randomUUID()})).status,422);
 const requestId=randomUUID(),draft=draftFor('universite');draft.title='Otomatik test · Veri Bilimi';
 const issue=await req('/api/rozet/uret',{draft,requestId});assert.equal(issue.status,201,JSON.stringify(issue.body));record=issue.body;assert.equal(record.id,requestId);assert.ok(record.jwt);
 assert.equal((await req('/api/rozet/uret',{draft,requestId})).body.jwt,record.jwt);
 assert.equal((await req('/api/rozet/dogrula',{jwt:record.jwt})).body.valid,true);
 const [head,payload,sig]=record.jwt.split('.');const p=decodeJwt(record.jwt);p.name='Değiştirilmiş';const altered=head+'.'+Buffer.from(JSON.stringify(p)).toString('base64url')+'.'+sig;
 assert.equal((await req('/api/rozet/dogrula',{jwt:altered})).body.valid,false);
 const pub=await req('/api/rozet/anahtarlar',undefined,false);assert.equal(pub.status,200);assert.equal(pub.body.keys[0].d,undefined);await jwtVerify(record.jwt,await importJWK(pub.body.keys[0],'RS256'),{issuer:base+'/api/rozet/kurum'});
 assert.ok((await req('/api/rozet/iptal',{id:record.id})).body.record.revoked_at);
 assert.equal((await req('/api/rozet/dogrula',{jwt:record.jwt})).body.revoked,true);
 const status=await req('/api/rozet/durum',undefined,false);assert.equal(status.status,200,JSON.stringify(status.body));const {payload:statusVC}=await jwtVerify(status.body,await importJWK(pub.body.keys[0],'RS256'),{issuer:base+'/api/rozet/kurum'});
 const bytes=gunzipSync(Buffer.from(statusVC.credentialSubject.encodedList.slice(1),'base64url'));assert.ok(bytes[Math.floor(record.index/8)]&(1<<(7-record.index%8)));
 assert.equal((await req('/api/rozet/liste')).body.records.filter(r=>r.id===record.id).length,1);
 console.log(JSON.stringify({environment:scope,checks:14,result:'passed',testRecord:record.id,testRecordRevoked:true}));
}finally{if(cookie){if(record)await req('/api/rozet/iptal',{id:record.id});await req('/api/erisim/cikis',{});assert.equal((await req('/api/rozet/liste')).status,401);cookie='';console.log('Çıkış sonrası eski oturum reddedildi.');}}
