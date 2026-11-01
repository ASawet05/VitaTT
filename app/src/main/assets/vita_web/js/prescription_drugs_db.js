/* =========================================================================
   VITA_PRESCRIPTION_DRUG_DB — Türkiye'de En Çok Reçete Edilen Kritik İlaç
   Sınıflarının Yerel Barkod (EAN-13), Klinik Etkileşim ve Besin Tüketim Veri Tabanı
   ========================================================================= */

const VITA_PRESCRIPTION_DRUG_DB = [
  // --- 1. TİROİD İLAÇLARI ---
  {
    barcode: "8699508010376",
    urunAdi: "Levotiron 100 mcg",
    etkenMadde: "Levotiroksin Sodyum",
    kategori: "Tiroid",
    kutuAdedi: 50,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç Karnına (Kahvaltıdan 30-60 dk önce)",
    etkilesimKurali: "Demir, Kalsiyum, Magnezyum ve Multivitamin takviyeleri ilacın emilimini bloke eder. Takviyeler bu ilaçtan en az 4 saat sonra alınmalıdır.",
    tuketilenBesinler: []
  },
  {
    barcode: "8699508010413",
    urunAdi: "Euthyrox 50 mcg",
    etkenMadde: "Levotiroksin Sodyum",
    kategori: "Tiroid",
    kutuAdedi: 50,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç Karnına",
    etkilesimKurali: "Kalsiyum ve Demir preparatları ile şelasyon oluşturur. En az 4 saatlik emilim aralığı şarttır.",
    tuketilenBesinler: []
  },

  // --- 2. METFORMİN (DİYABET / İNSÜLİN DİRENCİ) ---
  {
    barcode: "8699525092652",
    urunAdi: "Glifor 1000 mg",
    etkenMadde: "Metformin Hidroklorür",
    kategori: "Metformin",
    kutuAdedi: 100,
    gunlukDoz: 2,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok (Yemek ortasında veya hemen sonra)",
    etkilesimKurali: "Mide-bağırsak toleransı için tok alınmalıdır.",
    tuketilenBesinler: ["B12 Vitamini", "Folik Asit (Folat)"],
    klinikUyari: "Uzun süreli Metformin kullanımı ileumda B12 emilimini bozar. B12 kan düzeyinizi düzenli kontrol ettiriniz."
  },
  {
    barcode: "8699546090125",
    urunAdi: "Glucophage 850 mg",
    etkenMadde: "Metformin Hidroklorür",
    kategori: "Metformin",
    kutuAdedi: 100,
    gunlukDoz: 2,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok",
    etkilesimKurali: "Gastrointestinal yan etkileri azaltmak için ana yemekle alınmalıdır.",
    tuketilenBesinler: ["B12 Vitamini"],
    klinikUyari: "B12 eksikliği ve periferik nöropati riskine karşı tahlil takibi önerilir."
  },

  // --- 3. MİDE KORUYUCULAR (PPI - PROTON POMPA İNHİBİTÖRLERİ) ---
  {
    barcode: "8699786040058",
    urunAdi: "Nexium 40 mg",
    etkenMadde: "Esomeprazol",
    kategori: "Mide Koruyucu (PPI)",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç Karnına (Kahvaltıdan 30 dk önce)",
    etkilesimKurali: "Mide asidini baskıladığı için Demir ve Kalsiyum Karbonat emilimini düşürür. Kalsiyum Sitrat formu tercih edilmelidir.",
    tuketilenBesinler: ["Magnezyum", "B12 Vitamini", "Kalsiyum", "Demir"],
    klinikUyari: "Kronik PPI kullanımı hipomagnezemi ve B12 eksikliği riskini artırır."
  },
  {
    barcode: "8699532095417",
    urunAdi: "Pantpas 40 mg",
    etkenMadde: "Pantoprazol",
    kategori: "Mide Koruyucu (PPI)",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç Karnına",
    etkilesimKurali: "Demir emilimi için gereken asidik ortamı azaltır.",
    tuketilenBesinler: ["Magnezyum", "B12 Vitamini"],
    klinikUyari: "Uzun süreli kullanımda magnezyum düzeylerinizi tahlillerinizden takip edin."
  },
  {
    barcode: "8699514092106",
    urunAdi: "Lansor 30 mg",
    etkenMadde: "Lansoprazol",
    kategori: "Mide Koruyucu (PPI)",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç Karnına",
    etkilesimKurali: "Asit bağımlı vitamin/mineral emilimini azaltır.",
    tuketilenBesinler: ["B12 Vitamini", "Magnezyum"],
    klinikUyari: "B12 ve Magnezyum emilim engeli oluşturabilir."
  },

  // --- 4. KAN SULANDIRICILAR & ANTİKOAGÜLANLAR ---
  {
    barcode: "8699546010086",
    urunAdi: "Coumadin 5 mg",
    etkenMadde: "Varfarin Sodyum",
    kategori: "Kan Sulandırıcı (Antikoagülan)",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Akşam",
    aclikDurumu: "Aç/Tok (Her gün aynı saatte)",
    etkilesimKurali: "KRİTİK: K Vitamini (K2/MK-7), Yüksek Doz E Vitamini, Koenzim Q10 ve Sarımsak/Ginkgo takviyeleri ilacın antikoagülan etkisini bozar (INR dengesizliği). K vitamini takviyesi alınmamalıdır!",
    tuketilenBesinler: []
  },
  {
    barcode: "8699548010411",
    urunAdi: "Coraspin 100 mg",
    etkenMadde: "Asetilsalisilik Asit",
    kategori: "Kan Sulandırıcı (Antiagregan)",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok (Mide tahrişini önlemek için)",
    etkilesimKurali: "Yüksek doz Omega-3 (>2000 mg) ve Ginkgo Biloba ile birlikte kanama riskini artırabilir; hekime danışılmalıdır.",
    tuketilenBesinler: ["C Vitamini", "Demir (Gastrointestinal mikrokanama riski)"]
  },
  {
    barcode: "8699546090781",
    urunAdi: "Eliquis 5 mg",
    etkenMadde: "Apiksaban",
    kategori: "Yeni Nesil Kan Sulandırıcı (DOAC)",
    kutuAdedi: 56,
    gunlukDoz: 2,
    zamanBloku: "Sabah/Akşam",
    aclikDurumu: "Fark etmez",
    etkilesimKurali: "Yüksek doz E vitamini ve Sarı Kantaron (St. John's Wort) ile çakışır.",
    tuketilenBesinler: []
  },

  // --- 5. TANSİYON & DİÜRETİKLER ---
  {
    barcode: "8699536090029",
    urunAdi: "Delix 5 mg",
    etkenMadde: "Ramipril (ACE İnhibitörü)",
    kategori: "Tansiyon",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok",
    etkilesimKurali: "Potasyum tutucu etkisi vardır. Ek potasyum takviyesi alınmamalıdır.",
    tuketilenBesinler: ["Çinko"],
    klinikUyari: "İdrarla çinko atılımını artırabilir."
  },
  {
    barcode: "8699525010052",
    urunAdi: "Fludex SR 1.5 mg",
    etkenMadde: "İndapamid (Tiazid Benzeri Diüretik)",
    kategori: "Diüretik",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok",
    etkilesimKurali: "Gece sık idrara çıkmayı önlemek için sabah alınmalıdır.",
    tuketilenBesinler: ["Potasyum", "Magnezyum", "Çinko"],
    klinikUyari: "Elektrolit (özellikle Magnezyum ve Potasyum) atılımını artırır. Kramplara karşı dikkat edilmelidir."
  },
  {
    barcode: "8699546090446",
    urunAdi: "Beloc ZOK 50 mg",
    etkenMadde: "Metoprolol Süksinat (Beta Bloker)",
    kategori: "Tansiyon & Kalp",
    kutuAdedi: 20,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Kahvaltıyla)",
    etkilesimKurali: "Koenzim Q10 sentezini kısmen baskılayabilir.",
    tuketilenBesinler: ["Koenzim Q10 (CoQ10)"]
  },

  // --- 6. KEMİK ERİMESİ (BİSFOSFONATLAR) ---
  {
    barcode: "8699546090552",
    urunAdi: "Fosamax 70 mg Haftalık",
    etkenMadde: "Alendronat Sodyum",
    kategori: "Kemik Erimesi (Bisfosfonat)",
    kutuAdedi: 4,
    gunlukDoz: 1, // Haftada 1 gün
    zamanBloku: "Sabah",
    aclikDurumu: "Tam Aç (Günün ilk saatinde bol suyla)",
    etkilesimKurali: "KRİTİK UYARI: İlaç alındıktan sonra en az 30-60 dakika kesinlikle uzanılmamalı (dik durulmalı), hiçbir şey yenmemeli ve Kalsiyum/Magnezyum/D Vitamini gibi takviyeler EN AZ 2 saat sonra alınmalıdır (emilimi sıfırlar).",
    tuketilenBesinler: []
  },

  // --- 7. ANTİBİYOTİKLER (ŞELASYON YAPANLAR) ---
  {
    barcode: "8699546090669",
    urunAdi: "Cipro 500 mg",
    etkenMadde: "Siprofloksasin (Florokinolon)",
    kategori: "Antibiyotik",
    kutuAdedi: 14,
    gunlukDoz: 2,
    zamanBloku: "Sabah/Akşam",
    aclikDurumu: "Aç/Tok",
    etkilesimKurali: "Kalsiyum, Magnezyum, Çinko ve Demir mineralleri antibiyotikle birleşerek emilimini engeller. Takviyeler bu ilaçtan 2 saat önce veya 4 saat sonra alınmalıdır.",
    tuketilenBesinler: ["Bağırsak Mikrobiyotası (Probiyotik İhtiyacı)"]
  },
  {
    barcode: "8699546090775",
    urunAdi: "Tetradox 100 mg",
    etkenMadde: "Doksisiklin",
    kategori: "Antibiyotik (Tetrasiklin)",
    kutuAdedi: 14,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok (Bol suyla, dik pozisyonda)",
    etkilesimKurali: "Süt ürünleri, Kalsiyum, Demir ve Magnezyum ile aynı anda alınamaz. En az 3 saat aralık bırakılmalıdır.",
    tuketilenBesinler: []
  },

  // --- 8. KOLESTEROL (STATİNLER) & KRONİK ETKİ ---
  {
    barcode: "8699546090881",
    urunAdi: "Lipitor 20 mg",
    etkenMadde: "Atorvastatin",
    kategori: "Statin (Kolesterol)",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Gece",
    aclikDurumu: "Tok",
    etkilesimKurali: "Greyfurt suyu ile tüketilmemelidir.",
    tuketilenBesinler: ["Koenzim Q10 (CoQ10)"],
    klinikUyari: "Statinler mevalonat yolağını bloke ederek vücudun CoQ10 üretimini %40-50 azaltır; kas ağrılarına karşı CoQ10 takibi önerilir."
  },
  {
    barcode: "8699546090997",
    urunAdi: "Crestor 10 mg",
    etkenMadde: "Rosuvastatin",
    kategori: "Statin (Kolesterol)",
    kutuAdedi: 28,
    gunlukDoz: 1,
    zamanBloku: "Gece",
    aclikDurumu: "Tok",
    etkilesimKurali: "Antiasitler (mide ilaçları) ile arasında en az 2 saat olmalıdır.",
    tuketilenBesinler: ["Koenzim Q10 (CoQ10)"],
    klinikUyari: "Hücresel enerji ve mitokondriyal CoQ10 sentezini baskılar."
  }
];

