// Explicit local test policy arithmetic, never a statutory deadline calculator.
export const appealPolicyModes=Object.freeze({manual:'Bağımsız süre incelemesi',calendar:'Yerel takvim günü hesabı',business:'Yerel iş günü hesabı'});
const dayMs=86400000;
export function validDay(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00.000Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;}
// Fixed +03:00 is explicit local profile data, not an inferred university/legal time rule.
const localDay=iso=>new Date(Date.parse(iso)+3*3600000).toISOString().slice(0,10);
export function appealTiming(policy,receipt,now){
 const fallback={classification:'manual-review',deadline:null,official:false,receiptId:receipt?.id||null,reason:'Resmî tebliğ veya uygulanabilir kurum süre kabulü bulunmuyor.'};
 if(!policy||policy.mode==='manual'||!receipt||receipt.scope!=='local-acceptance')return fallback;
 if(!Number.isFinite(Date.parse(receipt.createdAt))||!Number.isFinite(Date.parse(now))||Date.parse(receipt.createdAt)>Date.parse(now))return fallback;
 let day=localDay(receipt.createdAt),remaining=policy.days;
 if(!Number.isInteger(remaining)||remaining<1||remaining>365)return fallback;
 const calendar=policy.calendar;
 if(policy.mode==='business'&&(!calendar||!validDay(calendar.from)||!validDay(calendar.to)||!Array.isArray(calendar.excludedDays)||day<calendar.from||day>calendar.to))return {...fallback,reason:'İş günü hesabının kapsayan yerel takvimi eksik.'};
 for(let attempts=0;remaining&&attempts<1100;attempts++){
  day=new Date(Date.parse(day+'T00:00:00.000Z')+dayMs).toISOString().slice(0,10);
  if(policy.mode==='calendar')remaining--;
  else if(policy.mode==='business'){
   if(day>calendar.to)return {...fallback,reason:'İş günü hesabı onaylanan yerel takvim kapsamını aşıyor.'};
   const weekday=new Date(day+'T00:00:00.000Z').getUTCDay();if(weekday!==0&&weekday!==6&&!calendar.excludedDays.includes(day))remaining--;
  }else return fallback;
 }
 if(remaining)return fallback;
 // This selected technical profile counts from the next local day, ending at 23:59:59.999 +03:00.
 const deadline=new Date(Date.parse(day+'T23:59:59.999+03:00')).toISOString();
 return {classification:Date.parse(now)<=Date.parse(deadline)?'within-local-window':'late-local-review',deadline,receiptId:receipt.id,official:false,reason:'Sentetik yerel süre hesabı; geç başvuru bağımsız incelemeye alınır, otomatik reddedilmez.'};
}
