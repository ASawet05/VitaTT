import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(20000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const reset = () => p.evaluate(() => { state.labHistory = []; state.labValues = createEmptyLabValuesState(); state.labReferences = {}; document.querySelectorAll('.anamnesis-card').forEach(c => { c.classList.remove('border-indigo-500','bg-indigo-50/70','ring-1','ring-indigo-400','is-selected','selected'); c.setAttribute('aria-pressed','false'); const d = c.querySelector('.check-dot'); if (d) { d.className = 'w-4 h-4 rounded-full border border-slate-300 check-dot'; d.innerHTML = ''; } }); state.selectedSymptoms = new Set(); state.selectedSymptomsArray = []; for (const el of document.querySelectorAll('[id^="inputLab"]')) if (!el.id.includes('Date')) el.value = ''; });
const profile = (pr) => p.evaluate((pr) => { openProfileModal(false); document.getElementById('modalInputAge').value = pr.age; document.getElementById('modalInputGender').value = pr.gender; document.getElementById('modalInputHeight').value = 170; document.getElementById('modalInputWeight').value = 70; document.getElementById('modalChronicNone').checked = true; document.getElementById('modalPregnancyStatus').value = pr.preg ? 't2' : ''; saveUserProfileFromModal(); }, pr);
const labs = async (l) => { await p.evaluate(() => navigateToView('view-labs')); await sleep(250); await p.evaluate((l) => { for (const [id, v] of Object.entries(l)) { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); } saveCurrentLabRecordWithDate(); }, l); await sleep(400); };
const syms = async (keys) => { await p.evaluate(() => navigateToView('view-neyim')); await sleep(300); await p.evaluate((keys) => document.querySelectorAll('.anamnesis-card').forEach(c => { const m = (c.getAttribute('onclick') || '').match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/); if (m && keys.includes(m[1])) c.click(); }), keys); await sleep(250); };
const analyse = async () => { await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1600); return p.evaluate(() => ({ warn: [...document.querySelectorAll('.vs-warn-t')].map(e => e.innerText), sym: [...document.querySelectorAll('.vs-sym')].map(e => e.innerText.replace(/\s+/g, ' ')), protocol: (state.lastCDSS.protocol || []).map(x => x.formKey), food: (state.lastCDSS.lowLabNutrients || []).concat(state.lastCDSS.borderlineLabNutrients || []) })); };

// 1) ani uyuşma kırmızı bayrak
await reset(); await profile({ age: 40, gender: 'K' }); await syms(['numbness']); let r = await analyse();
log('uyuşma: ani/tek taraflı acil uyarısı', r.warn.some(w => /Uyuşma: ani veya tek taraflı/.test(w)), r.warn.join(' | '));
// 2) tırnakta koyu çizgi: besin eşleşmesi yok, derm uyarısı var
await reset(); await syms(['dark_nail_change', 'unexplained_swelling', 'sun_sensitive_rash']); r = await analyse();
log('koyu tırnak/şişlik/döküntü: vitamin eşleşmesi yok', r.sym.every(s => !/Olası eksik/.test(s)), r.sym.join(' || '));
log('bu 3 belirti için dermatoloji/acil uyarıları var', r.warn.some(w => /Tırnakta koyu/.test(w)) && r.warn.some(w => /Şişlik/.test(w)) && r.warn.some(w => /Güneşe duyarlı/.test(w)), r.warn.join(' | '));
log('bu 3 belirti için takviye adayı üretilmez', r.protocol.length === 0, JSON.stringify(r.protocol));
// 3) 18 yaş altı
await reset(); await profile({ age: 16, gender: 'E' }); await labs({ inputLabFerritin: '9' }); r = await analyse();
log('18 yaş altı uyarısı', r.warn.some(w => /18 yaş altı/.test(w)), r.warn.join(' | '));
log('18 yaş altı: takviye adayı yok', r.protocol.length === 0, JSON.stringify(r.protocol));
// 4) gebelik
await reset(); await profile({ age: 30, gender: 'K', preg: true }); await labs({ inputLabFerritin: '9', inputLabHb: '10.5' }); r = await analyse();
log('gebelik uyarısı', r.warn.some(w => /Gebelik/.test(w)), r.warn.join(' | '));
log('gebelikte takviye adayı yok', r.protocol.length === 0, JSON.stringify(r.protocol));
log('gebelik alanı kaydediliyor', await p.evaluate(() => state.user.pregnancyLactation === true));
// 5) erkekte gebelik işaretlenemez
await profile({ age: 30, gender: 'E', preg: true });
log('erkek profilinde gebelik bayrağı kapalı', await p.evaluate(() => state.user.pregnancyLactation === false));
// 6) acil hemoglobin
await reset(); await profile({ age: 35, gender: 'K' }); await labs({ inputLabHb: '7.4', inputLabCrp: '80', inputLabFerritin: '1200' }); r = await analyse();
log('Hb 7,4 → gecikmeden hekim satırı', r.warn.some(w => /Hemoglobin.*(gecikmeden|acil klinik)/.test(w)), r.warn.join(' | '));
log('CRP 80 → gecikmeden hekim satırı', r.warn.some(w => /CRP.*(gecikmeden|acil klinik)/.test(w)));
log('Ferritin 1200 → gecikmeden hekim satırı', r.warn.some(w => /Ferritin.*(gecikmeden|acil klinik)/.test(w)));
// 7) normal kişi: gereksiz uyarı yok
await reset(); await profile({ age: 30, gender: 'K' }); await labs({ inputLabFerritin: '60', inputLabHb: '13.5', inputLabB12: '500', inputLabD3: '40' }); r = await analyse();
log('normal kişide güvenlik uyarısı yok', r.warn.length === 0, r.warn.join(' | '));
console.log('errs', errs.join('|')); console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
