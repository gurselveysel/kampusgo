// Shared labels only; no provider, secrets, or production payment capability.
export const paymentEvents={pending:'Ödeme bekliyor',captured:'Ödeme başarılı',failed:'Ödeme başarısız',refund_pending:'İade bekliyor',refund_succeeded:'İade başarılı',refund_failed:'İade başarısız',refund_reversed:'İade geri döndü',dispute_open:'Ters ibraz incelemesi açıldı',dispute_won:'Ters ibraz kurum lehine sonuçlandı',dispute_lost:'Ters ibraz kaybedildi',dispute_reversed:'Ters ibraz geri döndü'};
export const paymentStates={created:'Belirteç hazır · Sonuç yok',pending:'Sonuç bekleniyor',captured:'Sentetik ödeme başarılı',failed:'Sentetik ödeme başarısız'};
export const paymentMoney=minor=>(minor/100).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' TL';
