// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-programs');fs.mkdirSync(out,{recursive:true});
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
(async()=>{
 let publicContext;
 try{
  base=await start();const args=(process.env.MYYS_CHROMIUM_PACKAGE?require(process.env.MYYS_CHROMIUM_PACKAGE).args:[]).filter(arg=>!arg.includes('disable-web-security')&&!arg.includes('disable-site-isolation')&&!arg.includes('IsolateOrigins')&&!arg.includes('allow-running-insecure-content'));
  browser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await role('author');await tab('Program sürümleri');
  await page.getByLabel('Programlarda ara',{exact:true}).fill('bulunmayan program');await page.getByText('Aramanıza uygun program sürümü bulunamadı.',{exact:true}).waitFor();await page.getByLabel('Programlarda ara',{exact:true}).fill('P01');record('Katalog araması program kodunu ve boş sonucu gösterir');
  await page.getByRole('button',{name:'Bu sürümden yeni sürüm hazırla',exact:true}).click();
  await page.getByLabel('Program adı',{exact:true}).fill('Çoklu çıktılı yeni program sürümü');await page.getByLabel('Sürüm değişikliği gerekçesi',{exact:true}).fill('Çoklu görev ve çıktı ilişkileri akademik inceleme için yenilendi.');
  await page.getByRole('button',{name:'Öğrenme Çıktısı ekle',exact:true}).click();await page.getByLabel('Çıktı açıklaması 2',{exact:true}).fill('Veri kaynaklarının sınırlarını gerekçeleriyle açıklar.');
  await page.getByLabel('T1 Öğrenme Çıktısı O2',{exact:true}).check();await page.getByRole('button',{name:'Görev ekle',exact:true}).click();await page.getByLabel('Görev başlığı 2',{exact:true}).fill('Kaynak inceleme görevi');await page.getByLabel('T2 Öğrenme Çıktısı O2',{exact:true}).check();
  await page.getByLabel('Rubrik ağırlığı 1',{exact:true}).fill('60');await page.getByLabel('R1 Öğrenme Çıktısı O2',{exact:true}).check();await page.getByRole('button',{name:'Rubrik ölçütü ekle',exact:true}).click();await page.getByLabel('Rubrik ölçütü 2',{exact:true}).fill('Kaynak inceleme ölçütü');await page.getByLabel('Rubrik ağırlığı 2',{exact:true}).fill('40');await page.getByLabel('R2 Öğrenme Çıktısı O2',{exact:true}).check();await page.getByLabel('R2 Görev T1',{exact:true}).check();await page.getByLabel('R2 Görev T2',{exact:true}).check();
  await submitted(()=>page.getByRole('button',{name:'Pilot sürümünü kaydet',exact:true}).click());await page.getByRole('heading',{name:'Çoklu çıktılı yeni program sürümü',exact:true}).waitFor();record('Birden çok çıktı ve görevle yeni rubrik sürümü kaydedildi');
  await page.reload();await page.getByText('Kişi kaydı: author',{exact:true}).waitFor();await tab('Program sürümleri');await page.getByLabel('İlk sürüm',{exact:true}).selectOption({label:'P01 · Sürüm 1'});await page.getByLabel('Karşılaştırılacak sürüm',{exact:true}).selectOption({label:'P01 · Sürüm 2'});await page.getByText('Öğrenme Çıktıları değişti',{exact:true}).waitFor();await page.getByText('Görevler ve çıktı ilişkileri değişti',{exact:true}).waitFor();await page.getByText('Rubrik ve görev ilişkileri değişti',{exact:true}).waitFor();record('Yeniden yüklemede iki sürüm ve karşılaştırma korunur');
  await page.getByRole('heading',{name:'Program sürümleri',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px çoklu yazarlık ve sürüm karşılaştırmasında taşma yok');
  await role('student');await tab('Program sürümleri');assert.equal(await page.getByRole('heading',{name:'Çoklu çıktılı yeni program sürümü',exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Pilot sürümünü kaydet',exact:true}).count(),0);record('Öğrenen eski kayıt sürümünü görür ve programı değiştiremez');
  await tab('Akademik kararlar');const dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Kararın dayanaklarını indir',exact:true}).click();const dl=await dlPromise;await dl.saveAs(path.join(out,'archive.json'));const archive=JSON.parse(fs.readFileSync(path.join(out,'archive.json'),'utf8'));assert.equal(archive.payload.program.version,1);assert.equal(archive.payload.program.outcomes.length,1);assert.equal(archive.payload.assessment.score,100);assert.equal(archive.signed,false);record('Eski kararın program rubrik ve kanıt dayanakları indirildi');
  await role('other');await tab('Akademik kararlar');assert.equal(await page.getByRole('button',{name:'Kararın dayanaklarını indir',exact:true}).count(),0);record('Başka öğrenenin karar arşivi gösterilmez');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
