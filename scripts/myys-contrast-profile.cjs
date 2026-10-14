// Axe 4.14.0: ignoreLength removes the single-character uncertainty heuristic.
// It does not exclude short text, lower contrast thresholds, or replace evaluation.
const assert = require('node:assert/strict');
// The rule embeds options which take precedence over check-only configuration.
// Keep the same check and all 4.14.0 defaults; move options to its documented check
// configuration so the sole changed option is applied (verified below).
const singleCharacterProfile = {
  rules: [{ id: 'color-contrast', any: ['color-contrast'] }],
  checks: [{ id: 'color-contrast', options: {
    ignoreUnicode: true, ignoreLength: true, ignorePseudo: false,
    boldValue: 700, boldTextPt: 14, largeTextPt: 18,
    contrastRatio: { normal: { expected: 4.5 }, large: { expected: 3 } },
    pseudoSizeThreshold: .25, shadowOutlineEmMax: .2, textStrokeEmMin: .03,
  } }],
};
async function verifySingleCharacterProfile(page, axe) {
  assert.equal(axe.version, '4.14.0');
  await page.setContent(`<!doctype html><html lang="tr"><head><title>Karşıtlık ölçüm sınaması</title>
    <style>body{background:#fff;color:#000}p{font:16px Arial;margin:12px}.low{color:#888}.large{font-size:24px}</style>
    </head><body><p id="digit-low" class="low">5</p><p id="word-low" class="low">Sayaç</p>
    <p id="digit-good">5</p><p id="large-good" class="low large">Sayaç</p>
    <p id="gradient" style="color:white;background:linear-gradient(#035,#246)">Sayaç</p></body></html>`);
  await page.addScriptTag({ content: axe.source });
  const result = await page.evaluate(async profile => {
    const run = async () => {
      const r = await axe.run(document, { runOnly: ['color-contrast'], iframes: false });
      return Object.fromEntries(['violations','incomplete','passes'].map(k => [k, r[k].flatMap(r => r.nodes.map(n => ({ target: n.target[0], data: n.any[0]?.data })))]));
    };
    const normal = await run(); axe.configure(profile); const strict = await run();
    return { normal, strict };
  }, singleCharacterProfile);
  const has = (profile, group, target) => result[profile][group].some(n => n.target === '#' + target);
  assert(has('normal','incomplete','digit-low'));
  assert(has('strict','violations','digit-low'));
  assert(has('normal','violations','word-low') && has('strict','violations','word-low'));
  assert(has('normal','passes','digit-good') && has('strict','passes','digit-good'));
  assert(has('normal','passes','large-good') && has('strict','passes','large-good'));
  assert(has('normal','incomplete','gradient') && has('strict','incomplete','gradient'));
  assert.equal(result.strict.violations.find(n=>n.target==='#digit-low').data.expectedContrastRatio,'4.5:1');
  assert.equal(result.strict.passes.find(n=>n.target==='#large-good').data.expectedContrastRatio,'3:1');
  return result;
}
module.exports = { singleCharacterProfile, verifySingleCharacterProfile };
