// Tests the real built React portal and local HTTP core with disposable synthetic records.
// This runner never contacts production, signs credentials, or changes gateway authentication.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
if(process.env.VERCEL || process.env.VERCEL_ENV)throw Error('Local acceptance only');
const {chromium} = require(process.env.MYYS_PLAYWRIGHT_MODULE || path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || 'node_modules','playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results','myys-membership');fs.mkdirSync(out,{recursive:true});
const server=spawn(process.execPath,['scripts/myys-local-acceptance.mjs','--membership'],{cwd:root,stdio:['ignore','pipe','pipe']});
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
  browser=await chromium.launch({headless:true,executablePath:process.env.MYYS_CHROMIUM_EXECUTABLE,args});page=await browser.newPage({viewport:{width:1440,height:1000},locale:'tr-TR'});page.setDefaultTimeout(8000);page.on('pageerror',e=>errors.push(e.message));
  const open=async(actor)=>{await role(actor);await tab('Kişi ve üyelik');};
  const reason='Sentetik süreli görev değişikliği yalnız izole yerel kabul için hazırlanmıştır.';
  await open('student');assert.equal(await page.getByRole('heading',{name:'student · engineering',exact:true}).count(),1);assert.equal(await page.getByRole('heading',{name:'other · engineering',exact:true}).count(),0);assert.equal(await page.getByText('Bu üyelik için değişiklik hazırla',{exact:true}).count(),0);record('Öğrenen yalnız kendi üyeliğini gördü ve kendi yetkisini değiştiremedi');
  await open('admin');await page.getByLabel('Üyeliklerde ara',{exact:true}).fill('student');await page.getByText('Bu üyelik için değişiklik hazırla',{exact:true}).click();await page.getByLabel('Eğitici',{exact:true}).check();await page.getByLabel('Üyeliğin bitiş zamanı (UTC)',{exact:true}).fill('2028-01-01T12:30');await page.getByLabel('Üyelik değişiklik gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Görev atama dayanağı',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Üyelik önerisini kaydet',exact:true}).click());await page.getByText('Bağımsız inceleme bekliyor',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Üyelik incelemesini kaydet',exact:true}).count(),0);record('Süreli görev önerisi aynı kişi/birime bağlandı; hazırlayan inceleme yapamadı');
  await open('student');await page.getByText('Bağımsız inceleme bekliyor',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'Üyelik incelemesini kaydet',exact:true}).count(),0);record('Hedef kişi öneriyi gördü, bağımsız onay yetkisi verilmedi');
  await open('reviewer');await page.getByLabel('Üyeliklerde ara',{exact:true}).fill('student');await page.getByLabel('Üyelik inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Üyelik incelemesini kaydet',exact:true}).click());await page.getByText('Yerel değişiklik uygulandı',{exact:true}).waitFor();await page.getByText('1 yerel oturum kapatıldı. Akademik kayıtlar ve dış kimlik değişmedi.',{exact:true}).waitFor();await page.getByText('Bitiş (UTC): 2028-01-01T12:30:00.000Z',{exact:true}).waitFor();record('Ayrı yönetici süreli görevi uyguladı; UTC zamanı ve eski oturumun iptali görünür');
  await page.goto(base+'/__acceptance');await page.getByLabel('Test senaryosu').selectOption('student');await page.getByRole('button',{name:'Senaryoyu aç',exact:true}).click();await page.getByText('Kişiye bağlı kurumsal oturum gerekli. Pilot rol seçimi yetki sağlamaz.',{exact:true}).waitFor();await page.getByRole('heading',{name:'Kurum bağlantısı bekleniyor',exact:true}).waitFor();record('Değişiklikten önceki öğrenci oturumu yeniden kullanılamadı');
  await open('admin');await page.getByLabel('Üyeliklerde ara',{exact:true}).fill('student');await page.getByText('Bu üyelik için değişiklik hazırla',{exact:true}).click();await page.getByLabel('Üyelik işlemi',{exact:true}).selectOption('revoke');await page.getByLabel('Üyelik değişiklik gerekçesi',{exact:true}).fill(reason);await page.getByLabel('Görev atama dayanağı',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Üyelik önerisini kaydet',exact:true}).click());
  await open('reviewer');await page.getByLabel('Üyeliklerde ara',{exact:true}).fill('student');await page.getByLabel('Üyelik inceleme gerekçesi',{exact:true}).fill(reason);await submitted(()=>page.getByRole('button',{name:'Üyelik incelemesini kaydet',exact:true}).click());await page.getByText('Üyelik kapalı veya süresi dolmuş',{exact:true}).waitFor();assert.equal(await page.getByText('Yerel değişiklik uygulandı',{exact:true}).count(),2);record('Yeni öneri ve ayrı incelemeyle birim üyeliği kapatıldı; iki işlem geçmişi korundu');
  await page.reload();await tab('Kişi ve üyelik');await page.getByLabel('Üyeliklerde ara',{exact:true}).fill('student');await page.getByText('Üyelik kapalı veya süresi dolmuş',{exact:true}).waitFor();assert.equal(await page.getByText('Yerel değişiklik uygulandı',{exact:true}).count(),2);record('Yenilemede kişi, süreli görev ve geri çekme geçmişi korundu');
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(out,'desktop.png'),fullPage:true,animations:'disabled'});await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar').getBoundingClientRect().right<=1);await page.getByText('Bu üyelik için değişiklik hazırla',{exact:true}).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(out,'mobile.png'),fullPage:true,animations:'disabled'});record('390 px üyelik formunda ve inceleme geçmişinde yatay taşma yok');
  await page.getByRole('tab',{name:/^Kişi ve üyelik \(/}).focus();await page.keyboard.press('ArrowRight');await page.getByRole('tabpanel',{name:/^Akış ve saklama/}).waitFor();record('Üyelik sekmesinden klavyeyle sonraki çalışma alanına geçildi');
  await open('teacher');await tab('Öğrenen kayıtları');await page.getByText('Öğrenen / kayıt sahibi: student',{exact:true}).waitFor();record('Üyelik iptali mevcut akademik öğrenen kaydını silmedi');
  assert.deepEqual(errors,[]);record('İstemci istisnası yok');fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({at:new Date().toISOString(),scope:'isolated-local-acceptance',browser:browser.version(),checks,errors,production:false},null,2));
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true,animations:'disabled'}).catch(()=>{});console.error(current,e);process.exitCode=1;}
 finally{try{if(browser?.isConnected())await browser.close();}finally{server.kill('SIGTERM');}}
})();
