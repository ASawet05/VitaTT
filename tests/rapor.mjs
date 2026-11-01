import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.dismiss());
await p.setViewport({ width: 400, height: 850 });
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 34; document.getElementById('modalInputGender').value = 'K'; document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 62; document.getElementById('modalChronicNone').checked = false; document.getElementById('modalCustomMedications').value = 'Metformin, Pantoprazol'; saveUserProfileFromModal(); }); await sleep(500);
for (const [date, vals] of [['2026-05-14', { inputLabFerritin: '9', inputLabB12: '180', inputLabHb: '10.9' }], ['2026-10-02', { inputLabFerritin: '14', inputLabB12: '230', inputLabHb: '11.4', inputLabD3: '26', inputLabCreatinine: '0.9' }]]) {
  await p.evaluate(() => navigateToView('view-labs')); await sleep(250);
  await p.evaluate((date, vals) => { for (const el of document.querySelectorAll('[id^="inputLab"]')) if (!el.id.includes('Date')) el.value = ''; document.getElementById('inputLabDate').value = date; for (const [id, v] of Object.entries(vals)) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } saveCurrentLabRecordWithDate(); }, date, vals); await sleep(500);
}
await p.evaluate(() => navigateToView('view-neyim')); await sleep(300);
await p.evaluate(() => document.querySelectorAll('.anamnesis-card').forEach(c => { const m = (c.getAttribute('onclick') || '').match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/); if (m && ['numbness', 'burning_tongue', 'hair_loss'].includes(m[1])) c.click(); })); await sleep(300);
await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1500);
await p.evaluate(() => navigateToView('view-report')); await sleep(1200);
const I = await p.evaluate(() => { const v = document.getElementById('view-report'); const r = document.getElementById('repSimple'); return { chars: v.innerText.length, h: Math.round(v.getBoundingClientRect().height), simple: r.innerText.length, rows: r.querySelectorAll('.rs-tbl tbody tr').length, hl: r.querySelectorAll('.rs-list li').length, tests: r.querySelectorAll('.rs-tests span').length, text: r.innerText.slice(0, 1500) }; });
console.log(I.text);
log('Kısa rapor görünür metin < 2200 karakter', I.chars < 2200, String(I.chars));
log('Tahlil satırları var', I.rows >= 4, String(I.rows));
log('Öne çıkan nokta ≤ 6', I.hl > 0 && I.hl <= 6, String(I.hl));
log('Test ≤ 9 öğe', I.tests <= 9, String(I.tests));
const fresh = await p.evaluate(async () => { document.getElementById('rsModeToggle').click(); await new Promise(r => setTimeout(r, 300)); const d = document.getElementById('view-report').innerText.length; document.getElementById('rsModeToggle').click(); await new Promise(r => setTimeout(r, 300)); return { d, mode: getDoctorReportMode() }; });
log('Ayrıntılı mod daha uzun, geri dönüş çalışıyor', fresh.d > I.chars && fresh.mode === 'concise', fresh.d + ' ' + fresh.mode);
const H = await p.evaluate(() => document.documentElement.scrollHeight);
await p.screenshot({ path: 'rep_new.png', fullPage: true });
// Gebelik: eGFR yok
await p.evaluate(() => { state.user.pregnancyStage = 't2'; saveState(); renderReportTab(); });
const g = await p.evaluate(() => document.getElementById('repSimple').innerText);
log('Gebelikte etiket + eGFR yok', /Gebelik 2/.test(g) && !/CKD-EPI/.test(g));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length, 'H', H);
await b.close(); process.exit(0);
