/* Denetim düzeltmelerinin regresyon testi: yedekleme köprüsü, içe aktarma doğrulaması, sahte fotoğraf tanıma,
   uydurma barkodlar, hesap silme, tahlil aralık kontrolü, eksik profil, ALT, belirti tutarlılığı, çoklu sekme, yedek hatırlatması. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000);
p.on('dialog', d => (d.type() === 'prompt' ? d.accept('SİL') : d.accept()));
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'); });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* S2/S3: profil kaydedilmeden eGFR üretilmez, uyarı görünür */
const P0 = await p.evaluate(async () => {
  navigateToView('view-clinical-results'); await new Promise(r => setTimeout(r, 300));
  return { complete: isVitaProfileComplete(), egfr: calculateCKDEPI_eGFR(1.0, 40, 'K'), notice: !!document.querySelector('#view-clinical-results .vita-profile-incomplete-notice'), standalone: calculateCKDEPI_eGFR(1.0, 40, 'K', { ignorePregnancy: true })?.egfr };
});
log('Profil eksikken eGFR hesaplanmaz', P0.complete === false && P0.egfr === null, JSON.stringify(P0));
log('Profil eksik uyarısı Klinik Analiz sayfasında', P0.notice);
log('Bağımsız eGFR hesaplayıcı kendi girdileriyle çalışır', P0.standalone === 73, String(P0.standalone));
const P1 = await p.evaluate(async () => {
  openProfileModal(false);
  document.getElementById('modalInputAge').value = 40; document.getElementById('modalInputGender').value = 'E';
  document.getElementById('modalInputHeight').value = 178; document.getElementById('modalInputWeight').value = 80;
  saveUserProfileFromModal(); await new Promise(r => setTimeout(r, 300));
  return { complete: isVitaProfileComplete(), egfr: calculateCKDEPI_eGFR(1.0, 40, 'E')?.egfr, child: calculateCKDEPI_eGFR(0.5, 15, 'E'), notice: !!document.querySelector('.vita-profile-incomplete-notice') };
});
log('Profil kaydedilince eGFR hesaplanır, uyarı kalkar', P1.complete && P1.egfr === 98 && !P1.notice, JSON.stringify(P1));
log('18 yaş altında CKD-EPI kullanılmaz', P1.child === null);

/* S5: ALT erkek aralığı */
const A = await p.evaluate(() => ({ refE: getVitaAppLabReference('alt', 'E'), refK: getVitaAppLabReference('alt', 'K'), e40: KDSSRuleEngine.evaluate('alt', 40, 'E', '').isHigh, k40: KDSSRuleEngine.evaluate('alt', 40, 'K', '').isHigh, e55: KDSSRuleEngine.evaluate('alt', 55, 'E', '').isToxic, k90: KDSSRuleEngine.evaluate('alt', 90, 'K', '').isToxic }));
log('ALT: erkek 7–45, kadın 7–35; erkekte 40 normal, kadında yüksek', A.refE === '7–45 U/L' && A.refK === '7–35 U/L' && A.e40 === false && A.k40 === true, JSON.stringify(A));
log('ALT güvenlik uyarısı korunur (K 90 → uyarı, E 55 → uyarı değil)', A.k90 === true && A.e55 === false);

/* S4: belirti uyumu sabit eşik değil, ortak sınıflandırma */
const S4 = await p.evaluate(() => { const src = buildProfessorClinicalSynthesisData.toString(); return { fixed: /d3 < 30|mg < 1\.95|ca < 8\.8|folate < 5\.0|zinc < 75/.test(src), shared: /lowSide\("d3"\)/.test(src) }; });
log('Belirti–tahlil uyumu ekrandaki sınıflandırmayla aynı motordan', !S4.fixed && S4.shared, JSON.stringify(S4));

/* U2: fizyolojik olmayan tahlil değeri kaydedilmez */
const U2 = await p.evaluate(async () => {
  navigateToView('view-labs'); const before = state.labHistory.length;
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  set('inputLabD3', '-20'); set('inputLabFerritin', '40');
  saveCurrentLabRecordWithDate(); await new Promise(r => setTimeout(r, 300));
  const rejected = state.labHistory.length === before;
  const toast = document.getElementById('toastNotification')?.innerText || '';
  set('inputLabD3', '25'); saveCurrentLabRecordWithDate(); await new Promise(r => setTimeout(r, 500));
  return { rejected, toast: toast.replace(/\s+/g, ' ').slice(0, 120), accepted: state.labHistory.length === before + 1 };
});
log('Negatif D3 reddedilir ve nedeni gösterilir', U2.rejected && /Değeri kontrol edin/.test(U2.toast), U2.toast);
log('Geçerli değer kaydedilir', U2.accepted);

