// Tests the real built React portal and local HTTP core with disposable synthetic records.
// Uses ephemeral synthetic signing only; never contacts production or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-recovery');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--recovery'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
(async()=>{
 try{
  base=await start();const args=(process.env.MYYS_CHROMIUM_PACKAGE?require(process.env.MYYS_CHROMIUM_PACKAGE).args:[]).filter(a=>!a.includes('disable-web-security')&&!a.includes('disable-site-isolation')&&!a.includes('IsolateOrigins')&&!a.includes('allow-running-insecure-content'));
  browser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});page=await browser.newPage({viewport:{width:1440,height:1000},locale:'tr-TR'});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const open=async who=>{await role(who);await tab('Kurtarma tatbikatları');};
  const reason='Kesinti, yanlış ihraç ve anahtar riski için sentetik tarayıcı tatbikatı.';
  await open('it');await page.getByRole('heading',{name:'Kurtarma tatbikatı planla',exact:true}).waitFor();await page.getByText('Bu tatbikat ayrı bir geçici ortamda', {exact:false}).waitFor();record('Türkçe yerel kapsam ve plan formu');
  await page.getByLabel('Tatbikat gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Tatbikat planını kaydet',exact:true}).click());record('Hedef ve gerekçe kalıcı plana kaydedildi');
  await page.reload();await tab('Kurtarma tatbikatları');await page.getByRole('button',{name:'İzole tatbikatı çalıştır',exact:true}).waitFor();record('Yenileme sonrasında plan korunuyor');
  await page.getByRole('button',{name:'İzole tatbikatı çalıştır',exact:true}).click();await page.getByText('İzole tatbikat bitti; ayrı yönetici incelemesi bekleniyor.',{exact:true}).waitFor();await page.getByText('Yerel hedefler karşılandı',{exact:true}).waitFor();assert.equal(await page.locator('li').filter({hasText:/^Geçti:/}).count(),11);record('Gerçek sunucu tatbikatı 11 denetimi tamamladı');
  assert.equal(await page.getByRole('button',{name:'Tatbikat incelemesini kaydet',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'İzole tatbikatı çalıştır',exact:true}).count(),0);record('Hazırlayan kendi incelemesini yapamıyor ve başarı yeniden işletilmiyor');
  const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Tatbikat sonucunu indir',exact:true}).click()]);const downloaded=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(downloaded.official,false);assert.equal(downloaded.productionAuthorized,false);assert.equal(downloaded.result.report.lostRecords,0);assert.equal(downloaded.result.report.restoredSessions,0);assert.equal(downloaded.result.report.productionRpoRtoVerified,false);assert.ok(!JSON.stringify(downloaded).includes('sessionToken'));record('Sonuç dosyası ölçümleri içeriyor, ham depo ve oturum içermiyor');
  await page.getByLabel('Tatbikatlarda ara',{exact:true}).fill('eşleşmeyen');await page.getByText('Aramanızla eşleşen tatbikat bulunamadı.',{exact:true}).waitFor();await page.getByLabel('Tatbikatlarda ara',{exact:true}).fill('');record('Arama ve boş sonuç açıklaması');
  await open('admin');await page.getByLabel('Tatbikat inceleme sonucu',{exact:true}).selectOption('accepted');await page.getByLabel('Tatbikat inceleme gerekçesi',{exact:true}).fill('Sentetik sonuçlar ve hedefler ayrı yönetici tarafından incelendi.');await submitted(()=>page.getByRole('button',{name:'Tatbikat incelemesini kaydet',exact:true}).click());await page.getByText('Bağımsız yerel inceleme: Uygun bulundu',{exact:false}).waitFor();record('Ayrı yönetici tam sonuç özetini inceliyor');
  await open('student');await page.getByText('Bu yetki kapsamında tatbikat planı bulunmuyor.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Tatbikat sonucunu indir',exact:true}).count(),0);record('Öğrenen tatbikat kayıtlarını göremiyor');
  await open('it');await page.getByLabel('Yerel geri dönüş hedefi (saniye)',{exact:true}).fill('1');await page.getByLabel('Tatbikat gerekçesi',{exact:true}).fill('Sanal kuyruk süresinden kısa hedefin başarısızlık kontrolü.');await submitted(()=>page.getByRole('button',{name:'Tatbikat planını kaydet',exact:true}).click());await page.getByRole('button',{name:'İzole tatbikatı çalıştır',exact:true}).click();await page.getByText('Tatbikat hedefleri karşılanmadı; sonuçları inceleyin.',{exact:true}).waitFor();await page.getByText('Yerel hedefler karşılanmadı',{exact:true}).waitFor();record('Hedef aşımı geçer sonuç gibi sunulmuyor');
  await open('admin');assert.equal(await page.getByLabel('Tatbikat inceleme sonucu',{exact:true}).locator('option[value="accepted"]').count(),0);await page.getByLabel('Tatbikat inceleme gerekçesi',{exact:true}).fill('Kısa yerel hedef karşılanmadı; yeni hedefli plan gerekli.');await submitted(()=>page.getByRole('button',{name:'Tatbikat incelemesini kaydet',exact:true}).click());record('Başarısız sonuç yalnız düzeltme incelemesine açılıyor');
  await page.setViewportSize({width:390,height:844});await open('it');await page.getByLabel('Tatbikat birimi',{exact:true}).focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'Yerel veri kaybı hedefi (saniye)');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});await page.getByRole('heading',{name:'Kurtarma tatbikatı planla',exact:true}).locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," card ")][1]').screenshot({path:path.join(out,'mobile-plan.png'),animations:'disabled'});record('390 px genişlik ve klavye sırası');
  assert.deepEqual(errors,[]);record('Tarayıcı çalışma hatası yok');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({at:new Date().toISOString(),scope:'local-synthetic-only',checks,productionVerified:false},null,2));console.log('B27_BROWSER_CHECKS='+checks.length);
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});console.error('FAILED '+current,e);process.exitCode=1;}
 finally{await browser?.close();server.kill('SIGTERM');}
})();
