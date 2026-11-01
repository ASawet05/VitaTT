import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(60000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
const r = await p.evaluate(async () => {
  if (!window.VitaTakipDiagnostics) return { error: 'VitaTakipDiagnostics yok' };
  let res = window.VitaTakipDiagnostics.run();
  if (res && typeof res.then === 'function') res = await res;
  const list = Array.isArray(res) ? res : (res.results || res.tests || []);
  return { total: list.length, failed: list.filter(x => x && x.passed === false).map(x => x.name + ' :: ' + (x.detail || '')), raw: Array.isArray(res) ? undefined : Object.keys(res) };
});
console.log(JSON.stringify(r, null, 1));
console.log('errs', errs.join('|'));
await b.close(); process.exit(0);
