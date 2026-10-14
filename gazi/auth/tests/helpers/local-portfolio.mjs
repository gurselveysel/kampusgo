import {hash} from '../../myys/store.mjs';
import {registryFields} from '../../myys/registry.mjs';
import {signedFixture} from './local-signing.mjs';
import {localSkillMapSetup,skillReason} from './local-skill-map.mjs';
export const portfolioPurpose='Sentetik staj görüşmesinde seçili çalışma ve becerileri inceleme.';
export const portfolioReason='Sentetik amaçlı portfolyo kabulü; gerçek işveren veya kurum veri aktarımı değildir.';
export async function localPortfolioSetup(f,{initial=null,prepared=true,accepted=true,granted=true}={}){
 const first=initial||await signedFixture(f),x=localSkillMapSetup(f,{initial:first}),tenant=f.context('student').tenant;
 for(const person of ['employer','anotheremployer']){f.s.db.prepare('INSERT INTO persons VALUES(?,?,?,1)').run(person,'https://synthetic-recipient.invalid',person);f.s.db.prepare('INSERT INTO memberships VALUES(?,?,?,?,?,1)').run(tenant,person,first.p.unit,'[]','2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO bindings VALUES(?,?,?,1)').run(hash(person),person,'2099-01-01T00:00:00.000Z');f.s.db.prepare('INSERT INTO identity_scopes VALUES(?,?,?,?)').run(hash(person),tenant,'synthetic-portfolio','2026-01-01T00:00:00.000Z');}
 const r=f.run('admin','registry-draft',{unit:first.p.unit,type:'data-flow',title:'Sentetik portfolyo amaç ve alıcı sicili',fields:Object.fromEntries(registryFields['data-flow'].map(k=>[k,k==='purpose'?portfolioPurpose:k==='recipient'?'employer':portfolioReason]))});f.run('authority','registry-review',{recordId:r.id,outcome:'accepted',reason:portfolioReason});
 const input={unit:first.p.unit,recipientPersonId:'employer',recipientLabel:'Sentetik staj görüşmesi alıcısı',purpose:portfolioPurpose,dataFlowId:r.id,retentionReference:portfolioReason,noReuseReference:portfolioReason,reason:portfolioReason,validUntil:new Date(Date.parse(f.core.clock())+30*86400000).toISOString(),scope:'local-acceptance',official:false},policy=prepared?f.run('admin','portfolio-policy',input):null;if(policy&&accepted)f.run('reviewer','portfolio-policy-review',{policyId:policy.id,outcome:'accepted',reason:portfolioReason});
 const grantInput={policyId:policy?.id,enrollmentId:first.e.id,issuanceId:first.issuance.id,skillLinks:[{mapId:x.map.id,linkId:'L1'}],evidenceIds:[first.ev.id],expires:new Date(Date.parse(f.core.clock())+7*86400000).toISOString(),confirm:true},grant=policy&&accepted&&granted?f.run('student','portfolio-grant',grantInput):null;return {...first,map:x.map,mapInput:x.input,input,policy,grantInput,grant};
}
