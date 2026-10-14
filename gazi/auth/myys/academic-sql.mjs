// Isolated SQL academic unit of work. No connection, DDL, seed, production route or second persistent store.
import {LocalSqlAcademicWorkingSet,academicSqlKinds} from './academic-sql-store.mjs';
import {appealPolicyView} from './appeal-policy.mjs';
import {MyysCore,ROLES} from './core.mjs';
import {PostgresIdentityFlow} from './identity-sql-flow.mjs';
import {requireThat,hash} from './store.mjs';
export const academicSqlActions=Object.freeze(['program','publish','enroll','evidence','assess','decide','appeal','resolve','appeal-policy','appeal-policy-review','appeal-policy-hold','decision-receive']);
const kinds=new Set(academicSqlKinds);
const local=()=>requireThat(!process.env.VERCEL&&!process.env.VERCEL_ENV,'local_only','Akademik SQL denemesi yalnız izole yerel kabulde çalışır.',503);
const copy=v=>JSON.parse(JSON.stringify(v));
const iso=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
const field=(v,max=160)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\x00-\x1f]/.test(v);
const maxRows=10000,maxBytes=16*1024*1024;
export class LocalPostgresAcademicCore {
 #identity;#clock;
 constructor({identity,clock=()=>new Date()}){local();requireThat(identity instanceof PostgresIdentityFlow&&typeof clock==='function','academic_config','Aynı SQL kimlik akışı gerekli.',503);this.#identity=identity;this.#clock=clock;}
 #now(){local();const v=this.#clock();requireThat(v instanceof Date&&Number.isFinite(v.getTime()),'academic_clock','Geçerli akademik zaman gerekli.',503);return v.toISOString();}
 async #snapshot(tx,actor){
  // One tenant-wide lane across identity issuers; all participating academic writers must use it.
  await tx.query("SELECT pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('myys-academic/1:' || $1,0))",[actor.tenant]);
  const size=(await tx.query('SELECT count(*) AS rows,coalesce(sum(octet_length(data::text)),0) AS bytes FROM public.myys_academic_records WHERE tenant=$1',[actor.tenant])).rows[0];
  requireThat(Number.isSafeInteger(Number(size?.rows))&&Number.isSafeInteger(Number(size?.bytes))&&Number(size.rows)<=maxRows&&Number(size.bytes)<=maxBytes,'academic_capacity','Bu yerel akademik veri dilimi işlem sınırını aşıyor.',503);
  const records=(await tx.query('SELECT kind,id,unit,owner,data FROM public.myys_academic_records WHERE tenant=$1 ORDER BY position LIMIT 10001',[actor.tenant])).rows;
  const memberships=(await tx.query('SELECT m.person_id,m.unit,m.roles,m.active,m.not_before,m.expires,p.active AS person_active FROM public.myys_identity_memberships m JOIN public.myys_identity_persons p ON p.id=m.person_id WHERE m.tenant=$1 ORDER BY m.person_id,m.unit LIMIT 10001',[actor.tenant])).rows;
  requireThat(records.length<=maxRows&&memberships.length<=maxRows&&Buffer.byteLength(JSON.stringify({records,memberships}))<=maxBytes,'academic_capacity','Bu yerel akademik veri dilimi işlem sınırını aşıyor.',503);
  for(const r of records)requireThat(kinds.has(r.kind)&&r.data&&typeof r.data==='object'&&!Array.isArray(r.data)&&r.id===r.data.id&&r.unit===r.data.unit&&r.owner===r.data.owner&&field(r.id)&&field(r.unit)&&field(r.owner)&&field(r.data.createdBy)&&iso(r.data.createdAt),'academic_record','Akademik kayıt bütünlüğü doğrulanamadı.',503);
  for(const m of memberships)requireThat(field(m.person_id)&&field(m.unit)&&Array.isArray(m.roles)&&m.roles.length>0&&m.roles.every(r=>ROLES.includes(r))&&new Set(m.roles).size===m.roles.length&&typeof m.active==='boolean'&&typeof m.person_active==='boolean'&&iso(m.not_before)&&iso(m.expires)&&m.not_before<m.expires,'academic_directory','Kişi ve üyelik kaynağı doğrulanamadı.',503);
  return new LocalSqlAcademicWorkingSet({tenant:actor.tenant,records,memberships});
 }
 async run({sessionHash,tenant,commandId,action,input={},permit}){
  local();requireThat(field(tenant,80)&&typeof commandId==='string'&&commandId.length>=8&&commandId.length<=100&&!/[\x00-\x1f]/.test(commandId),'command','Kurum ve tekil işlem kimliği gerekli.');
  requireThat(academicSqlActions.includes(action),'academic_action','Bu işlem akademik SQL denemesinde henüz açık değil.',409);
  requireThat(input&&typeof input==='object'&&!Array.isArray(input)&&JSON.stringify(input).length<=60000,'payload','İstek boyutu veya biçimi geçersiz.');const value=copy(input),digest=hash(JSON.stringify({action,input:value}));
  return this.#identity.withPrincipal({sessionHash,permit,purpose:'academic-write'},async(tx,actor)=>{
   requireThat(actor.tenant===tenant,'not_found','Bu kurum kaydına erişilemiyor.',404);const set=await this.#snapshot(tx,actor);try{
    const now=this.#now(),core=new MyysCore(set.store,{clock:()=>now}),old=(await tx.query('SELECT action,digest,result FROM public.myys_academic_commands WHERE tenant=$1 AND person_id=$2 AND id=$3',[tenant,actor.id,commandId])).rows[0];
    if(old){requireThat(old.action===action&&old.digest===digest,'idempotency_conflict','Aynı işlem kimliği farklı içerikle kullanılamaz.',409);core.authorizeReplay(actor,action,old.result);return copy(old.result);}
    // Use the existing synchronous policy evaluator, never an independent second set of academic rules.
    const result=core.execute(actor,action,value,now);requireThat(set.pending.length===1||action==='decision-receive'&&set.pending.length===0&&set.store.get(tenant,'decision-receipt',result.id)?.decisionId===value.decisionId,'academic_record','Bu akademik işlem tam bir değişmez kayıt üretmeli.',503);
    // Semantic append order derives from immutable tenant rows, never an independently mutable sequence.
    for(const r of set.pending)await tx.query('INSERT INTO public.myys_academic_records (position,tenant,kind,id,unit,owner,data) SELECT coalesce(max(position),0)+1,$1,$2,$3,$4,$5,$6::jsonb FROM public.myys_academic_records WHERE tenant=$1',[tenant,r.kind,r.data.id,r.data.unit,r.data.owner,JSON.stringify(r.data)]);
    await tx.query('INSERT INTO public.myys_academic_commands (tenant,person_id,id,action,digest,result) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',[tenant,actor.id,commandId,action,digest,JSON.stringify(result)]);
    await tx.query('INSERT INTO public.myys_academic_audit (tenant,actor,action,record_id,recorded_at) VALUES ($1,$2,$3,$4,$5)',[tenant,actor.id,action,result.id,now]);
    requireThat(this.#now()>=now,'academic_clock','Akademik işlem zamanı geri döndü.',503);return copy(result);
   }finally{set.close();}
  });
 }
 async view({sessionHash,tenant,permit}){
  local();requireThat(field(tenant,80),'command','Kurum kapsamı gerekli.');return this.#identity.withPrincipal({sessionHash,permit,purpose:'academic-read'},async(tx,actor)=>{
   requireThat(actor.tenant===tenant,'not_found','Bu kurum kaydına erişilemiyor.',404);const set=await this.#snapshot(tx,actor);try{const now=this.#now(),core=new MyysCore(set.store,{clock:()=>now}),view=core.academicView(actor);return {...view,mode:'isolated-sql-acceptance',official:false,personId:actor.id,sessionExpires:actor.expires,memberships:copy(actor.memberships),supportedActions:[...academicSqlActions],appealPolicies:appealPolicyView(set.store,actor),decisions:view.decisions.map(d=>({...d,canIssue:false})),supportedTabs:[...(actor.memberships.some(m=>m.roles.some(r=>['admin','commission','quality'].includes(r)))?['appealPolicies']:[]),'programs','enrollments','evidence','assessments','decisions','appeals'],scope:'same-sql-identity-academic-transaction'};}finally{set.close();}
  });
 }
}
