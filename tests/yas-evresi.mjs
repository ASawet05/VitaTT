import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.accept());
await p.evaluate(() => closeProfileModal()); await sleep(1000);
await p.evaluate(() => { try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const N = await p.evaluate(() => {
  const g = (age, gender, extra = {}) => { const u = { age, gender, ...extra }; const o = {}; VitaAgeStage.needs(u).forEach(x => o[x.n] = x.v); return o; };
  return { k25: g(25, 'K'), k40: g(40, 'K'), k55: g(55, 'K'), e25: g(25, 'E'), e40: g(40, 'E'), e55: g(55, 'E'), k75: g(75, 'K'), e75: g(75, 'E'), hamile: VitaAgeStage.needs({ age: 30, gender: 'K', pregnancyStage: 't2' }).length, cocuk: VitaAgeStage.needs({ age: 12, gender: 'K' }).length };
});
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
log('Kadın 25: Ca 1000, Mg 310, Fe 18, Zn 8', N.k25['Kalsiyum'] === '1000 mg' && N.k25['Magnezyum'] === '310 mg' && N.k25['Demir'] === '18 mg' && N.k25['Çinko'] === '8 mg', JSON.stringify(N.k25));
log('Kadın 40: Mg 320, Fe 18', N.k40['Magnezyum'] === '320 mg' && N.k40['Demir'] === '18 mg');
log('Kadın 55: Ca 1200, Fe 8 (menopoz sonrası)', N.k55['Kalsiyum'] === '1200 mg' && N.k55['Demir'] === '8 mg');
log('Erkek 25: Mg 400, Fe 8, Zn 11', N.e25['Magnezyum'] === '400 mg' && N.e25['Demir'] === '8 mg' && N.e25['Çinko'] === '11 mg');
log('Erkek 40: Mg 420', N.e40['Magnezyum'] === '420 mg');
log('Erkek 55: Ca 1000 (51–70 erkek)', N.e55['Kalsiyum'] === '1000 mg');
log('75 yaş: Ca 1200 (her iki cinsiyet), D 800 IU, protein 1,0–1,2', N.k75['Kalsiyum'] === '1200 mg' && N.e75['Kalsiyum'] === '1200 mg' && /^800/.test(N.k75['D vitamini']) && N.k75['Protein'] === '1,0–1,2 g/kg');
log('Gebelik ve 19 yaş altında tablo üretilmez', N.hamile === 0 && N.cocuk === 0);
const L = await p.evaluate(() => ({
  crea65: VitaAgeStage.labNote('creatinine', 'ok', { age: 70, gender: 'K' }), crea35: VitaAgeStage.labNote('creatinine', 'ok', { age: 35, gender: 'E' }), crea20: VitaAgeStage.labNote('creatinine', 'ok', { age: 22, gender: 'E' }),
  ferE: VitaAgeStage.labNote('ferritin', 'low', { age: 30, gender: 'E' }), ferK30: VitaAgeStage.labNote('ferritin', 'low', { age: 30, gender: 'K' }), ferK55: VitaAgeStage.labNote('hb', 'low', { age: 55, gender: 'K' }),
  b12_60: VitaAgeStage.labNote('b12', 'low', { age: 60, gender: 'K' }), b12_30: VitaAgeStage.labNote('b12', 'low', { age: 30, gender: 'K' }), d75: VitaAgeStage.labNote('d3', 'low', { age: 75, gender: 'E' })
}));
log('Kreatinin notu: ≥65 sistatin C, 30–64 yaşa bağlı düşüş, <30 yok', /sistatin/.test(L.crea65) && /30–40/.test(L.crea35) && L.crea20 === '');
log('Demir eksikliği notu: erkek ve menopoz sonrası kadın evet, genç kadın hayır', /AGA/.test(L.ferE) && /AGA/.test(L.ferK55) && L.ferK30 === '');
log('B12 notu yalnızca ≥50', /50 yaş/.test(L.b12_60) && L.b12_30 === '');
log('D vitamini notu ≥65', /800 IU/.test(L.d75));
/* Uçtan uca */
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 58; document.getElementById('modalInputGender').value = 'K'; document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 70; saveUserProfileFromModal(); }); await sleep(500);
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabFerritin: '8', inputLabHb: '10.5', inputLabCreatinine: '0.9' })) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } saveCurrentLabRecordWithDate(); }); await sleep(500);
await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1600);
const U = await p.evaluate(() => ({ card: !!document.querySelector('#vitaSimpleHost .as-card'), title: (document.querySelector('#vitaSimpleHost .as-card summary') || {}).innerText, age: [...document.querySelectorAll('#vitaSimpleHost .vs-age')].map(e => e.innerText.slice(0, 60)), tbl: document.querySelectorAll('#vitaSimpleHost .as-tbl tbody tr').length }));
log('Klinik Analiz: yaş kartı + 8 satır tablo', U.card && U.tbl === 8, JSON.stringify(U));
log('Klinik Analiz: ferritin/Hb düşükken yaş notu satırı', U.age.length >= 1, U.age.join(' | '));
await p.evaluate(() => navigateToView('view-settings')); await sleep(600);
const S = await p.evaluate(() => ({ card: !!document.querySelector('#settingsAgeStage .as-card'), len: document.getElementById('view-settings').innerText.length }));
log('Ayarlar: yaş kartı görünür', S.card, JSON.stringify(S));
await p.evaluate(() => navigateToView('view-report')); await sleep(900);
const R = await p.evaluate(() => document.getElementById('repSimple').innerText);
log('Rapor: yaş notu en fazla bir satır', (R.match(/Yaş:/g) || []).length === 1, (R.match(/Yaş:[^\n]*/) || [''])[0].slice(0, 80));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
