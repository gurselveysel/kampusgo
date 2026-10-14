// Synthetic local targets, never a Gazi service level or statutory deadline.
export const localSupportPolicy={
 unit:'engineering',title:'Sentetik destek çalışma takvimi',scope:'local-acceptance',official:false,
 reason:'Yerel kabul için destek süreleri ve yönlendirme sınırları denenir.',authorityReference:'Sentetik yetki incelemesi; gerçek kurum görevlendirmesi değildir.',
 source:{title:'Sentetik destek kabul senaryosu',reference:'Yerel test dosyası; gerçek üniversite hizmet taahhüdü değildir.',version:'local-1',date:'2026-10-01',readScope:'Çalışma aralığı, ilk insan yanıtı, çözüm ve izinli yönlendirme kapsamı.',officialApproval:false},
 calendar:{from:'2026-10-01',to:'2026-11-30',timeZone:'UTC+03:00',weekdays:[1,2,3,4,5],windows:[[540,720],[780,1020]],excludedDays:['2026-10-19']},
 targets:{technical:{responseMinutes:60,resolutionMinutes:240,escalateTo:['academic']},academic:{responseMinutes:120,resolutionMinutes:480,escalateTo:['technical']},privacy:{responseMinutes:240,resolutionMinutes:960,escalateTo:[]}}
};
export function localSupportSetup(f,{now='2026-10-14T10:50:00.000Z',patch={},accepted=true}={}){
 f.core.clock=()=>now;const policy=f.run('admin','support-policy',{...structuredClone(localSupportPolicy),...patch});
 const review=accepted?f.run('reviewer','support-policy-review',{policyId:policy.id,outcome:'accepted',reason:'Sentetik destek kuralı bağımsız olarak incelendi; kurum taahhüdü değildir.'}):null;
 return {policy,review};
}
