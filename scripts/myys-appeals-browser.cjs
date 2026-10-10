// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-appeals');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--appeals'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),1);record('Yalnız yeni karar belge hazırlığına uygun; belge oluşturulmadı');
  await role('student');await tab('İtiraz incelemeleri');await page.getByText('Yeniden değerlendirme kararı kaydedildi',{exact:true}).waitFor();
  await page.getByText('Bağımsız incelemede başarı kanıtları uygun bulundu.',{exact:true}).waitFor();await page.getByText('Yeni sentetik rubrik değerlendirmesi bağımsız akademik karar için uygun bulundu.',{exact:true}).waitFor();
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});record('Öğrenen eski karar, itiraz, inceleme, yeni puan ve yeni kararı birlikte görür');
  await page.setViewportSize({width:390,height:844});
  await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'mobile overflow');
  assert.equal(await page.locator('img').evaluateAll(images=>images.filter(i=>!i.complete||!i.naturalWidth).length),0);
  await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px mobil: taşma ve bozuk resim yok');
  const selected=page.getByRole('tab',{selected:true});await selected.press('End');assert.equal(await page.getByRole('tab',{name:/^LMS kaynak olayları/}).getAttribute('aria-selected'),'true');
  await page.getByRole('tab',{name:/^LMS kaynak olayları/}).press('Home');assert.equal(await page.getByRole('tab').first().getAttribute('aria-selected'),'true');record('Akademik sekmeler Home/End tuşları ve seçili durum');
  assert.deepEqual(errors,[]);record('Yakalanmış istemci istisnası yok');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill('SIGTERM');}
})();
