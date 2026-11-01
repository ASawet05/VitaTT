# VitaTakip — Klinik ve Teknik Denetim Raporu

> **Önemli sınırlama.** Bu rapor, yazılım denetimi ve kural/eşik incelemesidir. Lisanslı bir hekim,
> klinik farmakolog veya tıbbi yazılım regülasyon uzmanının yerine geçmez. Aşağıdaki "açık riskler"
> bölümündeki maddeler yayın öncesinde nitelikli kişilerce onaylanmalıdır.

## 1. Kapsam ve yöntem

| Alan | Yöntem |
|---|---|
| Hesaplama çekirdeği | eGFR (CKD-EPI 2021) bağımsız formülle 56 durumda karşılaştırıldı; VKİ doğrulandı |
| Tahlil sınıflandırma | `VitaLabEvidence` kuralları ve kaynakları okundu; referans aralığı ile motor çıktısı tutarlılık testi |
| Uçtan uca senaryolar | 8 kişi senaryosu (profil + tahlil + belirti); yaş, cinsiyet, ilaç, böbrek, karaciğer, hiperkalsemi |
| Veri yaşam döngüsü | Tahlil silme/değiştirme, belirti kaldırma, yenileme sonrası diriliş, profil değişimi |
| Kural içeriği | Belirti sözlüğü (34 belirti), ilaç–besin etkileşim kuralları, takviye aday mantığı |
| Teknik sağlık | ESLint (hata sınıfı kurallar), sözdizimi, tüm ekran/pencere duman testi, dış bağımlılık taraması, gizli anahtar taraması |
| Uygulamanın kendi testleri | `VitaTakipDiagnostics.run()` — 159 test, tamamı geçiyor |

## 2. Bulgular ve yapılan düzeltmeler

### Hasta güvenliği (yüksek öncelik)
1. **İlaca özgü böbrek uyarısı kayboluyordu.** Sade görünüme geçişte "Metformin & azalmış GFR (laktik asidoz riski)" gibi uyarılar genel bir cümleye indirgenmişti. Düzeltildi: ilaca özgü uyarılar ayrı satır olarak gösteriliyor.
2. **Yanlış besin eşleştirmesi.** *Tırnakta koyu çizgi* (melanom ayırıcı tanısı), *güneşe duyarlı döküntü* (otoimmün) ve *açıklanamayan şişlik* (kalp/böbrek/karaciğer) belirtilerine vitamin/mineral bağlanmıştı; şişlikte böbrek hastası için magnezyum riskliydi. Besin eşleştirmesi kaldırıldı; bu belirtiler artık takviye adayı üretmiyor.
3. **Belirtiye özgü acil uyarı yoktu.** Eklendi: ani tek taraflı uyuşma/güçsüzlük, ani denge kaybı, şiddetli baş ağrısı, çarpıntı + göğüs ağrısı, bayılma/siyah dışkı, şişlik + nefes darlığı, kolay morarma/kanama, seğirme/kasılma, koyu tırnak lezyonu, güneşe duyarlı döküntü için "ne zaman 112/acil" satırları.
4. **18 yaş altı** için uyarı yoktu (yetişkin referansı kullanılıyor). Eklendi; takviye adayı üretilmez, eGFR (yetişkin formülü) üretilmez.
5. **Gebelik/emzirme** hiç ele alınmıyordu. Profile "Gebelik / emzirme" seçimi (1.–3. trimester, emzirme) eklendi; gebelik referans seti (Hb, kreatinin, ALT, ferritin) uygulandı, eGFR gebelikte hesaplanmaz, takviye adayı üretilmez. Kalan parametreler için bkz. açık riskler (B).
6. **Yanıltıcı veri kaynağı iddiası.** İlaç kalkanında "NIH ODS • Lexicomp • TİTCK Aktif" yazıyordu; Lexicomp (lisanslı) entegre değil ve uygulamanın kendi metni "kapsamlı etkileşim veri tabanına bağlı değildir" diyordu. Rozet "Yerleşik kural seti" yapıldı; kural atıflarından Lexicomp/Sanford Guide kaldırıldı.
7. **Kanıtı zayıf/yanlış atıflı öneriler düzeltildi.**
   - Varfarin–K2 kuralı "FDA Boxed Warning"e atfedilmişti (kutulu uyarı kanamayla ilgili); kaynak NIH ODS Vitamin K olarak düzeltildi.
   - PPI + demir için "lipozomal saşe" çözümü (pazarlama iddiası) kaldırıldı; karar hekime bırakıldı.
   - PPI + B12 için "dilaltı form emilimi baypas eder" iddiası kaldırıldı (kristalin B12 asit gerektirmez; dilaltının üstünlüğü kanıtlı değil).
