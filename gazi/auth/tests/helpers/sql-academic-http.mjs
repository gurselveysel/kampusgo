import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sqlIdentityHttpFixture} from './sql-identity-http.mjs';
export const sqlHttpOk=async promise=>{const r=await promise;assert.equal(r.status,200,r.text);return r.json();};
export async function sqlAcademicHttp(t,options={}){
 const h=await sqlIdentityHttpFixture({academic:true,...options});t.after(()=>h.close());h.accounts={};h.clock=h.f.clock;
 h.actor=async who=>{if(!h.accounts[who]){const login=await h.login(who);assert.equal(login.response.headers.location,'/#/academic');const v=await sqlHttpOk(h.request('/api/myys/calisma?kurum=gazi',{headers:{cookie:login.cookie}}));h.accounts[who]={cookie:login.cookie,csrf:v.identitySession.csrf};}return h.accounts[who];};
 h.post=async(who,path,body,extra={})=>{const a=await h.actor(who);return h.request('/api/myys/'+path,{method:'POST',headers:Object.fromEntries(Object.entries({cookie:a.cookie,origin:h.origin,'x-myys-csrf':a.csrf,...extra}).filter(([,v])=>v!==undefined)),body});};
 h.run=(who,action,input)=>sqlHttpOk(h.post(who,'islem',{tenant:'gazi',commandId:randomUUID(),action,input}));
 h.export=(who,programId,extra={})=>h.post(who,'program-paketi',{tenant:'gazi',programId},extra);
 return h;
}
