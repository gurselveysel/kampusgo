// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-program-package');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--appeals'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,adminBrowser,page,base,current='startup';const checks=[],errors=[];
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
  await role('author');await tab('Program sürümleri');await page.getByText('Yerel bilgi paketi bağları güncel',{exact:true}).waitFor();await page.getByText('Bilgi paketi dayanaklarını göster',{exact:true}).click();const expected=['Öğrenme Çıktıları','İş yükü','Görev ve rubrik','Eğitici bilgisi','İçerik lisansı beyanı','Ayrı program incelemesi','Güncel belge profili ve yetki dosyası'];for(const label of expected)await page.getByText(label+': Yerel sürüme bağlı',{exact:true}).waitFor();record('Program, ölçme, eğitici, lisans beyanı ve yetki/profil durumu aynı ekranda');
  const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Yerel bilgi paketini indir',exact:true}).click();const file=await downloaded;assert.equal(file.suggestedFilename(),'MYYS_program-bilgi-paketi.json');const result=JSON.parse(fs.readFileSync(await file.path(),'utf8'));assert.equal(result.payload.format,'myys-program-information/1');assert.equal(result.payload.program.ects,1);assert.equal(result.payload.program.rubric.length,1);assert.equal(result.payload.credentialProfile.fields.length,11);for(const key of ['signed','official','institutionApproved','licenseRightsVerified','externalSubmitted'])assert.equal(result[key],false);assert.equal(result.payload.credentialProfile.issuerPeople,undefined);record('Gerçek JSON indirmesi aynı program sürümü ve belge profiliyle geldi; resmî onay iddiası yok');
  const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])])):x;assert.equal(require('node:crypto').createHash('sha256').update(JSON.stringify(canonical(result.payload))).digest('hex'),result.sha256);record('İndirilen bilgi paketinin içerik özeti bağımsız hesaplamayla eşleşti');
  await role('student');await tab('Program sürümleri');await page.getByText('Yerel bilgi paketi bağları güncel',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Yerel bilgi paketini indir',exact:true}).count(),0);record('Öğrenen kendi programının durumunu gördü; idari paket indirmesi açılmadı');
  await role('author');await tab('Program sürümleri');const authorPage=page;adminBrowser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});page=await adminBrowser.newPage({viewport:{width:1440,height:1000},locale:'tr-TR'});page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));await role('admin');await tab('Politika ve hak sicili');await page.getByText('Bu yetki dosyasının kullanımını durdur',{exact:true}).click();await page.getByLabel('Yetki dosyası durdurma gerekçesi',{exact:true}).fill('Sentetik yeni kapsam incelemesi için yerel dosya durdurulmuştur.');await submitted(()=>page.getByRole('button',{name:'Yetki dosyasını durdur',exact:true}).click());page=authorPage;assert.equal((await (await page.request.get(base+'/api/myys/calisma?kurum=gazi')).json()).personId,'author');
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/myys/program-paketi')&&r.request().method()==='POST'),page.getByRole('button',{name:'Yerel bilgi paketini indir',exact:true}).click()]);assert.equal(response.status(),409);await page.getByRole('alert').filter({hasText:'Güncel program incelemesi'}).waitFor();await page.getByText('Bilgi paketinin dayanakları eksik veya güncel değil',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Yerel bilgi paketini indir',exact:true}).count(),0);record('Eski açık ekrandaki indirme isteği diğer oturumun durdurmasını yeniden denetledi');
  await page.reload();await tab('Program sürümleri');await page.getByText('Bilgi paketinin dayanakları eksik veya güncel değil',{exact:true}).waitFor();assert.equal(result.sha256,require('node:crypto').createHash('sha256').update(JSON.stringify(canonical(result.payload))).digest('hex'));record('Yenilemede kapalı durum korundu; önceden indirilen tarihsel dosya değişmedi');
  await role('publisher');await tab('Program sürümleri');await page.getByRole('link',{name:'Belge profili incelemesini aç',exact:true}).click();await page.getByRole('tab',{name:/^Belge profilleri \(/,selected:true}).waitFor();record('Program ekranından aynı yetkili belge profili incelemesine geçildi');
  await role('author');await tab('Program sürümleri');await page.getByText('Bilgi paketi dayanaklarını göster',{exact:true}).click();await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);const summary=page.getByText('Bilgi paketi dayanaklarını göster',{exact:true});await summary.focus();await page.keyboard.press('Enter');await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>el.parentElement.open),true);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await summary.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'mobile.png'),animations:'disabled'});record('390 px bilgi paketi durumu taşmadı; ayrıntılar klavyeyle açılıp kapandı');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(adminBrowser?.isConnected())await adminBrowser.close();if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