8. **"Beni hatırla" varsayılanı açıktı.** Sağlık verisi için güvenli varsayılan kapalı yapıldı (ortak cihazda oturum kalıcı saklanmaz). Uygulamanın kendi testi bunu zaten bekliyordu.

### Veri bütünlüğü
9. Alanı elle boşaltınca değer arşiv kaydında kalıyordu (hayalet değer); form tamamen boşaltılınca otomatik kayıt arşivde duruyordu. Düzeltildi.
10. Silinen tahlil/kaldırılan belirtinin analiz, rapor, `localStorage` ve yenileme sonrası dirilmediği doğrulandı.

### Teknik
11. ESLint hata sınıfı taramasında yalnızca 1 erişilemez kod bulundu (temizlendi); sözdizimi hatası yok; üst düzey `const` çakışması yok.
12. Tüm ekranlar ve pencereler (sayfalar, profil, takviye, barkod, çekmece, KVKK, geri bildirim, rapor, çıkış) konsol hatası/uyarısı olmadan çalışıyor.
13. Depoda gizli anahtar/token bulunmadı.

## 3. Doğrulanan güçlü yanlar
- Tahlil motoru kaynaklı ve temkinli: WHO ferritin 2020, WHO hemoglobin 2011, NIH ODS (B12, D, Mg); birim denetimi; "tipik aralık (doğrulanmadı)" ayrımı; laboratuvar referansı önceliklidir.
- Otomatik doz üretilmiyor; her takviye adayında kısıtlayıcı uyarı var.
- Kontrendikasyon kilitleri: hiperkalsemi (D/Ca), böbrek (kreatin/Mg), kan sulandırıcı (K2), hepatik (yağda çözünen vitaminler).
- Folat–B12 maskelenmesi, ferritin–CRP etkileşimi, anemi örüntüsü (mikro/makro/normositer) doğru ele alınıyor.

## 4. Açık riskler — nitelikli kişilerce onaylanmalı

| # | Konu | Neden önemli | Öneri |
|---|---|---|---|
| A | **Tıbbi cihaz sınıflandırması** | Belirti/tahlilden "olası eksiklik" ve takviye adayı üreten yazılım, AB MDR Kural 11 / Türkiye mevzuatında tıbbi cihaz yazılımı (SaMD) sayılabilir | Regülasyon uzmanı ve TİTCK ile amaç beyanını netleştirin; "tanı koymaz" ifadesi tek başına yeterli olmayabilir |
| B | **Gebelik referansları (kısmen uygulandı)** | Hemoglobin (WHO 2011/CDC: <11, 2. trimesterde <10,5; ağır <7), kreatinin (0,4–0,8; ≥1,1 acil), ALT, ferritin notu uygulandı; eGFR gebelikte hesaplanmaz. **Henüz yok:** folat, B12, D vitamini, kalsiyum (albümin/iyonize), çinko ve A vitamini için gebelik-özel eşik ve takviye önerileri | Obstetrisyen/klinik biyokimya uzmanı onayı; trimester bazlı kalan parametreler |
| C | **Eşik klinik onayı** | Çinko, folat, MCV, ALT eşikleri "kaynağı doğrulanmadı" olarak işaretli | Klinik biyokimya uzmanı onayı |
| D | ~~Hemoglobin üst sınırı / erkek kreatinin~~ **(çözüldü)** | Hb üst sınırı motora eklendi (K 16 / E 17,5 g/dL, ekrandakiyle aynı). Kreatinin ekran aralığı cinsiyete özgü yapıldı (K 0,5–1,1 / E 0,7–1,3 mg/dL) ve üst sınır `getCreatinineUpperLimit()` ile **tek kaynaktan** okunuyor; kodda 9 yerde dağınık olan sabitler (1,10 / 1,25 / 1,30 / 1,40) kaldırıldı. Gebelikte üst sınır 0,8. Test: `tests/esik-hizalama.mjs` | Cinsiyete özgü kreatinin aralığının (0,5–1,1 / 0,7–1,3) klinik biyokimya onayı |
| E | **Kural kaynakları doğrulanmamış** | İlaç etkileşim kuralları kodda gömülü; sürümlenmiş, hekim/eczacı onaylı bir kaynak değil | İlaç veri tabanı (TİTCK KÜB/KT veya lisanslı) ile doğrulama ve sürüm takibi |
| F | **Gemini API anahtarı tarayıcıda** | Anahtar kullanıcı tarafından girilip tarayıcıda tutuluyor; geliştirici araçlarıyla okunabilir; sağlık verisi yurt dışına gidebilir | Sunucu tarafı proxy, kimlik doğrulama, veri minimizasyonu, açık rıza günlüğü |
| G | **Dış bağımlılıklar (kütüphaneler yerele alındı)** | İkon yazı tipleri, PDF.js, Chart.js ve barkod kütüphaneleri artık `vendor/` altında; çalışma anında CDN isteği yok (`vendor/THIRD_PARTY_NOTICES.md`). Kalan dış çağrılar yalnızca işlevsel servisler: Gemini (isteğe bağlı, onaylı), Open Food Facts ve NIH (barkod sorgusu), FormSubmit (geri bildirim) | KVKK metninde bu servislerin sayılması; mümkünse sunucu tarafı proxy; gerçek cihazda çevrimdışı test |
| H | **KVKK / aydınlatma** | Metin genel taslaktır; özel nitelikli kişisel veri (sağlık) için açık rıza, saklama süresi, veri sorumlusu kimliği gerekir | Hukukçu onayı |
| I | **Yerel depolama şifresiz** | Cihaz paylaşımında veri okunabilir | İsteğe bağlı parola/biyometrik kilit değerlendirin |
| J | **Erişilebilirlik / dil** | Yalnızca Türkçe; ekran okuyucu ve kontrast tam denetlenmedi | WCAG 2.1 AA denetimi |

