/* Klinik mantık değişmezleri: takviye adayı yalnızca güvenli ve gerekçeli durumlarda üretilir. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.accept());
await p.evaluate(() => closeProfileModal()); await sleep(900);
await p.evaluate(() => { try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* Senaryo çalıştırıcı: profil + tahlil (+referans) + belirti → protokol aday listesi */
async function run(s) {
  return p.evaluate(async (s) => {
    const prof = Object.assign({ age: 40, gender: 'K', height: 165, weight: 65, meds: '', chronicNone: true, preg: '' }, s.profile || {});
    openProfileModal(false);
    document.getElementById('modalInputAge').value = prof.age;
    document.getElementById('modalInputGender').value = prof.gender;
    document.getElementById('modalInputHeight').value = prof.height;
    document.getElementById('modalInputWeight').value = prof.weight;
    const ps = document.getElementById('modalPregnancyStatus'); if (ps) ps.value = prof.preg;
    document.getElementById('modalChronicNone').checked = !prof.meds && !(prof.chronic || []).length;
    document.querySelectorAll('input[name="modalChronic"], .modal-chronic-checkbox').forEach(c => { c.checked = (prof.chronic || []).includes(c.value); });
    document.getElementById('modalCustomMedications').value = prof.meds;
    saveUserProfileFromModal();
    if (prof.chronic && prof.chronic.length) { state.user.chronic = prof.chronic.slice(); saveState(); }
    /* temiz tahlil durumu */
    state.labHistory = []; state.labReferences = {}; state.labValues = createEmptyLabValuesState(); state.selectedSymptoms = new Set(); state.selectedSymptomsArray = []; saveState();
    navigateToView('view-labs');
    for (const el of document.querySelectorAll('[id^="inputLab"]')) if (!el.id.includes('Date')) el.value = '';
    for (const [k, v] of Object.entries(s.labs || {})) {
      const id = 'inputLab' + ({ d3: 'D3', b12: 'B12', ferritin: 'Ferritin', mg: 'Mg', ca: 'Calcium', zinc: 'Zinc', creatinine: 'Creatinine', folate: 'Folate', alt: 'Alt', hb: 'Hb', mcv: 'Mcv', crp: 'Crp' })[k];
      const e = document.getElementById(id); if (!e) continue; e.value = v; e.dispatchEvent(new Event('input', { bubbles: true }));
    }
    for (const [k, r] of Object.entries(s.refs || {})) { const e = document.getElementById('inputLabRef-' + k); if (e) { e.value = r; } if (typeof handleLabReferenceChange === 'function') handleLabReferenceChange(k, r); }
    if (Object.keys(s.labs || {}).length) saveCurrentLabRecordWithDate();
    (s.symptoms || []).forEach(k => state.selectedSymptoms.add(k)); state.selectedSymptomsArray = Array.from(state.selectedSymptoms); saveState();
    if (typeof invalidateClinicalAnalysisCache === 'function') invalidateClinicalAnalysisCache({ clearDOM: true });
    executeCDSSRules();
    await new Promise(r => setTimeout(r, 150));
    const L = state.lastCDSS || {};
    return { protocol: (L.protocol || []).map(x => x.formKey), contra: (L.contraindications || []).map(x => x.title), low: L.lowLabNutrients || [], border: L.borderlineLabNutrients || [], egfr: L.egfrResult ? L.egfrResult.egfr : null };
  }, s);
}
const has = (arr, k) => arr.includes(k);

