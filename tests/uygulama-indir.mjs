/* "Uygulamayı indir": giriş ekranında, Ayarlar'da ve ilk girişteki bildirimde Android / iPhone / Bilgisayar seçenekleri.
   Cihaz algılama, APK bağlantısı, #indir bağlantısı ve uygulamanın içinden açıldığında gizlenme. */
import { boot, sleep } from './lib.mjs';
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const UA = {
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  win: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
};
const modalState = p => p.evaluate(() => {
  const m = document.getElementById('vitaInstallModal');
  if (!m || m.hidden) return { open: false };
  const act = m.querySelector('.vita-dl-tab.is-active');
  const here = [...m.querySelectorAll('.vita-dl-tab')].find(b => !b.querySelector('.vita-dl-here').hidden);
  const apk = m.querySelector('[data-dl-apk]');
  return { open: true, tab: act && act.getAttribute('data-dl-tab'), here: here && here.getAttribute('data-dl-tab'),
    apk: apk && apk.getAttribute('href'), text: m.querySelector('#vitaDlPanel').innerText };
});

/* 1) Android telefondan giriş ekranı */
{
  const { b, p, errs } = await boot({ register: false, ua: UA.android });
  const row = await p.evaluate(() => { const e = document.querySelector('#authModal .vta-download'); if (!e) return null; const r = e.getBoundingClientRect(); return { shown: !e.hidden && r.height > 0, btns: [...e.querySelectorAll('button')].map(x => x.innerText.trim()) }; });
  log('Giriş ekranında "Uygulamayı indir": Android · iPhone · Bilgisayar', row && row.shown && row.btns.join('|') === 'Android|iPhone|Bilgisayar', JSON.stringify(row));
  await p.evaluate(() => document.querySelector('#authModal .vta-download button').click()); await sleep(300);
  const s = await modalState(p);
  log('Android → pencere açılır, Android sekmesi seçili ve "Bu cihaz"', s.open && s.tab === 'android' && s.here === 'android', JSON.stringify({ tab: s.tab, here: s.here }));
  log('APK bağlantısı GitHub Releases\'teki son sürüm', s.apk === 'https://github.com/ASawet05/VitaTT/releases/latest/download/VitaTakip.apk', s.apk);
  log('Kurulum adımları ve test sürümü notu', /Bilinmeyen uygulamaları/.test(s.text) && /test sürümü/.test(s.text));
  const z = await p.evaluate(() => { const r = document.querySelector('#vitaInstallModal .vita-dl-dialog').getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return Boolean(top && top.closest('#vitaInstallModal')); });
  log('Pencere giriş ekranının üstünde görünüyor', z);
  await p.screenshot({ path: 'indir_android.png' });
  await p.evaluate(() => document.querySelector('[data-dl-tab="desktop"]').click()); await sleep(150);
  const d = await modalState(p);
  log('Sekme değiştirme: Bilgisayar adımları', d.tab === 'desktop' && /Yükle/.test(d.text) && !d.apk);
  await p.keyboard.press('Escape'); await sleep(150);
  log('Esc ile kapanır', !(await modalState(p)).open);
  log('Hata yok (Android)', errs.length === 0, errs.join(' | '));
  await b.close();
}

/* 2) iPhone: iOS sekmesi ve dürüst App Store notu */
{
  const { b, p, errs } = await boot({ register: false, ua: UA.ios });
  await p.evaluate(() => window.openVitaDownloadModal(null, null)); await sleep(300);
  const s = await modalState(p);
  log('iPhone → iPhone/iPad sekmesi kendiliğinden seçili', s.tab === 'ios' && s.here === 'ios', JSON.stringify({ tab: s.tab, here: s.here }));
  log('iPhone: "App Store sürümü henüz yok" + Ana Ekrana Ekle adımları', /App Store sürümü henüz yok/.test(s.text) && /Ana Ekrana Ekle/.test(s.text));
  await p.screenshot({ path: 'indir_ios.png' });
  log('Hata yok (iPhone)', errs.length === 0, errs.join(' | '));
  await b.close();
}

/* 3) Bilgisayar: #indir bağlantısı doğrudan açar; Ayarlar'da giriş var; ilk giriş bildiriminde 3 seçenek */
{
  const { b, p, errs } = await boot({ ua: UA.win, hash: '#indir' });
  await p.setViewport({ width: 1280, height: 860 });
  const s = await modalState(p);
  log('#indir bağlantısı pencereyi açar (Bilgisayar seçili)', s.open && s.tab === 'desktop' && s.here === 'desktop', JSON.stringify({ open: s.open, tab: s.tab }));
  await p.screenshot({ path: 'indir_pc.png' });
  await p.evaluate(() => document.querySelector('#vitaInstallModal [data-install-close]').click()); await sleep(150);
  const st = await p.evaluate(() => { const e = document.querySelector('#view-settings [data-vita-download-entry]'); return e ? { txt: e.innerText.replace(/\s+/g, ' ').trim(), hidden: e.hidden } : null; });
  log('Ayarlar: "Uygulamayı indir" satırı', st && /Uygulamayı indir/.test(st.txt) && /İndir/.test(st.txt) && !st.hidden, JSON.stringify(st));
  const toast = await p.evaluate(() => [...document.querySelectorAll('#vitaInstallSection [data-install]')].map(x => x.getAttribute('data-install')).join('|'));
  log('İlk giriş bildiriminde 3 seçenek', toast === 'android|ios|desktop', toast);
  await p.evaluate(() => document.querySelector('#vitaInstallSection [data-install="ios"]').click()); await sleep(200);
  log('Bildirimdeki iPhone düğmesi iPhone sekmesini açar', (await modalState(p)).tab === 'ios');
  log('Hata yok (Bilgisayar)', errs.length === 0, errs.join(' | '));
  await b.close();
}

/* 4) Android uygulamasının içinde: indirme girişleri gizli */
{
  const { b, p, errs } = await boot({ register: false, ua: UA.android, preload: () => { window.AndroidVitaBridge = {}; } });
  const h = await p.evaluate(() => [...document.querySelectorAll('[data-vita-download-entry]')].map(e => e.hidden || getComputedStyle(e).display === 'none'));
  log('Android uygulamasının içinde indirme seçenekleri gizli', h.length >= 2 && h.every(Boolean), JSON.stringify(h));
  log('Hata yok (uygulama içi)', errs.length === 0, errs.join(' | '));
  await b.close();
}
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
process.exit(0);
