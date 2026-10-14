// Discovery catalog; these entries do not enable transports or claim conformance.
export const walletOptions=[
 {id:'private-wallet',title:'Mevcut özel cüzdan ve süreli paylaşım',state:'Yerel kabul dilimi var',scope:'Kişisel belge indirme, sınırlı süreli özet paylaşımı ve ayrı güven siciliyle yerel doğrulama.',limit:'Gerçek dış cüzdan kabulü ve son çevrimiçi durum garantisi yok.',sources:[]},
 {id:'open-protocol',title:'Açık protokollü dış cüzdan',state:'Bağlantı yok; keşif adayı',scope:'Belge ihraç ve sunum protokollerini gerçek cüzdanla karşılıklı sınama adayı.',limit:'Ürün, biçim/profil, kişi anahtarı bağı, güven ve durum kabulü seçilmedi.',sources:[{title:'OpenID4VCI 1.0 Final',date:'2025-09-16',reference:'https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0-final.html'},{title:'OpenID4VP 1.0 Final',date:'2025-07-09',reference:'https://openid.net/specs/openid-4-verifiable-presentations-1_0-final.html'}]},
 {id:'chain',title:'Zincir kaydı seçeneği',state:'Ertelendi; yazma kapalı',scope:'Somut ihtiyaç varsa zincirsiz seçeneklerle gerekçeli karşılaştırma.',limit:'Kişisel veri veya ilişkilendirilebilir belge özeti zincire gönderilmez. Ağ, işlem, NFT ve anahtar bağlantısı yok.',sources:[]}
];
export const walletExternalChecks=[
 {id:'issuance',title:'Gerçek cüzdana yetkili belge ihracı'},
 {id:'presentation',title:'Kişi bağı ve yeni istekle sunum/doğrulama'},
 {id:'revocation',title:'İptal/askı ve güncel durumun dış cüzdanda görülmesi'},
 {id:'replay',title:'Yanlış alıcı/nonce ve tekrarlanan sunumun reddi'},
 {id:'privacy',title:'Asgari veri, izin, saklama ve ilişkilendirme incelemesi'}
];
export const walletStudyRecommendations={defer:'Gelişmiş cüzdan ve zinciri ertele','study-offchain':'Yalnız zincirsiz seçenek için ayrı keşif öner'};
