import {materialCatalog,materialReference} from '../../myys/material-catalog.mjs';
import {registryFields} from '../../myys/registry.mjs';
export const materialReason='Sentetik ders ve materyal kabulü; gerçek hak sahibi veya akademik kurul onayı değildir.';
export function localMaterialSetup(f,{initial,prepared=true,approved=true,republishing=false}={}){
 const x=initial||f.setup(),catalog=materialCatalog()[0];
 const fields=Object.fromEntries(registryFields['content-rights'].map(k=>[k,materialReason]));fields.sourceReference=materialReference(catalog);
 const registry=f.run('admin','registry-draft',{type:'content-rights',unit:x.p.unit,title:'Sentetik özgün materyal hak sicili',fields});f.run('authority','registry-review',{recordId:registry.id,outcome:'accepted',reason:materialReason});
 const input={programId:x.p.id,catalogId:catalog.id,catalogDigest:catalog.sha256,registryId:registry.id,reason:materialReason,scope:'local-acceptance',official:false,validUntil:'2090-01-01T00:00:00.000Z',lessons:catalog.lessons.map(l=>({lessonId:l.id,taskIds:x.p.tasks.map(t=>t.id),reason:materialReason}))};
 const rights={userGroup:'enrolled-and-authorized-staff',copying:true,republishing,brand:false,api:false,externalCopy:false,readConfirmed:true,sourceReference:materialReason,readScope:materialReason,exit:materialReason,postSubscription:materialReason,reason:materialReason};
 const checks=catalog.lessons.map(l=>({lessonId:l.id,source:true,language:true,accessibility:true,academic:true,reason:materialReason}));
 if(!prepared)return {...x,catalog,registry,input,rights,checks};
 const plan=f.run('author','material-plan',input);const grant=f.run('admin','material-rights',{planId:plan.id,...rights});if(approved)f.run('reviewer','material-review',{planId:plan.id,checks,outcome:'accepted',reason:materialReason});return {...x,catalog,registry,input,rights,checks,plan,grant};
}
