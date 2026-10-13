import {localCredentialProfile} from './local-credential-profile.mjs';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {LocalAcceptanceStore,hash} from '../../myys/store.mjs';
import {MyysCore} from '../../myys/core.mjs';
import {probeCommandScopes} from './local-scope-probe.mjs';
const people={author:['coordinator'],publisher:['commission'],teacher:['instructor'],judge:['commission'],issuer:['studentAffairs'],reviewer:['quality'],student:['learner'],other:['learner'],admin:['admin'],authority:['admin'],it:['it']};
export const fixture=(tenant='test-gazi')=>{
 const dir=mkdtempSync(join(tmpdir(),'myys-acceptance-')),path=join(dir,'records.sqlite');
 const s=new LocalAcceptanceStore(path),core=new MyysCore(s);
 const expires='2099-01-01T00:00:00.000Z';
 for(const [id,roles]of Object.entries(people)){
  s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run(id,'https://test-idp.invalid',id);
  s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(tenant,id,'engineering',JSON.stringify(roles),expires);
  s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(id),id,expires);
  s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(hash(id),tenant,'synthetic-fixture','2026-01-01T00:00:00.000Z');
 }
 const context=who=>({sessionHash:hash(who),tenant});
 const run=(who,action,input,commandId=randomUUID())=>{const request={...context(who),commandId,action,input},actor=process.env.MYYS_AUTHZ_PROBE_DIR?s.principal(request.sessionHash,tenant,core.clock()):null,result=core.run(request);if(actor)probeCommandScopes(core,request,result,actor);return result;};
 const program=()=>run('author','program',{code:'P01',title:'Yerel Veri Okuryazarlığı',unit:'engineering',mode:'pilot',pathway:'micro',responsibilities:{programOwner:'Örnek birim',decisionAuthority:'Örnek kurul',legalIssuer:'Pilot düzenleyici',technicalSigner:'ÜniGO yerel kabul'},outcomes:[{id:'O1',text:'Veri kalitesini gerekçeleriyle analiz eder.'}],tasks:[{id:'T1',title:'Veri analizi görevi',outcomeId:'O1'}],rubric:[{id:'R1',outcomeId:'O1',weight:100}],threshold:70,hours:25,ects:1,level:'6',participation:'Karma',quality:'Akran incelemesi ve dönem değerlendirmesi.',instructor:'Örnek eğitici',license:'Kurumca hazırlanan sentetik test içeriği.',assessmentMethod:'Rubrik ile insan değerlendirmesi.'});
 const setup=({withProfile=true}={})=>{const p=program();run('publisher','publish',{programId:p.id,reason:'Örnek program ve ölçme paketi incelendi.'});if(withProfile)localCredentialProfile({run},p);const e=run('author','enroll',{programId:p.id,learnerId:'student'});return {p,e};};
 const assess=({e},score=4)=>{const ev=run('student','evidence',{enrollmentId:e.id,taskId:'T1',content:'Sentetik veri çözümlemesi: boş değerler işaretlendi ve gerekçeleri açıklandı.'});const a=run('teacher','assess',{enrollmentId:e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score,reason:'Kanıt ve yöntem tutarlılığı incelendi.'}],reason:'Zorunlu çalışma ve öğrenme çıktısı rubrikle incelendi.'});return {ev,a};};
 const passed=options=>{const x=setup(options),{ev,a}=assess(x);const d=run('judge','decide',{assessmentId:a.id,outcome:'approved',reason:'Bağımsız incelemede başarı kanıtları uygun bulundu.'});return {...x,ev,a,d};};
 return {s,core,path,context,run,program,setup,assess,passed,close(){s.close();rmSync(dir,{recursive:true,force:true});}};
};
export const use=async(fn)=>{const f=fixture();try{return await fn(f);}finally{f.close();}};
