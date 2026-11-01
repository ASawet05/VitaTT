/* Kullanıcı girdisi sayfaya kod olarak çalışmamalı (XSS). Tüm metin alanlarına zararlı içerik girilir,
   tüm ekranlar ve pencereler gezilir; tek bir çalıştırma bile başarısızlıktır. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.accept());
await p.evaluate(() => closeProfileModal()); await sleep(900);
await p.evaluate(() => { try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const PAY = n => `<img src=x onerror="window.__xss=(window.__xss||[]).concat('${n}')">`;

await p.evaluate((P) => {
  openProfileModal(false);
  document.getElementById('modalInputName').value = 'Ad' + P.name;
  document.getElementById('modalInputAge').value = 45; document.getElementById('modalInputGender').value = 'K';
  document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 70;
  document.getElementById('modalChronicNone').checked = false;
  document.getElementById('modalCustomMedications').value = 'Metformin, Ilac' + P.med;
  saveUserProfileFromModal();
  state.user.chronic = ['ppi', 'metformin', 'blood_thinner', 'kidney'];
  state.supplements = [
    { id: 'x1', name: 'Demir' + P.sup1, selectedForm: 'Tablet', doseText: 'Doz' + P.dose, timing: 'Sabah', taken: false, kalanAdet: 3, toplamAdet: 30, gunlukKullanim: 1 },
    { id: 'x2', name: 'Kalsiyum' + P.sup2, selectedForm: 'Tablet', doseText: '1', timing: 'Sabah', taken: false },
    { id: 'x3', name: 'Magnezyum' + P.sup3, selectedForm: 'Tablet', doseText: '1', timing: 'Akşam', taken: true }
  ];
  saveState();
}, { name: PAY('profil-ad'), med: PAY('ilac'), sup1: PAY('takviye1'), sup2: PAY('takviye2'), sup3: PAY('takviye3'), dose: PAY('doz') });
await sleep(400);
await p.evaluate((P) => {
  navigateToView('view-labs');
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  set('inputLabFerritin', '9'); set('inputLabB12', '180'); set('inputLabCreatinine', '1.6'); set('inputLabMg', '2.0');
  if (typeof handleLabReferenceChange === 'function') handleLabReferenceChange('ferritin', '15-150 ng/mL' + P.ref);
  saveCurrentLabRecordWithDate();
  state.selectedSymptoms = new Set(['hair_loss', 'numbness']); state.selectedSymptomsArray = Array.from(state.selectedSymptoms);
  try { localStorage.setItem('vitatakip_notes_' + activeUserId, 'Not' + P.note); } catch (_) {}
  saveState();
}, { ref: PAY('referans'), note: PAY('not') });
await sleep(500);

const visit = async (fn) => { try { await p.evaluate(fn); } catch (e) { console.log('  (gezinti hatası) ' + e.message.slice(0, 80)); } await sleep(500); };
for (const v of ['view-home', 'view-labs', 'view-neyim', 'view-clinical-results', 'view-report', 'view-settings']) await visit(new Function(`navigateToView('${v}'); try{ if('${v}'==='view-clinical-results') executeCDSSRules(); }catch(e){}`));
await visit(() => { renderAllAppViews && renderAllAppViews(); });
await visit(() => { toggleMedShieldDrawer && toggleMedShieldDrawer(true); });
await visit(() => { toggleMedShieldDrawer && toggleMedShieldDrawer(false); });
await visit(() => { renderReportTab(); setDoctorReportMode('detailed'); });
await visit(() => { setDoctorReportMode('concise'); });
await visit(() => { if (window.VitaLabTrend) { VitaLabTrend.toggle(); } });
await visit(() => { openProfileModal(true); });
await visit(() => { closeProfileModal(); });
await visit(() => { typeof printFridgeSchedule === 'function' && (window.print = () => {}, printFridgeSchedule()); });
await visit(() => { typeof checkDeprescribingOpportunities === 'function' && checkDeprescribingOpportunities(); });
await visit(() => { VitaAIChat && VitaAIChat.toggle && VitaAIChat.toggle(true); VitaAIChat.sendPreset && VitaAIChat.sendPreset('etkilesim'); });
await sleep(3500);
await visit(() => { typeof renderLabHistoryUI === 'function' && renderLabHistoryUI(); });
await visit(() => { typeof exportFHIRBundle === 'function' && 0; });
/* Hazırlanmış QR/barkod içeriği: düğme onclick'ine gömülen değer kod çalıştırmamalı */
await visit(() => {
  const evil = "1');window.__xss=(window.__xss||[]).concat('qr');//";
  try { handleBarcodeDetected(evil, 'test'); } catch (e) {}
});
await sleep(1500);
await p.evaluate(() => { document.querySelectorAll('[onclick*="applyBarcodeCatalogueMatch"],[onclick*="handleBarcodeDetected"]').forEach(btn => { try { btn.click(); } catch (e) {} }); });
await sleep(800);
const X = await p.evaluate(() => window.__xss || []);
log('Hiçbir kullanıcı girdisi kod olarak çalışmadı', X.length === 0, X.length ? 'çalışan: ' + [...new Set(X)].join(', ') : '');
const shown = await p.evaluate(() => document.body.innerText.includes('<img src=x'));
log('Zararlı içerik düz metin olarak görünüyor (kaçışlı)', shown);
log('Konsol hatası yok', errs.length === 0, errs.join(' | ').slice(0, 300));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
