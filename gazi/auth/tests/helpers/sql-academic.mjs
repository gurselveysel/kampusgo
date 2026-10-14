import {randomUUID} from 'node:crypto';
import {sqlIdentityFlow} from './sql-identity-flow.mjs';
import {LocalPostgresAcademicCore} from '../../myys/academic-sql.mjs';
import {hash} from '../../myys/store.mjs';
export const sqlAcademicReason='Sentetik akademik SQL kabul gerekçesi; gerçek kurum kararı değildir.';
export const sqlProgram=()=>({code:'SQL01',title:'Yerel SQL Veri Okuryazarlığı',unit:'engineering',mode:'pilot',pathway:'micro',responsibilities:{programOwner:'Sentetik birim',decisionAuthority:'Sentetik komisyon',legalIssuer:'Sentetik düzenleyici',technicalSigner:'Yerel kabul'},outcomes:[{id:'O1',text:'Veri kalitesini gerekçeleriyle analiz eder.'}],tasks:[{id:'T1',title:'Veri analizi görevi',outcomeIds:['O1']}],rubric:[{id:'R1',outcomeIds:['O1'],taskIds:['T1'],weight:100}],threshold:70,hours:25,ects:1,level:'6',participation:'Karma',quality:'Sentetik akran incelemesi.',instructor:'Sentetik eğitici',license:'Sentetik test içeriği.',assessmentMethod:'Rubrik ile insan değerlendirmesi.'});
export async function sqlAcademic(t,{checkpointDirectory=null,keyLifetimeMs=3600000}={}){
 const f=await sqlIdentityFlow(t,{academic:true,checkpointDirectory,keyLifetimeMs});
 for(const [person,roles]of Object.entries({admin:['admin'],registrar:['admin'],author:['coordinator'],publisher:['commission'],teacher:['instructor'],judge:['commission'],reviewer:['quality'],moderator:['quality'],independent:['instructor'],it:['it']})){await f.putPerson(f.person(person),0);await f.putMembership(f.membership(person,{roles}),0);}
 f.academic=new LocalPostgresAcademicCore({identity:f.flow,clock:f.clock});f.sessions={};
 f.actor=async who=>f.sessions[who]||=(await f.login({sub:who,sid:'sid-'+who},f.flow,hash('sql-academic-browser-'+who)));
 f.context=async who=>({sessionHash:hash((await f.actor(who)).sessionToken),tenant:f.config.tenant});
 f.run=async(who,action,input,commandId=randomUUID())=>f.academic.run({...await f.context(who),action,input,commandId});
 f.view=async who=>f.academic.view(await f.context(who));
 f.setup=async()=>{const p=await f.run('author','program',sqlProgram());await f.run('publisher','publish',{programId:p.id,reason:sqlAcademicReason});const e=await f.run('author','enroll',{programId:p.id,learnerId:'student'});return {p,e};};
 f.assess=async(x,who='teacher',extra={})=>{const ev=await f.run('student','evidence',{enrollmentId:x.e.id,taskId:'T1',content:'Sentetik SQL kaynağında eksik değerler işaretlendi ve yorumlandı.'}),a=await f.run(who,'assess',{enrollmentId:x.e.id,evidenceIds:[ev.id],scores:[{criterionId:'R1',score:4,reason:sqlAcademicReason}],reason:sqlAcademicReason,...extra});return {...x,ev,a};};
 f.passed=async()=>{const x=await f.assess(await f.setup()),d=await f.run('judge','decide',{assessmentId:x.a.id,outcome:'approved',reason:sqlAcademicReason});return {...x,d};};
 return f;
}
