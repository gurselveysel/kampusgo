import {generateKeyPairSync,randomBytes,randomUUID} from 'node:crypto';
import {LocalIdentityFlow} from '../../myys/identity-flow.mjs';
import {hash} from '../../myys/store.mjs';
export const cleanupReason='Sentetik tamamlanmış giriş isteği temizliği; kurum saklama kararı değildir.';
export function installLoginCleanupFixture(f){
 if(f.loginCleanupFixture)return;
 const pair=generateKeyPairSync('ec',{namedCurve:'P-256'}),jwk={...pair.publicKey.export({format:'jwk'}),kid:'synthetic-cleanup',alg:'ES256',use:'sig'};
 f.loginCleanupFixture=new LocalIdentityFlow({store:f.s,identityConfig:{version:'synthetic-cleanup/1',tenant:f.context('student').tenant,issuer:'https://test-idp.invalid',audience:'synthetic-cleanup',algorithms:['ES256'],jwks:{keys:[jwk]},mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}],maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0},derivationKey:randomBytes(32),redirectUri:'http://127.0.0.1/cleanup-test',exchangeCode:async()=>{throw Error('No provider call in synthetic cleanup seed');}});
}
export function seedLoginRequest(f,{person='student',tenant=f.context('student').tenant,status='used',future=false,ambiguous=false,accepted=true,invalidTime=false}={}){
 installLoginCleanupFixture(f);const id=randomUUID(),now=Date.parse(f.core.clock()),created=now-600000,finished=now-500000,expires=future?now+300000:now-400000;
 f.s.db.prepare('INSERT INTO identity_challenges VALUES(?,?,?,?,?,?,?,?,?)').run(id,hash('state:'+id),hash('browser:'+id),tenant,hash('contract'),created,expires,status,status==='used'?(invalidTime?expires+1:finished):null);
 if(accepted)f.s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(tenant,person,'identity.accept',id,new Date(finished).toISOString());
 if(ambiguous)f.s.db.prepare('INSERT INTO audit(tenant,actor,action,record_id,at) VALUES(?,?,?,?,?)').run(tenant,'other','identity.accept',id,new Date(finished).toISOString());
 return id;
}
export function loginCleanupCase(f){const request=f.run('student','privacy-request',{unit:'engineering',type:'deletion',category:'account',description:cleanupReason}),response=f.run('admin','privacy-response',{requestId:request.id,outcome:'local-login-cleanup',response:cleanupReason,basisReference:cleanupReason,academicRetentionReference:cleanupReason,reviewOn:'2099-01-01'});return {request,response,preview:()=>f.run('student','privacy-login-preview',{requestId:request.id,responseId:response.id})};}
