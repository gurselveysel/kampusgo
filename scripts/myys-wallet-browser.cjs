// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-wallet');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--wallet'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  await role('student');await tab('Kişisel cüzdanım');await page.getByText('İmzalı yerel kabul belgesi',{exact:true}).waitFor();
  const dlPromise=page.waitForEvent('download');await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).click();const dl=await dlPromise;await dl.saveAs(path.join(out,'local-credential.jwt'));const jwt=fs.readFileSync(path.join(out,'local-credential.jwt'),'utf8');assert.equal(jwt.split('.').length,3);record('Kişisel imzalı belge indirildi');
  await page.getByLabel(/^Paylaşım amacı /).fill('Başvuru dosyası için sınırlı program özeti paylaşımı');await page.getByLabel(/^Paylaşım süresi /).selectOption('1');await submitted(()=>page.getByRole('button',{name:'Süreli bağlantı oluştur',exact:true}).click());
  const link=await page.getByLabel('Paylaşım bağlantısı',{exact:true}).inputValue();assert.ok(link.startsWith(base+'/#/shared/'));record('Süreli paylaşım bağlantısı yalnız ilk yanıtta gösterilir');
  publicContext=await browser.newContext();const publicPage=await publicContext.newPage();await publicPage.goto(link);await publicPage.getByText('İmzalı yerel kabul belgesi',{exact:true}).waitFor();assert.equal(await publicPage.getByText('Kişi kaydı: student',{exact:true}).count(),0);assert.equal(await publicPage.locator('.sidebar').count(),0);record('Oturumsuz özet kimlik ve özel kanıt göstermeden açıldı');
  await submitted(()=>page.getByRole('button',{name:'Paylaşımı iptal et',exact:true}).click());await page.getByText('Paylaşım iptal edildi',{exact:true}).waitFor();await publicPage.reload();await publicPage.getByRole('alert').getByText('Paylaşım bulunamadı veya sona erdi.',{exact:true}).waitFor();record('İptal sonrası yeni anonim erişim reddedildi');
  await page.reload();await page.getByText('Kişi kaydı: student',{exact:true}).waitFor();await tab('Kişisel cüzdanım');await page.getByText('Paylaşım iptal edildi',{exact:true}).waitFor();assert.equal(await page.getByLabel('Paylaşım bağlantısı',{exact:true}).count(),0);record('Cüzdan ve paylaşım iptali kalıcı; gizli bağlantı tekrar gösterilmiyor');
  await page.getByRole('heading',{name:'Kişisel belge cüzdanım',exact:true}).click();await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});
  await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px cüzdan görünümünde yatay taşma yok');
  for(const actor of ['other','teacher','it','admin','issuer']){await role(actor);await tab('Kişisel cüzdanım');assert.equal(await page.getByRole('button',{name:'İmzalı belgeyi indir',exact:true}).count(),0);await page.getByText('Bu kişiye bağlı belge veya belge hazırlığı bulunmuyor.',{exact:true}).waitFor();}record('Beş başka rolde kişisel belge gizli');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