let r;
r = await run({ labs: { b12: '950' }, refs: { b12: '200-1000 pg/mL' } });
log('B12 950 (lab ref 200–1000, yüksek-inceleme) → B12 adayı YOK', !has(r.protocol, 'B12') && !has(r.border, 'B12'), JSON.stringify(r.protocol) + ' border=' + r.border);
r = await run({ labs: { ferritin: '180', hb: '13' }, refs: { ferritin: '15-200 ng/mL' } });
log('Ferritin 180 kadın (lab ref 15–200) → demir adayı YOK', !has(r.protocol, 'Demir') && !has(r.border, 'Demir'), JSON.stringify(r.protocol));
r = await run({ labs: { d3: '60' }, refs: { d3: '30-100 ng/mL' } });
log('D vitamini 60 (lab ref 30–100) → D3 adayı YOK', !has(r.protocol, 'D3_K2'), JSON.stringify(r.protocol));
r = await run({ labs: { mg: '2.5' }, refs: { mg: '1.6-2.6 mg/dL' } });
log('Magnezyum 2,5 (lab ref 1,6–2,6) → Mg adayı YOK', !has(r.protocol, 'Magnezyum'), JSON.stringify(r.protocol));
r = await run({ labs: { ferritin: '400', hb: '13' }, symptoms: ['hair_loss'] });
log('Ferritin 400 + saç dökülmesi → demir adayı YOK (belirti modu)', !has(r.protocol, 'Demir'), JSON.stringify(r.protocol));
r = await run({ labs: { d3: '80' }, symptoms: ['muscle_weakness', 'bone_pain'] });
log('D vitamini 80 + belirti → D3 adayı YOK', !has(r.protocol, 'D3_K2'), JSON.stringify(r.protocol));
r = await run({ labs: { creatinine: '2.4' }, symptoms: ['eyelid_twitching', 'muscle_weakness'] });
log('Kreatinin 2,4 + kramp → Mg/kreatin adayı YOK, böbrek kilidi var', !has(r.protocol, 'Magnezyum') && !has(r.protocol, 'Kreatin') && r.contra.some(t => /BÖBREK/.test(t)), JSON.stringify(r.protocol));
r = await run({ labs: { mg: '1.5', creatinine: '2.4' } });
log('Mg düşük ama böbrek riski → Mg adayı YOK', !has(r.protocol, 'Magnezyum'), JSON.stringify(r.protocol));
r = await run({ labs: { d3: '10', ca: '11' } });
log('D düşük + kalsiyum yüksek → D3 adayı YOK (hiperkalsemi kilidi)', !has(r.protocol, 'D3_K2') && r.contra.some(t => /HİPERKALSEMİ/.test(t)), JSON.stringify(r.protocol));
r = await run({ labs: { d3: '10' } });
log('D düşük (10) → D3 adayı VAR', has(r.protocol, 'D3_K2'), JSON.stringify(r.protocol));
r = await run({ labs: { ferritin: '9', hb: '10.8' } });
log('Ferritin 9 + Hb 10,8 → demir adayı VAR', has(r.protocol, 'Demir'), JSON.stringify(r.protocol));
r = await run({ labs: { b12: '150' } });
log('B12 150 → B12 adayı VAR', has(r.protocol, 'B12'), JSON.stringify(r.protocol));
r = await run({ labs: { d3: '10', ferritin: '9' }, profile: { age: 15 } });
log('15 yaş → aday YOK', r.protocol.length === 0, JSON.stringify(r.protocol));
r = await run({ labs: { d3: '10', ferritin: '9' }, profile: { preg: 't2' } });
log('Gebelik (2. trimester) → aday YOK', r.protocol.length === 0, JSON.stringify(r.protocol));
r = await run({ labs: { d3: '10', ferritin: '9' }, profile: { preg: 'lactation' } });
log('Emzirme → aday YOK', r.protocol.length === 0, JSON.stringify(r.protocol));
r = await run({ labs: { d3: '30', b12: '500', ferritin: '80', mg: '2.0' } });
log('Tüm değerler normal, belirti yok → aday YOK', r.protocol.length === 0, JSON.stringify(r.protocol));
r = await run({ labs: { creatinine: '0.9' }, profile: { age: 15 } });
log('15 yaş → eGFR (yetişkin formülü) hesaplanmaz', r.egfr === null, String(r.egfr));
r = await run({ labs: { creatinine: '1.0' }, profile: { age: 60, gender: 'E' } });
log('CKD-EPI 2021: 60 yaş erkek, Cr 1,0 → eGFR 86 (142×(1,0/0,9)^-1,2×0,9938^60)', r.egfr === 86, String(r.egfr));
r = await run({ labs: { mg: '0.9' } });
log('Mg 0,9 (makul aralık dışı) → aday yok, uyarı mesajı', !has(r.protocol, 'Magnezyum'), JSON.stringify(r.protocol));
const M = await p.evaluate(() => VitaLabEvidence.evaluate('mg', 0.9).message);
log('Makul aralık dışı mesajı "ciddi derecede düşük olabilir" uyarısı içerir', /ciddi derecede düşük/.test(M), M.slice(0, 90));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
