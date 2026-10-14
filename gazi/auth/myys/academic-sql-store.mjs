// Transient SQL transaction working set. No connection, seed, DDL or persistent fallback store.
// SQL runtime constructs this after identity/tenant checks; no client or production factory exposes it.
import {requireThat} from './store.mjs';
export const academicSqlKinds=Object.freeze(['program','publication','enrollment','evidence','assessment','decision','appeal','resolution','appeal-policy','appeal-policy-review','appeal-policy-hold','decision-receipt','evidence-moderation','registry','registry-review']);
const kinds=new Set(academicSqlKinds);
const local=()=>requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Akademik SQL denemesi yalnız izole yerel kabulde çalışır.',503);
const copy=v=>JSON.parse(JSON.stringify(v));
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const field=v=>typeof v==='string'&&v.length>0&&v.length<=160&&!/[\x00-\x1f]/.test(v);
const membershipQueries=new Set([
 'SELECT roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND p.active=1 AND m.expires>?',
 'SELECT m.roles FROM memberships m JOIN persons p ON p.id=m.person WHERE m.tenant=? AND m.person=? AND m.unit=? AND m.active=1 AND m.expires>? AND p.active=1'
]);
export class LocalSqlAcademicWorkingSet {
 #tenant;#rows;#memberships;#pending=[];#active=true;
 constructor({tenant,records,memberships}){
  local();requireThat(field(tenant)&&Array.isArray(records)&&Array.isArray(memberships),'academic_scope','Akademik işlem kapsamı kullanılamaz.',503);
  this.#tenant=tenant;this.#rows=records.map(r=>({kind:r.kind,data:copy(r.data)}));this.#memberships=copy(memberships);
 }
 static owns(value){return typeof value==='object'&&value!==null&&#active in value&&value.#active;}
 #guard(tenant){local();requireThat(this.#active&&tenant===this.#tenant,'academic_scope','Akademik işlem kapsamı kullanılamaz.',503);}
 get store(){this.#guard(this.#tenant);return this;}
 get pending(){this.#guard(this.#tenant);return copy(this.#pending);}
 get(t,kind,id){this.#guard(t);const r=this.#rows.find(r=>r.kind===kind&&r.data.id===id);return r?copy(r.data):undefined;}
 list(t,kind){this.#guard(t);return this.#rows.filter(r=>r.kind===kind).map(r=>copy(r.data));}
 put(t,kind,data){
  this.#guard(t);requireThat(kinds.has(kind)&&[data?.id,data?.unit,data?.owner,data?.createdBy].every(field)&&iso(data.createdAt)&&!this.#rows.some(r=>r.kind===kind&&r.data.id===data.id),'academic_record','Değişmez akademik kayıt geçersiz.',503);
  const r={kind,data:copy(data)};this.#rows.push(r);this.#pending.push(r);return copy(data);
 }
 get db(){this.#guard(this.#tenant);return {prepare:query=>{
  this.#guard(this.#tenant);requireThat(membershipQueries.has(query),'academic_query','Bu depo sorgusu akademik SQL diliminde desteklenmiyor.',503);
  return {get:(t,person,unit,now)=>{this.#guard(t);requireThat(iso(now),'academic_clock','Geçerli akademik zaman gerekli.',503);const r=this.#memberships.find(m=>m.person_id===person&&m.unit===unit&&m.active&&m.person_active&&m.not_before<=now&&m.expires>now);return r?{roles:JSON.stringify(r.roles)}:undefined;}};
 }};}
 close(){this.#active=false;this.#rows.length=0;this.#pending.length=0;this.#memberships.length=0;}
}
export const isLocalSqlAcademicStore=value=>LocalSqlAcademicWorkingSet.owns(value);
