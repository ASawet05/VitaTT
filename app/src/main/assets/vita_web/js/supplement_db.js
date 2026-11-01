/* =========================================================================
   VITA_SUPPLEMENT_DB — Türkiye'de En Çok Reçete Edilen ve Tüketilen
   Yerli / İthal 30 Popüler Takviye Yerel Barkod (EAN-13) Veri Tabanı
   (Yalnızca "Takviye Ekle" Modalı -> "Kutu ve Barkod / Karekod" Modülü İçin)
   ========================================================================= */

const VITA_SUPPLEMENT_DB = [
  // --- D3 & D3K2 GRUBU ---
  {
    barcode: "8697595871234",
    urunAdi: "Ocean Vitamin D3 1000 IU",
    marka: "Orzaks",
    etkenMadde: "Kolekalsiferol (Vitamin D3)",
    form: "Oral Damla / Sprey",
    dozaj: "1000 IU (25 mcg) / puf",
    kutuAdedi: 130,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Yağlı Kahvaltı İle)"
  },
  {
    barcode: "8682417030426",
    urunAdi: "VeNatura D3K2 Damla",
    marka: "VeNatura",
    etkenMadde: "Vitamin D3 (Kolekalsiferol) + Vitamin K2 (Menakuinon-7)",
    form: "Oral Damla (Zeytinyağı Bazlı)",
    dozaj: "1000 IU D3 + 25 mcg K2 / damla",
    kutuAdedi: 200,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Yağlı Öğünle)"
  },
  {
    barcode: "8697595874129",
    urunAdi: "Ocean D3K2 Damla",
    marka: "Orzaks",
    etkenMadde: "Kolekalsiferol + Menakuinon-7 (MK-7)",
    form: "Damla (20 ml)",
    dozaj: "1000 IU D3 + 22.5 mcg K2 / damla",
    kutuAdedi: 400,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "0339840330085",
    urunAdi: "Solgar Vitamin D3 1000 IU",
    marka: "Solgar",
    etkenMadde: "Vitamin D3 (Kolekalsiferol)",
    form: "Yumuşak Kapsül",
    dozaj: "1000 IU (25 mcg)",
    kutuAdedi: 100,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },

  // --- MAGNEZYUM GRUBU (ŞELAT, MALAT, BİSGLİSİNAT, SİTRAT) ---
  {
    barcode: "8699546014022",
    urunAdi: "Magnimore Plus",
    marka: "Tab İlaç",
    etkenMadde: "ATA-Mg (Asetil Taurat) + Malat + Bisglisinat + B6 (P-5-P)",
    form: "Tablet",
    dozaj: "105 mg Elementel Magnezyum",
    kutuAdedi: 60,
    gunlukDoz: 2,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok (Yatmadan Önce)"
  },
  {
    barcode: "8682417030112",
    urunAdi: "VeNatura Magnezyum Malat",
    marka: "VeNatura",
    etkenMadde: "Magnezyum Malat",
    form: "Tablet",
    dozaj: "200 mg Elementel Magnezyum",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Hücresel Enerji İçin)"
  },
  {
    barcode: "8682417030129",
    urunAdi: "VeNatura Magnezyum Bisglisinat",
    marka: "VeNatura",
    etkenMadde: "Magnezyum Bisglisinat",
    form: "Tablet",
    dozaj: "110 mg Elementel Magnezyum",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Gece",
    aclikDurumu: "Tok (Kas & Uyku Onarımı)"
  },
  {
    barcode: "8697595875225",
    urunAdi: "Ocean Extramag Üçlü Magnezyum",
    marka: "Orzaks",
    etkenMadde: "Magnezyum Sitrat + Malat + Bisglisinat",
    form: "Tablet",
    dozaj: "200 mg Elementel Magnezyum",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok"
  },
  {
    barcode: "0339840171084",
    urunAdi: "Solgar Magnesium with Vitamin B6",
    marka: "Solgar",
    etkenMadde: "Magnezyum Oksit + Piridoksin HCl (B6)",
    form: "Tablet",
    dozaj: "400 mg Mg + 25 mg B6 (3 tablette)",
    kutuAdedi: 100,
    gunlukDoz: 2,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok"
  },

  // --- B12 & B KOMPLEKS GRUBU ---
  {
    barcode: "8697595874419",
    urunAdi: "Ocean Methyl B12 1000 mcg",
    marka: "Orzaks",
    etkenMadde: "Metilkobalamin (Aktif Koenzim B12)",
    form: "Dilaltı Sprey / Damla",
    dozaj: "1000 mcg / puf",
    kutuAdedi: 100,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç (Dil Altında 45 sn Bekletilerek)"
  },
  {
    barcode: "8699546014152",
    urunAdi: "New Life B12 Plus Dilaltı",
    marka: "New Life",
    etkenMadde: "Metilkobalamin + Folik Asit (Folat) + Biotin",
    form: "Dilaltı Tablet",
    dozaj: "1000 mcg B12 + 400 mcg Folat + 50 mcg Biotin",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç"
  },
  {
    barcode: "8682417030556",
    urunAdi: "VeNatura Metilkobalamin B12",
    marka: "VeNatura",
    etkenMadde: "Metilkobalamin",
    form: "Dilaltı Sprey",
    dozaj: "1000 mcg / puf",
    kutuAdedi: 100,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç"
  },
  {
    barcode: "0339840011077",
    urunAdi: "Solgar B-Complex with Vitamin C",
    marka: "Solgar",
    etkenMadde: "Tiamin, Riboflavin, Niasin, B6, Folik Asit, B12 + C Vitamini",
    form: "Tablet",
    dozaj: "B Kompleks 50 mg dengeli formül",
    kutuAdedi: 100,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8680134005122",
    urunAdi: "Nutraxin Biotin 5000 mcg",
    marka: "Nutraxin",
    etkenMadde: "D-Biotin (Vitamin B7)",
    form: "Tablet",
    dozaj: "5000 mcg",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok"
  },

  // --- BALIK YAĞI & OMEGA-3 GRUBU ---
  {
    barcode: "8697595872019",
    urunAdi: "Ocean Plus 1200 mg Balık Yağı",
    marka: "Orzaks",
    etkenMadde: "Trigliserit Form Omega-3 (384 mg EPA, 252 mg DHA)",
    form: "Yumuşak Kapsül",
    dozaj: "1200 mg Balık Yağı (780 mg Toplam Omega-3)",
    kutuAdedi: 50,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok (Ana Öğün İle)"
  },
  {
    barcode: "7070866011124",
    urunAdi: "Möller's Sıvı Omega-3 Morina Karaciğer Yağı",
    marka: "Möller's",
    etkenMadde: "Doğal Trigliserit Omega-3 (EPA + DHA + A, D, E Vitamini)",
    form: "Sıvı Şurup (250 ml)",
    dozaj: "1200 mg Doğal Omega-3 / 5 ml",
    kutuAdedi: 50,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8699546014404",
    urunAdi: "Efa One Balık Yağı 1200 mg",
    marka: "New Life",
    etkenMadde: "Konsantre Trigliserit Omega-3 (EPA 500 mg, DHA 375 mg)",
    form: "Yumuşak Kapsül",
    dozaj: "1200 mg (1020 mg Aktif Omega-3)",
    kutuAdedi: 45,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8697595870312",
    urunAdi: "Ocean Krill Oil 700 mg",
    marka: "Orzaks",
    etkenMadde: "Antarktika Krill Yağı (Fosfolipit bağlı EPA/DHA + Astaksantin)",
    form: "Kapsül",
    dozaj: "700 mg Saf Krill Yağı",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },

  // --- MULTİVİTAMİN & ENERJİ KOMPLEKSLERİ ---
  {
    barcode: "4260384870025",
    urunAdi: "Supradyn All Day",
    marka: "Bayer",
    etkenMadde: "13 Vitamin + 9 Mineral + Koenzim Q10",
    form: "Film Tablet",
    dozaj: "1 Tablet / Standart Günlük",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8699548092776",
    urunAdi: "Pharmaton Vitality Kapsül",
    marka: "Sanofi",
    etkenMadde: "Standardize Ginseng G115 + Vitamin ve Mineraller",
    form: "Yumuşak Kapsül",
    dozaj: "40 mg Ginseng G115 + Kompleks",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "0339840103078",
    urunAdi: "Solgar Formula VM-2000",
    marka: "Solgar",
    etkenMadde: "Yüksek Potensli Multivitamin ve Aminoasit Şelatlı Mineraller",
    form: "Tablet",
    dozaj: "1 Tablet / Günlük",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Öğle",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8697595870084",
    urunAdi: "Ocean Daily One Energy",
    marka: "Orzaks",
    etkenMadde: "12 Vitamin + 10 Mineral + Kore Ginsengi",
    form: "Tablet",
    dozaj: "1 Tablet / Günlük",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },

  // --- C VİTAMİNİ, ÇİNKO, DEMİR & BAĞIŞIKLIK ---
  {
    barcode: "4260384871152",
    urunAdi: "Redoxon Üçlü Etki (C + D + Çinko)",
    marka: "Bayer",
    etkenMadde: "Vitamin C (1000 mg) + Vitamin D3 (400 IU) + Çinko (10 mg)",
    form: "Efervesan Tablet",
    dozaj: "1000 mg C Vitamini",
    kutuAdedi: 15,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Bol Suyla)"
  },
  {
    barcode: "0339840131484",
    urunAdi: "Solgar Ester-C Plus 1000 mg",
    marka: "Solgar",
    etkenMadde: "Kalsiyum Askorbat (Nötr pH Mide Dostu C Vitamini)",
    form: "Tablet",
    dozaj: "1000 mg Askorbik Asit Eşdeğeri",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok"
  },
  {
    barcode: "8682417030228",
    urunAdi: "VeNatura Çinko Bisglisinat",
    marka: "VeNatura",
    etkenMadde: "Elementel Çinko (Bisglisinat Şelatı)",
    form: "Kapsül",
    dozaj: "15 mg Elementel Çinko",
    kutuAdedi: 60,
    gunlukDoz: 1,
    zamanBloku: "Gece",
    aclikDurumu: "Tok (Mide bulantısını önlemek için hafif atıştırmalık sonrası)"
  },
  {
    barcode: "0339840118096",
    urunAdi: "Solgar Gentle Iron 20 mg",
    marka: "Solgar",
    etkenMadde: "Demir Bisglisinat (Kabızlık ve mide tahrişi yapmayan form)",
    form: "Bitkisel Kapsül",
    dozaj: "20 mg Elementel Demir",
    kutuAdedi: 90,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Aç (C vitamini ile, çay/kahve/kalsiyumdan 2 saat ayrı)"
  },

  // --- KALSİYUM & KEMİK DESTEĞİ ---
  {
    barcode: "5021265220349",
    urunAdi: "Osteocare Original",
    marka: "Vitabiotics",
    etkenMadde: "Kalsiyum + Magnezyum + Çinko + Vitamin D3",
    form: "Tablet",
    dozaj: "800 mg Ca + 300 mg Mg + 10 mg Zn + 400 IU D3 (2 tablette)",
    kutuAdedi: 30,
    gunlukDoz: 2,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok"
  },
  {
    barcode: "0339840051059",
    urunAdi: "Solgar Calcium Magnesium with Vitamin D3",
    marka: "Solgar",
    etkenMadde: "Kalsiyum Sitrat + Magnezyum Oksit/Sitrat + Kolekalsiferol",
    form: "Tablet",
    dozaj: "1000 mg Ca + 400 mg Mg + 400 IU D3 (3 tablette)",
    kutuAdedi: 150,
    gunlukDoz: 2,
    zamanBloku: "Akşam",
    aclikDurumu: "Tok"
  },

  // --- KOLAJEN & KOENZİM Q10 ---
  {
    barcode: "8680134011246",
    urunAdi: "Nutraxin Collagen Plus",
    marka: "Nutraxin",
    etkenMadde: "Tip 1 ve Tip 3 Hidrolize Kolajen Peptitleri + C Vitamini + Hyaluronik Asit",
    form: "Tablet",
    dozaj: "1050 mg Kolajen Peptiti / Tablet",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Gece",
    aclikDurumu: "Aç (Yatmadan Önce)"
  },
  {
    barcode: "8697595870220",
    urunAdi: "Ocean Coenzyme Q10 100 mg",
    marka: "Orzaks",
    etkenMadde: "Koenzim Q10 (Ubikinon)",
    form: "Yumuşak Kapsül",
    dozaj: "100 mg Ubikinon",
    kutuAdedi: 30,
    gunlukDoz: 1,
    zamanBloku: "Sabah",
    aclikDurumu: "Tok (Yağlı Öğünle)"
  }
];

if (typeof window !== "undefined") {
  window.VITA_SUPPLEMENT_DB = VITA_SUPPLEMENT_DB;
}
