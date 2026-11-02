# Üçüncü taraf kütüphaneler (yerel kopyalar)

Bu dosyalar uygulamanın çalışma anında dış sunuculara (CDN) bağlanmaması için yerel olarak barındırılır.
Sürüm yükseltirken ilgili npm paketinden yeniden kopyalayın ve `sw.js` içindeki `CACHE_VERSION` değerini artırın.

| Klasör | Paket / sürüm | Lisans | Kullanım |
|---|---|---|---|
| `fontawesome/` | @fortawesome/fontawesome-free 6.7.2 (yalnızca woff2 yazı tipleri) | Yazı tipleri SIL OFL 1.1 (`LICENSE.txt`) | Simgeler |
| `pdfjs/` | pdfjs-dist 3.11.174 | Apache-2.0 | e-Nabız PDF tahlil aktarımı |
| `chartjs/` | chart.js 4.4.7 | MIT | Tekil trend grafiği |
| `html5-qrcode/` | html5-qrcode 2.3.8 | Apache-2.0 | Kamerayla barkod/karekod |
| `zxing/` | @zxing/browser 0.1.5 (@zxing/library içerir) | MIT/Apache-2.0 | Yedek barkod okuyucu |
| `firebase/` | firebase 11.10.0 (yalnızca app + auth + firestore; esbuild ile tek dosya) | Apache-2.0 (`LICENSE`) | İsteğe bağlı bulut eşitleme (yalnızca yapılandırılırsa yüklenir) |
