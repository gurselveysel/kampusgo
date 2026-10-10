// Required package identities are copied from B30 dependencies in backlog.json.
// These are local readiness checks, never institutional approvals.
export const cohortGateLabels={B05:'İçerik ve sağlayıcı hakları',B07:'Kişiye bağlı güvenli giriş',B12:'Belge profili ve yetkisi',B15:'LMS sözleşmesi',B24:'Erişilebilirlik',B25:'Ders ve ölçme içeriği',B26:'Destek işletimi',B27:'Geri yükleme ve olay planı',B28:'Veri talepleri ve saklama',B23:'Merkezi SEM yolu',B20:'Tanıma politikası',B21:'Tanıma inceleme akışı',B22:'OBS aktarım mutabakatı'};
export const cohortGateRoles={B05:['admin'],B07:['it'],B12:['studentAffairs'],B15:['it'],B24:['quality'],B25:['commission'],B26:['it'],B27:['it'],B28:['admin'],B23:['studentAffairs'],B20:['commission'],B21:['commission'],B22:['studentAffairs']};
export const cohortAxes={technical:{label:'Teknik inceleme',roles:['it']},academic:{label:'Akademik inceleme',roles:['commission']},operations:{label:'İşletim incelemesi',roles:['quality']}};
export function requiredCohortGates(pathway,recognition,obs){return ['B05','B07','B12','B15','B24','B25','B26','B27','B28',...(pathway==='sem-central'?['B23']:[]),...(recognition?['B20','B21']:[]),...(obs?['B22']:[])];}