function mapPrescriptionDrugToChronicCode(drug) {
  if (!drug) return null;
  const kat = String(drug.kategori || "").toLocaleLowerCase("tr-TR");
  const name = String(drug.urunAdi || "").toLocaleLowerCase("tr-TR");
  const active = String(drug.etkenMadde || "").toLocaleLowerCase("tr-TR");
  if (kat.includes("tiroid") || active.includes("levotiroksin") || name.includes("levotiron") || name.includes("euthyrox")) return "levothyroxine";
  if (kat.includes("metformin") || active.includes("metformin") || name.includes("glifor") || name.includes("glucophage")) return "metformin";
  if (kat.includes("ppi") || kat.includes("mide koruyucu") || active.includes("esomeprazol") || active.includes("pantoprazol") || active.includes("lansoprazol")) return "ppi";
  if (kat.includes("kan sulandırıcı") || kat.includes("antikoagülan") || kat.includes("doac") || active.includes("varfarin") || active.includes("asetilsalisilik") || active.includes("apiksaban")) return "blood_thinner";
  if (kat.includes("diüretik") || active.includes("indapamid") || name.includes("fludex")) return "diuretic";
  if (active.includes("ramipril") || active.includes("ace") || name.includes("delix")) return "ace_arb";
  if (kat.includes("bisfosfonat") || kat.includes("kemik erimesi") || active.includes("alendronat") || name.includes("fosamax")) return "bisphosphonate";
  if (kat.includes("antibiyotik") || active.includes("siprofloksasin") || active.includes("doksisiklin") || name.includes("cipro") || name.includes("tetradox")) return "antibiotic";
  if (kat.includes("statin") || kat.includes("kolesterol") || active.includes("atorvastatin") || active.includes("rosuvastatin") || name.includes("lipitor") || name.includes("crestor")) return "statin";
  if (kat.includes("tansiyon")) return "hypertension";
  return null;
}

