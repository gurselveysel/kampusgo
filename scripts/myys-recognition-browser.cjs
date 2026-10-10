// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-recognition');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--recognition'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  const open=async actor=>{await role(actor);await tab('Tanıma ve kredi');};
  await open('student');await page.getByLabel('Tanıma için program kaydım',{exact:true}).selectOption({index:1});await page.getByLabel('Başvuru politikası',{exact:true}).selectOption({index:1});
  for(const [label,value]of [['Kaynak belge adı','Sentetik dış eğitim belgesi'],['Belgeyi düzenleyen','Yerel test sağlayıcı'],['Kaynak belge kimliği','TEST-CREDENTIAL-1'],['Belgedeki çıktı kimliği','SOURCE-O1'],['Tanınması istenen ders kodu','COURSE-1'],['Talep edilen kredi','10'],['Talebin uzaktan kredisi','5'],['Öğrenme Çıktısı eşlemesi ve gerekçesi','İlgili çıktı ve ders içeriği insan incelemesine sunuldu.']])await page.getByLabel(label,{exact:true}).fill(value);
  fs.writeFileSync(path.join(out,'synthetic-source.txt'),'Yalnız sentetik yerel kabul belgesi; gerçek kişi veya kayıt yok.');await page.getByLabel('İncelenecek yerel dosya',{exact:true}).setInputFiles(path.join(out,'synthetic-source.txt'));await page.getByText('Dosya özeti hazır. Bu işlem teknik doğrulama değildir.',{exact:true}).waitFor();await submitted(()=>page.getByRole('button',{name:'Tanıma talebini kaydet',exact:true}).click());await page.getByText('Teknik inceleme bekleniyor.',{exact:true}).waitFor();record('Öğrenen kendi kaydına bağlı dosya özetli tanıma talebi hazırladı');
  await open('it');await page.getByLabel('İncelenen teknik rapor referansı',{exact:true}).fill('Sentetik düzenleyici kayıt inceleme raporu');await page.getByLabel('Teknik inceleme sonucu',{exact:true}).selectOption('accepted');await page.getByLabel('Gerekçe',{exact:true}).fill('Sentetik belgenin kaynak kaydı insan tarafından incelendi.');await submitted(()=>page.getByRole('button',{name:'Teknik incelemeyi kaydet',exact:true}).click());await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('credits');await page.getByText('Etkin yerel kredi kaydı yok.',{exact:true}).waitFor();record('İnsan teknik incelemesi kredi üretmedi');
  const decision=async(outcome,credits,remote)=>{await page.getByLabel('Tanıma kararı',{exact:true}).selectOption(outcome);await page.getByLabel('Kabul edilen kredi',{exact:true}).fill(credits);await page.getByLabel('Kabul edilen uzaktan kredi',{exact:true}).fill(remote);await page.getByLabel('Yerel karar referansı',{exact:true}).fill('Sentetik yerel akademik karar referansı');await page.getByLabel('İncelenmiş tekil kazanım anahtarı',{exact:true}).fill('GAIN-1');await page.getByLabel('Önceki ders inceleme referansı',{exact:true}).fill('Sentetik önceki ders kayıt incelemesi');await page.getByLabel('Önceki ders ve eşdeğer kazanım kayıtlarını inceledim.',{exact:true}).check();await page.getByLabel('Tanıma kararı gerekçesi',{exact:true}).fill('Sentetik kazanımlar hedef ders için bağımsız incelendi.');await submitted(()=>page.getByRole('button',{name:'Tanıma kararını kaydet',exact:true}).click());};
  await open('judge');await decision('full','10','5');await page.getByText('Tam tanıma · 10 kredi',{exact:true}).waitFor();record('Ayrı komisyon rolü tam tanımayı ve iki paydasını kaydetti');
  await open('student');await page.getByLabel('Tanıma kararına itiraz gerekçesi',{exact:true}).fill('Sentetik kazanımların kısmi karşılığı için bağımsız inceleme istiyorum.');await submitted(()=>page.getByRole('button',{name:'Tanıma itirazını kaydet',exact:true}).click());await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('credits');await page.getByText('İtiraz nedeniyle bekletiliyor',{exact:true}).waitFor();record('Öğrenen itirazı kredi satırını bekletti');
  await open('reviewer');await page.getByLabel('Tanıma itirazı sonucu',{exact:true}).selectOption('reassessment');await page.getByLabel('Gerekçe',{exact:true}).fill('İtiraz bağımsız incelendi; yeni insan kararı gereklidir.');await submitted(()=>page.getByRole('button',{name:'İncelemeyi kaydet',exact:true}).click());record('Bağımsız itiraz incelemesi otomatik kredi değiştirmedi');
  await open('judge');assert.equal(await page.getByRole('button',{name:'Tanıma kararını kaydet',exact:true}).count(),0);record('Önceki karar sahibi yeni karar veremez');
  await open('publisher');await decision('partial','6','3');await page.getByText('Kısmi tanıma · 6 kredi',{exact:true}).waitFor();record('Bağımsız yeni karar kısmi tanımayı eski karara bağladı');
  await open('student');await page.getByText('Tam tanıma · 10 kredi',{exact:true}).waitFor();await page.getByText('Kısmi tanıma · 6 kredi',{exact:true}).waitFor();await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('credits');await page.getByText('LOCAL-DIP / COURSE-1 · 6 kredi',{exact:true}).waitFor();assert.equal(await page.getByText('İtiraz nedeniyle bekletiliyor',{exact:true}).count(),0);await page.reload();await tab('Tanıma ve kredi');await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('credits');await page.getByText('LOCAL-DIP / COURSE-1 · 6 kredi',{exact:true}).waitFor();record('Yeniden yüklemede tek etkin kredi ve eski karar geçmişi korundu');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px tanıma defterinde yatay taşma yok');
  await open('other');await page.getByText('Bu kapsamda tanıma talebi bulunmuyor.',{exact:true}).waitFor();await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('credits');await page.getByText('Etkin yerel kredi kaydı yok.',{exact:true}).waitFor();record('Başka öğrenen başvuru karar ve krediyi göremez');
  await open('admin');await page.getByLabel('Tanıma görünümü',{exact:true}).selectOption('policies');await page.getByRole('button',{name:'Politikanın yeni sürümünü hazırla',exact:true}).click();await page.getByLabel('Politika değişikliği gerekçesi',{exact:true}).fill('Kaynak sürümü izole yerel kabul için yeniden incelenecek.');await submitted(()=>page.getByRole('button',{name:'Politika hazırlığını kaydet',exact:true}).click());await page.getByRole('heading',{name:'Sentetik yerel tanıma politikası · Sürüm 2',exact:true}).waitFor();record('Sürümlü politika yeni inceleme bekleyerek kaydedildi');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
