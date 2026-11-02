/* Gerçek bulut eşitleme — Firebase emülatörüyle uçtan uca.
   Önkoşul: proje kökünde `firebase emulators:start --only auth,firestore --project demo-vitatakip`
   (firestore.rules emülatörde de uygulanır).
   Senaryo: "bilgisayar" ve "telefon" iki ayrı tarayıcı (ayrı depolama). Aynı Google hesabı → aynı veri;
   farklı hesap → veri görünmez; kurallar başkasının kaydını okumayı engeller. */
import { boot, sleep } from './lib.mjs';

const CFG = {
  apiKey: 'demo-key', authDomain: 'demo-vitatakip.firebaseapp.com', projectId: 'demo-vitatakip', appId: 'demo-app',
  firestoreDatabaseId: '(default)',
  emulator: { auth: 'http://127.0.0.1:9099', firestoreHost: '127.0.0.1', firestorePort: 8085 }
};
const preload = (cfg) => { window.VITA_FIREBASE_CONFIG = cfg; };
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

async function device(register) {
  const d = await boot({ preload, preloadArg: CFG, register });
  d.p.setDefaultTimeout(30000);
  d.p.on('dialog', x => x.accept()); /* KVKK rızası ve çakışma soruları: "Tamam" */
  await d.p.evaluate(() => { try { closeProfileModal(); } catch (e) {} try { finishVitaSpotlightTour(true); } catch (e) {} });
  /* SDK yüklenene kadar bekle */
  for (let i = 0; i < 30; i++) { if (await d.p.evaluate(() => !!window.VitaFirebaseSDK)) break; await sleep(300); }
  return d;
}
const signIn = (p, sub, email, name) => p.evaluate((s, e, n) => VitaCloud._testSignIn(s, e, n).then(() => true, err => 'HATA ' + err.code), sub, email, name);

/* 1) Bilgisayar: yerel hesapla veri gir, Google ile giriş yap → buluta gider */
const pc = await device(true);
log('Mod: web (yapılandırma yüklendi)', await pc.p.evaluate(() => VitaCloud.mode()) === 'web');
await pc.p.evaluate(() => {
  openProfileModal(false);
  document.getElementById('modalInputAge').value = 41; document.getElementById('modalInputGender').value = 'K';
  document.getElementById('modalInputHeight').value = 168; document.getElementById('modalInputWeight').value = 64;
  saveUserProfileFromModal();
  navigateToView('view-labs');
  const set = (id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); };
  set('inputLabFerritin', '11'); set('inputLabB12', '210');
  saveCurrentLabRecordWithDate();
  state.selectedSymptoms = new Set(['hair_loss']); state.selectedSymptomsArray = ['hair_loss']; saveState();
});
await sleep(500);
const s1 = await signIn(pc.p, 'google-ayse', 'ayse@example.com', 'Ayşe Yılmaz');
log('Bilgisayarda Google girişi', s1 === true, String(s1));
await sleep(5000);
const pcState = await pc.p.evaluate(() => ({ user: VitaCloud.user(), linked: (getUsersDb().find(u => u.id === activeUserId) || {}).cloudUid, hdr: (document.getElementById('headerCloudSyncSublabel') || {}).textContent }));
log('Yerel hesap doğrulanmış kimliğe bağlandı', pcState.user && pcState.linked === pcState.user.uid, JSON.stringify(pcState));

/* 2) Telefon: boş tarayıcı, aynı Google hesabı → bilgisayardaki veriler gelir */
const phone = await device(false);
const s2 = await signIn(phone.p, 'google-ayse', 'ayse@example.com', 'Ayşe Yılmaz');
log('Telefonda aynı hesapla giriş', s2 === true, String(s2));
await sleep(5000);
const ph = await phone.p.evaluate(() => ({ labs: state.labHistory.length, fer: state.labHistory[0] && state.labHistory[0].ferritin, sym: Array.from(state.selectedSymptoms), age: state.user && state.user.age, authOpen: (document.getElementById('authModal') || {}).style?.display }));
log('Bilgisayardaki tahlil telefonda görünüyor', ph.labs === 1 && Number(ph.fer) === 11, JSON.stringify(ph));
log('Belirti ve profil de geldi', ph.sym.includes('hair_loss') && Number(ph.age) === 41);

