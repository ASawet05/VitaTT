/* LABORATUVAR KANIT VE SINIFLANDIRMA MOTORU (VitaLabEvidence)
   ---------------------------------------------------------------------------
   Amaç: "laboratuvar referans aralığı", "klinik değerlendirme eşiği", "takviye gereksinimi" ve
   "toksisite" kavramlarını birbirinden ayırmak. Hiçbir sonuç tek başına tanı veya takviye kararı değildir.

   Her parametre için: kanonik birim, kabul edilen birimler ve dönüşüm katsayıları, makul değer aralığı
   (birim hatasını yakalamak için), genel/tipik aralık (laboratuvar aralığı girilmediğinde) ve
   KAYNAKLI klinik değerlendirme işlevi tanımlıdır. Kaynağı doğrulanmayan hiçbir eşik "klinik eşik"
   olarak kullanılmaz; yalnızca laboratuvar referansı veya "tipik aralık (doğrulanmadı)" olarak işaretlenir.

   Durumlar: in_ref, below_ref, above_ref, borderline, not_assessable, urgent.
   Ayrıntılı kaynak/koşul tablosu: docs/LAB_THRESHOLDS.md */
    const VITA_LAB_SOURCES = {
      ODS_B12: { title: "NIH Office of Dietary Supplements — Vitamin B12 (Health Professional Fact Sheet)", url: "https://ods.od.nih.gov/factsheets/VitaminB12-HealthProfessional/", note: "Çoğu laboratuvar 200–250 pg/mL altını subnormal sayar; 150–399 pg/mL aralığında MMA ile doğrulama önerilir. B12 için tolere edilebilir üst alım sınırı (UL) belirlenmemiştir." },
      AAFP2025_B12: { title: "Am Fam Physician 2025 — Vitamin B12 Deficiency: Common Questions and Answers", url: "https://www.aafp.org/afp/2025/0900/vitamin-b12-deficiency", note: "Total B12 <180 pg/mL tanısaldır; 180–350 pg/mL sınırdadır ve MMA önerilir; iki ölçümde kalıcı >1000 pg/mL, solid tümör, hematolojik maligniteler ve kardiyovasküler ölüm riskiyle ilişkilendirilmiştir (ilişki, nedensellik değil)." },
      WHO2020_FERR: { title: "WHO 2020 — Guideline on use of ferritin concentrations to assess iron status", url: "https://www.ncbi.nlm.nih.gov/books/NBK569876/", note: "Sağlıklı yetişkinde ferritin <15 µg/L demir eksikliği; enfeksiyon/enflamasyonda <70 µg/L (koşullu öneri; CRP >5 mg/L); demir yüklenmesi riski: sağlıklılarda >150 (K) / >200 (E), sağlıksız bireylerde >500 µg/L." },
      AGA2020_IDA: { title: "AGA 2020 — Gastrointestinal evaluation of iron deficiency anemia (ferritin <45 ng/mL)", url: "", note: "İkincil kaynaklardan aktarılan 45 ng/mL kesme değeri; birincil metin bu çalışmada açılıp doğrulanmadı." },
      ODS_D: { title: "NIH Office of Dietary Supplements — Vitamin D (Health Professional Fact Sheet)", url: "https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/", note: "25(OH)D <30 nmol/L (<12 ng/mL) eksiklik riski; 30–50 nmol/L (12–20 ng/mL) bazı kişilerde yetersiz; ≥50 nmol/L (≥20 ng/mL) çoğu kişide yeterli; >125 nmol/L (>50 ng/mL) olası yan etkiler; >375 nmol/L (>150 ng/mL) belirgin toksisite belirtileri." },
      ODS_MG: { title: "NIH Office of Dietary Supplements — Magnesium (Health Professional Fact Sheet)", url: "https://ods.od.nih.gov/factsheets/Magnesium-HealthProfessional/", note: "Normal serum magnezyum 0,75–0,95 mmol/L (1,82–2,31 mg/dL); hipomagnezemi <0,75 mmol/L; serum düzeyi vücut depolarıyla zayıf ilişkilidir; takviyeden gelen magnezyum için UL 350 mg/gün; uzun süreli PPI kullanımı hipomagnezemiye yol açabilir." },
      ADVNUTR_MG: { title: "Advances in Nutrition — Magnesium (semptomlar <0,5 mmol/L altında belirginleşir)", url: "https://advances.nutrition.org/article/S2161-8313(23)00153-9/fulltext", note: "Hipomagnezemi 0,5–0,7 mmol/L arasında çoğunlukla hafif veya belirtisizdir; <0,5 mmol/L altında belirtiler belirginleşir/şiddetlenir." },
      WHO2011_HB: { title: "WHO — Haemoglobin concentrations for the diagnosis of anaemia and assessment of severity (2011)", url: "https://www.who.int/publications/i/item/WHO-nMH-NHD-MNM-11.1", note: "Anemi: gebe olmayan kadın (≥15 yaş) Hb <12 g/dL, erkek (≥15 yaş) <13 g/dL, gebe <11 g/dL (deniz seviyesi)." },
      UNVERIFIED: { title: "Kaynağı doğrulanmadı", url: "", note: "Bu değer genel/tipik bir laboratuvar aralığıdır; kesin klinik eşik olarak sunulmaz. Laboratuvarınızın aralığı esas alınmalıdır." }
    };

    const VITA_LAB_STATUS_TEXT = {
      in_ref: "Referans aralığında",
      below_ref: "Referans altı",
      above_ref: "Referans üstü",
      borderline: "Sınırda / ek değerlendirme gerekli",
      not_assessable: "Değerlendirilemedi",
      urgent: "Acil klinik değerlendirme gerekli"
    };

    const VitaLabEvidence = (() => {
      /* factor: değer(birim) × factor = değer(kanonik birim) */
      const PARAMS = {
        b12: { label: "B12", unit: "pg/mL", units: { "pg/ml": 1, "ng/l": 1, "pmol/l": 1.355 }, plausible: [30, 5000],
          typical: { min: 200, max: 900, source: "ODS_B12", verified: false, note: "Alt sınır NIH ODS'ye göre subnormal sınırıdır; üst sınır tipik değerdir." },
          sources: ["ODS_B12", "AAFP2025_B12"] },
        d3: { label: "25-OH D vitamini", unit: "ng/mL", units: { "ng/ml": 1, "nmol/l": 0.4 }, plausible: [3, 200],
          typical: { min: 20, max: 50, source: "ODS_D", verified: true, note: "NIH ODS: ≥20 ng/mL çoğu kişide yeterli, >50 ng/mL olası yan etkiler." },
          sources: ["ODS_D"] },
        ferritin: { label: "Ferritin", unit: "ng/mL", units: { "ng/ml": 1, "ug/l": 1, "pmol/l": 0.445 }, plausible: [1, 5000],
          typical: { min: 15, max: 150, maxMale: 200, source: "WHO2020_FERR", verified: true, note: "Alt: sağlıklı yetişkinde eksiklik eşiği (15); üst: demir yüklenmesi riski eşiği (K 150 / E 200)." },
          sources: ["WHO2020_FERR", "AGA2020_IDA"] },
        mg: { label: "Magnezyum", unit: "mg/dL", units: { "mg/dl": 1, "mmol/l": 2.43, "meq/l": 1.215 }, plausible: [1.0, 6.0],
          typical: { min: 1.82, max: 2.31, source: "ODS_MG", verified: true, note: "NIH ODS: 0,75–0,95 mmol/L." },
          sources: ["ODS_MG", "ADVNUTR_MG"] },
        ca: { label: "Kalsiyum (total)", unit: "mg/dL", units: { "mg/dl": 1, "mmol/l": 4.008 }, plausible: [5.0, 16.0],
          typical: { min: 8.6, max: 10.2, source: "UNVERIFIED", verified: false, note: "Tipik laboratuvar aralığı; total kalsiyum albümine bağlıdır." },
          sources: ["UNVERIFIED"] },
        zinc: { label: "Çinko", unit: "µg/dL", units: { "ug/dl": 1, "umol/l": 6.54 }, plausible: [10, 400],
          typical: { min: 70, max: 120, source: "UNVERIFIED", verified: false, note: "Tipik laboratuvar aralığı; serum çinko enflamasyondan ve albümin düzeyinden etkilenir." },
          sources: ["UNVERIFIED"] },
        folate: { label: "Folat", unit: "ng/mL", units: { "ng/ml": 1, "nmol/l": 0.4413 }, plausible: [0.3, 60],
          typical: { min: 4, max: 20, source: "UNVERIFIED", verified: false, note: "Tipik laboratuvar aralığı; yönteme göre belirgin değişir." },
          sources: ["UNVERIFIED"] },
        hb: { label: "Hemoglobin", unit: "g/dL", units: { "g/dl": 1, "g/l": 0.1 }, plausible: [3, 25],
          typical: { min: 12, minMale: 13, source: "WHO2011_HB", verified: true, note: "WHO anemi sınırı: K <12, E <13 g/dL (gebelikte farklıdır)." },
          sources: ["WHO2011_HB"] },
        mcv: { label: "MCV", unit: "fL", units: { "fl": 1 }, plausible: [40, 150],
          typical: { min: 80, max: 100, source: "UNVERIFIED", verified: false, note: "Yetişkinlerde yaygın tipik aralık; laboratuvara göre değişir." },
          sources: ["UNVERIFIED"] },
        crp: { label: "CRP", unit: "mg/L", units: { "mg/l": 1, "mg/dl": 10 }, plausible: [0, 500],
          typical: { min: 0, max: 5, source: "WHO2020_FERR", verified: true, note: "WHO ferritin kılavuzu enflamasyon için CRP >5 mg/L eşiğini kullanır." },
          sources: ["WHO2020_FERR"] }
      };

      const num = v => {
        if (v === null || v === undefined || v === "") return null;
        const n = typeof v === "number" ? v : Number(String(v).trim().replace(/\s+/g, "").replace(",", "."));
        return Number.isFinite(n) ? n : null;
      };
      const fmt = n => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ","));
      const normUnitText = t => String(t || "").toLowerCase().replace(/[μµ]/g, "u").replace(/\s+/g, "");

      /* Referans metnini ayrıştırır; birimi dönüştürülebilirse kanonik birime çevirir. */
      function parseReference(key, refText) {
        const P = PARAMS[key];
        const raw = String(refText || "").trim();
        if (!P || !raw) return null;
        const text = normUnitText(raw);
        const unitKeys = Object.keys(P.units).sort((a, b) => b.length - a.length);
        const unit = unitKeys.find(u => text.includes(u));
        const numeric = raw.replace(/,/g, ".");
        let range = null;
        const r = numeric.match(/(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)/);
        if (r) range = { min: Number(r[1]), max: Number(r[2]) };
        else {
          const c = numeric.match(/([<>≤≥])\s*(-?\d+(?:\.\d+)?)/);
          if (c) { const n = Number(c[2]); range = (c[1] === "<" || c[1] === "≤") ? { min: -Infinity, max: n } : { min: n, max: Infinity }; }
        }
        if (!range) return { compatible: false, reason: "Referans aralığı sayısal olarak okunamadı.", raw };
        if (!unit) return { compatible: false, reason: "Referans aralığında ölçüm birimi yazmıyor; birim doğrulanamadı.", raw };
        const f = P.units[unit];
        return {
          compatible: true, raw, unit, converted: f !== 1 || unit !== normUnitText(P.unit),
          min: range.min * f, max: range.max * f, rawMin: range.min, rawMax: range.max
        };
      }

      /* ---------- Parametreye özgü, KAYNAKLI klinik değerlendirme ---------- */
      const CLINICAL = {
        b12(v) {
          if (v < 180) return { level: "low_likely", sources: ["AAFP2025_B12", "ODS_B12"], text: "B12 180 pg/mL altında: eksiklik olası. Doğrulama için metilmalonik asit (MMA) ve hemogram hekimle konuşulabilir." };
          if (v < 400) return { level: "borderline", sources: ["ODS_B12", "AAFP2025_B12"], text: "B12 sınırda aralıkta (180–399 pg/mL). NIH ODS bu aralıkta MMA ile doğrulamayı önerir; tek başına kesin eksiklik tanısı koydurmaz. Belirti varsa referans aralığında olsa bile eksikliği dışlamaz." };
          if (v > 1000) return { level: "high_review", sources: ["AAFP2025_B12", "ODS_B12"], text: "B12 1000 pg/mL üzerinde. B12 takviyesi (özellikle yüksek doz veya enjeksiyon) bunu açıklayabilir. Takviye yoksa ve yükseklik tekrarlıyorsa hekim değerlendirmesi uygundur. B12 için tolere edilebilir üst alım sınırı belirlenmemiştir; yüksek serum değeri tek başına toksisite anlamına gelmez." };
          return { level: "adequate", sources: ["ODS_B12"], text: "" };
        },
        d3(v) {
          if (v > 150) return { level: "urgent", side: "high", sources: ["ODS_D"], text: "25(OH)D 150 ng/mL (375 nmol/L) üzerinde: NIH ODS bu düzeylerde bulantı, kusma, kas güçsüzlüğü, susuzluk ve böbrek taşı gibi belirgin etkiler tanımlar. D vitamini takviyesini hekime danışmadan sürdürmeyin ve kısa sürede değerlendirme isteyin." };
          if (v > 50) return { level: "high_review", sources: ["ODS_D"], text: "25(OH)D 50 ng/mL (125 nmol/L) üzerinde: NIH ODS olası yan etkilerle ilişkilendirir. Takviye dozunu hekimle gözden geçirin." };
          if (v < 12) return { level: "low_likely", sources: ["ODS_D"], text: "25(OH)D 12 ng/mL (30 nmol/L) altında: NIH ODS'ye göre eksiklik riski. Kalsiyum, fosfor, PTH gibi tetkikler ve tedavi hekimle planlanmalıdır." };
          if (v < 20) return { level: "borderline", sources: ["ODS_D"], text: "25(OH)D 12–20 ng/mL arasında: NIH ODS bazı kişilerde yetersiz olabileceğini belirtir. Güneş maruziyeti, beslenme ve risk faktörleriyle birlikte değerlendirilmelidir." };
          return { level: "adequate", sources: ["ODS_D"], text: "" };
        },
        ferritin(v, ctx) {
          const female = ctx.gender !== "E";
          const inflamed = ctx.crp !== null && ctx.crp !== undefined && ctx.crp > 5;
          if (v >= 1000) return { level: "urgent", side: "high", sources: ["WHO2020_FERR"], text: "Ferritin 1000 ng/mL ve üzerinde: ciddi demir yüklenmesi (hemokromatozis), karaciğer patolojisi veya belirgin sistemik enflamasyon açısından gecikmeden uzman dahiliye/hematoloji değerlendirmesi gerekir. Demir takviyesi kesinlikle kullanmayın." };
          if (v > 500) return { level: "high_review", sources: ["WHO2020_FERR"], text: "Ferritin 500 ng/mL üzerinde: WHO, sağlıksız bireylerde bu düzeyi demir yüklenmesi veya başka bir hastalık açısından ek değerlendirme gerektiren bir sınır olarak tanımlar. Demir takviyesi kullanmayın; hekime başvurun." };
          if (v > (female ? 150 : 200)) return { level: "high_review", sources: ["WHO2020_FERR"], text: `Ferritin ${female ? "150" : "200"} ng/mL üzerinde: sağlıklı bireylerde demir yüklenmesi riski eşiği. Enflamasyon, karaciğer hastalığı ve alkol de ferritini yükseltir; tek başına demir fazlası göstermez. Demir takviyesinden önce hekime danışın.` };
          if (v < 15) return { level: "low_likely", sources: ["WHO2020_FERR"], text: "Ferritin 15 ng/mL altında: WHO'ya göre sağlıklı yetişkinde demir eksikliğini gösterir. Hemoglobin, MCV ve nedenin (adet kanaması, beslenme, sindirim kaybı) hekimce değerlendirilmesi gerekir." };
          if (inflamed && v < 70) return { level: "borderline", sources: ["WHO2020_FERR"], text: "CRP yüksek (>5 mg/L): WHO, enflamasyonda ferritinin 70 ng/mL altında kalmasını demir eksikliği açısından anlamlı sayar (koşullu öneri). Ferritin enflamasyonla yükseldiği için gerçek demir deposu daha düşük olabilir." };
          if (v < 45) return { level: "borderline", sources: ["AGA2020_IDA", "WHO2020_FERR"], text: "Ferritin 15–44 ng/mL arasında: sınırda. AGA 45 ng/mL altını demir eksikliği anemisi araştırmasında anlamlı sayar. Hemoglobin, MCV, transferrin satürasyonu ve klinik durumla birlikte değerlendirilmelidir; tek başına takviye gereksinimini kesinleştirmez." };
          return { level: "adequate", sources: ["WHO2020_FERR"], text: "" };
        },
        mg(v) {
          const mmol = v / 2.43;
          if (mmol > 1.74) return { level: "urgent", side: "high", sources: ["ODS_MG"], text: "Magnezyum 1,74 mmol/L (≈4,2 mg/dL) üzerinde: NIH ODS toksisite belirtilerinin genellikle bu düzeyin üzerinde başladığını bildirir. Magnezyum içeren takviye, antiasit ve müshilleri bırakıp gecikmeden hekime başvurun." };
          if (mmol < 0.5) return { level: "urgent", side: "low", sources: ["ADVNUTR_MG", "ODS_MG"], text: "Magnezyum 0,5 mmol/L (≈1,2 mg/dL) altında: belirtiler belirginleşebilir. Gecikmeden hekim değerlendirmesi gerekir." };
          if (mmol < 0.75) return { level: "low_likely", sources: ["ODS_MG"], text: "Magnezyum 0,75 mmol/L (1,82 mg/dL) altında: NIH ODS hipomagnezemi tanımı. Nedeni (ilaçlar, ishal, alkol, böbrek kaybı) hekimce araştırılmalıdır; PPI veya idrar söktürücü kullanımı bunu açıklayabilir." };
          if (mmol > 0.95) return { level: "high_review", sources: ["ODS_MG"], text: "Magnezyum NIH ODS normal aralığının (0,95 mmol/L, 2,31 mg/dL) üzerinde. Magnezyum içeren takviye/antiasit ve böbrek işlevi gözden geçirilmelidir." };
          return { level: "adequate", sources: ["ODS_MG"], text: "" };
        },
        hb(v, ctx) {
          const limit = ctx.gender === "E" ? 13 : 12;
          if (v < 8.5) return { level: "urgent", side: "low", sources: ["WHO2011_HB"], text: "Hemoglobin 8,5 g/dL altında: belirgin/ağır anemi düzeyi. Doku oksijenlenmesi ve kardiyovasküler yük açısından gecikmeden yüz yüze dahiliye/hematoloji değerlendirmesi gerekir." };
          if (v > 18.5) return { level: "urgent", side: "high", sources: ["WHO2011_HB"], text: "Hemoglobin 18,5 g/dL üzerinde: belirgin eritrositoz/polisitemi eğilimi. Kan viskozitesi ve altta yatan nedenler açısından gecikmeden hekim değerlendirmesi gerekir." };
          if (v < limit) return { level: "low_likely", sources: ["WHO2011_HB"], text: `Hemoglobin ${limit} g/dL altında: WHO ölçütüne göre anemi ile uyumlu (gebelikte sınır 11 g/dL'dir). Nedeni (demir, B12, folat, kronik hastalık, kanama) hekimce araştırılmalıdır.` };
          return { level: "adequate", sources: ["WHO2011_HB"], text: "" };
        },
        ca(v) {
          if (v > 11.5) return { level: "urgent", side: "high", sources: ["ODS_D"], text: "Total kalsiyum 11,5 mg/dL üzerinde: belirgin hiperkalsemi riski. D vitamini ve kalsiyum takviyelerini kesinlikle kullanmayın; PTH, albümin, fosfor ve böbrek fonksiyonları için gecikmeden dahiliye/endokrinoloji değerlendirmesi gerekir." };
          if (v < 7.5) return { level: "urgent", side: "low", sources: ["ODS_D"], text: "Total kalsiyum 7,5 mg/dL altında: ciddi hipokalsemi / nöromüsküler tetani riski (albümin düzeltmesi gerekir). Gecikmeden hekim değerlendirmesi isteyin." };
          if (v > 10.2) return { level: "high_review", sources: ["ODS_D"], text: "Total kalsiyum 10,2 mg/dL üzerinde (hiperkalsemi eğilimi). D vitamini veya kalsiyum takviyesi başlanmamalı; albümin ile düzeltilmiş kalsiyum ve paratiroid hormonu (PTH) hekimce değerlendirilmelidir." };
          if (v < 8.6) return { level: "low_likely", sources: ["ODS_D"], text: "Total kalsiyum 8,6 mg/dL altında. Total kalsiyum serum albümin düzeyine bağlıdır (albümin düşüklüğünde yalancı düşük görünebilir); 25(OH)D, magnezyum, albümin ve PTH ile birlikte değerlendirilmelidir." };
          return { level: "adequate", sources: ["UNVERIFIED"], text: "" };
        },
        zinc(v) {
          if (v < 70) return { level: "low_likely", sources: ["UNVERIFIED"], text: "Serum çinko 70 µg/dL altında: eksiklik olası. Açlık durumu, albümin düzeyi ve akut faz yanıtı (CRP) çinkoyu düşürebilir; uzun süreli yüksek doz (>40 mg/gün) çinko kullanımı bakır emilimini bozabileceğinden hekim kontrolünde planlanmalıdır." };
          if (v > 150) return { level: "high_review", sources: ["UNVERIFIED"], text: "Serum çinko 150 µg/dL üzerinde: aşırı çinko alımı bağırsaktan bakır (Cu) emilimini bloke ederek bakır eksikliği ve sideroblastik anemiye yol açabilir. Çinko içeren takviyeleri hekimle gözden geçirin." };
          return { level: "adequate", sources: ["UNVERIFIED"], text: "" };
        },
        folate(v) {
          if (v < 4.0) return { level: "low_likely", sources: ["UNVERIFIED"], text: "Serum folat 4,0 ng/mL altında: folat eksikliği ile uyumlu. Tedaviye başlamadan önce mutlaka B12 düzeyi kontrol edilmelidir; tek başına folat verilmesi B12 eksikliğinin hematolojik bulgularını maskelerken nörolojik hasarı ilerletebilir." };
          if (v > 20.0) return { level: "high_review", sources: ["UNVERIFIED"], text: "Serum folat 20,0 ng/mL üzerinde. Yüksek folat düzeyi eşlik eden B12 eksikliğini gizleyebileceğinden B12 vitamini ve kullandığınız takviyeler hekimle değerlendirilmelidir." };
          return { level: "adequate", sources: ["UNVERIFIED"], text: "" };
        },
        crp(v) {
          if (v > 50) return { level: "urgent", side: "high", sources: ["WHO2020_FERR"], text: "CRP 50 mg/L üzerinde: belirgin akut bakteriyel enfeksiyon veya ciddi sistemik enflamasyon olasılığı. Ateş, titreme, nefes darlığı veya odak belirtileriyle birlikte gecikmeden hekime başvurun; aktif enfeksiyon sırasında demir takviyesi kullanımı hekime danışılmalıdır." };
          if (v > 5) return { level: "high_review", sources: ["WHO2020_FERR"], text: "CRP 5 mg/L üzerinde: sistemik enflamasyon/akut faz yanıtı göstergesi. Bu durumda ferritin akut faz reaktanı olarak yükselir (WHO <70 ng/mL eşiğini kullanır) ve serum çinko/demir düzeyleri geçici olarak düşebilir." };
          return { level: "adequate", sources: ["WHO2020_FERR"], text: "" };
        }
      };
      const GENERIC_TEXT = {
        in_ref: "Sonuç laboratuvarın referans aralığında.",
        below_ref: "Sonuç laboratuvarın referans aralığının altında. Klinik önem, diğer bulgularla birlikte değerlendirilmelidir.",
        above_ref: "Sonuç referans aralığının üzerinde. Takviye kullanımı ve klinik durumla birlikte değerlendirilmesi önerilir.",
        borderline: "Sonuç sınırda olabilir. Tek başına bu değer takviye gereksinimini kesinleştirmez.",
        not_assessable: "Birim veya referans aralığı doğrulanamadığı için güvenilir değerlendirme yapılamadı.",
        urgent: "Bu değer için klinik değerlendirme gecikmeden yapılmalıdır."
      };

      /* ---------- Ana değerlendirme ---------- */
      function evaluate(key, rawValue, ctx = {}) {
        const P = PARAMS[key];
        if (!P) return null;
        const out = {
          key, label: P.label, unit: P.unit, value: null, status: "not_assessable", statusText: VITA_LAB_STATUS_TEXT.not_assessable,
          refStatus: "unknown", referenceUsed: "none", reference: "", clinical: null, message: "", notes: [], sources: [], flags: []
        };
        const value = num(rawValue);
        if (value === null) { out.message = "Sonuç sayısal olarak okunamadı."; return out; }
        out.value = value;
        const gender = ctx.gender === "E" ? "E" : "K";

        // 1) Makul değer ve birim denetimi (kanonik birimde girildiği varsayılır)
        let ref = ctx.reference ? parseReference(key, ctx.reference) : null;
        const [lo, hi] = P.plausible;
        if (value < lo || value > hi) {
          const suspect = ref && ref.compatible && ref.converted ? ` Referans ${ref.unit.replace("ug", "µg").replace("umol", "µmol")} biriminde yazılmış; değer ${P.unit} olarak girilmiş olmalıdır.` : ` Alan ${P.unit} birimindedir; değeri ve birimi kontrol edin.`;
          out.message = `Girilen değer (${fmt(value)}) ${P.unit} için beklenen aralığın (${fmt(lo)}–${fmt(hi)}) dışında.${suspect} Birim doğrulanamadığı için güvenilir değerlendirme yapılmadı.`;
          out.flags.push("unit_or_range_suspect");
          return out;
        }

        // 2) Laboratuvar referansı → genel (tipik) aralık
        let refMin = null, refMax = null;
        if (ref && ref.compatible) {
          refMin = ref.min; refMax = ref.max; out.referenceUsed = "lab"; out.reference = ref.raw;
          if (ref.converted) out.notes.push(`Referans aralığı ${ref.unit} biriminden ${P.unit} birimine dönüştürüldü; değerin raporla aynı biçimde girildiğini doğrulayın.`);
        } else {
          if (ref && !ref.compatible) { out.notes.push(`Girilen laboratuvar referansı kullanılmadı: ${ref.reason}`); out.flags.push("lab_reference_unusable"); }
          const T = P.typical;
          if (T) {
            refMin = (gender === "E" && T.minMale !== undefined) ? T.minMale : T.min;
            refMax = (gender === "E" && T.maxMale !== undefined) ? T.maxMale : (T.max !== undefined ? T.max : Infinity);
            out.referenceUsed = "typical";
            out.reference = `${fmt(refMin)}${Number.isFinite(refMax) ? "–" + fmt(refMax) : "+"} ${P.unit}`;
            out.notes.push(`Laboratuvar referansı girilmedi/kullanılamadı; genel aralık kullanıldı${T.verified ? "" : " (kaynağı doğrulanmadı)"}. Kendi laboratuvarınızın aralığı farklı olabilir.`);
          }
        }
        if (refMin !== null) out.refStatus = value < refMin ? "below" : (value > refMax ? "above" : "in");

        // 3) Parametreye özgü klinik değerlendirme (yalnızca kaynaklı)
        const fn = CLINICAL[key];
        const clin = fn ? fn(value, { gender, age: ctx.age, crp: num(ctx.crp), hb: num(ctx.hb) }) : null;
        out.clinical = clin;
        out.sources = [...new Set([...(P.sources || []), ...(clin?.sources || [])])];

        // 4) Birleşik durum
        let status;
        if (clin?.level === "urgent") status = "urgent";
        else if (out.refStatus === "unknown" && !clin) status = "not_assessable";
        else {
          status = out.refStatus === "below" ? "below_ref" : (out.refStatus === "above" ? "above_ref" : "in_ref");
          if (status === "in_ref" && clin && ["low_likely", "borderline", "high_review"].includes(clin.level)) status = "borderline";
          if (status === "above_ref" && clin?.level === "low_likely") status = "borderline";
        }
        out.status = status;
        const typicalOnly = out.referenceUsed === "typical" && !["urgent", "not_assessable"].includes(status);
        out.statusText = VITA_LAB_STATUS_TEXT[status] + (typicalOnly && ["below_ref", "above_ref", "in_ref"].includes(status) ? " (genel aralığa göre)" : "");

        // 5) Metin
        const parts = [];
        if (status === "not_assessable") parts.push(GENERIC_TEXT.not_assessable);
        else {
          if (out.refStatus === "below") parts.push(out.referenceUsed === "lab" ? GENERIC_TEXT.below_ref : "Sonuç genel referans aralığının altında; kendi laboratuvarınızın aralığıyla karşılaştırın.");
          else if (out.refStatus === "above") parts.push(out.referenceUsed === "lab" ? GENERIC_TEXT.above_ref : "Sonuç genel referans aralığının üzerinde; kendi laboratuvarınızın aralığıyla karşılaştırın.");
          else if (out.refStatus === "in" && !clin?.text) parts.push(GENERIC_TEXT.in_ref);
          if (clin?.text) parts.push(clin.text);
        }
        out.message = parts.join(" ");
        return out;
      }

      /* ---------- Eski KDSSRuleEngine.evaluate çıktısıyla uyumlu biçim ---------- */
      function evaluateForEngine(key, value, gender, referenceText, ctx = {}) {
        const R = evaluate(key, value, { gender, reference: referenceText || state?.labReferences?.[key] || "", ...ctx });
        if (!R) return null;
        const clin = R.clinical;
        const lvl = clin?.level;
        const lowSide = R.refStatus === "below" || clin?.side === "low" || lvl === "low_likely" || lvl === "borderline";
        // isLow: yalnızca laboratuvar referansının altı veya KAYNAKLI klinik eşik; genel/tipik aralığın altı tek başına yeterli değildir.
        const isLow = (R.refStatus === "below" && R.referenceUsed === "lab") || lvl === "low_likely" || (lvl === "urgent" && clin.side === "low");
        const isHigh = (R.refStatus === "above" && R.referenceUsed === "lab") || lvl === "high_review" || (lvl === "urgent" && clin.side === "high");
        // isToxic: yalnızca kaynaklı toksisite eşiği (ör. 25(OH)D >150 ng/mL); kan düzeyinin yüksek olması tek başına toksisite sayılmaz.
        const isToxic = lvl === "urgent" && clin.side === "high";
        const tierMap = { in_ref: "optimal", below_ref: "borderline_low", above_ref: "high", borderline: lowSide ? "borderline_low" : "borderline_high", not_assessable: "none", urgent: clin?.side === "low" ? "critical_low" : "critical_high" };
        const colorMap = { in_ref: "green", below_ref: "yellow", above_ref: "blue", borderline: "yellow", not_assessable: "gray", urgent: "red" };
        const color = colorMap[R.status];
        const base = {
          statusText: R.statusText, tier: tierMap[R.status], color,
          badgeHtml: KDSSRuleEngine.createBadge(R.statusText, color),
          isLow, isHigh, isToxic
        };
        return { ...base, status: R.status, refStatus: R.refStatus, referenceSource: R.referenceUsed === "lab" ? "lab" : (R.referenceUsed === "typical" ? "app" : "none"),
          labReference: R.referenceUsed === "lab" ? R.reference : "", message: R.message, notes: R.notes, clinical: R.clinical, isBorderline: R.status === "borderline",
          isNotAssessable: R.status === "not_assessable", isUrgent: R.status === "urgent", sources: R.sources, appFlaggedLow: isLow };
      }

      const handles = key => Boolean(PARAMS[key]);
      return { PARAMS, parseReference, evaluate, evaluateForEngine, handles, STATUS_TEXT: VITA_LAB_STATUS_TEXT, SOURCES: VITA_LAB_SOURCES };
    })();
    window.VitaLabEvidence = VitaLabEvidence;

    /* OTOMATİK TESTLER: VitaTakipDiagnostics.run() içinde çalışır. Kullanıcı verisine dokunmaz (saf işlev testleri). */
    VitaLabEvidence.selfTests = function () {
      const R = [];
      const t = (name, ok, detail = "") => R.push({ name: "Laboratuvar kanıt motoru: " + name, passed: Boolean(ok), detail });
      const ev = (key, value, ctx = {}) => VitaLabEvidence.evaluate(key, value, ctx);
      const eng = (key, value, gender, ref, ctx) => VitaLabEvidence.evaluateForEngine(key, value, gender || "K", ref || "", ctx || {});

      // --- B12 ---
      t("B12 150 pg/mL klinik olarak eksiklik olası", eng("b12", 150, "K", "200-900 pg/mL").isLow === true);
      t("B12 179 pg/mL eşiğin altında (eksiklik olası)", ev("b12", 179).clinical.level === "low_likely");
      t("B12 180 pg/mL eşiğin kendisi: sınırda, kesin eksiklik değil", ev("b12", 180).clinical.level === "borderline");
      t("B12 180 pg/mL genel aralıkta takviye adayı (isLow) üretmez", eng("b12", 180, "K", "").isLow === false);
      t("B12 250 pg/mL referans içinde ama 'sınırda / ek değerlendirme'", ev("b12", 250, { reference: "200-900 pg/mL" }).status === "borderline");
      t("B12 399 pg/mL hâlâ sınırda", ev("b12", 399, { reference: "200-900 pg/mL" }).status === "borderline");
      t("B12 400 pg/mL referans içinde", ev("b12", 400, { reference: "200-900 pg/mL" }).status === "in_ref");
      t("B12 900 pg/mL üst sınırın kendisi referans içinde", ev("b12", 900, { reference: "200-900 pg/mL" }).status === "in_ref");
      t("B12 901 pg/mL referans üstü", ev("b12", 901, { reference: "200-900 pg/mL" }).status === "above_ref");
      const hi = eng("b12", 1500, "K", "200-900 pg/mL");
      t("Yüksek B12 toksik olarak etiketlenmez", hi.isToxic === false && !/toksik|kritik/i.test(hi.statusText));
      t("Yüksek B12 mesajı toksisite olmadığını belirtir", /toksisite anlamına gelmez/.test(hi.message));
      t("B12 pmol/L referansı pg/mL'e dönüştürülür", ev("b12", 300, { reference: "148-664 pmol/L" }).refStatus === "in");
      t("B12 referansında birim yoksa referans kullanılmaz ve belirtilir", ev("b12", 300, { reference: "200-900" }).flags.includes("lab_reference_unusable"));
      t("B12 aşırı büyük değer geçersiz sayılır", ev("b12", 90000).status === "not_assessable");
      t("Sayısal olmayan sonuç değerlendirilemez", ev("b12", "abc").status === "not_assessable");

      // --- Ferritin ---
      t("Ferritin 14 ng/mL klinik olarak düşük (WHO <15)", ev("ferritin", 14).clinical.level === "low_likely");
      t("Ferritin 15 ng/mL (eşiğin kendisi) sınırda", ev("ferritin", 15).clinical.level === "borderline");
      t("Ferritin 44 ng/mL sınırda, takviye adayı değil", eng("ferritin", 44).isLow === false && eng("ferritin", 44).isBorderline === true);
      t("Ferritin 49 ng/mL kesin eksiklik/takviye gereksinimi sayılmaz", ev("ferritin", 49).clinical.level === "adequate");
      t("Ferritin 45 ng/mL eşiğin kendisi yeterli", ev("ferritin", 45).clinical.level === "adequate");
      t("CRP yüksekken ferritin 60 sınırda (WHO <70)", ev("ferritin", 60, { crp: 12 }).clinical.level === "borderline");
      t("CRP normalken ferritin 60 yeterli", ev("ferritin", 60, { crp: 1 }).clinical.level === "adequate");
      t("Ferritin 160 kadında yüksek-inceleme", ev("ferritin", 160, { gender: "K" }).clinical.level === "high_review");
      t("Ferritin 160 erkekte yüksek değil", ev("ferritin", 160, { gender: "E" }).clinical.level === "adequate");
      t("Ferritin laboratuvar referansında (40, 15-150) takviye adayı üretmez", eng("ferritin", 40, "K", "15-150 ng/mL").isLow === false);
      t("Ferritin laboratuvar referansının altında (10, 15-150) isLow", eng("ferritin", 10, "K", "15-150 ng/mL").isLow === true);
      t("Yüksek ferritin isLow değil", eng("ferritin", 400, "K", "15-150 ng/mL").isLow === false);

      // --- Magnezyum ---
      t("Magnezyum 1,8 mg/dL (0,74 mmol/L) hipomagnezemi eşiğinin altında", ev("mg", 1.8).clinical.level === "low_likely");
      t("Magnezyum 1,83 mg/dL eşik üstünde, yeterli", ev("mg", 1.83).clinical.level === "adequate");
      t("Magnezyum 1,9 mg/dL tek başına eksiklik sayılmaz", eng("mg", 1.9, "K", "").isLow === false);
      t("Magnezyum mmol/L referansı mg/dL'ye dönüştürülür", ev("mg", 2.0, { reference: "0.75-0.95 mmol/L" }).refStatus === "in");
      t("Magnezyum 0,85 (mmol/L girilmiş olabilir) değerlendirilemez", ev("mg", 0.85, { reference: "0.75-0.95 mmol/L" }).status === "not_assessable");
      t("Magnezyum 1,2 mg/dL acil değerlendirme (<0,5 mmol/L)", ev("mg", 1.2).status === "urgent");
      t("Magnezyum 4,3 mg/dL toksisite eşiği (>1,74 mmol/L)", eng("mg", 4.3).isToxic === true);
      t("Magnezyum 2,6 mg/dL yüksek ama toksik değil", eng("mg", 2.6).isToxic === false && eng("mg", 2.6).isHigh === true);

      // --- D vitamini ---
      t("D vitamini 11 ng/mL eksiklik riski", ev("d3", 11).clinical.level === "low_likely");
      t("D vitamini 12 ng/mL eşiğin kendisi sınırda", ev("d3", 12).clinical.level === "borderline");
      t("D vitamini 19,9 ng/mL sınırda", ev("d3", 19.9).clinical.level === "borderline");
      t("D vitamini 20 ng/mL yeterli (NIH ODS)", ev("d3", 20).clinical.level === "adequate");
      t("D vitamini 25 ng/mL eksik sayılmaz", eng("d3", 25).isLow === false && eng("d3", 25).isBorderline === false);
      t("D vitamini 50 ng/mL üst sınırın kendisi yeterli", ev("d3", 50).clinical.level === "adequate");
      t("D vitamini 51 ng/mL yüksek-inceleme", ev("d3", 51).clinical.level === "high_review");
      t("D vitamini 151 ng/mL toksisite eşiği", eng("d3", 151).isToxic === true);
      t("D vitamini nmol/L referansı dönüştürülür", ev("d3", 30, { reference: "50-125 nmol/L" }).refStatus === "in");

      // --- Hemogram / CRP ---
      t("Hemoglobin 11,9 kadında anemi ile uyumlu", ev("hb", 11.9, { gender: "K" }).clinical.level === "low_likely");
      t("Hemoglobin 12,0 kadında normal", ev("hb", 12, { gender: "K" }).clinical.level === "adequate");
      t("Hemoglobin 12,5 erkekte anemi ile uyumlu", ev("hb", 12.5, { gender: "E" }).clinical.level === "low_likely");
      t("MCV 75 fL referans altı", ev("mcv", 75).refStatus === "below");
      t("MCV 105 fL referans üstü", ev("mcv", 105).refStatus === "above");
      t("CRP 6 mg/L referans üstü", ev("crp", 6).refStatus === "above");
      t("Hb g/L biriminde referans dönüştürülür", ev("hb", 13.5, { reference: "120-160 g/L" }).refStatus === "in");

      // --- Genel ---
      t("Dört durum metni tanımlı", ["in_ref", "below_ref", "above_ref", "borderline", "not_assessable", "urgent"].every(k => VITA_LAB_STATUS_TEXT[k]));
      t("Eski motor yüksek B12'yi artık toksik saymaz", KDSSRuleEngine.evaluate("b12", 2000, "K", "").isToxic === false);
      t("Eski motor kreatinin/ALT güvenlik süzgecini korur", KDSSRuleEngine.evaluate("alt", 90, "K", "").isToxic === true);
      t("Kaynak kayıtlarında doğrulanmamış eşik işaretli", VITA_LAB_SOURCES.UNVERIFIED.title.includes("doğrulanmadı"));
      return R;
    };
