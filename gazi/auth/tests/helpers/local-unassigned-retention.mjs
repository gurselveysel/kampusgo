// Disposable synthetic input. Never imported by production entry points.
import {randomUUID} from 'node:crypto';
import {recordLocalRetentionAuthority,unassignedLoginTarget} from '../../myys/unassigned-login-retention.mjs';
import {registryFields} from '../../myys/registry.mjs';
import {hash} from '../../myys/store.mjs';
import {installLoginCleanupFixture} from './local-login-cleanup.mjs';
export const retentionReason='Sentetik kurum kapsamlı giriş saklama denemesi; gerçek görevlendirme veya hukuki saklama süresi değildir.';
export function grantRetention(f,person,capabilities,{unit='engineering',revision,active=true,expires='2099-01-01T00:00:00.000Z',...patch}={}){
 const tenant=f.context(person).tenant,prior=f.s.list(tenant,'retention-authority').filter(r=>r.personId===person&&r.unit===unit).at(-1);
 return recordLocalRetentionAuthority({store:f.s,tenant,personId:person,unit,capabilities,active,notBefore:'2020-01-01T00:00:00.000Z',expires,revision:revision??(prior?.revision||0)+1,expectedRevision:prior?.revision||0,operatorRef:'synthetic-trusted-control',authorityDigest:hash(retentionReason),now:f.core.clock(),...patch});
}
export function grantRetentionTeam(f){grantRetention(f,'admin',['prepare']);grantRetention(f,'authority',['review']);grantRetention(f,'it',['execute']);}
export const retentionRegistry=f=>f.run('admin','registry-draft',{type:'data-flow',unit:'engineering',title:'Yerel giriş saklama sicili',fields:Object.fromEntries(registryFields['data-flow'].map(k=>[k,retentionReason]))});
export function unassignedPolicy(f,patch={},actor='admin'){
 const registry=patch.registryId?{id:patch.registryId}:retentionRegistry(f);
 return f.run(actor,'flow-policy',{registryId:registry.id,provider:'MYYS-local',stage:'login-security',senderRole:'controller',recipientRole:'processor',countries:['TR'],retentionDays:30,startEvent:'request-terminal-expired',target:unassignedLoginTarget,basisReference:retentionReason,academicRetention:retentionReason,locationReference:retentionReason,transferReference:retentionReason,...patch});
}
export const reviewRetention=(f,p,actor='authority')=>f.run(actor,'flow-review',{policyId:p.id,outcome:'accepted',reason:retentionReason});
export const previewRetention=(f,p,actor='it')=>f.run(actor,'retention-preview',{policyId:p.id});
export const runRetention=(f,p,actor='it',commandId)=>f.run(actor,'retention-run',{previewId:p.id,confirm:true},commandId);
export function unassignedCase(f){grantRetentionTeam(f);const policy=unassignedPolicy(f),review=reviewRetention(f,policy);return {policy,review,preview:()=>previewRetention(f,policy)};}
export function seedUnassignedLogin(f,{status='failed',tenant=f.context('student').tenant,days=45,finished=true,browserHash,accepted=false,patch={}}={}){
 installLoginCleanupFixture(f);const id=randomUUID(),at=Date.parse(f.core.clock())-days*86400000,row={id,state_hash:hash('state:'+id),browser_hash:browserHash||hash('browser:'+id),tenant,contract_digest:hash('synthetic-contract'),created:at-600000,expires:at-100000,status,finished:finished?at-200000:null,...patch};
 f.s.db.prepare('INSERT INTO identity_challenges VALUES(?,?,?,?,?,?,?,?,?)').run(...['id','state_hash','browser_hash','tenant','contract_digest','created','expires','status','finished'].map(k=>row[k]));
 if(accepted)f.s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(tenant,'student','identity.accept',row.id,new Date(at-200000).toISOString());return row;
}
export const requestRows=f=>f.s.db.prepare('SELECT * FROM identity_challenges ORDER BY id').all();