function findPrescriptionDrugInDb(queryOrBarcode) {
  const clean = String(queryOrBarcode || "").trim();
  if (!clean) return null;
  const exactBarcode = VITA_PRESCRIPTION_DRUG_DB.find(d => d.barcode === clean);
  if (exactBarcode) return exactBarcode;

  const digitsOnly = clean.replace(/\D/g, "");
  if (digitsOnly.length >= 8) {
    const byDigits = VITA_PRESCRIPTION_DRUG_DB.find(d => d.barcode === digitsOnly || digitsOnly.includes(d.barcode));
    if (byDigits) return byDigits;
  }

  const lower = clean.toLocaleLowerCase("tr-TR");
  return VITA_PRESCRIPTION_DRUG_DB.find(d =>
    d.urunAdi.toLocaleLowerCase("tr-TR") === lower ||
    d.urunAdi.toLocaleLowerCase("tr-TR").includes(lower) ||
    lower.includes(d.urunAdi.toLocaleLowerCase("tr-TR").split(" ")[0]) ||
    d.etkenMadde.toLocaleLowerCase("tr-TR").includes(lower)
  ) || null;
}

function evaluatePrescriptionDrugSupplementConflict(drug, supplements) {
  const supList = Array.isArray(supplements) ? supplements : [];
  if (!drug || supList.length === 0) {
    return { hasConflict: false, severity: "none", conflictingSupplements: [], sameTimingSupplements: [] };
  }

  const kat = String(drug.kategori || "").toLocaleLowerCase("tr-TR");
  const name = String(drug.urunAdi || "").toLocaleLowerCase("tr-TR");
  const drugTimings = String(drug.zamanBloku || "Sabah").split("/").map(s => s.trim());

  const matchesKeyword = (sup, keywords) => {
    const hay = `${sup.name || ""} ${sup.formKey || ""} ${sup.selectedForm || ""} ${sup.doseText || ""} ${sup.subText || ""}`.toLocaleLowerCase("tr-TR");
    return keywords.some(kw => hay.includes(kw));
  };

  let targetKeywords = [];
  let checkTimingOverlapOnly = false;
  let defaultSeverity = "warning";

  if (kat.includes("tiroid") || name.includes("levotiron") || name.includes("euthyrox")) {
    targetKeywords = ["demir", "iron", "microfer", "kalsiyum", "calcium", "osteocare", "magnezyum", "magnesium", "magnimore", "extramag", "multivitamin", "supradyn", "pharmaton", "vm-2000", "daily one"];
    defaultSeverity = "danger";
  } else if (kat.includes("bisfosfonat") || name.includes("fosamax")) {
    targetKeywords = ["kalsiyum", "calcium", "osteocare", "magnezyum", "magnesium", "magnimore", "extramag", "d3", "kolekalsiferol", "demir", "çinko", "zinc"];
    defaultSeverity = "danger";
  } else if (kat.includes("kan sulandırıcı") || kat.includes("antikoagülan") || kat.includes("doac") || name.includes("coumadin") || name.includes("coraspin") || name.includes("eliquis")) {
    if (name.includes("coumadin")) {
      targetKeywords = ["k2", "d3_k2", "d3k2", "menakuinon", "mk-7", "koenzim", "coq10", "q10", "omega", "balık yağı", "krill", "efa one", "möller"];
      defaultSeverity = "danger";
    } else {
      targetKeywords = ["omega", "balık yağı", "krill", "efa one", "möller", "ginkgo", "e vitamini"];
      defaultSeverity = "warning";
    }
  } else if (kat.includes("antibiyotik") || name.includes("cipro") || name.includes("tetradox")) {
    targetKeywords = ["kalsiyum", "calcium", "osteocare", "magnezyum", "magnesium", "magnimore", "extramag", "çinko", "zinc", "demir", "iron", "microfer", "supradyn", "multivitamin"];
    defaultSeverity = "danger";
  } else if (kat.includes("ppi") || kat.includes("mide koruyucu") || name.includes("nexium") || name.includes("pantpas") || name.includes("lansor")) {
    targetKeywords = ["demir", "iron", "microfer", "kalsiyum", "calcium", "osteocare", "b12", "magnezyum", "magnesium"];
    defaultSeverity = "warning";
  } else if (name.includes("delix")) {
    targetKeywords = ["potasyum", "potassium"];
    defaultSeverity = "danger";
  }

  if (!targetKeywords.length) {
    return { hasConflict: false, severity: "none", conflictingSupplements: [], sameTimingSupplements: [] };
  }

  const conflictingSupplements = supList.filter(s => matchesKeyword(s, targetKeywords));
  const sameTimingSupplements = conflictingSupplements.filter(s =>
    drugTimings.includes(s.timing) || (drugTimings.includes("Sabah") && !s.timing)
  );

  if (conflictingSupplements.length === 0) {
    return { hasConflict: false, severity: "none", conflictingSupplements: [], sameTimingSupplements: [] };
  }

  const severity = sameTimingSupplements.length > 0 ? "danger" : defaultSeverity;
  return {
    hasConflict: true,
    severity,
    conflictingSupplements,
    sameTimingSupplements
  };
}

if (typeof window !== "undefined") {
  window.VITA_PRESCRIPTION_DRUG_DB = VITA_PRESCRIPTION_DRUG_DB;
  window.mapPrescriptionDrugToChronicCode = mapPrescriptionDrugToChronicCode;
  window.findPrescriptionDrugInDb = findPrescriptionDrugInDb;
  window.evaluatePrescriptionDrugSupplementConflict = evaluatePrescriptionDrugSupplementConflict;
}