/* 3) Telefonda değişiklik → bilgisayara döner */
await phone.p.evaluate(() => { state.supplements = [{ id: 'sup_tel', name: 'D3 Damla', selectedForm: 'Damla', doseText: '1', timing: 'Sabah', taken: false }]; saveState(); });
await sleep(4500);
await pc.p.evaluate(() => VitaCloud.pull({}));
await sleep(3000);
const back = await pc.p.evaluate(() => (state.supplements || []).map(s => s.name));
log('Telefondaki değişiklik bilgisayara geldi', back.includes('D3 Damla'), JSON.stringify(back));

/* 4) Farklı Google hesabı → Ayşe'nin verisi görünmez */
const other = await device(false);
await signIn(other.p, 'google-mehmet', 'mehmet@example.com', 'Mehmet Kaya');
await sleep(4000);
const ot = await other.p.evaluate(() => ({ labs: state.labHistory.length, sups: (state.supplements || []).length }));
log('Başka hesap Ayşe\'nin verisini görmüyor', ot.labs === 0 && ot.sups === 0, JSON.stringify(ot));

/* 5) Güvenlik kuralı: Mehmet oturumuyla Ayşe'nin belgesi okunamaz/yazılamaz */
const rule = await other.p.evaluate(async (ayseUid) => {
  const sdk = window.VitaFirebaseSDK; const cfg = window.VITA_FIREBASE_CONFIG;
  const app = sdk.initializeApp({ apiKey: cfg.apiKey, projectId: cfg.projectId, authDomain: cfg.authDomain, appId: cfg.appId }, 'probe');
  const auth = sdk.getAuth(app); sdk.connectAuthEmulator(auth, cfg.emulator.auth, { disableWarnings: true });
  const db = sdk.getFirestore(app, cfg.firestoreDatabaseId); sdk.connectFirestoreEmulator(db, cfg.emulator.firestoreHost, cfg.emulator.firestorePort);
  await sdk.signInWithCredential(auth, sdk.GoogleAuthProvider.credential(JSON.stringify({ sub: 'google-mehmet', email: 'mehmet@example.com', email_verified: true })));
  const out = {};
  try { await sdk.getDoc(sdk.doc(db, 'users', ayseUid, 'portal_state', 'main')); out.read = 'izin verildi'; } catch (e) { out.read = e.code; }
  try { await sdk.setDoc(sdk.doc(db, 'users', ayseUid, 'portal_state', 'main'), { payloadJson: '{}' }, { merge: true }); out.write = 'izin verildi'; } catch (e) { out.write = e.code; }
  return out;
}, pcState.user.uid);
log('Kural: başkasının kaydını okuma engellendi', rule.read === 'permission-denied', JSON.stringify(rule));
log('Kural: başkasının kaydına yazma engellendi', rule.write === 'permission-denied');

/* 6) Elle e-posta yazarak "bağlama" artık mümkün değil */
const manual = await other.p.evaluate(() => { openCloudSyncModal('app'); const box = document.getElementById('cloudSyncNameInput').closest('.pt-2'); return box.classList.contains('hidden'); });
log('Elle e-posta ile bağlama alanı kapalı', manual);

/* 7) Uygulamadan çıkış → bulut oturumu da kapanır (ortak bilgisayar güvenliği) */
await pc.p.evaluate(() => handleLogout());
await sleep(1500);
log('Çıkışta bulut oturumu kapandı', await pc.p.evaluate(() => VitaCloud.user() === null));

const allErrs = [...pc.errs, ...phone.errs, ...other.errs];
log('Sayfa hatası yok', allErrs.length === 0, allErrs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await pc.b.close(); await phone.b.close(); await other.b.close(); process.exit(0);
