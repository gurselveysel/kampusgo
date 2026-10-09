import test from 'node:test';
import assert from 'node:assert/strict';
import {seed,evaluateMatch,createApplication,saveMatch,sendCommission,recordVote,finalize,transfer,issue,verify,csv} from './model.mjs';
test('AKTS respects workload, coverage and evidence independently',()=>{
 const input={hours:75,hoursPerEcts:25,covered:2,total:3,evidence:true,issuerChecked:true,minCoverage:70};
 const result=evaluateMatch(input);assert.equal(result.ects,3);assert.equal(result.coverage,67);assert.equal(result.eligible,false);
 assert.equal(evaluateMatch({...input,covered:3}).eligible,true);
 assert.equal(evaluateMatch({...input,covered:3,evidence:false}).eligible,false);
 assert.equal(evaluateMatch({...input,covered:3,issuerChecked:false}).eligible,false);
 assert.throws(()=>evaluateMatch({...input,hours:-1}));assert.throws(()=>evaluateMatch({...input,total:0}));assert.throws(()=>evaluateMatch({...input,hoursPerEcts:0}));
});
test('role, conflict, duplicate vote and quorum gates block invalid decisions',()=>{
 const s=seed(),id=s.applications[0].id,vote={member:'Üye 1',vote:'approve',reason:'Ölçme kanıtı ve öğrenme çıktıları incelendi.',conflict:false};
 assert.throws(()=>recordVote(s,id,vote));s.role='commission';assert.throws(()=>recordVote(s,id,{...vote,conflict:true}));assert.throws(()=>finalize(s,id));
 recordVote(s,id,vote);assert.throws(()=>recordVote(s,id,vote));assert.throws(()=>finalize(s,id));
 recordVote(s,id,{...vote,member:'Üye 2'});recordVote(s,id,{...vote,member:'Üye 3'});finalize(s,id);assert.equal(s.applications[0].status,'approved');
 assert.throws(()=>recordVote(s,id,{...vote,member:'Üye 4'}));assert.throws(()=>saveMatch(s,id,{}));
});
test('full application to credential and OBS rehearsal, with idempotency',()=>{
 const s=seed();s.role='learner';const a=createApplication(s,{title:'Örnek eğitim',provider:'Örnek kurum',unit:'GAZİSEM',target:'Veri okuryazarlığı',hours:50,outcomes:['Verileri yorumlar.'],evidence:true});
 s.role='coordinator';assert.throws(()=>sendCommission(s,a.id));a.issuerChecked=true;
 const m=evaluateMatch({hours:50,hoursPerEcts:25,covered:1,total:1,evidence:true,issuerChecked:true});saveMatch(s,a.id,m);sendCommission(s,a.id);s.role='commission';
 for(const member of ['Üye 1','Üye 2','Üye 3'])recordVote(s,a.id,{member,vote:'approve',reason:'Kanıt ve öğrenme çıktıları yeterli bulundu.'});
 finalize(s,a.id);assert.equal(a.status,'approved');assert.throws(()=>transfer(s,a.id));s.role='studentAffairs';const t=transfer(s,a.id);assert.equal(t.live,false);assert.equal(t.ects,2);assert.throws(()=>transfer(s,a.id));
 const c=issue(s,a.id);assert.equal(verify(s,c.code).valid,true);assert.throws(()=>issue(s,a.id));c.status='revoked';assert.equal(verify(s,c.code).valid,false);assert.equal(verify(s,'unknown').valid,false);
});
test('insufficient match or stale policy cannot become an approval',()=>{
 for(const patch of [{coverage:10},{policyVersion:'STALE'}]){const s=seed();s.role='commission';Object.assign(s.applications[0].match,patch);for(const member of ['Üye 1','Üye 2','Üye 3'])recordVote(s,s.applications[0].id,{member,vote:'approve',reason:'Örnek değerlendirme gerekçesi yeterli uzunlukta.'});assert.throws(()=>finalize(s,s.applications[0].id));}
});
test('CSV escapes formula injection and delimiters',()=>{const out=csv([['=1+1','hello;world','"quoted"']]);assert.ok(out.includes("'=1+1"));assert.ok(out.includes('"hello;world"'));assert.ok(out.includes('""quoted""'));});
test('unapproved applications cannot issue documents or transfer',()=>{const s=seed();s.role='studentAffairs';assert.throws(()=>issue(s,s.applications[1].id));assert.throws(()=>transfer(s,s.applications[1].id));});
