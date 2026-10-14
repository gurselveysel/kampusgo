import {outcomeIds} from './program-model.mjs';
// Projections consume only the caller's already-authorized record set.
// No synthetic totals, inferred attendance or automatic credit equivalence.
export function qualityMetrics(view){
 const ratio=(numerator,denominator,unit)=>({numerator,denominator,percent:denominator?Math.round(numerator/denominator*10000)/100:null,unit});
 return {scope:'local-acceptance',sample:true,source:'Yetkili görünümdeki kalıcı kayıtlar',
  programVersions:view.programs.length,enrollments:view.enrollments.length,
  assessedEnrollments:ratio(new Set(view.assessments.map(r=>r.enrollmentId)).size,view.enrollments.length,'öğrenen program kaydı'),
  assessmentSuccess:ratio(view.assessments.filter(r=>r.passed).length,view.assessments.length,'değerlendirme kaydı'),
  decisions:view.decisions.length,issuanceAuthorizations:view.issuances.length,
  blockedIssuanceAuthorizations:view.issuances.filter(r=>r.blocked).length,
  supportRequests:view.support.length,
  attendance:null,courseCompletion:null,officialCredits:null,employmentEffect:null};
}
export function skillsProjection(view){
 return view.enrollments.flatMap(enrollment=>{
  const program=view.programs.find(p=>p.id===enrollment.programId);if(!program)return [];
  const evidence=view.evidence.filter(e=>e.enrollmentId===enrollment.id);
  const decisions=view.decisions.filter(d=>d.enrollmentId===enrollment.id&&d.outcome==='approved'&&d.usable===true);
  return program.outcomes.map(outcome=>{
   const tasks=program.tasks.filter(t=>outcomeIds(t).includes(outcome.id)),related=evidence.filter(e=>tasks.some(t=>t.id===e.taskId));
   const assessed=decisions.some(d=>view.assessments.some(a=>a.id===d.assessmentId&&a.passed&&a.scores.some(s=>program.rubric.some(r=>r.id===s.criterionId&&outcomeIds(r).includes(outcome.id))&&s.score*25>=program.threshold)));
   return {id:enrollment.id+':'+outcome.id,owner:enrollment.owner,programId:program.id,programVersion:program.version,outcomeId:outcome.id,label:outcome.text,
    state:assessed?'assessed':related.length?'developing':'target',
    pilot:true,expertTaxonomyApproved:false,
    taxonomyLinks:(view.skillMaps?.plans||[]).filter(m=>m.programId===program.id&&m.current).flatMap(m=>m.links.filter(l=>l.outcomeId===outcome.id).map(l=>({mapId:m.id,mapVersion:m.version,linkId:l.id,conceptId:l.conceptId,label:l.label,usable:l.usable,sourceVersion:m.source.version,state:l.usable?(assessed?'evidenced':related.length?'developing':'target'):'review-required',official:false}))),
    source:'Kurum programındaki öğrenme çıktısı; meslek veya dış taksonomi eşdeğerliği değildir.'};
  });
 });
}
