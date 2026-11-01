# VitaTakip — Laboratuvar eşikleri, kaynaklar ve karar mantığı

Kod: `js/app/16-lab-evidence.js` (sınıflandırma + kaynak kaydı), `js/app/17-lab-insights.js` (birleştirme, ilişkiler),
`js/app/11-cdss-analysis.js` (klinik analiz), `js/app/05-clinical-rules.js` (eski motor sarmalayıcısı).
Testler: tarayıcı konsolunda `VitaTakipDiagnostics.run()` (55 yeni test dahil toplam 159 kontrol).

## Dört ayrı kavram
| Kavram | Anlamı | Uygulamadaki karşılığı |
|---|---|---|
| Referans aralığı | Laboratuvarın kendi aralığı (yönteme/popülasyona göre değişir) | Kullanıcının girdiği aralık (birimi doğrulanırsa) |
| Klinik eşik | Kılavuz/otorite kaynağın eksiklik/yüksek riski için önerdiği sınır | `CLINICAL` işlevleri; yalnızca kaynağı doğrulananlar |
| Takviye gereksinimi | Hekimin karar vereceği tedavi | Uygulama yalnızca "hekimle değerlendirilecek aday" üretir; doz vermez |
| Toksisite | Zararlı alım/düzey | Yalnızca kaynaklı eşik (25(OH)D >150 ng/mL, magnezyum >1,74 mmol/L) |

## Durumlar
Referans aralığında · Referans altı · Referans üstü · Sınırda / ek değerlendirme gerekli · Değerlendirilemedi ·
Acil klinik değerlendirme gerekli (yalnızca aşağıdaki kaynaklı koşullar).
`isLow` (takviye adayı üretebilen "düşük") = laboratuvar referansının altı **veya** kaynaklı klinik eşiğin altı.
Genel/tipik aralığın altı tek başına `isLow` yapmaz ve takviye adayı üretmez.

## Parametre tablosu
Birim = alanın kanonik birimi. Dönüşüm: değer(birim) × katsayı = kanonik birim. Makul aralık dışındaki değer birim hatası şüphesiyle "değerlendirilemedi" olur.