## 5. Yayın öncesi kontrol listesi
- [ ] A–J maddeleri kapatıldı veya risk kabulü yazılı alındı
- [ ] Klinik uzman imzalı eşik ve kural tablosu (`docs/LAB_THRESHOLDS.md` ile birlikte)
- [ ] Mağaza/mevzuat başvurusu için amaç beyanı ve risk yönetim dosyası
- [ ] Sunucu tarafı yapay zekâ proxy'si veya özelliğin kapatılması
- [ ] Dış kütüphanelerin yerel barındırılması, SRI/CSP eklenmesi
- [ ] Gerçek cihazlarda (Android WebView, iOS Safari) kamera ve çevrimdışı testi
- [ ] Sürüm/önbellek numarası (`sw.js` → `CACHE_VERSION`) artırıldı

## 6. Testleri çalıştırma
`tests/README.md` dosyasına bakın.

## 7. Yaş evresine göre ihtiyaçlar ve yorum notları (`js/age-stage.js`)

Eşikler **değiştirilmedi**; tahlil sınıflandırması `VitaLabEvidence`'ta kalır. Modül yalnızca yaş/cinsiyete göre günlük hedef (RDA) ve takviyeden üst sınır (UL) tablosu ile yorumu etkileyen yaş notları sunar. Gebelik/emzirme ve 19 yaş altında tablo üretilmez (uyarı gösterilir).

| Konu | Uygulanan içerik | Kaynak |
|---|---|---|
| Kalsiyum | 19–50: 1000 mg; kadın 51+: 1200; erkek 51–70: 1000; 71+: 1200. UL 2500 (≤50) / 2000 (51+) | NIH ODS / IOM 2011 |
| D vitamini | 19–70: 600 IU; 71+: 800 IU; UL 4000 IU | IOM 2011 |
| B12, folat | 2,4 µg; 400 µg DFE (UL folat 1000 µg). 50+ için emilim notu | IOM 1998 |
| Magnezyum, çinko, demir | Mg E 400/420, K 310/320 (UL yalnız takviyeden 350); Zn E 11, K 8 (UL 40); Fe E 8, K 18 → 51+ 8 (UL 45) | IOM 1997–2001 |
| Protein | 0,8 g/kg; 65+ 1,0–1,2 g/kg | PROT-AGE 2013, ESPEN 2019 |
| Böbrek/kas | 30–40 yaştan sonra eGFR ≈ yılda 1 mL/dk/1,73 m² azalır, kas kütlesi on yılda ≈ %3–8; 65+ kreatinin işlevi olduğundan iyi gösterebilir, eGFR 45–59'da sistatin C düşünülebilir | KDIGO 2012, EWGSOP2 2019 |
| Demir eksikliği | Erkek ve 51+ kadında nedeni (GİS kaybı) hekimce araştırılmalı | AGA 2020 |

**Doğrulanmadı / onay gerekir:** Bu değerler yazarın bilgisinden yukarıdaki kaynaklara göre girildi; çalışma sırasında kaynaklara çevrimiçi erişilmedi. Sağlık Bakanlığı **TÜBER (Türkiye Beslenme Rehberi)** değerleri ve PubMed kaynak künyeleri ayrıca karşılaştırılmadı. Yayın öncesi diyetisyen/klinik uzman onayı ve TÜBER ile çapraz kontrol önerilir. Test: `tests/yas-evresi.mjs`.

## 8. Yayın öncesi uçtan uca inceleme (2026-11-01)

**Kapsam:** 45 JS dosyası (≈22.400 satır) + `index.html`; sözdizimi (`node --check`), ESLint hata sınıfı, servis çalışanı varlık listesi, klinik kural motoru, takviye adayı mantığı, ilaç–besin kuralları, XSS/enjeksiyon, veri girişi doğrulaması, yedekten geri yükleme.

