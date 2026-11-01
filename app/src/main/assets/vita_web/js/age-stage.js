/* Yaş evresine göre günlük referans alımlar ve yaşa bağlı yorum notları.
   Bu modül ESİK DEĞİŞTİRMEZ: tahlil sınıflandırması VitaLabEvidence'ta kalır. Yalnızca
   (1) yaş/cinsiyete göre RDA/UL bilgisi, (2) yorumu değiştiren yaş notları sunar.
   Kaynaklar (kodda tek yerde): NIH ODS / IOM DRI (Ca-D 2011, B12-folat 1998, Mg-Zn-Fe 1997–2001),
   KDIGO 2012 KBH rehberi, EWGSOP2 2019 (Cruz-Jentoft), PROT-AGE 2013 ve ESPEN 2019 (yaşlıda protein),
   AGA 2020 demir eksikliği anemisi klinik uygulama güncellemesi, WHO 2011/2020.
   Klinik uzman onayı gerekir (bkz. docs/KLINIK_VE_TEKNIK_DENETIM.md). */
(function () {
  "use strict";

  var SRC = {
    dri: "NIH ODS / IOM DRI",
    kdigo: "KDIGO 2012",
    ewgsop: "EWGSOP2 2019",
    aga: "AGA 2020",
    prot: "PROT-AGE 2013, ESPEN 2019"
  };

  function profile() { return (typeof state !== "undefined" && state && state.user) || {}; }
  function ageOf(u) { var a = Number((u || profile()).age); return isFinite(a) && a > 0 ? a : null; }
  function isMale(u) { return (u || profile()).gender === "E"; }
  function isPreg(u) { u = u || profile(); return u.gender !== "E" && (u.pregnancyStage === "t1" || u.pregnancyStage === "t2" || u.pregnancyStage === "t3" || u.pregnancyStage === "lactation" || u.pregnancyLactation); }

  /* Günlük önerilen alım (RDA) ve takviyeden üst sınır (UL) — sağlıklı yetişkin, gebelik/emzirme hariç */
  function needs(u) {
    u = u || profile();
    var a = ageOf(u); if (a === null || a < 19 || isPreg(u)) return [];
    var m = isMale(u);
    var ca = (a >= 71 || (!m && a >= 51)) ? 1200 : 1000;
    var mg = m ? (a <= 30 ? 400 : 420) : (a <= 30 ? 310 : 320);
    var fe = m ? 8 : (a >= 51 ? 8 : 18);
    var zn = m ? 11 : 8;
    var d = a >= 71 ? "800 IU (20 µg)" : "600 IU (15 µg)";
    var out = [
      { n: "Kalsiyum", v: ca + " mg", ul: (a >= 51 ? "2000" : "2500") + " mg" },
      { n: "D vitamini", v: d, ul: "4000 IU (100 µg)" },
      { n: "B12", v: "2,4 µg", ul: "belirlenmemiş", note: a >= 50 ? "Emilim azalabilir; zenginleştirilmiş gıda veya takviye önerilir" : "" },
      { n: "Folat", v: "400 µg DFE", ul: "1000 µg (takviye/zenginleştirilmiş)" },
      { n: "Magnezyum", v: mg + " mg", ul: "350 mg (yalnızca takviyeden)" },
      { n: "Demir", v: fe + " mg", ul: "45 mg", note: (!m && a >= 51) ? "Menopoz sonrası ihtiyaç düşer" : "" },
      { n: "Çinko", v: zn + " mg", ul: "40 mg" },
      { n: "Protein", v: a >= 65 ? "1,0–1,2 g/kg" : "0,8 g/kg", ul: "—", note: a >= 65 ? "Kas kaybını yavaşlatmak için" : "" }
    ];
    return out;
  }

  /* Yaş dönemine göre kısa bilgi (değerlendirme değil, genel fizyoloji) */
  function stageNotes(u) {
    u = u || profile();
    var a = ageOf(u); if (a === null || a < 19) return [];
    var n = [];
    if (a >= 30 && a < 50) n.push({ t: "Kas kütlesi ve böbrek süzme hızı (eGFR) 30–40 yaşından itibaren çok yavaş azalmaya başlar (eGFR ortalama yılda yaklaşık 1 mL/dk/1,73 m²; kas kütlesi on yılda yaklaşık %3–8). Bu, yaşlanmanın normal parçasıdır.", s: SRC.kdigo + ", " + SRC.ewgsop });
    if (a >= 50 && a < 65) n.push({ t: "50 yaşından sonra kas kaybı ve eGFR düşüşü belirginleşebilir. Düzenli direnç egzersizi ve yeterli protein kası korumaya yardımcı olur.", s: SRC.kdigo + ", " + SRC.ewgsop });
    if (a >= 65) n.push({ t: "65 yaş üzerinde kas kaybı hızlanır; kreatinin kas azlığı nedeniyle böbrek işlevini olduğundan iyi gösterebilir. Protein hedefi 1,0–1,2 g/kg önerilir (böbrek hastalığı yoksa).", s: SRC.prot + ", " + SRC.kdigo });
    if (!isMale(u) && a >= 45 && a < 60) n.push({ t: "Menopoz öncesi/sonrası dönemde kemik kaybı hızlanır; kalsiyum ve D vitamini yeterliliği önemlidir (51 yaş sonrası kadınlarda kalsiyum hedefi 1200 mg).", s: SRC.dri });
    if (a >= 50) n.push({ t: "Mide asidinin azalması nedeniyle B12 emilimi düşebilir; PPI veya metformin kullanıyorsanız daha da belirgindir.", s: SRC.dri });
    return n;
  }

  /* Tek bir tahlil için yaşa özgü yorum notu (yalnızca ilgili ve anlamlıysa) */
  function labNote(key, dir, u) {
    u = u || profile();
    var a = ageOf(u); if (a === null || a < 19) return "";
    var m = isMale(u), low = dir === "low" || dir === "border";
    if (key === "creatinine") {
      if (a >= 65) return "Yaş notu: 65 yaş üzerinde kreatinin normal görünse bile böbrek işlevi azalmış olabilir (kas kütlesi az). eGFR 45–59 ise ve başka böbrek bulgusu yoksa hekim sistatin C ile doğrulamayı düşünebilir (" + SRC.kdigo + ").";
      if (a >= 30) return "Yaş notu: 30–40 yaşından sonra eGFR yılda yaklaşık 1 mL/dk/1,73 m² azalır; kas kütlesi de azaldığı için kreatinin tek başına böbrek işlevini tam yansıtmaz (" + SRC.kdigo + ").";
    }
    if ((key === "ferritin" || key === "hb") && low) {
      if (m || a >= 51) return "Yaş notu: Erkeklerde ve menopoz sonrası kadınlarda demir eksikliğinin nedeni (özellikle sindirim sistemi kan kaybı) hekimce araştırılmalıdır (" + SRC.aga + "). Kendi başınıza demir başlamadan önce hekime danışın.";
    }
    if (key === "b12" && low && a >= 50) return "Yaş notu: 50 yaş sonrası mide asidi azalır, B12 gıdalardan emilemeyebilir; zenginleştirilmiş gıda veya takviye gerekebilir (" + SRC.dri + "). Karar için hekime danışın.";
    if (key === "d3" && low && a >= 65) return "Yaş notu: Yaşla cilt D vitamini üretimi azalır; düşük D düşme ve kırık riskiyle ilişkilidir. 71 yaş üzerinde günlük hedef 800 IU'dur (" + SRC.dri + ").";
    return "";
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  /* Kompakt kart (Klinik Analiz ve Ayarlar'da aynı içerik) */
  function cardHtml(u) {
    u = u || profile();
    var a = ageOf(u); if (a === null) return "";
    var stage = typeof getLifeStageProfile === "function" ? getLifeStageProfile(a).stage : "";
    if (a < 19) return '<details class="as-card"><summary><b>Yaş evresi</b> <span>' + esc(stage) + '</span></summary><p class="as-p">Bu uygulama yetişkin referanslarını kullanır. Çocuk ve ergenlerin vitamin-mineral ihtiyacı yaşa göre farklıdır; çocuk/aile hekimine danışın.</p></details>';
    if (isPreg(u)) return '<details class="as-card"><summary><b>Yaş evresi</b> <span>' + esc(stage) + ' · gebelik/emzirme</span></summary><p class="as-p">Gebelik ve emzirmede vitamin-mineral ihtiyacı farklıdır (ör. folat, demir, B12, kalsiyum artar). Bu dönemde takviyeyi doğum hekiminiz veya ebenizle belirleyin.</p></details>';
    var rows = needs(u).map(function (x) {
      return '<tr><td>' + esc(x.n) + '</td><td><b>' + esc(x.v) + '</b>' + (x.note ? '<small>' + esc(x.note) + '</small>' : "") + '</td><td class="as-ul">' + esc(x.ul) + '</td></tr>';
    }).join("");
    var notes = stageNotes(u).map(function (x) { return '<li>' + esc(x.t) + ' <i>(' + esc(x.s) + ')</i></li>'; }).join("");
    return '<details class="as-card"><summary><b>Yaşınıza göre ihtiyaçlar</b> <span>' + esc(stage) + '</span></summary>' +
      (notes ? '<ul class="as-notes">' + notes + '</ul>' : "") +
      '<table class="as-tbl"><thead><tr><th>Besin</th><th>Günlük hedef</th><th>Üst sınır</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<p class="as-foot">Sağlıklı yetişkin için gıda + takviye toplamı hedefidir; “takviye almalısınız” demek değildir. Üst sınırlar takviyeden alınan miktar içindir (Mg yalnızca takviyeden). Kaynak: ' + esc(SRC.dri) + '. Kişisel karar için hekim/diyetisyen.</p></details>';
  }

  window.VitaAgeStage = { needs: needs, stageNotes: stageNotes, labNote: labNote, cardHtml: cardHtml, SOURCES: SRC };
})();

/* Ayarlar > Profil altında aynı kart */
(function () {
  function paint() {
    var host = document.getElementById("settingsAgeStage");
    if (host && window.VitaAgeStage) host.innerHTML = VitaAgeStage.cardHtml();
  }
  var orig = window.renderSettingsView;
  if (typeof orig === "function") {
    window.renderSettingsView = function () { var r = orig.apply(this, arguments); try { paint(); } catch (_) {} return r; };
  }
  document.addEventListener("DOMContentLoaded", paint);
  window.paintSettingsAgeStage = paint;
})();