| Parametre | Kanonik birim (dönüşümler) | Klinik değerlendirme | Kaynak | Doğrulama |
|---|---|---|---|---|
| B12 | pg/mL (ng/L ×1, pmol/L ×1,355) | <180 eksiklik olası; 180–399 sınırda (MMA önerilir); >1000 yüksek-inceleme (toksisite değil) | NIH ODS B12; AAFP 2025 (NICE ile uyumlu) | Birincil sayfalar arama sonuçlarında doğrulandı |
| Ferritin | ng/mL (µg/L ×1, pmol/L ×0,445) | <15 düşük (WHO); CRP>5 iken <70 sınırda (WHO koşullu); 15–44 sınırda (AGA <45); K >150 / E >200 yüksek-inceleme; >500 yüksek-inceleme | WHO 2020 ferritin kılavuzu; AGA 2020 | WHO doğrulandı; **AGA 45 değeri ikincil kaynaktan, birincil metin açılmadı** |
| 25-OH D | ng/mL (nmol/L ×0,4) | <12 eksiklik riski; 12–19,9 bazı kişilerde yetersiz; ≥20 yeterli; >50 olası yan etki; >150 toksisite belirtileri (acil) | NIH ODS Vitamin D | Doğrulandı. Not: Endocrine Society 2011 ≥30 ng/mL öneriyordu; kılavuzlar farklıdır |
| Magnezyum | mg/dL (mmol/L ×2,43; mEq/L ×1,215) | <0,75 mmol/L (1,82 mg/dL) hipomagnezemi; <0,5 mmol/L acil; >0,95 yüksek-inceleme; >1,74 mmol/L toksisite (acil) | NIH ODS Magnesium; Adv Nutr | Doğrulandı. Serum Mg depoları tam yansıtmaz |
| Hemoglobin | g/dL (g/L ×0,1) | K <12, E <13 anemi ile uyumlu (gebelikte 11) | WHO 2011 | Doğrulandı |
| CRP | mg/L (mg/dL ×10) | >5 enflamasyon göstergesi (ferritin yorumu için) | WHO ferritin kılavuzu | Doğrulandı |
| Kalsiyum (total) | mg/dL (mmol/L ×4,008) | Yok: yalnızca laboratuvar referansı / tipik 8,6–10,2 | — | **Kaynaklı klinik eşik yok; albümin etkisi uyarılır** |
| Çinko | µg/dL (µmol/L ×6,54) | Yok: yalnızca laboratuvar referansı / tipik 70–120 | — | **Doğrulanmadı** |
| Folat | ng/mL (nmol/L ×0,4413) | Yok: yalnızca laboratuvar referansı / tipik 4–20 | — | **Doğrulanmadı** (NIH ODS'de eksiklik sınırı var; bu çalışmada okunmadı) |
| MCV | fL | Yok: laboratuvar referansı / tipik 80–100 | — | Tipik aralık, doğrulanmadı |
| Kreatinin / ALT | mg/dL / U/L | Eski motor: kreatinin >1,4 ve ALT >50 U/L **güvenlik süzgeci** (takviye güvenliği için); eGFR CKD-EPI 2021 (KDIGO evreleri) | KDIGO / CKD-EPI 2021 | ALT 50 eşiği uygulamaya özgü güvenlik süzgecidir, tanı sınırı değildir |

## Önceki eşiklerin incelenmesi (silinmedi, arşivlendi)
`KDSSRuleEngine.evaluateLegacy` içinde duruyor; yalnızca kreatinin ve ALT için kullanılıyor.
- B12: <200 "kritik", 200–399 "sınırda", 400–800 "optimal", >1200 "toksik". Alt kısım NIH ODS'nin 150–399 gri bölgesine yakındı; "optimal 400–800" ve ">1200 toksik" için kaynak bulunamadı. B12 için UL belirlenmemiştir.
- D vitamini: 20–29 "yetersiz", 30–60 "optimal" → NIH ODS'ye göre ≥20 ng/mL çoğu kişide yeterli.
- Magnezyum: ≤1,9 mg/dL "yetersiz" → NIH ODS alt sınırı 1,82 mg/dL; birim ayrımı yoktu.
- Ferritin: <50 "sınırda/yetersiz" → tek eşik, enflamasyon ve hemogram yok.

## Davranış kuralları
- Referans aralığı yoksa veya birimi doğrulanamıyorsa: genel aralık kullanılır, bu belirtilir; takviye adayı yalnızca kaynaklı klinik eşikle oluşur.
- Referans birimi dönüştürülebiliyorsa (mmol/L, pmol/L, nmol/L, g/L...) dönüştürülür ve değerin raporla aynı birimde girildiği varsayımı notla belirtilir.
- Klinik analiz her gösterge için en güncel ölçümü kullanır (farklı tarihler birleştirilir). 90 günden eski ölçümler takviye adayı üretmez, "güncel değil" olarak listelenir.
- Magnezyum, ferritin, B12 tek başına takviyeye dönüşmez: adaylar "hekimle doğrulanacak" ifadesiyle, parametreye özgü uyarılarla sunulur.

## Doğrulanamayan / hekim değerlendirmesi gerektiren noktalar
1. AGA 2020 ferritin <45 ng/mL eşiğinin birincil metni; 2. folat, çinko, kalsiyum, MCV için kaynaklı klinik eşikler;
3. Gebelik ve çocuklarda eşikler (uygulama yetişkin odaklıdır); 4. 90 günlük "güncellik" süresi bir tasarım kararıdır, kılavuz değildir;
5. B12 >1000 pg/mL için yönlendirme metni AAFP 2025'e dayanır (ilişki, nedensellik değil); 6. ALT >50 güvenlik süzgeci.
