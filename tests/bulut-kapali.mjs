/* Bulut yapılandırılmamışken arayüz dürüst olmalı: "eşitlendi" denmez, elle e-posta ile hesap bağlanamaz,
   e-posta yazarak başkasının hesabına/yedeğine girilemez. */
import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot({ preload: () => { window.VITA_FIREBASE_CONFIG = false; } });
p.setDefaultTimeout(30000); p.on('dialog', d => d.accept());
await p.evaluate(() => { try { closeProfileModal(); } catch (e) {} try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

log('Mod: kapalı (yapılandırma yok)', await p.evaluate(() => VitaCloud.mode()) === 'off');
/* Eski sürümden kalmış doğrulamasız "bağlı hesap" kaydı geçersiz sayılır */
const fake = await p.evaluate(() => {
  localStorage.setItem('vitatakip_google_cloud_account', JSON.stringify({ connected: true, email: 'baskasi@example.com', source: 'google_portal' }));
  return getLinkedGoogleCloudAccount().connected;
});
log('Doğrulamasız eski bağlantı "bağlı" sayılmaz', fake === false);
await p.evaluate(() => openCloudSyncModal('app')); await sleep(300);
const M = await p.evaluate(() => ({
  title: document.getElementById('cloudModalStatusTitle').textContent,
  tag: document.getElementById('cloudModalSourceTag').textContent,
  detail: document.getElementById('cloudModalAccountDetail').textContent,
  manualHidden: document.getElementById('cloudSyncNameInput').closest('.pt-2').classList.contains('hidden'),
  signHidden: document.getElementById('btnTriggerNativeGoogleSignIn').classList.contains('hidden'),
  backup: document.getElementById('btnCloudBackupNow').innerText.trim(),
  restore: document.getElementById('btnCloudRestoreNow').innerText.trim()
}));
log('Pencere dürüst: "Bulut eşitleme etkin değil / Yalnızca bu cihaz"', /etkin değil/.test(M.title) && /Yalnızca bu cihaz/.test(M.tag) && /otomatik görünmez/.test(M.detail), JSON.stringify(M));
log('Elle e-posta ile bağlama alanı ve sahte giriş düğmesi gizli', M.manualHidden && M.signHidden);
log('Düğmeler dosya yedeğine yönlendiriyor', /Yedek dosyası indir/.test(M.backup) && /Yedekten geri yükle/.test(M.restore), M.backup + ' | ' + M.restore);
/* "Şimdi buluta yedekle" → buluta gittiğini iddia etmez */
const S = await p.evaluate(() => { window.exportDataBackup = () => { window.__exported = true; }; const r = syncDataToCloudNow(true); return { r, exported: !!window.__exported, fb: document.getElementById('cloudSyncModalFeedback').textContent, hdr: (document.getElementById('headerCloudSyncSublabel') || {}).textContent }; });
log('"Eşitlendi" denmiyor; dosya yedeği iniyor', S.r === false && S.exported && /etkin değil/.test(S.fb) && !/Eşitlendi/i.test(S.hdr || ''), JSON.stringify(S));
/* E-posta yazıp "geri yükle" ile başka hesaba girilemez */
const T = await p.evaluate(() => {
  const before = activeUserId;
  localStorage.setItem('vitatakip_cloud_backup_kurban@example.com', JSON.stringify({ app: 'VitaTakip', user: { name: 'Kurban' }, labHistory: [{ date: '2026-01-01', ferritin: 5 }] }));
  document.getElementById('cloudSyncEmailInput').value = 'kurban@example.com';
  const inp = document.getElementById('drawerImportBackupInput'); let clicked = false; inp.click = () => { clicked = true; };
  restoreDataFromCloudNow();
  return { same: activeUserId === before, labs: state.labHistory.length, name: state.user && state.user.name, clicked };
});
log('E-posta yazarak başkasının yedeğine/hesabına girilemiyor', T.same && T.labs === 0 && T.name !== 'Kurban', JSON.stringify(T));
log('Geri yükleme dosya seçiciyi açıyor', T.clicked);
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