### Düzeltilen hatalar
| # | Önem | Sorun | Düzeltme |
|---|---|---|---|
| 1 | **Yüksek (hasta güvenliği)** | Referans içinde ama "yüksek-inceleme" olan değerler (ör. ferritin 180 [ref 15–200], D vit. 60, Mg 2,5) motor tarafından "sınırda" döndüğü için **eksiklik sayılıp takviye adayı üretiyordu** (ör. yüksek ferritinde demir). | Eksiklik yalnızca düşük tarafta sayılır (`lowSide`). |
| 2 | **Yüksek** | Belirti modu, ilgili tahlil **ölçülmüş ve normal/yüksek** olsa bile aday üretiyordu (ferritin 400 + saç dökülmesi → demir). | Ölçülmüş ve düşük olmayan besin için aday yok. |
| 3 | **Yüksek** | Böbrek kilidi "magnezyum önerilmez" derken Mg adayı yine üretiliyordu; belirti modunda böbrek/hiperkalsemi süzgeci eksikti. | Böbrek riskinde Mg/kreatin, hiperkalsemide D/Ca adayı üretilmez. |
| 4 | **Yüksek (güvenlik)** | Barkod/QR içeriği ve içe aktarılan takviye kimliği satır içi `onclick` içine yalnızca HTML-kaçışla yazılıyordu; hazırlanmış bir QR kod JavaScript çalıştırabilirdi. Takviye adı bir uyarı şeridinde kaçışsızdı. | `safeJsStringAttribute` ve `escapeHtmlText` kullanıldı. |
| 5 | Orta | Profil kaydında aralık denetimi yoktu (yaş 300, kilo 5 kabul). | Yaş 1–120, boy 45–250 cm, kilo 2–350 kg. |
| 6 | Orta | Tahlil tarihi yedek yolu UTC kullanıyordu (Türkiye'de 00:00–03:00 arası "dün"); gelecek tarih kabul ediliyordu. | `vitaLocalToday()`, tarih alanına `max`, gelecek tarih reddi. |
| 7 | Orta | Yedekten geri yükleme tür doğrulaması yapmıyor, eski analiz sonucunu (`lastCDSS`) olduğu gibi alıyordu. | Tür/tarih/belirti süzgeci, 10 MB sınırı, analiz yeniden hesaplanır. |
| 8 | Orta | Makul aralık dışı değer (ör. Mg 0,9 mg/dL) yalnızca "birim hatası" diyordu; gerçek olabilecek ciddi düşüklük belirtilmiyordu. | "Değer doğruysa ciddi derecede düşük/yüksek olabilir; gecikmeden hekime" eklendi. |
| 9 | Düşük | Yanlış kaynak atfı: kalsiyum eşikleri NIH ODS **D vitamini**, CRP >50 acil eşiği WHO **ferritin** kılavuzuna atfedilmişti; Hb 8,5 "WHO ağır anemi" deniyordu (WHO: <8). | Kaynak "doğrulanmadı" olarak işaretlendi; metin düzeltildi. |
| 10 | Düşük | Kreatinin kadında 1,26 mg/dL'de "Kritik Yüksek" etiketi (abartılı). | "Yüksek (böbrek işlevi hekimce değerlendirilmeli)". |
| 11 | Düşük | İlaç–besin metinlerinde doğrulanmamış yüzdeler (%40–70, %50–90, %60–80); metformin böbrek eşiğinde dağınık sabit (1,35/1,15). | Yüzdeler kaldırıldı; `getCreatinineUpperLimit()` kullanıldı. |
| 12 | Düşük | Uyarı simgesi temizleme regex'i (⚠️) görünmez karakter bırakıyordu (ESLint). | `/^(?:⛔|⚠️?)\s*/u`. |

### Doğrulanan (değişiklik gerekmeyen)
- CKD-EPI 2021 katsayıları (κ, α, 1,012, 0,9938^yaş); 18 yaş altı ve gebelikte eGFR üretilmiyor.
- Birim dönüşüm katsayıları (B12 1,355; D 0,4; ferritin 0,445; Mg 2,43; Ca 4,008; Zn 6,54; folat 0,4413; Hb 0,1; CRP 10).
- 18 yaş altı, gebelik ve emzirmede takviye adayı üretilmiyor; tüm değerler normalse aday yok.
- Servis çalışanı listesindeki tüm dosyalar mevcut; sayfadaki tüm yerel CSS/JS çevrimdışı önbellekte.

### Yeni testler
`tests/klinik-mantik.mjs` (21 klinik değişmez), `tests/guvenlik-xss.mjs` (tüm metin alanlarına zararlı içerik, tüm ekranlar).