/* U1: fotoğraf tanıma ürün uydurmaz */
const U1 = await p.evaluate(() => ({
  med: JSON.parse(LocalClinicalFallbackEngine('', 'AAAA', { expectBoxJson: true, fileName: 'IMG_20261112_0931.jpg', mode: 'medication' })).urunAdi,
  sup: JSON.parse(LocalClinicalFallbackEngine('', 'AAAA', { expectBoxJson: true, fileName: 'photo.jpg', mode: 'supplement' })).urunAdi,
  named: JSON.parse(LocalClinicalFallbackEngine('', 'AAAA', { expectBoxJson: true, fileName: 'euthyrox.jpg', mode: 'medication' })).urunAdi
}));
log('Eşleşme yoksa ilaç/takviye uydurulmaz', U1.med === '' && U1.sup === '', JSON.stringify(U1));
log('Dosya adı eşleşirse yerel listeden doldurulur', /Euthyrox/i.test(U1.named), U1.named);

/* S1: uydurma (kontrol basamağı geçersiz) barkod kalmadı; Fosamax haftalık */
const S1 = await p.evaluate(() => {
  const valid = c => { const d = String(c).split('').map(Number); const s = d.slice(0, 12).reduce((a, x, i) => a + x * (i % 2 ? 3 : 1), 0); return (10 - s % 10) % 10 === d[12]; };
  const all = [...(window.VITA_SUPPLEMENT_DB || []), ...(window.VITA_PRESCRIPTION_DRUG_DB || [])].map(x => String(x.barcode || ''));
  const fakeEan = all.filter(c => /^\d{13}$/.test(c) && !valid(c));
  const fos = (window.VITA_PRESCRIPTION_DRUG_DB || []).find(d => /Fosamax/.test(d.urunAdi));
  return { fakeEan: fakeEan.length, internal: all.filter(c => /^VT-/.test(c)).length, fosWeekly: fos && fos.dozPeriyodu === 'haftalik' };
});
log('Geçersiz EAN-13 barkod kalmadı (dahili kimliğe çevrildi)', S1.fakeEan === 0 && S1.internal === 43, JSON.stringify(S1));
log('Fosamax haftalık doz olarak işaretli', S1.fosWeekly === true);

/* G1 + G7: yedek Android köprüsü üzerinden kaydedilir; son yedek tarihi tutulur */
const G1 = await p.evaluate(() => {
  window.AndroidVitaBridge = { saveTextFile: (n, m, t) => { window.__saved = { n, m, len: t.length, app: JSON.parse(t).app }; return true; } };
  exportDataBackup(); delete window.AndroidVitaBridge;
  return { saved: window.__saved, stamp: Boolean(localStorage.getItem('vitatakip_last_backup_' + activeUserId)) };
});
log('Yedek Android köprüsüyle dosyaya yazılır', G1.saved && G1.saved.app === 'VitaTakip' && /^VitaTakip_Yedek_/.test(G1.saved.n) && G1.saved.m === 'application/json', JSON.stringify(G1.saved));
log('Son yedek tarihi kaydedilir (hatırlatma için)', G1.stamp);

