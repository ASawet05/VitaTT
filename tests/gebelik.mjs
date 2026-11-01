import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(20000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* ---- Motor düzeyi ---- */
const E = await p.evaluate(() => {
  const set = (stage, g = 'K') => { state.user = { ...state.user, gender: g, age: 30, pregnancyStage: stage, pregnancyLactation: !!stage }; };
  const lvl = (k, v, g = 'K') => { const r = VitaLabEvidence.evaluate(k, v, { gender: g }); return r.clinical ? r.clinical.level : r.status; };
  const eng = (k, v) => KDSSRuleEngine.evaluate(k, v, 'K', '');
  const out = {};
  set(''); out.hb_np_10_8 = lvl('hb', 10.8); out.hb_np_8 = lvl('hb', 8.0); out.cr_np_09 = eng('creatinine', 0.9).isHigh; out.egfr_np = !!calculateCKDEPI_eGFR(0.7, 30, 'K'); out.hbref_np = getVitaAppLabReference('hb');
  set('t1'); out.hb_t1_10_8 = lvl('hb', 10.8); out.hb_t1_6_8 = lvl('hb', 6.8); out.hb_t1_11_5 = lvl('hb', 11.5);
  set('t2'); out.hb_t2_10_8 = lvl('hb', 10.8); out.hb_t2_10_2 = lvl('hb', 10.2); out.hbref_t2 = getVitaAppLabReference('hb');
  set('t3'); out.hb_t3_8 = lvl('hb', 8.0); out.hb_t3_10_8 = lvl('hb', 10.8);
  out.cr_p_07 = eng('creatinine', 0.7).isHigh; out.cr_p_09 = eng('creatinine', 0.9).isHigh; out.cr_p_09_tox = eng('creatinine', 0.9).isToxic; out.cr_p_12_tox = eng('creatinine', 1.2).isToxic; out.crref_p = getVitaAppLabReference('creatinine');
  out.alt_p_30 = eng('alt', 30).isHigh; out.alt_p_50 = eng('alt', 50).isHigh; out.alt_p_80_tox = eng('alt', 80).isToxic;
  out.egfr_p = calculateCKDEPI_eGFR(0.7, 30, 'K'); out.egfr_p_ignore = !!calculateCKDEPI_eGFR(0.7, 30, 'K', { ignorePregnancy: true });
  out.fer_p_25 = VitaLabEvidence.evaluate('ferritin', 25, { gender: 'K' }).message; out.fer_p_10 = lvl('ferritin', 10);
  set('lactation'); out.hb_lac_11_5 = lvl('hb', 11.5); out.egfr_lac = !!calculateCKDEPI_eGFR(0.7, 30, 'K'); out.hbref_lac = getVitaAppLabReference('hb');
  set('t2', 'E'); out.male_ignores = !isPregnantNow() && lvl('hb', 12.5, 'E') === 'low_likely';
  set('');
  return out;
});
log('Gebe değil: Hb 10,8 anemi (düşük)', E.hb_np_10_8 === 'low_likely');
log('1. trimester: Hb 10,8 anemi', E.hb_t1_10_8 === 'low_likely');
log('1. trimester: Hb 11,5 yeterli', E.hb_t1_11_5 === 'adequate');
log('2. trimester: Hb 10,8 yeterli (sınır 10,5)', E.hb_t2_10_8 === 'adequate');
log('2. trimester: Hb 10,2 anemi', E.hb_t2_10_2 === 'low_likely');
log('Gebelikte Hb 6,8 acil (ağır anemi <7)', E.hb_t1_6_8 === 'urgent');
log('3. trimester: Hb 8,0 acil değil (≥7), anemi', E.hb_t3_8 === 'low_likely', E.hb_t3_8);
log('Gebe değil: Hb 8,0 acil (<8,5)', E.hb_np_8 === 'urgent');
log('Hb referans metni gebelikte değişir', /10,5/.test(E.hbref_t2) && /11,0/.test(String(E.hbref_np)) === false, E.hbref_np + ' → ' + E.hbref_t2);
log('Gebe değil: kreatinin 0,9 normal', E.cr_np_09 === false);
log('Gebelikte kreatinin 0,7 normal', E.cr_p_07 === false);
log('Gebelikte kreatinin 0,9 yüksek (toksik değil)', E.cr_p_09 === true && E.cr_p_09_tox === false);
log('Gebelikte kreatinin 1,2 acil (≥1,1)', E.cr_p_12_tox === true);
log('Kreatinin referans metni gebelikte 0,4–0,8', /0,4–0,8/.test(E.crref_p), E.crref_p);
log('Gebelikte ALT 30 normal, 50 yüksek, 80 acil', E.alt_p_30 === false && E.alt_p_50 === true && E.alt_p_80_tox === true);
log('Gebelikte eGFR hesaplanmaz', E.egfr_p === null);
log('Bağımsız hesaplayıcı (ignorePregnancy) çalışır', E.egfr_p_ignore === true);
log('Gebe değil: eGFR hesaplanır', E.egfr_np === true);
log('Gebelikte ferritin 25 mesajı gebelik notu içerir', /Gebelikte ferritin 30/.test(E.fer_p_25));
log('Gebelikte ferritin 10 düşük', E.fer_p_10 === 'low_likely');
log('Emzirme: gebelik eşikleri uygulanmaz (Hb 11,5 anemi)', E.hb_lac_11_5 === 'low_likely');
log('Emzirme: eGFR hesaplanır', E.egfr_lac === true);
log('Erkek profilinde gebelik bayrağı yok sayılır', E.male_ignores === true);

/* ---- Uçtan uca ---- */
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 29; document.getElementById('modalInputGender').value = 'K'; document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 70; document.getElementById('modalChronicNone').checked = true; document.getElementById('modalPregnancyStatus').value = 't2'; saveUserProfileFromModal(); }); await sleep(500);
log('Profil kaydı: trimester saklanır', await p.evaluate(() => state.user.pregnancyStage === 't2' && state.user.pregnancyLactation === true));
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabHb: '10.8', inputLabCreatinine: '0.9', inputLabFerritin: '25' })) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } saveCurrentLabRecordWithDate(); }); await sleep(500);
await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1700);
const U = await p.evaluate(() => ({
  rows: [...document.querySelectorAll('.vs-val')].map(d => d.innerText.replace(/\s+/g, ' ')),
  okchips: [...document.querySelectorAll('.vs-okchip')].map(e => e.innerText.replace(/\s+/g, ' ')),
  warn: [...document.querySelectorAll('.vs-warn-t')].map(e => e.innerText),
  protocol: (state.lastCDSS.protocol || []).length, egfr: state.lastCDSS.egfrResult,
}));
log('Hb 10,8 (2. trimester) sorunlu listede değil', !U.rows.some(r => /Hemoglobin/.test(r)), U.okchips.join(' | '));
log('Kreatinin 0,9 gebelikte "Yüksek" satırı', U.rows.some(r => /Kreatinin.*Yüksek/.test(r)), U.rows.join(' || '));
log('Satırda eGFR gösterilmez', !U.rows.some(r => /eGFR/.test(r)));
log('Gebelik uyarısı ve acil belirtiler satırı var', U.warn.some(w => /Gebelik \(2\. trimester\)/.test(w)) && U.warn.some(w => /Gebelikte acil belirtiler/.test(w)), U.warn.join(' | '));
log('Gebelikte takviye adayı yok', U.protocol === 0);
log('lastCDSS eGFR üretilmedi', U.egfr === null);
for (const v of ['view-report', 'view-settings', 'view-home', 'view-labs']) { await p.evaluate((v) => navigateToView(v), v); await sleep(500); }
await p.evaluate(() => { if (typeof renderReportTab === 'function') renderReportTab(); }); await sleep(300);
log('Diğer ekranlar gebelikte hatasız', errs.length === 0, errs.join(' | '));
console.log('errs', errs.join('|')); console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
