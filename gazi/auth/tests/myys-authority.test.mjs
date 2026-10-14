import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {use} from './helpers/myys-fixture.mjs';
import {localAuthorityDossier,authorityInput,authorityReason as reason} from './helpers/local-authority.mjs';
import {localCredentialProfile} from './helpers/local-credential-profile.mjs';
import {profileFields,profileSource,profileFormat} from '../myys/credential-profile-model.mjs';
import {LocalAcceptanceStore,hash} from '../myys/store.mjs';
import {MyysCore} from '../myys/core.mjs';
import {stableStringify} from '../myys/program-model.mjs';
import {signedFixture} from './helpers/local-signing.mjs';
import {verifyWithKeyring,signApproved} from '../myys/credentials.mjs';
const code=c=>e=>e.code===c;
function setup(f,reviewed=true){const prior=f.s.list('test-gazi','program').at(-1),p=prior?f.run('author','program',{...prior,code:'NEXT-'+randomUUID()}):f.program(),authority=f.run('admin','registry-draft',{unit:p.unit,type:'institution-authority',title:'Yerel kurum yetki dosyası',fields:{...p.responsibilities,pathway:p.pathway,authorityReference:reason}});f.run('authority','registry-review',{recordId:authority.id,outcome:'accepted',reason});return {p,authority,...localAuthorityDossier(f,p,authority,{reviewed})};}
const input=x=>authorityInput(x.p,x.authority,x.attachments);
const next=(f,x,patch={})=>f.run('admin','authority-dossier',{...input(x),previousId:x.dossier.id,changeReason:reason,...patch});
const review=(f,d,outcome='accepted')=>f.run('authority','authority-review',{dossierId:d.id,outcome,reason});
const profile=x=>({programId:x.p.id,authorityId:x.authority.id,mode:'local-acceptance',sourceVersion:profileSource.version,format:profileFormat,acknowledgedFields:profileFields.map(f=>f.key),issuerPeople:['issuer'],expires:'2028-01-01T00:00:00.000Z',reason,scopeReference:reason});
const upload=x=>({authorityId:x.authority.id,kind:'delegation',title:'Sentetik görev eki',reference:'LOCAL-DELEGATION',version:'local-1',documentDate:'2020-01-01',readScope:reason,fileName:'yetki.txt',base64:Buffer.from(reason).toString('base64')});

