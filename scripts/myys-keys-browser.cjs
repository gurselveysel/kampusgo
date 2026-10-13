// Tests the real built React portal and local HTTP core with disposable synthetic records.
// Uses only generated in-memory synthetic keys; never contacts production or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-keys');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--keys'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
 let publicContext;
 try{
  base=await start();const args=(process.env.MYYS_CHROMIUM_PACKAGE?require(process.env.MYYS_CHROMIUM_PACKAGE).args:[]).filter(arg=>!arg.includes('disable-web-security')&&!arg.includes('disable-site-isolation')&&!arg.includes('IsolateOrigins')&&!arg.includes('allow-running-insecure-content'));
  browser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});page=await browser.newPage({viewport:{width:1440,height:1000},locale:'tr-TR'});page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  const open=async(actor)=>{await role(actor);await tab('Anahtar ve belge durumu');};
  const reason='Sentetik anahtar olayı ve incelemesi; gerçek kurum yetkisi değildir.';
  const response=await page.request.get(base+'/__acceptance/public-key'),jwk=await response.json();
  await role('issuer');await tab('Belge hazırlığı');assert.equal(await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).count(),0);record('Kayıtlı anahtar yokken belge imzası düğmesi kapalı');
  await open('it');await page.getByLabel('Açık anahtar (JWK)',{exact:true}).fill(JSON.stringify(jwk));await page.getByLabel('Anahtar sorumluluğu dayanağı',{exact:true}).fill(reason);await page.getByLabel('Anahtar hazırlama gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Açık anahtarı kaydet',exact:true}).click());await page.getByText('İnceleme bekliyor',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Anahtar incelemesini kaydet',exact:true}).count(),0);record('BT açık anahtarı kaydetti; kendi anahtarını inceleyemedi');
  await role('issuer');await tab('Belge hazırlığı');assert.equal(await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).count(),0);record('İncelenmemiş anahtar imza yetkisi vermedi');
  await open('admin');await page.getByLabel('Anahtar inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Anahtar incelemesini kaydet',exact:true}).click());await page.getByText('İmzalamaya açık',{exact:true}).waitFor();record('Ayrı yöneticinin gerekçeli incelemesi anahtarı etkinleştirdi');
  await role('issuer');await tab('Belge hazırlığı');await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).click();await page.getByText('Yerel belge imzalandı; resmî kurum belgesi değildir.',{exact:true}).waitFor();await page.getByText('Kurum kaydı kontrol ediliyor…',{exact:true}).waitFor({state:'hidden'});await page.getByText('Yerel belge imzalandı.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Yerel belgeyi imzala',exact:true}).count(),0);record('Atanmış belge görevlisi sentetik belgeyi imzaladı; tekrar düğmesi kapandı');
  await role('student');await tab('Kişisel cüzdanım');await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).waitFor();record('Aynı imzalı belge öğrenenin özel cüzdanında indirilebilir');
  async function state(value){await page.getByText('Anahtar kullanımını değiştir',{exact:true}).click();await page.getByLabel('Yeni anahtar durumu',{exact:true}).selectOption(value);await page.getByLabel('Anahtar değişikliği gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Rotasyon veya olay dayanağı',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Anahtar durumunu kaydet',exact:true}).click());}
  await open('it');await state('retired');await page.getByText('Yeni imzaya kapalı · Eski imzalar korunur',{exact:true}).first().waitFor();await role('student');await tab('Kişisel cüzdanım');await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).waitFor();record('Emekliye ayırma eski imzalı belgenin indirilmesini korudu');
  await open('it');await state('compromised');await page.getByText('Ele geçirilmiş · Doğrulama kapalı',{exact:true}).first().waitFor();assert.equal(await page.getByRole('button',{name:'Anahtar durumunu kaydet',exact:true}).count(),0);await page.reload();await tab('Anahtar ve belge durumu');await page.getByText('Ele geçirilmiş · Doğrulama kapalı',{exact:true}).first().waitFor();record('Ele geçirilme yenilemede korundu; anahtarı yeniden açma işlemi yok');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await open('it');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px anahtar formu ve geçmişinde yatay taşma yok');
  await role('student');await tab('Kişisel cüzdanım');assert.equal(await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).count(),0);await tab('Anahtar ve belge durumu');await page.getByText('Bu kapsamda anahtar kaydı bulunmuyor.',{exact:true}).waitFor();record('Ele geçirilmiş anahtarın belgesi cüzdanda kapandı; öğrenci idari sicile erişemedi');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
