import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
await p.setViewport({ width: 400, height: 850 });
await p.evaluate(() => closeProfileModal()); await sleep(1300);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
await p.evaluate(() => navigateToView('view-neyim')); await sleep(800);
const st = () => p.evaluate(() => {
  const row = document.getElementById('cdssAnalysisActionRow'); const btn = document.getElementById('btnRunCDSS');
  const vis = !!row && getComputedStyle(row).display !== 'none' && row.getBoundingClientRect().height > 2;
  return { step: document.getElementById('anamnesisCategoryProgressLabel')?.innerText, rowVisible: vis, btnText: btn?.innerText.trim(), hint: document.getElementById('anamnesisStepHint')?.innerText, next: !document.getElementById('anamnesisStepNext').hidden };
});
console.log('1. adım', JSON.stringify(await st()));
for (let i = 0; i < 5; i++) { await p.evaluate(() => window.vitaAnamnesisStep(1)); await sleep(250); }
console.log('6. adım', JSON.stringify(await st()));
await p.evaluate(() => window.vitaAnamnesisStep(1)); await sleep(300);
console.log('7. adım', JSON.stringify(await st()));
await p.evaluate(() => { [...document.querySelectorAll('.anamnesis-card')].slice(0, 2).forEach(x => x.click()); });
await p.evaluate(() => document.getElementById('btnRunCDSS').click()); await sleep(1800);
console.log('tıklayınca sayfa:', await p.evaluate(() => state.activeTab), '| özet:', await p.evaluate(() => document.querySelector('#vitaSimpleHost h2')?.innerText));
await p.evaluate(() => navigateToView('view-neyim')); await sleep(500);
await p.evaluate(() => window.vitaAnamnesisStep(-1)); await sleep(300);
console.log('geri gidince', JSON.stringify(await st()));
console.log('errs', errs.join('|'));
await b.close();
