/* VitaTakip servis çalışanı: çevrimdışı açılış için uygulama dosyalarını önbelleğe alır.
   Dosyalarda değişiklik yaptığınızda CACHE_VERSION değerini artırın ki kullanıcılar yeni sürümü alsın. */
const CACHE_VERSION = 'vitatakip-v69';
const CORE_FILES = [
  "./",
  "index.html",
  "manifest.json",
  "css/fontawesome.css",
  "css/food-alternatives.css",
  "css/overrides.css",
  "css/style.css",
  "css/auth.css",
  "css/clinical.css",
  "css/home.css",
  "css/tailwind.css",
  "css/tools.css",
  "js/compact-labs-neyim.js",
  "js/egfr-calculator.js",
  "js/evidence-guide.js",
  "js/install-app.js",
  "js/legal-onboarding.js",
  "js/medical-drawer.js",
  "js/doctor-tests.js",
  "js/clinical-simple.js",
  "js/add-sup-simple.js",
  "js/scanner-simple.js",
  "js/lazy-icon-fonts.js",
  "js/neyim-wizard.js",
  "js/neyimvar-final-tidy.js",
  "js/lab-trend.js",
  "js/recharts-lab-dashboard.js",
  "js/pwa-notification-checklist.js",
  "js/simplify-ui.js",
  "js/supplement_db.js",
  "js/prescription_drugs_db.js",
  "js/sw-register.js",
  "js/ui-enhancements.js",
  "js/visual-reference.js",
  "vendor/fontawesome/webfonts/fa-solid-900.woff2",
  "vendor/fontawesome/webfonts/fa-regular-400.woff2",
  "vendor/fontawesome/webfonts/fa-brands-400.woff2",
  "vendor/fontawesome/webfonts/fa-v4compatibility.woff2",
  "vendor/pdfjs/pdf.min.js",
  "vendor/pdfjs/pdf.worker.min.js",
  "vendor/chartjs/chart.umd.js",
  "vendor/html5-qrcode/html5-qrcode.min.js",
  "vendor/zxing/zxing-browser.min.js",
  "js/app/01-hash-ses-tts.js",
  "js/app/02-navigation.js",
  "js/app/03-global-search.js",
  "js/app/04-anamnesis-tabs.js",
  "js/app/05-clinical-rules.js",
  "js/app/06-state-lab-reference.js",
  "js/app/07-session-backup-fhir.js",
  "js/app/08-pdf-onboarding-conflicts.js",
  "js/app/09-symptom-review-storage.js",
  "js/app/10-daily-tracking-deprescribing.js",
  "js/app/11-cdss-analysis.js",
  "js/app/12-report-notifications-ai-chat.js",
  "js/app/13-ai-summary-barcode.js",
  "js/app/14-spotlight-tour.js",
  "js/app/15-fridge-schedule.js",
  "js/app/16-lab-evidence.js",
  "js/app/17-lab-insights.js",
  "js/app/18-food-alternatives.js",
  "js/app/19-app-startup.js",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png"
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    // Bir dosya eksik olsa bile kurulum başarısız olmasın: tek tek eklenir.
    await Promise.all(CORE_FILES.map(url => cache.add(url).catch(() => null)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('vitatakip-') && k !== CACHE_VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of allClients) {
      if ('focus' in client) {
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow('./index.html');
    }
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Yalnızca kendi dosyalarımız: Gemini API, CDN ve diğer dış istekler olduğu gibi geçer.
  if (url.origin !== self.location.origin) return;

  // Sayfa gezintisi ve JS/CSS dosyaları: önce ağ (güncel sürüm), ağ yoksa önbellek
  if (req.mode === 'navigate' || url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.endsWith('.html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(req, fresh.clone()).catch(() => null);
        }
        return fresh;
      } catch (_) {
        return (await caches.match(req, { ignoreSearch: true })) || (await caches.match('index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  // Diğer statik dosyalar (ikonlar vb.): önce önbellek, arkada güncelle
  event.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const network = fetch(req).then(async res => {
      if (res && res.ok) { const cache = await caches.open(CACHE_VERSION); cache.put(req, res.clone()).catch(() => null); }
      return res;
    }).catch(() => null);
    return cached || (await network) || Response.error();
  })());
});
