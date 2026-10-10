// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-profile');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--profiles'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async(actor)=>{await role(actor);await tab('Belge profilleri');};
  const reason='Sentetik belge profili incelemesi; gerçek kurum düzenleme yetkisi değildir.';
  await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),0);record('Profil bulunmayan başarı kararı belge hazırlama düğmesini açmadı');
  await open('admin');await page.getByLabel('Belge profilinin programı',{exact:true}).selectOption({label:'Yerel Veri Okuryazarlığı · Sürüm 1'});await page.getByLabel('Düzenleme yetkisi sicili',{exact:true}).selectOption({label:'Sentetik düzenleme yetkisi'});assert.equal(await page.locator('input[name="field"]').count(),11);for(const c of await page.locator('input[name="field"]').all())await c.check();await page.getByLabel('issuer',{exact:true}).check();await page.getByLabel('Belge profili bitiş zamanı (UTC)',{exact:true}).fill('2028-01-01T12:30');await page.getByLabel('Belge profili gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Belge yetkisinin kapsam dayanağı',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Belge profilini kaydet',exact:true}).click());await page.getByRole('heading',{name:'Yerel Veri Okuryazarlığı · Belge profili 1',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Belge profili incelemesini kaydet',exact:true}).count(),0);record('11 alan, yetki sicili, program sürümü ve kişi görevi aynı profile bağlandı');
  await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),0);record('İncelenmemiş profil ihraç yetkisi sağlamadı');
  await open('publisher');await page.getByLabel('Belge profili inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Belge profili incelemesini kaydet',exact:true}).click());await page.getByText('Yerel ihraç incelemesi uygun',{exact:true}).waitFor();await role('issuer');await tab('Akademik kararlar');await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).waitFor();record('Ayrı komisyon incelemesi sonrası atanmış görevliye hazırlık açıldı');
  await open('admin');await page.getByRole('button',{name:'Belge profilinin yeni sürümünü hazırla',exact:true}).click();for(const c of await page.locator('input[name="field"]').all())await c.check();await page.getByLabel('Belge profili gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Belge yetkisinin kapsam dayanağı',{exact:true}).fill(reason);await page.getByLabel('Belge profili değişiklik gerekçesi',{exact:true}).fill('Sentetik profil değişikliği için güncel inceleme gereklidir.');await submitted(()=>page.getByRole('button',{name:'Belge profilini kaydet',exact:true}).click());await page.getByRole('heading',{name:'Yerel Veri Okuryazarlığı · Belge profili 2',exact:true}).waitFor();await role('issuer');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),0);record('Yeni sürüm inceleme beklerken eski profille yeni belge hazırlanamadı');
  await open('publisher');await page.getByLabel('Belge profili inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Belge profili incelemesini kaydet',exact:true}).click());await role('issuer');await tab('Akademik kararlar');await submitted(()=>page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).click());assert.equal(await page.getByRole('button',{name:'Belge uygunluğunu denetle',exact:true}).count(),0);await tab('Belge hazırlığı');await page.getByText('Belge profili sürümü 2',{exact:true}).waitFor();record('Yeni ihraç hazırlığı profil 2 ve aynı akademik karara bağlandı; tekrar düğmesi kapandı');
  await open('publisher');const latest=page.locator('article').filter({has:page.getByRole('heading',{name:'Yerel Veri Okuryazarlığı · Belge profili 2',exact:true})});await latest.getByText('Yeni ihraçlarda bu profili durdur',{exact:true}).click();await latest.getByLabel('Belge profili durdurma gerekçesi',{exact:true}).fill(reason);await submitted(()=>latest.getByRole('button',{name:'Profil kullanımını durdur',exact:true}).click());await page.getByText('Yeni belge hazırlığı durduruldu',{exact:true}).waitFor();record('Profil kullanımı gerekçeyle durduruldu; önceki belgeleri iptal etmiş gibi gösterilmedi');
  await page.reload();await tab('Belge profilleri');await page.getByText('Yeni belge hazırlığı durduruldu',{exact:true}).waitFor();await page.getByRole('heading',{name:'Yerel Veri Okuryazarlığı · Belge profili 1',exact:true}).waitFor();record('Yenilemede iki profil sürümü, inceleme ve durdurma korundu');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await open('admin');await page.getByLabel('Belge profilinin programı',{exact:true}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px belge profili formunda ve sürüm geçmişinde taşma yok');
  await open('student');await page.getByText('Bu kapsamda belge profili bulunmuyor.',{exact:true}).waitFor();await tab('Belge hazırlığı');await page.getByText('Belge profili sürümü 2',{exact:true}).waitFor();record('Öğrenen idari profillere erişmedi; kendi hazırlığının sürümünü gördü');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
