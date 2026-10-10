// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-obs');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--obs'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async(actor,section='Aktarım ve mutabakat')=>{await role(actor);await tab(section);};
  await open('issuer');await submitted(()=>page.getByRole('button',{name:'Aktarım hazırlığını kaydet',exact:true}).click());await page.getByRole('heading',{name:'Kredi hazırlığı',exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Aktarım hazırlığını kaydet',exact:true}).count(),0);record('Yetkili kredi tek yerel aktarım olayına hazırlandı');
  const ack=async(ref,outcome='accepted')=>{await page.getByLabel('Yerel alındı referansı',{exact:true}).fill(ref);await page.getByLabel('Alındı örneği sonucu',{exact:true}).selectOption(outcome);await page.getByLabel('Mutabakat gerekçesi',{exact:true}).fill('Sentetik alındı yalnız yerel sözleşme provası için kaydedildi.');await submitted(()=>page.getByRole('button',{name:'Yerel alındı örneğini kaydet',exact:true}).click());};
  const match=async()=>{await page.getByLabel('Mutabakat gerekçesi',{exact:true}).fill('Sentetik içerik özeti ve alındı kaydı satır bazında karşılaştırıldı.');await submitted(()=>page.getByRole('button',{name:'Mutabakatı kaydet',exact:true}).click());};
  await open('it');assert.equal(await page.getByText('LOCAL-DIP / COURSE-1 · 10 kredi',{exact:true}).count(),0);await ack('LOCAL-REJECT-001','rejected');record('Teknik rolde kredi ayrıntısı yok; red alındısı örneği kaydedildi');
  await open('issuer');await match();await page.getByText('Alındı örneği reddedildi',{exact:true}).waitFor();record('Red alındısı başarı veya mutabakat sayılmadı');
  await open('it');await ack('LOCAL-ACCEPT-002');await open('issuer');await match();await page.getByText('Yerel mutabakat sağlandı',{exact:true}).waitFor();record('Ayrı alındı ve öğrenci işleri mutabakatı bağlandı');
  await open('student','Tanıma ve kredi');await page.getByLabel('Tanıma kararına itiraz gerekçesi',{exact:true}).fill('Sentetik kaydın yeniden bağımsız değerlendirilmesini istiyorum.');await submitted(()=>page.getByRole('button',{name:'Tanıma itirazını kaydet',exact:true}).click());
  await open('reviewer','Tanıma ve kredi');await page.getByLabel('Tanıma itirazı sonucu',{exact:true}).selectOption('reassessment');await page.getByLabel('Gerekçe',{exact:true}).fill('Bağımsız yerel inceleme yeni akademik karar gerektiriyor.');await submitted(()=>page.getByRole('button',{name:'İncelemeyi kaydet',exact:true}).click());
  await open('publisher','Tanıma ve kredi');await page.getByLabel('Tanıma kararı',{exact:true}).selectOption('partial');for(const [label,value] of [['Kabul edilen kredi','6'],['Kabul edilen uzaktan kredi','3'],['Yerel karar referansı','Sentetik yeni yerel karar referansı'],['İncelenmiş tekil kazanım anahtarı','GAIN-1'],['Önceki ders inceleme referansı','Sentetik önceki dersler tekrar incelendi'],['Tanıma kararı gerekçesi','Sentetik kazanımlar yeniden incelenip kısmi tanıma kararı verildi.']])await page.getByLabel(label,{exact:true}).fill(value);await page.getByLabel('Önceki ders ve eşdeğer kazanım kayıtlarını inceledim.',{exact:true}).check();await submitted(()=>page.getByRole('button',{name:'Tanıma kararını kaydet',exact:true}).click());
  await open('issuer');assert.equal(await page.getByRole('button',{name:'Aktarım hazırlığını kaydet',exact:true}).count(),0);await submitted(()=>page.getByRole('button',{name:'Güncel karar için düzeltme hazırla',exact:true}).click());await page.getByRole('heading',{name:'Kredi düzeltmesi',exact:true}).waitFor();await page.getByText('LOCAL-DIP / COURSE-1 · 6 kredi',{exact:true}).waitFor();record('Yeni karar önceki olaya bağlı düzeltme oluşturdu');
  await open('it');await ack('LOCAL-CORRECTION-003');await open('issuer');await match();assert.equal(await page.getByText('Yerel mutabakat sağlandı',{exact:true}).count(),2);record('Düzeltme alındısı ayrı mutabakatla kapandı');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'OBS simülasyon raporunu indir',exact:true}).click();const dl=await download;await dl.saveAs(path.join(out,'obs-simulation.csv'));const csv=fs.readFileSync(path.join(out,'obs-simulation.csv'),'utf8');assert.ok(csv.includes('LOCAL-CORRECTION-003'));assert.ok(csv.includes('Hayır · Yerel simülasyon'));record('CSV raporu gerçek aktarım olmadığını koruyarak indirildi');
  await page.reload();await tab('Aktarım ve mutabakat');await page.getByLabel('OBS hazırlık filtresi',{exact:true}).selectOption('matched');assert.equal(await page.getByText('Yerel mutabakat sağlandı',{exact:true}).count(),2);record('Yeniden yükleme ve filtrede iki mutabık yerel olay korunur');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px mutabakat ekranında yatay taşma yok');
  await open('other');await page.getByText('Bu kapsam ve filtrede yerel OBS aktarım olayı bulunmuyor.',{exact:true}).waitFor();record('Başka öğrenen aktarım kayıtlarını göremez');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
