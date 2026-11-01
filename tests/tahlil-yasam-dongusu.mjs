import { boot, sleep } from './lib.mjs';
const only = process.argv[2];
const results = [];
const log = (n, ok, d) => { results.push([n, ok]); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? '  -> ' + d : '')); };

async function fresh() {
  const { b, p, errs } = await boot();
  await p.setViewport({ width: 400, height: 850 });
  await p.evaluate(() => closeProfileModal()); await sleep(1300);
  await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
  return { b, p, errs };
}
const setLab = (p, vals) => p.evaluate((vals) => {
  navigateToView('view-labs');
  for (const [id, v] of Object.entries(vals)) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }
}, vals);
const analysisText = async (p) => {
  await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1600);
  return p.evaluate(() => document.getElementById('view-clinical-results').innerText);
};
const lsDump = (p) => p.evaluate(() => { let s = ''; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); s += k + '=' + localStorage.getItem(k) + '\n'; } return s; });

// --- T1: yanlış tahlil silinip doğrusu girildi
if (!only || only === 'T1') {
  const { b, p, errs } = await fresh();
  await setLab(p, { inputLabFerritin: '9.37', inputLabB12: '187', inputLabCreatinine: '0.9' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(500);
  const id = await p.evaluate(() => state.labHistory[0].id);
  await p.evaluate((id) => deleteLabRecord(id), id); await sleep(500);
  let ls = await lsDump(p);
  log('T1a silinen tahlil localStorage\'da kalmadı', !/9\.37|"b12":187|187/.test(ls.replace(/usr_\d+_\w+/g, '')), (ls.match(/.{0,30}9\.37.{0,20}/) || [''])[0]);
  log('T1b state.labHistory boş, labValues boş', await p.evaluate(() => state.labHistory.length === 0 && Object.values(state.labValues).every(v => v === null || v === '')));
  await setLab(p, { inputLabFerritin: '80', inputLabB12: '600', inputLabCreatinine: '0.9' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(500);
  const t = await analysisText(p);
  log('T1c yeni normal tahlilde demir/B12 eksikliği sızmadı', !/Ferritin: Referans altı|B12: Referans altı|9\.37|187/.test(t), (t.match(/.{0,40}(Referans altı|187|9\.37).{0,40}/) || [''])[0]);
  log('T1d besin bölümünde demir/B12 yok (veya normal)', await p.evaluate(() => { const f = document.getElementById('foodAlternativesSection'); return !/Demir|B12/i.test(f.innerText) || f.classList.contains('hidden') || getComputedStyle(f).display === 'none'; }));
  ls = await lsDump(p);
  log('T1e localStorage\'da eski değer yok', !/9\.37/.test(ls));
  // yeniden yükle
  await p.reload({ waitUntil: 'networkidle2' }); await sleep(1500);
  log('T1f yenileme sonrası silinen tahlil dirilmedi', await p.evaluate(() => !JSON.stringify(state.labHistory).includes('9.37') && !JSON.stringify(state.labValues).includes('9.37')));
  if (errs.length) console.log('  errs', errs.join('|'));
  await b.close();
}

// --- T2: tek tahlil silindi → analizde hiç tahlil yok
if (!only || only === 'T2') {
  const { b, p } = await fresh();
  await setLab(p, { inputLabFerritin: '9.37', inputLabCreatinine: '1.5' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(500);
  await p.evaluate(() => navigateToView('view-neyim')); await sleep(400);
  await p.evaluate(() => { [...document.querySelectorAll('.anamnesis-card')].slice(0, 2).forEach(c => c.click()); }); await sleep(300);
  const id = await p.evaluate(() => state.labHistory[0].id);
  await p.evaluate((id) => deleteLabRecord(id), id); await sleep(500);
  const t = await analysisText(p);
  log('T2a silinen tahlil sonrası analizde kreatinin/ferritin izi yok', !/9\.37|Kreatinin 1\.5|eGFR/.test(t) || false, (t.match(/.{0,30}(9\.37|1\.5|eGFR).{0,30}/) || [''])[0]);
  log('T2b "güncel tahlil yok" moduna geçti', await p.evaluate(() => state.lastCDSS && state.lastCDSS.hasNoCurrentLabs === true && state.lastCDSS.hasArchiveLabs !== true), JSON.stringify(await p.evaluate(() => ({ nl: state.lastCDSS?.hasNoCurrentLabs, al: state.lastCDSS?.hasArchiveLabs, hist: state.labHistory.length }))));
  await b.close();
}

// --- T3: tek alanı boşaltma (aynı gün kaydı)
if (!only || only === 'T3') {
  const { b, p } = await fresh();
  await setLab(p, { inputLabFerritin: '9.37', inputLabB12: '187' });
  await p.evaluate(() => persistCurrentLabInputsToState({ silentUI: true })); await sleep(300);
  await p.evaluate(() => { const el = document.getElementById('inputLabFerritin'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  await p.evaluate(() => persistCurrentLabInputsToState({ silentUI: true })); await sleep(300);
  const st = await p.evaluate(() => ({ lv: state.labValues.ferritin, rec: state.labHistory[0]?.ferritin, b12: state.labHistory[0]?.b12 }));
  log('T3 formdan silinen ferritin kayıttan da silindi', st.lv == null && st.rec == null, JSON.stringify(st));
  await b.close();
}

// --- T4: form tamamen boşaltıldı ve kayıt yok
if (!only || only === 'T4') {
  const { b, p } = await fresh();
  await setLab(p, { inputLabFerritin: '9.37' });
  await p.evaluate(() => persistCurrentLabInputsToState({ silentUI: true })); await sleep(300);
  await p.evaluate(() => { const el = document.getElementById('inputLabFerritin'); el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); });
  await p.evaluate(() => persistCurrentLabInputsToState({ silentUI: true })); await sleep(300);
  const st = await p.evaluate(() => ({ lv: state.labValues.ferritin, hist: state.labHistory.length }));
  log('T4 form boşaltılınca otomatik oluşan taslak kayıt da gitti', st.lv == null && st.hist === 0, JSON.stringify(st));
  await b.close();
}

// --- T5: belirti tikinin kaldırılması
if (!only || only === 'T5') {
  const { b, p } = await fresh();
  await p.evaluate(() => navigateToView('view-neyim')); await sleep(500);
  const names = await p.evaluate(() => { const c = [...document.querySelectorAll('.anamnesis-card')].slice(0, 3); c.forEach(x => x.click()); return c.map(x => x.innerText.replace(/\s+/g, ' ').slice(0, 40)); });
  const t1 = await analysisText(p);
  await p.evaluate(() => editSymptomsFromClinicalResults()); await sleep(600);
  await p.evaluate(() => { const c = document.querySelectorAll('.anamnesis-card')[0]; c.click(); }); await sleep(400);
  const removed = await p.evaluate(() => { const meta = ANAMNESIS_DICTIONARY; return null; });
  const arr = await p.evaluate(() => ({ set: [...state.selectedSymptoms].length, arr: state.selectedSymptomsArray.length, ls: JSON.parse(localStorage.getItem('vitatakip_selected_symptoms_array') || '[]').length }));
  log('T5a işaret kaldırılınca set/array/localStorage 2', arr.set === 2 && arr.arr === 2 && arr.ls === 2, JSON.stringify(arr));
  await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1600);
  const info = await p.evaluate(() => ({ cnt: state.lastCDSS.selectedSymptoms.length, tests: window.computeDoctorTests().symTests.length, sectionText: document.getElementById('doctorTestsSection').innerText }));
  log('T5b analizde 2 belirti kaldı', info.cnt === 2, JSON.stringify({ cnt: info.cnt }));
  const firstName = names[0];
  await b.close();
}

// --- T6: profil reaktivitesi
if (!only || only === 'T6') {
  const { b, p } = await fresh();
  await p.evaluate(() => { openProfileModal(false); }); await sleep(500);
  const ids = await p.evaluate(() => [...document.querySelectorAll('#profileModal input, #profileModal select')].map(e => e.id + ':' + e.type).join(' '));
  console.log('  profil alanları:', ids);
  await b.close();
}
console.log('\nÖZET', results.filter(r => r[1]).length + '/' + results.length);
