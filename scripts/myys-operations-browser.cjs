// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-operations');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--operations'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  base=await start();const args=(process.env.MYYS_CHROMIUM_PACKAGE?require(process.env.MYYS_CHROMIUM_PACKAGE).args:[]).filter(arg=>!arg.includes('disable-web-security')&&!arg.includes('disable-site-isolation')&&!arg.includes('IsolateOrigins')&&!arg.includes('allow-running-insecure-content'));
  browser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});
  page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  await role('it');await tab('Aktarım ve mutabakat');
  await page.getByLabel('İşleme durumu',{exact:true}).selectOption('quarantined');
  await page.getByText('1 olay gösteriliyor.',{exact:true}).waitFor();
  assert.equal(await page.getByText('Sentetik öğrenme ürünü: gerçek öğrenci verisi içermez.',{exact:true}).count(),0);
  record('Bilgi işlem karantina filtreleri ve özel kanıt ayrımı');
  const reason=page.getByLabel(/^Karantina inceleme gerekçesi /);await reason.fill('Kaynak sürümü ve olay kimliği karşılaştırıldı; düzeltme yeni sürümle istenmeli.');
  await reason.press('Tab');assert.equal(await page.getByRole('button',{name:'İncelemeyi kaydet',exact:true}).evaluate(el=>document.activeElement===el),true);
  await submitted(()=>page.getByRole('button',{name:'İncelemeyi kaydet',exact:true}).click());
  await page.reload();await page.getByText('Kişi kaydı: it',{exact:true}).waitFor();await tab('Aktarım ve mutabakat');
  assert.equal(await page.getByRole('button',{name:'İncelemeyi kaydet',exact:true}).count(),0);
  await page.getByText(/İnceleme kaydı: Kaynak sürümü/).waitFor();record('Karantina gerekçesi kalıcı, klavye sırası doğru ve tekrar inceleme kapalı');
  for(const actor of ['student','other','teacher','judge','admin','finance']){await role(actor);await tab('Aktarım ve mutabakat');await page.getByText('0 olay gösteriliyor.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Listeyi sunucuya kaydet',exact:true}).count(),0);}record('Altı yetkisiz rolde kuyruk ve toplu hazırlık kapalı');
  await role('issuer');await tab('Akademik kararlar');
  const d=await page.locator('.academic-record small').first().textContent();const decisionId=d.replace('Kayıt: ','');
  await tab('Aktarım ve mutabakat');await page.getByLabel('Toplu işlem adı',{exact:true}).fill('Türkçe karakter ve kısmi hata kabulü');await page.getByLabel('Liste kaynağı',{exact:true}).selectOption('csv');
  await page.getByLabel('CSV satırları',{exact:true}).fill('Karar kimliği,Satır açıklaması\n'+decisionId+',"Öğrenen, İstanbul"\n'+decisionId+',Yinelenen kişi\n,Eksik karar\n');
  await submitted(()=>page.getByRole('button',{name:'Listeyi sunucuya kaydet',exact:true}).click());
  await page.getByText('3 gönderilen · 1 kabul edilen · 0 işlenen · 2 reddedilen',{exact:true}).waitFor();
  for(let row=1;row<=3;row++)await submitted(()=>page.getByRole('button',{name:'Satır '+row+' sonucunu kaydet',exact:true}).click());
  await page.getByText('3 gönderilen · 1 kabul edilen · 3 işlenen · 2 reddedilen',{exact:true}).waitFor();
  await page.getByText('1 hazırlık · 0 imzalı · 0 teslim',{exact:true}).waitFor();record('CSV liste ve satır bazlı kısmi hata: tek hazırlık, sıfır imza/teslim');
  await page.reload();await page.getByText('Kişi kaydı: issuer',{exact:true}).waitFor();await tab('Aktarım ve mutabakat');await page.getByText('1 hazırlık · 0 imzalı · 0 teslim',{exact:true}).waitFor();record('Toplu mutabakat sayfa yenilemede korunur');
  const dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'Mutabakatı CSV indir',exact:true}).click();const dl=await dlPromise;await dl.saveAs(path.join(out,'mutabakat.csv'));const csv=fs.readFileSync(path.join(out,'mutabakat.csv'),'utf8');assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('Öğrenen, İstanbul'));assert.ok(csv.includes('aynı listede tekrar'));record('Türkçe UTF-8 CSV mutabakat indirildi ve içerik okundu');
  await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px mobilde taşma yok');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');
  fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{if(browser)await browser.close();server.kill('SIGTERM');}
})();
