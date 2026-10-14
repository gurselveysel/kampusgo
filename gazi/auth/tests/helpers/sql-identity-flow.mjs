import assert from 'node:assert/strict';
import {createHmac,randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {exportJWK,generateKeyPair,SignJWT} from 'jose';
import {pgliteIdentity} from './pglite-identity.mjs';
import {PostgresIdentityTransactions} from '../../myys/identity-transactions.mjs';
import {PostgresIdentityFlow} from '../../myys/identity-sql-flow.mjs';
import {logoutEvent} from '../../myys/identity-contract.mjs';
import {hash} from '../../myys/store.mjs';
import {pkceS256} from '../../myys/identity-flow.mjs';
export async function sqlIdentityFlow(t,{configPatch={},redirectUri='https://portal.invalid/callback',clock=null}={}){
 const sql=await pgliteIdentity();t.after(()=>sql.close());await sql.install();
 for(const name of ['identity-challenge-schema.sql','identity-session-schema.sql'])await sql.db.exec(await readFile(new URL('../../myys/'+name,import.meta.url),'utf8'));
 let time=clock?0:Date.parse('2026-10-14T10:00:00Z');const now=()=>clock?clock().getTime()+time:time;const signing=await generateKeyPair('ES256'),publicKey={...await exportJWK(signing.publicKey),kid:'test-key',alg:'ES256',use:'sig'};
 const config={version:'test-sql-v1',issuer:'https://idp.invalid',tenant:'test-gazi',audience:'test-myys',algorithms:['ES256'],jwks:{keys:[publicKey]},maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0,mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}],...configPatch};
 const h={sql,config,clock:()=>new Date(now()),advance:n=>{time+=n;},redirectUri,browser:hash('synthetic-browser'),exchanges:0,exchangeHook:async()=>{},keyRows:new Map(),control:{operatorRef:'test-operator',authorityDigest:hash('test-control')}};
 const secrets=new Map(),pending=new Map();for(const purpose of ['pkce','nonce']){secrets.set(purpose,randomBytes(32));h.keyRows.set(purpose,{tenant:config.tenant,purpose,version:'v1',algorithm:'HMAC-SHA-256',state:'active',notBefore:new Date(now()-3600000).toISOString(),notAfter:new Date(now()+3600000).toISOString(),retiredAt:null,revision:1});}
 h.driver={describe:async ref=>structuredClone(h.keyRows.get(ref.purpose)),mac:async ref=>({tenant:ref.tenant,purpose:ref.purpose,version:ref.version,revision:ref.revision,mac:createHmac('sha256',secrets.get(ref.purpose)).update(ref.message).digest('base64url')})};
 h.sign=async(patch,nonce)=>{const at=Math.floor(now()/1000);return new SignJWT({iss:config.issuer,sub:'student',aud:config.audience,iat:at,exp:at+300,auth_time:at,nonce,acr:'urn:test:strong',amr:['pwd','otp'],sid:'sid-student',...patch}).setProtectedHeader({alg:'ES256',kid:'test-key',typ:'JWT'}).sign(signing.privateKey);};
 h.exchange=async ref=>{h.exchanges++;assert.equal(sql.active,0);const p=pending.get(ref.code);assert.ok(p);assert.equal(pkceS256(ref.codeVerifier),p.start.code_challenge);await h.exchangeHook(ref,p);return h.sign(p.patch,p.start.nonce);};
 h.newFlow=(patch={})=>{const cfg=patch.identityConfig||config;return new PostgresIdentityFlow({transactions:new PostgresIdentityTransactions({pool:sql.pool,tenant:cfg.tenant,issuer:cfg.issuer,audience:cfg.audience}),identityConfig:cfg,keyDriver:h.driver,redirectUri:h.redirectUri,exchangeCode:h.exchange,clock:h.clock,...patch});};h.flow=h.newFlow();
 for(const row of h.keyRows.values())await h.flow.recordKeyMetadata(row,{...h.control,expectedRevision:0});
 h.person=(id='student',patch={})=>({id,issuer:config.issuer,subject:id,active:true,revision:1,...patch});
 h.membership=(personId='student',patch={})=>({personId,unit:'engineering',roles:['learner'],active:true,notBefore:new Date(now()-3600000).toISOString(),expires:new Date(now()+3600000).toISOString(),revision:1,...patch});
 h.putPerson=(value,expectedRevision,flow=h.flow)=>flow.putPerson(value,{...h.control,expectedRevision});h.putMembership=(value,expectedRevision,flow=h.flow)=>flow.putMembership(value,{...h.control,expectedRevision});
 for(const id of ['student','other']){await h.putPerson(h.person(id),0);await h.putMembership(h.membership(id),0);}
 h.begin=(flow=h.flow,browser=h.browser,permit)=>flow.begin({browserSessionHash:browser,permit});
 h.complete=(start,patch={},flow=h.flow,browser=h.browser,permit)=>{const code=randomBytes(16).toString('hex');pending.set(code,{start,patch});return flow.complete({state:start.state,code,browserSessionHash:browser,issuer:config.issuer,redirectUri:h.redirectUri,permit});};
 h.login=async(patch={},flow=h.flow,browser=h.browser)=>h.complete(await h.begin(flow,browser),patch,flow,browser);
 h.principal=(session,flow=h.flow)=>flow.principal({sessionHash:hash(session.sessionToken)});
 h.rows=table=>sql.db.query('SELECT * FROM '+table).then(r=>r.rows);
 h.logoutToken=(patch={})=>{const at=Math.floor(now()/1000);return new SignJWT({iss:config.issuer,aud:config.audience,iat:at,exp:at+90,jti:randomBytes(16).toString('hex'),events:{[logoutEvent]:{}},sub:'student',...patch}).setProtectedHeader({alg:'ES256',kid:'test-key',typ:'logout+jwt'}).sign(signing.privateKey);};
 h.revokeKey=async purpose=>{const old=h.keyRows.get(purpose),next={...old,state:'revoked',revision:old.revision+1};await h.flow.recordKeyMetadata(next,{...h.control,expectedRevision:old.revision});Object.assign(old,next);};
 return h;
}
