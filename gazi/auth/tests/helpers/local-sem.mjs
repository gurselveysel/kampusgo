import {semChecklist} from '../../myys/sem-dossier-model.mjs';
import {semDigest} from '../../myys/sem-dossier.mjs';
export const semReason='Sentetik merkezî dosya kontrolü; gerçek YÖKSİS onayı veya kurum kararı değildir.';
export function semSetup(f){const baseline=f.program(),p=f.run('author','program',{...baseline,code:'SEM01',title:'Yerel SEM Programı',pathway:'sem-central'});f.run('publisher','publish',{programId:p.id,reason:semReason});return {p};}
export const semInput=(p,patch={})=>({programId:p.id,localOnly:true,reason:semReason,checklist:Object.keys(semChecklist).map(key=>({key,state:'documented',reference:'Sentetik iç kontrol belgesi '+key,note:semReason})),sources:{central:{title:'Sentetik merkezî yöntem örneği',reference:'Yerel kabul merkezi belge örneği',version:'test-1',date:'2026-01-01',readScope:semReason},institution:{title:'Sentetik kurum içi usul',reference:'Yerel kabul kurum usul örneği',version:'test-1',date:'2026-01-01',readScope:semReason}},...patch});
export const semReview=(f,d,patch={})=>f.run('judge','sem-review',{dossierId:d.id,basedOn:semDigest(d),outcome:'ready',reason:semReason,...patch});
export const semPacket=(f,d)=>f.run('issuer','sem-package',{dossierId:d.id,basedOn:semDigest(d)});