/* G4: zararlı/bozuk yedek doğrulanarak içe aktarılır */
const G4 = await p.evaluate(async () => {
  const X = f => `"><img src=x onerror="window.__xss=(window.__xss||[]).concat('${f}')">`;
  const bad = { app: 'VitaTakip', user: { name: X('name'), age: 'abc', gender: X('g'), height: -5, weight: 1e9, chronic: [X('c'), 5] },
    supplements: [{ name: X('sup'), kalanAdet: 'x', scheduleDays: [1, 9, 'a'] }, { nope: 1 }], hydration: { current: X('h') },
    labValues: { d3: -20, b12: 'abc', ferritin: 40 }, labHistory: [{ date: '2026-01-01', d3: 1e9, ferritin: 40 }, { date: 'kötü', d3: 30 }, { date: '2026-02-01', d3: -1 }] };
  const file = new File([JSON.stringify(bad)], 'y.json', { type: 'application/json' });
  const input = document.getElementById('drawerImportBackupInput'); const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files;
  input.dispatchEvent(new Event('change', { bubbles: true })); await new Promise(r => setTimeout(r, 1500));
  for (const v of ['view-home', 'view-labs', 'view-clinical-results', 'view-report', 'view-settings']) { navigateToView(v); await new Promise(r => setTimeout(r, 300)); }
  try { closeProfileModal(); } catch (_) {}
  return { xss: window.__xss || [], u: { age: state.user.age, h: state.user.height, w: state.user.weight, g: state.user.gender, done: state.user.profileCompleted, chronic: state.user.chronic.length },
    hyd: { cur: state.hydration.current, target: state.hydration.target }, labs: { d3: state.labValues.d3, b12: state.labValues.b12, ferritin: state.labValues.ferritin },
    hist: state.labHistory.map(r => [r.date, r.d3, r.ferritin]), sups: state.supplements.length, days: state.supplements[0]?.scheduleDays };
});
log('Zararlı yedekte kod çalışmaz', G4.xss.length === 0, JSON.stringify(G4.xss));
log('Aralık dışı profil değerleri reddedilir, profil "eksik" sayılır', G4.u.age === 28 && G4.u.h === 168 && G4.u.w === 68 && G4.u.g === 'K' && G4.u.done === false && G4.u.chronic === 1, JSON.stringify(G4.u));
log('Su hedefi makul kalır', G4.hyd.cur === 0 && G4.hyd.target > 1000 && G4.hyd.target < 6000, JSON.stringify(G4.hyd));
log('Geçersiz tahlil değerleri atlanır, geçerliler korunur', G4.labs.d3 === null && G4.labs.b12 === null && G4.labs.ferritin === 40, JSON.stringify(G4.labs));
log('Tahlil geçmişi: geçersiz tarih/tamamen geçersiz kayıt atlanır', G4.hist.length === 1 && G4.hist[0][1] === null && G4.hist[0][2] === 40, JSON.stringify(G4.hist));
log('Takviyeler doğrulanır', G4.sups === 1 && JSON.stringify(G4.days) === '[1]', JSON.stringify({ n: G4.sups, d: G4.days }));

/* G6: başka sekmedeki değişiklik bu sekmeye yansır */
const G6 = await p.evaluate(async () => {
  const key = 'vitatakip_supplements_' + activeUserId;
  const list = JSON.parse(localStorage.getItem(key) || '[]'); list.push({ id: 'diger_sekme', name: 'Diğer Sekme Takviyesi', timing: 'Sabah', taken: false, scheduleDays: [0, 1, 2, 3, 4, 5, 6] });
  const nv = JSON.stringify(list); localStorage.setItem(key, nv);
  window.dispatchEvent(new StorageEvent('storage', { key, newValue: nv }));
  await new Promise(r => setTimeout(r, 900));
  return state.supplements.some(s => s.id === 'diger_sekme');
});
log('Başka sekmedeki değişiklik bu sekmeye yüklenir', G6);

/* G3: hesap silme tüm yerel kayıtları ve IndexedDB'yi temizler */
const G3 = await p.evaluate(async () => {
  const id = activeUserId;
  saveDoctorNotes('not'); await new Promise(r => setTimeout(r, 900));
  const idbBefore = await new Promise(res => { const rq = indexedDB.open('VitaTakipLocalDB', 1); rq.onsuccess = () => { const g = rq.result.transaction('extendedData').objectStore('extendedData').get(id); g.onsuccess = () => { res(Boolean(g.result)); rq.result.close(); }; }; });
  await deleteMyAccountData(); await new Promise(r => setTimeout(r, 800));
  const leftKeys = Object.keys(localStorage).filter(k => k.includes(id));
  const idbAfter = await new Promise(res => { const rq = indexedDB.open('VitaTakipLocalDB', 1); rq.onsuccess = () => { const g = rq.result.transaction('extendedData').objectStore('extendedData').get(id); g.onsuccess = () => { res(Boolean(g.result)); rq.result.close(); }; }; });
  return { idbBefore, idbAfter, leftKeys, userGone: !getUsersDb().some(u => u.id === id) };
});
log('Hesap silinince bu hesaba ait hiçbir yerel anahtar kalmaz', G3.userGone && G3.leftKeys.length === 0, JSON.stringify(G3.leftKeys));
log('Hesap silinince IndexedDB anlık görüntüsü de silinir', G3.idbBefore === true && G3.idbAfter === false, JSON.stringify(G3));

log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
