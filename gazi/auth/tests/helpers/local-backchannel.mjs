import {randomBytes,randomUUID} from 'node:crypto';
import {generateKeyPair,exportJWK,SignJWT} from 'jose';
import {LocalIdentityFlow} from '../../myys/identity-flow.mjs';
import {logoutEvent} from '../../myys/identity-contract.mjs';
import {hash} from '../../myys/store.mjs';
const pair=await generateKeyPair('ES256'),jwk={...await exportJWK(pair.publicKey),alg:'ES256',kid:'logout-test'};
export function backchannelHarness(f){
 let time=Date.parse('2026-10-14T08:30:00Z');const codes=new Map(),key=randomBytes(32),redirectUri='https://127.0.0.1:43118/callback';
 const h={now:()=>new Date(time),advance(ms){time+=ms;},hook:async()=>{},patch:{},lastToken:null};
 h.config={version:'backchannel-local-1',tenant:'test-gazi',issuer:'https://test-idp.invalid',audience:'logout-test',algorithms:['ES256'],jwks:{keys:[jwk]},mfaProfiles:[{acr:'urn:test:strong',amr:['pwd','otp']}],maxTokenAgeSeconds:300,maxAuthAgeSeconds:900,clockToleranceSeconds:0};
 h.make=(store=f.s,patch={})=>{const config={...h.config,...patch};return new LocalIdentityFlow({store,identityConfig:config,derivationKey:key,redirectUri,clock:h.now,exchangeCode:async({code})=>{const r=codes.get(code);if(!r)throw Error('Unknown synthetic code');codes.delete(code);await h.hook();const at=Math.floor(time/1000);h.lastToken=await new SignJWT({iss:config.issuer,aud:config.audience,sub:r.sub,sid:r.sid,iat:at,exp:at+300,auth_time:at,nonce:r.nonce,acr:'urn:test:strong',amr:['pwd','otp'],...h.patch}).setProtectedHeader({alg:'ES256',kid:jwk.kid,typ:'JWT'}).sign(pair.privateKey);return h.lastToken;}});};
 h.flow=h.make();h.begin=({flow=h.flow,sub='student',sid='provider-session-a',browser=hash(randomUUID()),issuer=h.config.issuer}={})=>{const r=flow.begin({browserSessionHash:browser}),code=randomUUID();codes.set(code,{...r,sub,sid});return {state:r.state,code,browserSessionHash:browser,issuer,redirectUri};};
 h.login=async(options={})=>(options.flow||h.flow).complete(h.begin(options));
 h.logout=async(patch={},header={})=>{const at=Math.floor(time/1000),payload={iss:h.config.issuer,aud:h.config.audience,iat:at,exp:at+120,jti:randomUUID(),events:{[logoutEvent]:{}},sub:'student',...patch};for(const key of Object.keys(payload))if(payload[key]===undefined)delete payload[key];return new SignJWT(payload).setProtectedHeader({alg:'ES256',kid:jwk.kid,typ:'logout+jwt',...header}).sign(pair.privateKey);};
 h.active=(result,tenant='test-gazi')=>{try{return f.s.principal(hash(result.sessionToken),tenant,h.now().toISOString()).id;}catch{return null;}};
 return h;
}
