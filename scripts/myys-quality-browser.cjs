// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-quality');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--quality'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async(actor,section='Kaynaklı göstergeler')=>{await role(actor);await tab(section);};
  const card=name=>page.locator('article').filter({has:page.getByRole('heading',{name,exact:true})});
  await open('student','Başvurular');await page.getByLabel('Başvuru açıklaması P02',{exact:true}).fill('Sentetik program için öğrenme ve uygulama başvurumu sunuyorum.');await submitted(()=>page.getByRole('button',{name:'Yerel başvuruyu kaydet',exact:true}).click());await page.getByText('Yetkili incelemesi bekleniyor.',{exact:true}).waitFor();record('Öğrenen yayımlanmış program sürümüne yerel başvuru yaptı');
  await tab('Kaynaklı göstergeler');await card('Başvurudan program kaydına geçiş').getByText('0 / 1 · %0',{exact:true}).waitFor();await card('LMS kaynaklı tamamlama bildirimi').getByText('1 / 1 · %100',{exact:true}).waitFor();await card('Dış kurumda belge kabulü').getByText('Oran hesaplanmadı.',{exact:true}).waitFor();record('Başvuru, tamamlama ve dış kabul ayrı kaynak/paydalarda gösterildi');
  await open('author','Başvurular');await page.getByLabel('Başvuru inceleme gerekçesi',{exact:true}).fill('Yerel başvuru incelendi; güvenilir öğrenen üyeliği kapsamında programa kaydedildi.');await submitted(()=>page.getByRole('button',{name:'Başvuru incelemesini kaydet',exact:true}).click());await page.getByText('Yerel program kaydına bağlandı',{exact:true}).waitFor();record('Ayrı yetkili başvuruyu program kaydına atomik bağladı');
  await open('student');await card('Başvurudan program kaydına geçiş').getByText('1 / 1 · %100',{exact:true}).waitFor();await card('LMS kaynaklı tamamlama bildirimi').getByText('1 / 2 · %50',{exact:true}).waitFor();await card('LMS kaynaklı tamamlama bildirimi').getByText('Kısmi kaynak · Eksikler var',{exact:true}).waitFor();await card('Güncel akademik başarı').getByText('1 / 1 · %100',{exact:true}).waitFor();record('Yeni program kaydı tamamlama paydasını değiştirdi; başarı paydası değerlendirmeye bağlı kaldı');
  await tab('Kişisel cüzdanım');await page.getByLabel('İmzalı yerel belgeyi teslim aldım.',{exact:true}).check();await submitted(()=>page.getByRole('button',{name:'Yerel teslim teyidini kaydet',exact:true}).click());await tab('Kaynaklı göstergeler');await card('Yerel imzalı belge teslim teyidi').getByText('1 / 1 · %100',{exact:true}).waitFor();await card('Destek çözüm durumu').getByText('1 / 1 · %100',{exact:true}).waitFor();record('Cüzdan teslim teyidi ve destek sonucu kendi kaynak kayıtlarından sayıldı');
  await page.getByLabel('Gösterge programı',{exact:true}).selectOption({label:'Yerel Araştırma Yöntemleri · Sürüm 1'});await card('Destek çözüm durumu').getByText('Oran hesaplanmadı.',{exact:true}).waitFor();await card('LMS kaynaklı tamamlama bildirimi').getByText('Oran hesaplanmadı.',{exact:true}).waitFor();record('Program filtresi olmayan destek ilişkisini veya tamamlama kaynağını uydurmadı');
  await page.getByLabel('Gösterge programı',{exact:true}).selectOption('');await card('Başvurudan program kaydına geçiş').getByText('Kaynak kayıtlarını incele',{exact:true}).click();await page.getByText('Yerel kaynak-sayı mutabakatı sağlandı.',{exact:true}).waitFor();const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Gösterge kaynak raporunu indir',exact:true}).click();const dl=await downloading;await dl.saveAs(path.join(out,'sources.csv'));const csv=fs.readFileSync(path.join(out,'sources.csv'),'utf8');assert.ok(csv.includes('Dış kurumda belge kabulü'));assert.ok(csv.includes('Yerel kabul'));assert.ok(csv.includes('application'));assert.ok(csv.includes('lms-event'));record('Tüm göstergeler ve izinli kaynak kimlikleri CSV mutabakatına indirildi');
  await page.reload();await tab('Kaynaklı göstergeler');await card('Yerel imzalı belge teslim teyidi').getByText('1 / 1 · %100',{exact:true}).waitFor();record('Yeniden yüklemede bağlı kayıtlar ve gösterge sayıları korundu');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px gösterge ekranında yatay taşma yok');
  await open('other');await card('Başvurudan program kaydına geçiş').getByText('0 / 0 · Payda yok',{exact:true}).waitFor();await card('Yerel imzalı belge teslim teyidi').getByText('0 / 0 · Payda yok',{exact:true}).waitFor();record('Başka öğrenen sayılara veya kaynaklara dahil edilmedi');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
