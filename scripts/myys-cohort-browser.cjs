// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-cohort');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--cohort'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async(actor)=>{await role(actor);await tab('Kontrollü grup kabulü');};
  const reason='Sentetik yerel kabul dayanağı incelendi; gerçek kurum onayı değildir.';
  await open('author');await page.getByLabel('Grup adı',{exact:true}).fill('Yerel kontrollü grup kabul provası');await page.getByLabel('Grup programı',{exact:true}).selectOption({label:'Yerel Veri Okuryazarlığı · Sürüm 1'});await page.getByRole('checkbox',{name:/^student · /}).check();await page.getByLabel('Grup inceleme tarihi',{exact:true}).fill('2099-01-01');await submitted(()=>page.getByRole('button',{name:'Yerel grup planını kaydet',exact:true}).click());await page.getByText('Yerel kayıt zinciri: 1/1 · Açık kritik hata: 0',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Yerel açılış provasını kaydet',exact:true}).count(),0);record('Tek programdaki sınırlı grup hazırlandı; eksik kapılarda açılış gösterilmedi');
  const gateNames={B05:'İçerik ve sağlayıcı hakları',B07:'Kişiye bağlı güvenli giriş',B12:'Belge profili ve yetkisi',B15:'LMS sözleşmesi',B24:'Erişilebilirlik',B25:'Ders ve ölçme içeriği',B26:'Destek işletimi',B27:'Geri yükleme ve olay planı',B28:'Veri talepleri ve saklama'};
  for(const [actor,keys] of [['admin',['B05','B28']],['it',['B07','B15','B26','B27']],['issuer',['B12']],['reviewer',['B24']],['publisher',['B25']]]){await open(actor);for(const key of keys){const details=page.locator('details').filter({has:page.getByText(gateNames[key]+' · İnceleme bekliyor / kapalı',{exact:true})});await details.locator('summary').click();await page.getByLabel('Yerel kanıt referansı '+key,{exact:true}).fill(reason);await page.getByLabel('Koşul gerekçesi '+key,{exact:true}).fill(reason);await submitted(()=>details.getByRole('button',{name:'Koşul incelemesini kaydet',exact:true}).click());}}
  record('Dokuz temel koşul farklı görev yetkileriyle yerel kanıta bağlandı');
  const approve=async(actor,axis,label)=>{await open(actor);await page.getByLabel('Açılış gerekçesi '+axis,{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:label+' kaydet',exact:true}).click());};
  await approve('it','technical','Teknik inceleme');await approve('publisher','academic','Akademik inceleme');await approve('reviewer','operations','İşletim incelemesi');record('Teknik, akademik ve işletim incelemeleri üç ayrı kişide tamamlandı');
  await open('author');await page.getByLabel('Açılış provası gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Yerel açılış provasını kaydet',exact:true}).click());await page.getByText('Yerel açılış provası uygun',{exact:true}).waitFor();record('Yalnız yerel açılış provası kaydedildi; gerçek kohort açılmadı');
  await open('it');await page.getByText('Hata ve bulgu kaydet',{exact:true}).click();await page.getByLabel('Bulgu açıklaması',{exact:true}).fill('Sentetik kritik hata açılışın otomatik bekletilmesini sınamak için kaydedildi.');await submitted(()=>page.getByRole('button',{name:'Grup bulgusunu kaydet',exact:true}).click());await page.getByText('Yerel prova bekletiliyor',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Bulgu incelemesini kaydet',exact:true}).count(),0);record('Kritik hata provayı bekletti; kendi hatasını çözme formu verilmedi');
  await open('reviewer');await page.getByLabel('Bulgu inceleme gerekçesi',{exact:true}).fill('Sentetik kritik bulgu bağımsız incelendi; yalnız yerel prova için çözüldü.');await submitted(()=>page.getByRole('button',{name:'Bulgu incelemesini kaydet',exact:true}).click());await open('author');assert.equal(await page.getByRole('button',{name:'Yerel açılış provasını kaydet',exact:true}).count(),0);record('Kritik hata çözüldüğünde eski üç inceleme yeniden kullanılmadı');
  await approve('it','technical','Teknik inceleme');await approve('publisher','academic','Akademik inceleme');await approve('reviewer','operations','İşletim incelemesi');await open('author');await page.getByLabel('Açılış provası gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Yerel açılış provasını kaydet',exact:true}).click());record('Güncel dayanaklarla üç ayrı inceleme sonrası prova yenilendi');
  await open('reviewer');await page.getByLabel('Dönem değerlendirme sonucu',{exact:true}).selectOption('close');await page.getByLabel('Dönem değerlendirme gerekçesi',{exact:true}).fill('Sentetik dönem değerlendirmesinde kaynak sayıları incelendi ve yerel prova kapatıldı.');await page.getByLabel('Sonraki grup incelemesi',{exact:true}).fill('2099-02-01');await submitted(()=>page.getByRole('button',{name:'Dönem değerlendirmesini kaydet',exact:true}).click());await page.getByText('Yerel prova kapatıldı',{exact:true}).waitFor();await page.getByText('Gerçek yetkili öğrenci grubu gözlemi tamamlanmış sayılmaz.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Dönem değerlendirmesini kaydet',exact:true}).count(),0);record('Kaynak sayılı dönem değerlendirmesi kaydedildi; kapanış yeniden açılmadı');
  await page.reload();await tab('Kontrollü grup kabulü');await page.getByText('Yerel prova kapatıldı',{exact:true}).waitFor();record('Yeniden yüklemede plan, bulgu, inceleme ve kapanış korundu');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px grup kabul ekranında yatay taşma yok');
  await open('other');await page.getByText('Bu yetki kapsamında hazırlanmış yerel grup bulunmuyor.',{exact:true}).waitFor();record('Başka öğrenen grup inceleme kayıtlarına erişemedi');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
