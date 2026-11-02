# VitaTakip uçtan uca testleri

Gerçek Chrome ile (puppeteer-core) uygulamayı açıp kullanıcı gibi dener.

## Hazırlık
1. Node.js 20+ kurulu olsun, bu klasörde: `npm i puppeteer-core`
2. Web uygulamasını yerelde sunun (örn. `npx serve -l 8080 app/src/main/assets/vita_web`)
3. `lib.mjs` içindeki Chrome yolunu (`executablePath`) kendi makinenize göre düzenleyin.

## Testler
| Dosya | Ne doğrular |
|---|---|
| `smoke.mjs` | Tüm ekranlar/pencereler açılıyor, konsol hatası ve dış istek yok |
| `uygulama-tanilama.mjs` | Uygulamanın kendi 159 testi (`VitaTakipDiagnostics.run()`) |
| `veri-yasam-dongusu.mjs` | Tahlil silme, belirti kaldırma, yenileme sonrası diriliş yok |
| `tahlil-yasam-dongusu.mjs` | Yanlış tahlil → doğru tahlil, alan boşaltma, taslak kaydı temizliği |
| `analiz-5-senaryo.mjs` | Klinik Analiz'in 5 kullanım senaryosu |
| `hasta-guvenligi.mjs` | Acil uyarılar, 18 yaş altı, gebelik uyarısı, yanlış besin eşleşmesi yok |
| `geri-bildirim.mjs` | Geri bildirim: adres görünmez, ad profilden, gerçek teslim kontrolü, yeniden deneme (sahte ağ) |
| `esik-hizalama.mjs` | Hb ve kreatinin eşikleri ekrandaki aralıkla aynı (sınır değerler, cinsiyet, gebelik, tüm parametrelerde tutarlılık) |
| `gebelik.mjs` | Gebelik referans seti: Hb (WHO/CDC), kreatinin, ALT, ferritin, eGFR kapatma, emzirme, uçtan uca |
| `neyimvar-son-adim.mjs` | "Sonuçları Gör" düğmesi yalnızca son adımda görünür |
| `yas-evresi.mjs` | Yaş/cinsiyete göre RDA tablosu, yaş notları, Klinik Analiz/Ayarlar/Rapor entegrasyonu |
| `belirti-kontrol.mjs` | Günlük "belirti hâlâ var mı" kartı |
| `gun-ai-anahtar.mjs` | Hesaba özel API anahtarı, gece sıfırlama, kompakt yerel yanıt |
| `rapor.mjs` | Kısa doktor özeti |
| `klinik-mantik.mjs` | Takviye adayı güvenlik değişmezleri (yüksek değerde aday yok, böbrek/hiperkalsemi kilidi, gebelik/çocuk, eGFR) |
| `guvenlik-xss.mjs` | Kullanıcı girdisinin kod olarak çalışmaması (XSS) |
| `bulut-esitleme.mjs` | Gerçek bulut eşitleme (Firebase emülatörü gerekir): iki cihaz, başka hesap, güvenlik kuralları |
| `bulut-kapali.mjs` | Bulut yapılandırılmamışken dürüst arayüz; e-posta yazarak hesap ele geçirme denemesi |
| `ana-sayfa-grafik.mjs` | Ana sayfa karşılama kartı ve tahlil gelişim grafiği |

Çalıştırma: `node smoke.mjs` (her biri bağımsızdır).
