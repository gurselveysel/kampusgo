import React,{useEffect,useState} from 'react';
import {Card,CardHead,Button,Field,Notice,Pill,Heading} from './ui.jsx';

const names={blocked:'Kullanımı durduruldu',signed:'İmzalı yerel kabul belgesi','awaiting-signature':'Hazırlık kaydı · İmza bekliyor'};
const shares={active:'Paylaşım açık',revoked:'Paylaşım iptal edildi',expired:'Süresi doldu',blocked:'Belge durumu nedeniyle kapalı'};
function saveFile(name,text,type='application/jwt'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function WalletWorkspace({data,busy,command,downloadCredential,downloadBundle,tenant}){
 const [link,setLink]=useState(''),[error,setError]=useState('');
 async function share(e,r){e.preventDefault();setLink('');setError('');const f=new FormData(e.currentTarget);const result=await command('share',{issuanceId:r.id,hours:Number(f.get('hours')),purpose:f.get('purpose')});if(result?.token)setLink(location.origin+'/#/shared/'+encodeURIComponent(tenant)+'/'+result.token);}
 async function download(r){setError('');try{const record=await downloadCredential(r.id);saveFile('MYYS_'+r.id+'.jwt',record.jwt);}catch(e){setError(e.message);}}
 async function bundle(r){setError('');try{saveFile('MYYS_dogrulama_'+r.id+'.json',JSON.stringify(await downloadBundle(r.id),null,2),'application/json');}catch(e){setError(e.message);}}
 return <Card><CardHead title="Kişisel belge cüzdanım" sub="Yalnız kişinize bağlı belgeler. Paylaşmadığınız kayıtlar özeldir."/><div className="academic-body form-stack">
 <a className="button secondary" href="#/academic/walletStudy">Cüzdan seçeneklerini incele</a>
 <Notice>İzole yerel kabul belgeleri kurum adına düzenlenmiş resmî belgeler değildir. Hazırlık kaydı imzalı belge yerine geçmez.</Notice>
 {error&&<p role="alert">{error}</p>}
 {link&&<div role="status" className="academic-record"><strong>Paylaşım bağlantısı hazır</strong><p>Bağlantıyı bilen kişi yalnız program adı ve güncel belge durumunu görebilir. Özel kanıtlar ve kimliğiniz gösterilmez. Bu bağlantı yerel kabul ortamında çalışır.</p><Field label="Paylaşım bağlantısı"><input aria-label="Paylaşım bağlantısı" readOnly value={link} onFocus={e=>e.target.select()}/></Field><a className="button" href={link} target="_blank" rel="noreferrer">Paylaşılan özeti aç</a><p>Bağlantı yeniden gösterilmez. Yenisi gerekirse eski paylaşımı iptal edip yeni bağlantı oluşturun.</p></div>}
 {(data.wallet||[]).map(r=><article key={r.id} className="academic-record"><strong>{r.title}</strong><Pill tone={r.state==='signed'?'green':'amber'}>{names[r.state]||'İnceleme gerekli'}</Pill><p>Program sürümü {r.programVersion} · Varsayılan özel</p>
 {r.canDownload&&((data.credentialReceipts||[]).some(x=>x.issuanceId===r.id)?<p>Yerel belge teslim teyidi kaydedildi. Dış kurum kabulü değildir.</p>:<form onSubmit={e=>{e.preventDefault();command('credential-receive',{issuanceId:r.id,confirm:true});}}><label><input required type="checkbox"/>İmzalı yerel belgeyi teslim aldım.</label><Button disabled={busy} type="submit">Yerel teslim teyidini kaydet</Button></form>)}
 {r.canDownload&&<Button disabled={busy} onClick={()=>download(r)}>İmzalı belgeyi indir</Button>}
 {r.hasSignedCredential&&<><Button disabled={busy||!r.canExportVerification} onClick={()=>bundle(r)}>Durumuyla doğrulama paketini indir</Button><p>{r.canExportVerification?'Paket imzalı belgeyi ve kısa süreli durum listelerini içerir. Bağımsız doğrulayıcı ayrıca güvenilir kaynaktan alınmış açık anahtar sicili ister; bu paket resmî tanınma veya sertifikasyon değildir.':'Doğrulama paketi için BT tarafından güncel durum listesi hazırlanmalı.'}</p></>}
 {r.canShare&&<form className="form-stack" onSubmit={e=>share(e,r)}><Field label="Paylaşım amacı"><input aria-label={'Paylaşım amacı '+r.id} name="purpose" required minLength={12} maxLength={500}/></Field><Field label="Paylaşım süresi"><select aria-label={'Paylaşım süresi '+r.id} name="hours"><option value="1">1 saat</option><option value="24">1 gün</option><option value="168">7 gün</option></select></Field><Button disabled={busy} type="submit">Süreli bağlantı oluştur</Button></form>}
 <ul>{r.shares.map(s=><li key={s.id}><strong>{shares[s.state]}</strong><p>{s.purpose} · Bitiş: {new Date(s.expires).toLocaleString('tr-TR')}</p>{['active','blocked'].includes(s.state)&&<Button disabled={busy} onClick={async()=>{setLink('');await command('unshare',{shareId:s.id});}}>Paylaşımı iptal et</Button>}</li>)}</ul>
 </article>)}
 {!data.wallet?.length&&<p>Bu kişiye bağlı belge veya belge hazırlığı bulunmuyor.</p>}
 </div></Card>;
}
export function SharedCredentialSummary(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 useEffect(()=>{const c=new AbortController(),parts=location.hash.split('/');let tenant,token;try{tenant=decodeURIComponent(parts[2]||'');token=parts[3]||'';}catch{setError('Paylaşım bağlantısı geçersiz.');return;}
  fetch('/api/myys/paylasim',{method:'POST',credentials:'omit',cache:'no-store',signal:c.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({tenant,token})}).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||'Paylaşım açılamadı.');setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>c.abort();
 },[]);
 return <main className="shared-summary"><Heading eyebrow="SÜRELİ PAYLAŞIM" title="Paylaşılan belge özeti" description="Kişisel kanıt ve kimlik bilgisi içermeyen sınırlı görünüm."/>{error?<Notice tone="amber"><span role="alert">{error}</span></Notice>:data?<Card><div className="academic-body"><Pill tone="amber">Yerel kabul · Resmî belge değil</Pill><h2>{data.title}</h2><p>{names[data.state]||'İnceleme gerekli'}</p><p>{data.issuer}</p><p>Bu özet, bağımsız kriptografik belge doğrulaması veya akademik tanıma kararı değildir.</p></div></Card>:<p role="status">Paylaşımın güncel durumu kontrol ediliyor…</p>}</main>;
}
