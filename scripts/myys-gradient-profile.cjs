const assert=require('node:assert/strict');
const {contrast,composite,measureGradientText}=require('./myys-gradient-measure.cjs');
async function verifyGradientMeasurement(page){
  assert.equal(contrast([0,0,0],[255,255,255]),21);
  assert.deepEqual(composite([0,0,0,.5],[200,200,200]),[100,100,100]);
  assert(contrast([119,119,119],[255,255,255])<4.5);
  await page.setContent(`<!doctype html><html lang="tr"><head><title>Geçişli zemin ölçümü</title>
    <style>body{margin:0;padding:20px;background:white}p{font:16px Arial;margin:8px;padding:8px;width:260px}
    .dark{background:linear-gradient(90deg,#123,#234);color:white}.light{background:linear-gradient(90deg,#fafafa,#fff);color:#999}
    .pseudo{position:relative}.pseudo::before{content:' ';position:absolute;inset:0}.wrap{position:relative;width:300px}.cover{position:absolute;inset:0;background:white}</style></head><body>
    <p id="good" class="dark" style="border:1px solid currentColor">Öğrenme çıktısı</p>
    <p id="low" class="light">Öğrenme çıktısı</p>
    <p id="alpha" class="dark" style="color:rgba(255,255,255,.3)">Öğrenme çıktısı</p>
    <p id="opacity" class="dark" style="opacity:.5">Öğrenme çıktısı</p>
    <p id="shadow" class="dark" style="text-shadow:1px 1px black">Öğrenme çıktısı</p>
    <p id="pseudo" class="dark pseudo">Öğrenme çıktısı</p>
    <div class="wrap"><p id="covered" class="dark">Öğrenme çıktısı</p><div class="cover"></div></div>
    <p id="scroll" class="dark" style="margin-top:1200px">Aşağıdaki öğrenme çıktısı</p></body></html>`);
  const before=await page.locator('#good').getAttribute('style');const border=await page.locator('#good').evaluate(n=>getComputedStyle(n).borderColor);
  const results={};for(const id of ['good','low','alpha','opacity','shadow','pseudo','covered'])results[id]=await measureGradientText(page.mainFrame(),['#'+id]);
  assert.equal(results.good.status,'sample-sufficient',JSON.stringify(results.good));
  assert.equal(results.low.status,'sample-below-target');
  assert.equal(results.alpha.status,'sample-below-target');
  for(const id of ['opacity','shadow','pseudo','covered'])assert.equal(results[id].status,'review',id);
  assert.equal(await page.locator('#good').getAttribute('style'),before);
  assert.equal(await page.locator('#good').evaluate(n=>getComputedStyle(n).borderColor),border);
  assert.equal(await page.locator('#low').getAttribute('style'),null);
  assert.equal(await page.evaluate(()=>scrollY),0);
  results.scroll=await measureGradientText(page.mainFrame(),['#scroll']);
  assert.equal(results.scroll.status,'sample-sufficient');
  assert.equal(await page.evaluate(()=>scrollY),0);
  return {assertions:16,results};
}
module.exports={verifyGradientMeasurement};