test('B02 belge ekleri, sorumluluk kapsamı ve bağımsız inceleme olmadan profil hazırlığı kapalıdır',()=>use(f=>{
 const x=setup(f,false);assert.throws(()=>f.run('admin','credential-profile',profile(x)),code('authority_required'));review(f,x.dossier);const p=f.run('admin','credential-profile',profile(x));assert.equal(p.authorityDossierId,x.dossier.id);assert.equal(p.authorityDossierDigest,hash(stableStringify(x.dossier)));assert.equal(f.core.view(f.context('admin')).authority.dossiers[0].usable,true);assert.equal(x.dossier.legalAuthorityVerified,false);assert.equal(x.dossier.externalSubmitted,false);
}));
test('B02 ek dosya aynen indirilir; ham içerik çalışma alanında veya tekrar sonucunda saklanmaz',()=>use(f=>{
 const x=setup(f),args={attachmentId:x.attachments[0].id},id=randomUUID(),r=f.run('admin','authority-download',args,id);assert.equal(hash(Buffer.from(r.file.base64,'base64')),x.attachments[0].sha256);assert.equal(r.file.bytes,x.attachments[0].bytes);assert.equal(f.s.list('test-gazi','authority-download')[0].file,undefined);assert.deepEqual(f.run('admin','authority-download',args,id),r);
 const command=JSON.parse(f.s.db.prepare('SELECT result FROM commands WHERE id=?').get(id).result);assert.equal(command.file,undefined);assert.equal(JSON.stringify(f.core.view(f.context('admin')).authority).includes(r.file.base64),false);
 f.s.db.prepare('UPDATE bindings SET mfa=0 WHERE person=?').run('admin');assert.throws(()=>f.run('admin','authority-download',args,id),code('forbidden'));
}));
test('B02 ek boyutu, tarih, dosya adı, kodlama ve uydurma onay alanları reddedilir',()=>use(f=>{
 const x=setup(f),base=upload(x);for(const patch of [{base64:''},{base64:Buffer.alloc(32769).toString('base64')},{base64:'a==='},{base64:'YQ'},{fileName:'../yetki.pdf'},{fileName:'yetki.html'},{fileName:'a\n.pdf'},{documentDate:'2026-02-30'},{documentDate:'2090-01-01'},{kind:'unknown'},{readScope:'kısa'},{official:true}])assert.throws(()=>f.run('admin','authority-attachment',{...base,...patch}));assert.equal(f.s.list('test-gazi','authority-attachment').length,2);const r=f.run('admin','authority-attachment',{...base,base64:Buffer.alloc(32768,65).toString('base64')});assert.equal(r.bytes,32768);assert.equal(r.authenticityVerified,false);
}));
test('B02 Senato ve SEM ekleri aynı sicile bağlı olmalı; dört kapsam ayrı ve kaynaklıdır',()=>use(f=>{
 const x=setup(f),y=setup(f),b=input(x);for(const patch of [{attachmentIds:[]},{attachmentIds:[x.attachments[0].id,x.attachments[0].id]},{attachmentIds:[x.attachments[0].id,y.attachments[1].id]},{responsibilities:{}},{responsibilities:{...b.responsibilities,programOwner:{scope:reason,attachmentIds:[y.attachments[0].id]}}},{responsibilities:{...b.responsibilities,programOwner:{scope:reason,attachmentIds:[x.attachments[0].id],official:true}}},{authorityId:y.authority.id},{official:true}])assert.throws(()=>next(f,x,patch));assert.equal(f.s.list('test-gazi','authority-dossier').length,2);
}));
test('B02 hazırlayan, ek yazarı ve program yazarı kendi dosyasını inceleyemez',()=>use(f=>{
 const x=setup(f,false);assert.throws(()=>f.run('admin','authority-review',{dossierId:x.dossier.id,outcome:'accepted',reason}),code('separation'));f.s.db.prepare('UPDATE memberships SET roles=? WHERE person=?').run('["admin","coordinator"]','author');assert.throws(()=>f.run('author','authority-review',{dossierId:x.dossier.id,outcome:'accepted',reason}),code('separation'));review(f,x.dossier);assert.throws(()=>review(f,x.dossier),code('authority_changed'));
}));
test('B02 başlangıç, bitiş ve görev süreleri yeni kullanımda tekrar denetlenir',()=>use(f=>{
 const x=setup(f),d=next(f,x,{validFrom:'2030-01-01T00:00:00.000Z'});assert.throws(()=>review(f,d),code('authority_dependencies'));review(f,d,'rejected');const n=next(f,{...x,dossier:d},{validUntil:'2027-01-01T00:00:00.000Z'});review(f,n);assert.throws(()=>f.run('admin','credential-profile',profile(x)),code('profile_fields'));
 f.core.clock=()=> '2027-01-01T00:00:00.000Z';assert.equal(f.core.view(f.context('admin')).authority.dossiers.at(-1).usable,false);assert.throws(()=>f.run('admin','credential-profile',profile(x)),code('authority_required'));assert.throws(()=>next(f,{...x,dossier:n},{validUntil:'2020-01-01T00:00:00.000Z'}),code('authority_validity'));
}));
test('B02 yeni taslak önceki yetki dosyasına geri dönüşü kapatır; program sürümü değişmez',()=>use(f=>{
 const x=setup(f),d=next(f,x);assert.equal(f.core.view(f.context('admin')).authority.dossiers.every(r=>!r.usable),true);assert.throws(()=>review(f,x.dossier),code('authority_changed'));review(f,d,'rejected');assert.throws(()=>f.run('admin','credential-profile',profile(x)),code('authority_required'));const n=next(f,{...x,dossier:d});review(f,n);const newer=f.run('author','program',{...x.p,previousProgramId:x.p.id,changeReason:reason});assert.throws(()=>f.run('admin','credential-profile',{...profile(x),programId:newer.id}),code('authority_required'));assert.equal(f.s.list('test-gazi','authority-dossier').length,3);
}));
test('B02 iki depo bağlantısı aynı önceki sürümden iki güncel dosya üretemez',()=>use(f=>{
 const x=setup(f),s2=new LocalAcceptanceStore(f.path),c2=new MyysCore(s2,{clock:f.core.clock});try{const d=next(f,x);assert.throws(()=>c2.run({...f.context('admin'),commandId:randomUUID(),action:'authority-dossier',input:{...input(x),previousId:x.dossier.id,changeReason:reason}}),code('authority_changed'));assert.equal(s2.list('test-gazi','authority-dossier').at(-1).id,d.id);}finally{s2.close();}
}));
test('B02 ek ve indirme denetim hatasında dosya, sonuç ve komut atomik geri alınır',()=>use(f=>{
 const x=setup(f),counts=()=>['authority-attachment','authority-file','authority-download'].map(k=>f.s.list('test-gazi',k).length),before=counts();f.s.db.exec("CREATE TRIGGER reject_authority_audit BEFORE INSERT ON audit WHEN NEW.action IN ('authority-attachment','authority-download') BEGIN SELECT RAISE(ABORT,'synthetic authority audit failure'); END;");for(const [action,args]of [['authority-attachment',upload(x)],['authority-download',{attachmentId:x.attachments[0].id}]])assert.throws(()=>f.run('admin',action,args),/synthetic authority audit failure/);assert.deepEqual(counts(),before);
}));
test('B02 birim, kurum, MFA ve üretim sınırları ek indirmede de korunur',()=>use(f=>{
 const x=setup(f),args={attachmentId:x.attachments[0].id};for(const who of ['student','issuer','publisher','it']){assert.throws(()=>f.run(who,'authority-download',args),code('not_found'));assert.deepEqual(f.core.view(f.context(who)).authority.attachments,[]);}
 f.s.db.prepare('UPDATE memberships SET unit=? WHERE person=?').run('arts','authority');assert.throws(()=>f.run('authority','authority-download',args),code('not_found'));assert.equal(f.core.view(f.context('admin')).authority.dossiers[0].usable,false);
 assert.throws(()=>f.core.run({...f.context('admin'),tenant:'another',commandId:randomUUID(),action:'authority-download',input:args}),code('identity_tenant'));const old=process.env.VERCEL;try{process.env.VERCEL='1';assert.throws(()=>f.run('admin','authority-download',args),code('local_only'));}finally{if(old===undefined)delete process.env.VERCEL;else process.env.VERCEL=old;}
}));
test('B02 dosya bayt bütünlüğü bozulursa okuma ve profil hazırlığı kapanır',()=>use(f=>{
 const x=setup(f);f.s.db.exec('DROP TRIGGER records_no_update');const r=f.s.get('test-gazi','authority-file',x.attachments[0].id);f.s.db.prepare('UPDATE records SET data=? WHERE tenant=? AND kind=? AND id=?').run(JSON.stringify({...r,base64:Buffer.from('changed').toString('base64')}),'test-gazi','authority-file',r.id);assert.throws(()=>f.run('admin','authority-download',{attachmentId:r.id}),code('authority_file_changed'));assert.throws(()=>f.run('admin','credential-profile',profile(x)),code('authority_required'));
}));
test('B02 yetki dosyası durdurması bekleyen imzayı kapatır; eski imzayı ve akademik arşivi değiştirmez',()=>use(async f=>{
 const x=await signedFixture(f),d=f.s.list('test-gazi','authority-dossier')[0],before=hash(stableStringify(['decision','assessment','evidence','issuance','signed'].map(k=>f.s.list('test-gazi',k))));f.run('admin','authority-hold',{dossierId:d.id,reason});assert.equal(hash(stableStringify(['decision','assessment','evidence','issuance','signed'].map(k=>f.s.list('test-gazi',k)))),before);assert.equal(f.s.list('test-gazi','revocation').length,0);assert.equal(f.core.view(f.context('admin')).authority.dossiers[0].usable,false);
 // The signature verification path intentionally does not reinterpret a historical authority hold as revocation.
 const verified=await verifyWithKeyring(f.core,f.context('student'),x.signed.jwt,[{state:'active',material:x.material}],x.base);assert.equal(verified.valid,true);

}));

test('B02 durdurulmuş dosyaya bağlı bekleyen ihraç imzalanamaz',()=>use(async f=>{
 const x=f.passed(),issuance=f.run('issuer','issue',{decisionId:x.d.id}),d=f.s.list('test-gazi','authority-dossier')[0];f.run('authority','authority-hold',{dossierId:d.id,reason});await assert.rejects(()=>signApproved(f.core,f.context('issuer'),issuance.id,null,'https://local-acceptance.invalid'),code('profile_blocked'));assert.equal(f.s.list('test-gazi','signed').length,0);
}));
