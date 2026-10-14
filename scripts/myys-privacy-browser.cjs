// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-privacy');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--privacy'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  await open('student');const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Kendi kayıt özetimi indir',exact:true}).click();const dl=await downloading;await dl.saveAs(path.join(out,'summary.json'));const summary=JSON.parse(fs.readFileSync(path.join(out,'summary.json'),'utf8'));assert.equal(summary.payload.personId,'student');assert.ok(summary.payload.records.evidence.length);assert.equal(JSON.stringify(summary).includes('tokenHash'),false);record('Kendi kayıt özeti indirildi; gizli paylaşım alanı yok');
  await tab('Kişisel cüzdanım');await page.getByLabel(/^Paylaşım amacı /).fill('Sentetik veri talebi paylaşım denemesi');await submitted(()=>page.getByRole('button',{name:'Süreli bağlantı oluştur',exact:true}).click());await tab('Veri talepleri');await page.getByLabel('Bu birimdeki kendi paylaşım bağlantılarımı ve portfolyo izinlerimi geri çekmek istiyorum.',{exact:true}).check();await submitted(()=>page.getByRole('button',{name:'Paylaşımlarımı geri çek',exact:true}).click());await page.getByText('1 paylaşım geri çekildi. Akademik kayıt silinmedi; dış hesap değişmedi.',{exact:true}).waitFor();await tab('Kişisel cüzdanım');await page.getByText('Paylaşım iptal edildi',{exact:true}).waitFor();record('Toplu geri çekme cüzdandaki aynı paylaşımı kapattı');
  await tab('Veri talepleri');await page.getByLabel('Veri talebi türü',{exact:true}).selectOption('deletion');await page.getByLabel('Veri talebi kapsamı',{exact:true}).selectOption('account');await page.getByLabel('Veri talebi açıklaması',{exact:true}).fill('Gereksiz hesap verilerimin incelenmesini ve gerekçeli yanıt verilmesini istiyorum.');await submitted(()=>page.getByRole('button',{name:'Yerel veri talebini kaydet',exact:true}).click());await page.getByRole('heading',{name:'Silme talebi · Hesap ve oturum',exact:true}).waitFor();record('Kişinin kapsamlı talebi sunucuya kaydedildi');
  await open('other');await page.getByText('Bu kapsam ve filtrede veri talebi bulunmuyor.',{exact:true}).waitFor();await open('it');assert.equal(await page.getByRole('heading',{name:'Silme talebi · Hesap ve oturum',exact:true}).count(),0);record('Başka öğrenen ve teknik destek kişisel talebi göremez');
  await open('admin');await page.getByLabel('Veri talebi yanıt sonucu',{exact:true}).selectOption('local-session-cleanup');for(const [label,value] of [['Gerekçeli yazılı yanıt','Yalnız süresi dolmuş yerel oturumlar temizlenebilir; hesap ve akademik kayıtlar bu işlemde korunur.'],['İşlem dayanağı','Sentetik kabul incelemesi; gerçek kurum saklama kararı değildir.'],['Akademik saklama dayanağı ve ayrımı','Kurumun akademik saklama kararı ayrıca gerekir; bu provada akademik kayıt silinmez.'],['Sonraki inceleme tarihi','2099-01-01']])await page.getByLabel(label,{exact:true}).fill(value);await submitted(()=>page.getByRole('button',{name:'Gerekçeli yerel yanıtı kaydet',exact:true}).click());assert.equal(await page.getByRole('button',{name:'Süresi dolmuş yerel oturumları temizle',exact:true}).count(),0);record('Ayrı görevli dayanak ve inceleme tarihiyle yazılı yanıt verdi');
  await open('student');await submitted(()=>page.getByRole('button',{name:'Yanıtı görüntülediğimi kaydet',exact:true}).click());await page.getByText('Yerel görüntüleme kaydedildi.',{exact:true}).waitFor();record('Kişinin yerel görüntüleme kaydı resmî tebligattan ayrı tutuldu');
  await submitted(()=>page.getByRole('button',{name:'Süresi dolmuş yerel oturumları temizle',exact:true}).click());await page.getByText('1 süresi dolmuş yerel oturum kaydı temizlendi. Akademik kayıtlar ve kişi hesabı korunuyor. Talebin tamamı yerine getirilmiş sayılmaz.',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Süresi dolmuş yerel oturumları temizle',exact:true}).count(),0);record('Yalnız süresi dolmuş yerel oturum temizlendi; talep bütünü kapatılmadı');
  await page.reload();await tab('Veri talepleri');await page.getByText('Yerel görüntüleme kaydedildi.',{exact:true}).waitFor();await page.getByLabel('Veri talebi filtresi',{exact:true}).selectOption('waiting');await page.getByText('Bu kapsam ve filtrede veri talebi bulunmuyor.',{exact:true}).waitFor();await page.getByLabel('Veri talebi filtresi',{exact:true}).selectOption('own');await page.getByRole('heading',{name:'Silme talebi · Hesap ve oturum',exact:true}).waitFor();record('Yeniden yüklemede talep, yanıt, görüntüleme ve temizlik korundu');
  const selected=page.getByRole('tab',{name:/^Veri talepleri /});await selected.focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowLeft');await selected.waitFor();assert.equal(await selected.getAttribute('aria-selected'),'true');record('Veri talepleri sekmesi klavye ile seçilebildi');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px veri talepleri ekranında yatay taşma yok');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
