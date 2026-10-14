// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-login-cleanup');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--privacy','--login-cleanup'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async(actor)=>{await role(actor);await tab('Veri talepleri');};
  await open('student');await page.getByLabel('Veri talebi türü',{exact:true}).selectOption('deletion');await page.getByLabel('Veri talebi kapsamı',{exact:true}).selectOption('account');await page.getByLabel('Veri talebi açıklaması',{exact:true}).fill('Tamamlanmış ve süresi dolmuş giriş isteklerimin ayrı kapsamla incelenmesini istiyorum.');await submitted(()=>page.getByRole('button',{name:'Yerel veri talebini kaydet',exact:true}).click());assert.equal(await page.getByRole('button',{name:'Tamamlanmış giriş isteklerini önizle',exact:true}).count(),0);record('Kişi talebi kaydetti; ayrı yanıt olmadan temizleme açılmadı');
  await open('admin');await page.getByLabel('Veri talebi yanıt sonucu',{exact:true}).selectOption('local-login-cleanup');for(const [label,value]of [['Gerekçeli yazılı yanıt','Yalnız kişiye ait tamamlanmış ve süresi dolmuş giriş isteklerinin yerel temizliği incelendi.'],['İşlem dayanağı','Sentetik ayrı kapsam kabulü; kurum saklama kararı değildir.'],['Akademik saklama dayanağı ve ayrımı','Akademik kayıt ve güvenlik iptal bağları bu temizliğin dışındadır.'],['Sonraki inceleme tarihi','2099-01-01']])await page.getByLabel(label,{exact:true}).fill(value);await submitted(()=>page.getByRole('button',{name:'Gerekçeli yerel yanıtı kaydet',exact:true}).click());assert.equal(await page.getByRole('button',{name:'Tamamlanmış giriş isteklerini önizle',exact:true}).count(),0);record('Ayrı görevli özel kapsamlı yanıt verdi; kişinin yerine silemedi');
  await open('other');assert.equal(await page.getByRole('heading',{name:'Silme talebi · Hesap ve oturum',exact:true}).count(),0);await open('it');assert.equal(await page.getByRole('heading',{name:'Silme talebi · Hesap ve oturum',exact:true}).count(),0);record('Başka öğrenen ve teknik görevli özel temizleme talebini göremedi');
  await open('student');await submitted(()=>page.getByRole('button',{name:'Tamamlanmış giriş isteklerini önizle',exact:true}).click());await page.getByText('Temizlenecek: 2 · Uygun toplam: 2. Bir işlemde en fazla 100 kayıt. Önizleme 15 dakika geçerlidir; kayıtlar değişirse yenilenmelidir.',{exact:true}).waitFor();record('Önizleme yalnız iki uygun isteği saydı; devam eden ve diğer kişinin isteği dışarıda kaldı');
  const consent=page.getByLabel('Bu kurumdaki bana ait, önizlenen tamamlanmış giriş isteklerinin temizlenmesini onaylıyorum.',{exact:true});assert.equal(await consent.isChecked(),false);await consent.focus();await page.keyboard.press('Space');await page.keyboard.press('Tab');assert.equal(await page.getByRole('button',{name:'Önizlenen giriş isteklerini temizle',exact:true}).evaluate(e=>e===document.activeElement),true);await submitted(()=>page.keyboard.press('Enter'));await page.getByText('2 tamamlanmış giriş isteği temizlendi. Aynı önizleme kapsamında kalan: 0. Talebin tamamı yerine getirilmiş sayılmaz.',{exact:true}).waitFor();record('Kişi açık teyitle ve klavyeyle önizlenen isteklere temizlik uyguladı');
  await page.reload();await tab('Veri talepleri');await page.getByText('2 tamamlanmış giriş isteği temizlendi. Aynı önizleme kapsamında kalan: 0. Talebin tamamı yerine getirilmiş sayılmaz.',{exact:true}).waitFor();await submitted(()=>page.getByRole('button',{name:'Tamamlanmış giriş isteklerini önizle',exact:true}).click());await page.getByText('Bu önizlemede temizlenebilecek giriş isteği bulunmuyor.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Önizlenen giriş isteklerini temizle',exact:true}).count(),0);record('Sonuç yenilemede korundu; boş önizleme ikinci silme oluşturmadı');
  const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Kendi kayıt özetimi indir',exact:true}).click();const dl=await downloading;await dl.saveAs(path.join(out,'summary.json'));const summary=JSON.parse(fs.readFileSync(path.join(out,'summary.json'),'utf8')).payload;assert.equal(summary.records['privacy-login-cleanup'][0].removedRequestRows,2);assert.equal(summary.records['privacy-login-cleanup'][0].securityBarriersChanged,false);assert.equal(summary.records['privacy-login-cleanup'][0].physicalDestructionVerified,false);assert.equal(summary.records.evidence.length,1);assert.equal(summary.records.decision.length,1);assert.equal(summary.account.sessions.expired,1);record('Kişisel özet temizleme makbuzunu içerdi; akademik kayıtlar ve mevcut oturum temizleme kapsamı korundu');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px giriş temizliği görünümünde yatay taşma yok');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
