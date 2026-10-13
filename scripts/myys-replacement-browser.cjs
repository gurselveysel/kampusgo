// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-replacement');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--replacement'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page,base,current='startup';const checks=[],errors=[];
const record=(name)=>{checks.push(name);console.log('PASS '+name);};
async function start(){
 let log='';return await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Local fixture did not start')),10000);
  server.once('exit',code=>{clearTimeout(timer);reject(Error('Fixture exited: '+code));});
  server.stdout.on('data',chunk=>{log+=chunk;const match=log.match(/MYYS_LOCAL_ACCEPTANCE=(http:\/\/127\.0\.0\.1:\d+)\/__acceptance/);if(match){clearTimeout(timer);resolve(match[1]);}});
  server.stderr.on('data',chunk=>process.stderr.write(chunk));
 });
}
async function role(actor){
 current='role '+actor;await page.goto(base+'/__acceptance');await page.getByLabel('Test senaryosu').selectOption(actor);await page.getByRole('button',{name:'Senaryoyu aç',exact:true}).click();
 await page.getByText('Kişi kaydı: '+actor,{exact:true}).waitFor();
}
const tab=async(name)=>{current='tab '+name;await page.getByRole('tab',{name:new RegExp('^'+name+' \\(')}).click();};
async function submitted(click){await click();await page.getByText('Sunucu kaydı oluşturuldu.',{exact:true}).waitFor();await page.getByText('Kurum kaydı kontrol ediliyor…',{exact:true}).waitFor({state:'hidden'});}
async function assessment(){
 await tab('Değerlendirmeler');const select=page.getByLabel('Öğrenen kaydı',{exact:true});await select.selectOption({index:1});
 await page.getByLabel('Yeniden değerlendirme bağlantısı',{exact:true}).selectOption({index:1});
 await page.getByRole('checkbox').check();await page.getByLabel('Ölçüt puanı R1',{exact:true}).fill('3');
 await page.getByLabel('Ölçüt gerekçesi R1',{exact:true}).fill('Sentetik kanıt bağımsız rubrik incelemesinde yeterli bulundu.');
 await page.getByLabel('Değerlendirme gerekçesi',{exact:true}).fill('İlk karardan bağımsız incelemede sentetik öğrenme kanıtı yeniden değerlendirildi.');
}
(async()=>{
 try{
  base=await start();const args=(process.env.MYYS_CHROMIUM_PACKAGE?require(process.env.MYYS_CHROMIUM_PACKAGE).args:[]).filter(arg=>!arg.includes('disable-web-security')&&!arg.includes('disable-site-isolation')&&!arg.includes('IsolateOrigins')&&!arg.includes('allow-running-insecure-content'));
  browser=await chromium.launch({headless:true,...(process.env.MYYS_CHROMIUM_EXECUTABLE?{executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE}:{}),args});
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',async r=>{if(r.status()>=400&&r.url().startsWith(base))console.error('HTTP',r.status(),new URL(r.url()).pathname,(await r.text().catch(()=>'' )).slice(0,250));});
  // All nine core roles, plus a separate learner and independent instructor, use server fixtures.
  for(const actor of ['author','publisher','student','teacher','judge','issuer','reviewer','admin','it','finance','other','independent']){
   await role(actor);await tab('Akademik kararlar');
   const count=await page.locator('.academic-record').count();
   assert.equal(count,['admin','it','finance','other'].includes(actor)?0:1,actor+' decision scope');
  }record('12 sentetik kişi / 9 çekirdek rol için kayıt kapsamı');
  await role('student');await tab('Akademik kararlar');await page.getByLabel('İtiraz gerekçesi',{exact:true}).fill('Bu sentetik örnekte kanıtın ikinci kez bağımsız incelenmesini talep ediyorum.');
  await submitted(()=>page.getByRole('button',{name:'İtiraz kaydet',exact:true}).click());await tab('İtiraz incelemeleri');
  assert.equal(await page.getByRole('button',{name:'İnceleme sonucunu kaydet'}).count(),0);
  await page.reload();await page.getByText('Kişi kaydı: student',{exact:true}).waitFor();await tab('İtiraz incelemeleri');await page.getByText('İnceleme bekliyor',{exact:true}).waitFor();record('Öğrenen itirazı yeniden yüklemede korunur; sonuç formu yok');
  await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle'}).count(),0);record('Açık itiraz belge hazırlığını kapatır');
  for(const actor of ['author','teacher','judge','student','it','finance','other']){await role(actor);await tab('İtiraz incelemeleri');assert.equal(await page.getByRole('button',{name:'İnceleme sonucunu kaydet'}).count(),0);}record('Bağımsız olmayan veya kapsam dışı roller inceleme yapamaz');
  await role('reviewer');await tab('İtiraz incelemeleri');
  await page.getByLabel('İnceleme sonucu',{exact:true}).selectOption('reassessment');
  await page.getByLabel('İnceleme sonucu',{exact:true}).press('Tab');assert.equal(await page.getByLabel('Bağımsız inceleme gerekçesi',{exact:true}).evaluate(el=>document.activeElement===el),true);
  await page.getByLabel('Bağımsız inceleme gerekçesi',{exact:true}).fill('Sentetik örnekte bağımsız eğitici tarafından yeniden değerlendirme yapılmalıdır.');
  await submitted(()=>page.getByRole('button',{name:'İnceleme sonucunu kaydet',exact:true}).click());
  await page.getByText('Yeniden değerlendirme gerekli',{exact:true}).waitFor();record('Bağımsız inceleme, ilişkili etiketler ve klavye sırası');
  await role('teacher');await assessment();await page.getByRole('button',{name:'Değerlendirmeyi kaydet',exact:true}).click();
  await page.getByRole('alert').getByText('Yeniden değerlendirmeyi önceki işlemlerden bağımsız bir eğitici yapmalı.').waitFor();record('İlk değerlendiricinin yeniden değerlendirme isteği sunucuda reddedilir');
  await role('independent');await assessment();await submitted(()=>page.getByRole('button',{name:'Değerlendirmeyi kaydet',exact:true}).click());
  await tab('İtiraz incelemeleri');await page.getByText('Yeniden değerlendirildi · Karar bekleniyor',{exact:true}).waitFor();record('Bağımsız yeniden değerlendirme aynı itiraz kaydına bağlanır');
  await role('judge');await tab('Değerlendirmeler');assert.equal(await page.getByRole('button',{name:'Gerekçeli kararı kaydet',exact:true}).count(),1);
  await page.getByLabel('Akademik karar gerekçesi',{exact:true}).fill('Yeni sentetik rubrik değerlendirmesi bağımsız akademik karar için uygun bulundu.');
  await submitted(()=>page.getByRole('button',{name:'Gerekçeli kararı kaydet',exact:true}).click());assert.equal(await page.getByRole('button',{name:'Gerekçeli kararı kaydet',exact:true}).count(),0);record('Yalnız karar bekleyen değerlendirme için karar formu');
  const reason='Sentetik yeni karar nedeniyle belge değiştirme; gerçek kurum belgesi değildir.';
  await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),0);await tab('Belge hazırlığı');await page.getByLabel('Değişiklik yapılacak belge',{exact:true}).selectOption({index:1});await page.getByLabel('Belge değişikliği gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Belge değişikliği yetki dayanağı',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Değişiklik önerisini kaydet',exact:true}).click());await page.getByText('Bağımsız inceleme bekleniyor',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'İncelenen yeni belgeyi hazırla',exact:true}).count(),0);record('Mevcut imzalı belge için doğrudan ikinci belge yerine incelemeli değiştirme önerildi');
  await role('judge');await tab('Belge hazırlığı');assert.equal(await page.getByRole('button',{name:'Değişiklik incelemesini kaydet',exact:true}).count(),0);await role('publisher');await tab('Belge hazırlığı');await page.getByLabel('Belge değişikliği inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Değişiklik incelemesini kaydet',exact:true}).click());await page.getByText('Bağımsız inceleme uygun',{exact:true}).waitFor();record('Akademik karar sahibi değiştirmeyi inceleyemedi; ayrı komisyon inceledi');
  await role('issuer');await tab('Belge hazırlığı');await submitted(()=>page.getByRole('button',{name:'İncelenen yeni belgeyi hazırla',exact:true}).click());await page.getByText('Yeni belge imzası bekleniyor',{exact:true}).waitFor();assert.equal(await page.getByText('İncelenen işlem tamamlandı',{exact:true}).count(),0);record('Yeni hazırlık imza bekliyor; eski belge iptali tamamlandı gibi sunulmadı');
  await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).click();await page.getByText('Yerel belge imzalandı; resmî kurum belgesi değildir.',{exact:true}).waitFor();await page.getByText('Kurum kaydı kontrol ediliyor…',{exact:true}).waitFor({state:'hidden'});await page.getByText('İncelenen işlem tamamlandı',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).count(),0);record('Yeni imza ve eski belge iptali aynı kayıt zincirinde tamamlandı');
  await role('student');await tab('Belge hazırlığı');await page.getByText('İncelenen işlem tamamlandı',{exact:true}).waitFor();await page.getByText('Önceki dosya korunuyor.',{exact:false}).waitFor();assert.equal(await page.getByRole('button',{name:'Değişiklik incelemesini kaydet',exact:true}).count(),0);await page.reload();await tab('Belge hazırlığı');await page.getByText('İncelenen işlem tamamlandı',{exact:true}).waitFor();record('Öğrenen yenilemede önceki belge, yeni karar, inceleme ve yeni imzayı birlikte gördü');
  await tab('Kişisel cüzdanım');assert.equal(await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).count(),1);await page.getByText('Kullanımı durduruldu',{exact:true}).waitFor();await page.getByText('İmzalı yerel kabul belgesi',{exact:true}).waitFor();record('Cüzdanda eski belge kapalı ve yeni belge indirilebilir');
  await tab('Belge hazırlığı');await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px önceki/yeni belge ve inceleme geçmişi taşmadan göründü');
  await role('other');await tab('Belge hazırlığı');await page.getByText('Bu kapsamda belge değişikliği veya iptal önerisi yok.',{exact:true}).waitFor();assert.equal(await page.getByText('İncelenen işlem tamamlandı',{exact:true}).count(),0);record('Başka öğrenen değişiklik geçmişine erişemedi');
  assert.deepEqual(errors,[]);record('Yakalanmış istemci istisnası yok');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill('SIGTERM');}
})();
