import {privacyCategories,kindCategory,subjectFields,projectSubjectRecord,projectRecipientRecord,inventoryVersion} from './privacy-inventory-model.mjs';
import {supportState} from './support.mjs';
const member=(a,u)=>a.memberships.some(m=>m.unit===u);
const owned=(a,r)=>r?.owner===a.id&&member(a,r.unit);
function accountSummary(s,a,now){
 const sessions=s.db.prepare('SELECT b.expires,b.mfa FROM bindings b JOIN identity_scopes i ON i.session_hash=b.session_hash WHERE b.person=? AND i.tenant=?').all(a.id,a.tenant);
 return {memberships:s.db.prepare('SELECT unit,roles,expires FROM memberships WHERE tenant=? AND person=? AND active=1 AND expires>?').all(a.tenant,a.id,now).filter(r=>member(a,r.unit)).map(r=>({...r,roles:JSON.parse(r.roles)})),sessions:{active:sessions.filter(r=>r.expires>now).length,expired:sessions.filter(r=>r.expires<=now).length,unitScope:'institution-only'},fullAccountDeletionAvailable:false,physicalDestructionVerified:false};
}
function assemble(s,a,now,includeContent){
 // Read only the authenticated institution. Never infer a subject from a display name.
 const byKind=new Map();for(const row of s.db.prepare('SELECT kind,data FROM records WHERE tenant=? ORDER BY rowid').all(a.tenant)){const list=byKind.get(row.kind)||[];list.push(JSON.parse(row.data));byKind.set(row.kind,list);}
 const get=kind=>byKind.get(kind)||[],ownedRequest=new Map(get('recognition-request').filter(r=>owned(a,r)).map(r=>[r.id,r]));
 // OBS records are owned by the operator, not the learner; walk the immutable request.
 const obsEvents=get('obs-event').filter(r=>member(a,r.unit)&&ownedRequest.get(r.requestId)?.unit===r.unit&&r.payload?.personId===a.id),obsIds=new Set(obsEvents.map(r=>r.id));
 const stats=Object.fromEntries(Object.keys(privacyCategories).map(key=>[key,{key,...privacyCategories[key],recordCount:0,summaryCount:0,contributionCount:0,recipientCount:0,retentionApproved:false}]));
 const records=Object.fromEntries(Object.keys(subjectFields).map(k=>[k,[]])),recipientRecords={'portfolio-access':[],'portfolio-feedback':[]};
 let unknownOwnRecordCount=0,unknownContributionCount=0;
 for(const [kind,rows]of byKind){
  const category=kindCategory[kind],stat=stats[category];
  for(const r of rows){
   if(!member(a,r.unit))continue;
   const own=kind==='obs-event'?obsIds.has(r.id):['obs-receipt','obs-reconciliation'].includes(kind)?obsIds.has(r.eventId)&&obsEvents.some(e=>e.id===r.eventId&&e.unit===r.unit):r.owner===a.id;
   const contribution=r.createdBy===a.id&&!own;
   if(!stat){if(own)unknownOwnRecordCount++;if(contribution)unknownContributionCount++;continue;}
   if(contribution)stat.contributionCount++;
   if(own){
    stat.recordCount++;
    if(subjectFields[kind]){
     stat.summaryCount++;
     if(includeContent){const selected=projectSubjectRecord(kind,kind==='obs-event'?{...r,...Object.fromEntries(['operation','targetProgramCode','targetCourseCode','credits','remoteCredits','decisionId','previousEventId'].map(k=>[k,r.payload[k]]))}:r);
      if(kind==='support'){const current=supportState(s,a.tenant,r);selected.currentState=current.state;selected.currentCategory=current.category;}
      records[kind].push(selected);
     }
    }
   }
   // Retain only the recipient's own acknowledgement/message. No grant/learner/
   // evidence IDs or content are restored when consent has been withdrawn.
   if(Object.hasOwn(recipientRecords,kind)&&r.recipientPersonId===a.id&&r.createdBy===a.id&&!own){stat.recipientCount++;if(includeContent)recipientRecords[kind].push(projectRecipientRecord(r));}
  }
 }
 const account=accountSummary(s,a,now),inventory={version:inventoryVersion,categories:Object.values(stats),unknownOwnRecordCount,unknownContributionCount,allDataExported:false,retentionApproved:false,externalServicesIncluded:false};
 if(!includeContent)return {...inventory,account};
 const programIds=new Set(records.enrollment.map(r=>r.programId)),programs=get('program').filter(p=>member(a,p.unit)&&programIds.has(p.id)).map(p=>({id:p.id,code:p.code,title:p.title,version:p.version}));
 return {records,programs,recipientRecords,account,inventory};
}
export const subjectInventory=(s,a,now)=>assemble(s,a,now,false);
export const subjectSnapshot=(s,a,now)=>assemble(s,a,now,true);
