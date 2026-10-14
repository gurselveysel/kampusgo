import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {ROLES} from '../myys/core.mjs';
import {curricula,lessonsFor} from '../../portal/src/learning-data.mjs';
import {knowledge} from '../../portal/src/knowledge-data.mjs';
import {workbenchPages,roleCodes,rolePages} from '../../portal/src/workspace-data.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
const baseline=JSON.parse(readFileSync(new URL('../myys/gazi-baseline-27.json',import.meta.url)));
const inventory=JSON.parse(readFileSync(new URL('../myys/pilot-inventory.json',import.meta.url)));
test('Original 27-row Gazi baseline and evidence classes remain byte-equivalent as JSON values',()=>{
 assert.equal(baseline.rows.length,27);assert.equal(createHash('sha256').update(JSON.stringify(baseline.rows)).digest('hex'),'a6af9f1988b77ab7a00ad3e30123238af76c56b14cef6ac8c49ab3141cf70363');
 const ids=new Set(baseline.sources.map(s=>s.id));for(const r of baseline.rows){assert.equal(r.origin,'Gazi');for(const id of r.source_ids)assert.ok(ids.has(id));assert.ok(r.acceptance_criteria&&r.evidence_class&&r.limits_and_open_questions);}
});
test('Every original row has separate current behavior, routes, existing regression evidence and explicit open acceptance',()=>{
 assert.deepEqual(inventory.rows.map(r=>r.inventory_id),baseline.rows.map(r=>r.inventory_id));const routes=new Set([...Object.values(rolePages).flat(),'guide','shared']);
 for(const [i,r] of inventory.rows.entries()){assert.deepEqual(r.baseline_source_ids,baseline.rows[i].source_ids);assert.ok(r.current_behavior&&r.remaining);assert.equal(r.row_acceptance,'partial; original criterion not declared complete');for(const route of r.routes)assert.ok(routes.has(route),route);for(const path of r.tests)assert.ok(existsSync(resolve(root,path)),path);}
});
test('Preserved content and role counts are independently derived from current code',()=>{
 assert.equal(Object.keys(curricula).length,6);assert.equal(Object.values(curricula).flat().length,22);assert.equal(Object.keys(curricula).flatMap(lessonsFor).length,66);
 for(const id of Object.keys(curricula))for(const l of lessonsFor(id)){const html=readFileSync(resolve(root,'gazi/content/'+l.id+'-Sunum.html'),'utf8');assert.ok(html.includes('lang="tr"'));assert.equal((html.match(/<section>/g)||[]).length,7);}
 assert.equal(knowledge.sources.length,24);assert.equal(knowledge.programs.length,6);assert.equal(knowledge.programs.reduce((n,p)=>n+p.outcomes.length,0),76);assert.equal(knowledge.levels.length,20);assert.equal(knowledge.criteria.length,46);assert.equal(Object.keys(workbenchPages).length,33);
 assert.deepEqual(ROLES,['learner','instructor','coordinator','commission','studentAffairs','quality','it','finance','admin']);assert.equal(Object.keys(roleCodes).length,11);assert.equal(Object.keys(rolePages).length,11);
});
