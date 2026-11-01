/* Klinik Analiz: "Doktorla görüşmede değerlendirilebilecek test ve incelemeler".
   Girdi: güncel tahlil + en son arşiv kaydı + seçili belirtiler (+ eGFR).
   Çıktı: tahlile ve belirtiye göre gruplanmış, tekrarsız bir liste.
   Bu liste tanı veya talimat değildir; hangi testlerin yapılacağına hekim karar verir. */
(function () {
  "use strict";

  var LAB_NAMES = {
    d3: "25-OH Vitamin D", b12: "Vitamin B12", ferritin: "Ferritin", mg: "Magnezyum", ca: "Kalsiyum", zinc: "Çinko",
    creatinine: "Kreatinin", folate: "Folat", alt: "ALT", hb: "Hemoglobin", mcv: "MCV", crp: "CRP"
  };
  var LAB_UNITS = {
    d3: "ng/mL", b12: "pg/mL", ferritin: "ng/mL", mg: "mg/dL", ca: "mg/dL", zinc: "µg/dL",
    creatinine: "mg/dL", folate: "ng/mL", alt: "U/L", hb: "g/dL", mcv: "fL", crp: "mg/L"
  };
  /* Bir testin hangi girilmiş tahlille zaten karşılandığını anlamak için */
  var COVERED_BY = {
    d3: /25.?oh|vitamin d|d vitamini/i, b12: /b12/i, ferritin: /ferritin/i, mg: /magnezyum/i, ca: /kalsiyum/i,
    zinc: /çinko|cinko/i, creatinine: /kreatinin|egfr/i, folate: /folat/i, alt: /\balt\b/i,
    hb: /hemogram|hemoglobin|tam kan/i, mcv: /hemogram|mcv|tam kan/i, crp: /\bcrp\b/i
  };

  /* Tahlil sonucuna göre hekimle konuşulabilecek ek incelemeler (low / high) */
  var FOLLOW_UP = {
    ferritin: {
      low: { tests: ["Hemogram (Hb, MCV)", "Serum demiri, TIBC, transferrin satürasyonu", "CRP"], why: "Depo demiri düşük; nedeni ve anemi olup olmadığı değerlendirilir." },
      high: { tests: ["Transferrin satürasyonu", "CRP", "Karaciğer enzimleri (ALT/AST)"], why: "Ferritin enflamasyon veya karaciğer nedenleriyle de yükselebilir." }
    },
    b12: {
      low: { tests: ["Metilmalonik asit (MMA)", "Homosistein", "Folat", "Hemogram ve periferik yayma"], why: "B12 eksikliğinin doğrulanması ve etkilerinin değerlendirilmesi için." }
    },
    folate: {
      low: { tests: ["Vitamin B12", "Homosistein", "Hemogram ve periferik yayma"], why: "Folat ve B12 eksikliği birlikte görülebilir." }
    },
    d3: {
      low: { tests: ["Kalsiyum, fosfor", "PTH", "ALP", "Magnezyum"], why: "D vitamini düşüklüğünde kemik-mineral dengesi birlikte değerlendirilir." },
      high: { tests: ["Kalsiyum", "PTH", "Kreatinin / eGFR"], why: "Yüksek D vitamini düzeyinde kalsiyum ve böbrek durumu kontrol edilir." }
    },
    mg: {
      low: { tests: ["Potasyum, kalsiyum", "Kreatinin / eGFR", "Kullanılan ilaçların gözden geçirilmesi (PPI, diüretik)"], why: "Düşük magnezyumun nedeni ve eşlik eden elektrolit bozuklukları araştırılır." },
      high: { tests: ["Kreatinin / eGFR", "Kullanılan magnezyum/antasit ürünlerinin gözden geçirilmesi"], why: "Yüksek magnezyumda böbrek işlevi ve ürün kullanımı önemlidir." }
    },
    ca: {
      low: { tests: ["Albümin (düzeltilmiş kalsiyum)", "PTH", "25-OH Vitamin D", "Magnezyum, fosfor"], why: "Düşük kalsiyumun nedeni için paratiroid ve D vitamini birlikte bakılır." },
      high: { tests: ["PTH", "25-OH Vitamin D", "Kreatinin / eGFR"], why: "Yüksek kalsiyumda paratiroid ve böbrek işlevi değerlendirilir." }
    },
    zinc: {
      low: { tests: ["Serum bakır", "Albümin", "CRP"], why: "Çinko düzeyi albümin ve enflamasyondan etkilenebilir." }
    },
    hb: {
      low: { tests: ["Hemogram ve periferik yayma", "Retikülosit", "Ferritin, demir, TIBC", "Vitamin B12 ve folat"], why: "Anemi tipinin ve nedeninin ayrımı için." },
      high: { tests: ["Hemogram tekrarı", "Hematokrit, eritropoetin (hekim kararıyla)"], why: "Yüksek hemoglobinde nedeni değerlendirilir." }
    },
    mcv: {
      low: { tests: ["Ferritin, demir, TIBC", "Hemoglobin elektroforezi (hekim kararıyla)"], why: "Küçük (mikrositer) alyuvar: demir eksikliği ve diğer nedenler ayrılır." },
      high: { tests: ["Vitamin B12 ve folat", "TSH", "Karaciğer enzimleri"], why: "Büyük (makrositer) alyuvar: B12/folat, tiroid ve karaciğer nedenleri sorgulanır." }
    },
    crp: {
      high: { tests: ["Hemogram", "Sedimantasyon (ESR)", "Enflamasyon veya enfeksiyon kaynağının klinik değerlendirmesi"], why: "CRP yüksekliği ferritin gibi bazı sonuçların yorumunu etkiler." }
    },
    alt: {
      high: { tests: ["AST, GGT, ALP, bilirubin", "Karaciğer ultrasonu (hekim kararıyla)", "Hepatit paneli (hekim kararıyla)", "Kullanılan ilaç/takviyelerin gözden geçirilmesi"], why: "Karaciğer enzim yüksekliğinin nedeni araştırılır." }
    },
    creatinine: {
      high: { tests: ["Kreatinin / eGFR tekrarı", "Tam idrar tahlili", "İdrarda albümin/kreatinin oranı", "Elektrolitler (Na, K)", "Sistatin C ve böbrek ultrasonu (hekim kararıyla)"], why: "Böbrek işlevindeki azalmanın kalıcı olup olmadığı ve nedeni değerlendirilir.", keep: true }
    }
  };

  var BASELINE = ["Hemogram", "Ferritin", "Vitamin B12", "Folat", "25-OH Vitamin D", "Magnezyum", "Kreatinin / eGFR", "ALT"];

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(String(v).trim().replace(",", "."));
    return isFinite(n) && n > 0 ? n : null;
  }
  /* Eş anlamlı test adlarını tek adda birleştir (Ferritin / Serum Ferritin, Folat / Folat (B9) gibi) */
  var CANON = [
    [/hemogram|tam kan/i, "Hemogram (tam kan sayımı)"],
    [/serum demir|tibc/i, "Serum demiri, TIBC"],
    [/ferritin/i, "Ferritin"],
    [/b12/i, "Vitamin B12"],
    [/folat/i, "Folat (B9)"],
    [/25.?oh|vitamin d/i, "25-OH Vitamin D"],
    [/^magnezyum$/i, "Magnezyum"],
    [/^kalsiyum$/i, "Kalsiyum"],
    [/çinko|cinko/i, "Çinko"],
    [/\btsh\b/i, "TSH ve serbest T4"],
    [/hba1c|açlık kan şeker/i, "Açlık kan şekeri / HbA1c"]
  ];
  function canon(t) {
    var s = String(t || "").trim();
    if (s.length > 45) return s; /* açıklayıcı uzun maddeleri bozma */
    for (var i = 0; i < CANON.length; i++) if (CANON[i][0].test(s)) return CANON[i][1];
    return s;
  }
  function norm(s) { return canon(s).toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim(); }

  /* Güncel tahlil + en son arşiv kaydı (güncel değer arşivin üstüne yazar) */
  function collectLabs() {
    var out = {};
    var hist = (typeof state !== "undefined" && Array.isArray(state.labHistory)) ? state.labHistory.slice() : [];
    hist.sort(function (a, b) { return (b.timestamp || 0) - (a.timestamp || 0); });
    var latest = hist[0] || null;
    Object.keys(LAB_NAMES).forEach(function (k) {
      var cur = typeof state !== "undefined" && state.labValues ? num(state.labValues[k]) : null;
      var arc = latest ? num(latest[k]) : null;
      if (cur !== null) out[k] = { value: cur, source: "güncel" };
      else if (arc !== null) out[k] = { value: arc, source: "arşiv" + (latest.date ? " · " + latest.date : "") };
    });
    return out;
  }

  function evalLab(key, value) {
    try {
      var gender = (state.user && state.user.gender) || "K";
      var ref = (state.labReferences && state.labReferences[key]) || "";
      var r = KDSSRuleEngine.evaluate(key, value, gender, ref) || {};
      var low = !!(r.isLow || r.status === "below_ref");
      var high = !!(r.isHigh || r.status === "above_ref");
      var tier = String(r.tier || "");
      return { low: low, high: high, borderline: !!(r.isBorderline) && !low, critical: /^critical/.test(tier) || r.status === "urgent", status: r.statusText || "" };
    } catch (_) { return { low: false, high: false, critical: false, status: "" }; }
  }

  function selectedSymptomMetas() {
    var keys = [];
    if (typeof state !== "undefined") {
      if (state.selectedSymptoms instanceof Set) keys = Array.from(state.selectedSymptoms);
      else if (Array.isArray(state.selectedSymptomsArray)) keys = state.selectedSymptomsArray.slice();
    }
    var dict = (typeof ANAMNESIS_DICTIONARY !== "undefined") ? ANAMNESIS_DICTIONARY : {};
    return keys.map(function (k) { return dict[k]; }).filter(Boolean);
  }

  function compute() {
    var labs = collectLabs();
    var enteredKeys = Object.keys(labs);
    var isCovered = function (testName) {
      return enteredKeys.some(function (k) { return COVERED_BY[k] && COVERED_BY[k].test(testName); });
    };
    var seen = {};
    var mark = function (t) { seen[norm(t)] = true; };

    /* A) Tahlile göre */
    var labGroups = [];
    enteredKeys.forEach(function (k) {
      var ev = evalLab(k, labs[k].value);
      var dir = ev.low ? "low" : (ev.high ? "high" : null);
      var rule = dir && FOLLOW_UP[k] && FOLLOW_UP[k][dir];
      if (!rule) return;
      var tests = rule.tests.filter(function (t) { return rule.keep || !isCovered(t) || /tekrar/i.test(t); });
      tests = tests.filter(function (t) { var n = norm(t); if (seen[n]) return false; return true; });
      if (!tests.length) return;
      tests.forEach(mark);
      labGroups.push({
        key: k, name: LAB_NAMES[k], value: labs[k].value, unit: LAB_UNITS[k], source: labs[k].source,
        dir: dir, status: ev.status, critical: ev.critical, tests: tests, why: rule.why
      });
    });

    /* eGFR: kreatinin kuralı yakalamadıysa */
    var eg = typeof state !== "undefined" && state.lastCDSS && state.lastCDSS.egfrResult;
    if (eg && Number(eg.egfr) > 0 && Number(eg.egfr) < 60 && !labGroups.some(function (g) { return g.key === "creatinine"; })) {
      var r = FOLLOW_UP.creatinine.high;
      var tt = r.tests.filter(function (t) { return !seen[norm(t)]; });
      if (tt.length) {
        tt.forEach(mark);
        labGroups.push({ key: "egfr", name: "eGFR", value: Math.round(Number(eg.egfr)), unit: "mL/dk/1.73m²", source: "hesaplanan", dir: "low", status: "Azalmış", critical: Number(eg.egfr) < 30, tests: tt, why: r.why });
      }
    }
    labGroups.sort(function (a, b) { return (b.critical ? 1 : 0) - (a.critical ? 1 : 0); });

    /* B) Belirtiye göre */
    var symMap = {}, order = [], droppedCovered = 0;
    selectedSymptomMetas().forEach(function (meta) {
      var name = meta.symptomName || meta.medicalName;
      String(meta.suggestedLab || "").split(",").forEach(function (raw) {
        var t = raw.trim();
        if (!t) return;
        var n = norm(t);
        if (seen[n]) return;
        if (isCovered(t)) { droppedCovered++; return; }
        if (!symMap[n]) { symMap[n] = { name: canon(t), symptoms: [] }; order.push(n); }
        if (symMap[n].symptoms.indexOf(name) === -1) symMap[n].symptoms.push(name);
      });
    });
    /* Birden çok belirtiyle ilişkili testler öne çıkar */
    var symTests = order.map(function (n, i) { var o = symMap[n]; o._i = i; return o; })
      .sort(function (a, b) { return (b.symptoms.length - a.symptoms.length) || (a._i - b._i); });

    var hasAnyLab = enteredKeys.length > 0;
    var baseline = (!hasAnyLab && symTests.length) ? BASELINE.filter(function (t) { return !seen[norm(t)] && !symMap[norm(t)]; }) : [];

    return { labGroups: labGroups, symTests: symTests, baseline: baseline, droppedCovered: droppedCovered, hasAnyLab: hasAnyLab, hasSymptoms: selectedSymptomMetas().length > 0 };
  }

  function plainText(m) {
    var lines = ["Doktorla görüşmede değerlendirilebilecek test ve incelemeler", ""];
    if (m.labGroups.length) {
      lines.push("Tahlil sonuçlarına göre:");
      m.labGroups.forEach(function (g) {
        lines.push("- " + g.name + " " + g.value + " " + g.unit + " (" + (g.dir === "low" ? "düşük" : "yüksek") + "): " + g.tests.join("; "));
      });
      lines.push("");
    }
    if (m.symTests.length) {
      lines.push("Belirtilere göre:");
      m.symTests.forEach(function (t) { lines.push("- " + t.name + " (" + t.symptoms.join(", ") + ")"); });
      lines.push("");
    }
    if (m.baseline.length) { lines.push("Genel başlangıç paneli: " + m.baseline.join(", ")); lines.push(""); }
    lines.push("Not: Bu liste tanı veya talimat değildir; hangi testlerin yapılacağına hekim karar verir.");
    return lines.join("\n");
  }

  function render() {
    var host = $("doctorTestsSection");
    if (!host) return;
    var m;
    try { m = compute(); } catch (e) { console.warn("[VitaTakip] doctor-tests:", e); host.classList.add("hidden"); return; }

    var hasData = m.hasAnyLab || m.hasSymptoms;
    if (!hasData) { host.classList.add("hidden"); host.style.display = "none"; host.innerHTML = ""; return; }

    var total = m.labGroups.reduce(function (n, g) { return n + g.tests.length; }, 0) + m.symTests.length + m.baseline.length;
    var html = '<div class="dt-card"><div class="dt-head"><div class="dt-title"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i>' +
      '<div><h3>Doktorla görüşmede değerlendirilebilecek test ve incelemeler</h3>' +
      '<p>Sonuçlarınıza ve seçtiğiniz belirtilere göre hazırlandı.</p></div></div>' +
      (total ? '<span class="dt-badge">' + total + ' öneri</span>' : "") + '</div>';

    if (m.labGroups.length) {
      html += '<div class="dt-group"><div class="dt-gtitle"><i class="fa-solid fa-flask-vial" aria-hidden="true"></i>Tahlil sonuçlarınıza göre</div>';
      m.labGroups.forEach(function (g) {
        html += '<div class="dt-item' + (g.critical ? " dt-crit" : "") + '"><div class="dt-irow"><strong>' + esc(g.name) + ' ' + esc(g.value) + ' ' + esc(g.unit) + '</strong>' +
          '<span class="dt-tag ' + (g.dir === "low" ? "dt-low" : "dt-high") + '">' + (g.dir === "low" ? "Düşük" : "Yüksek") + '</span>' +
          (g.critical ? '<span class="dt-tag dt-prio">Öncelikli</span>' : "") +
          '<span class="dt-src">' + esc(g.source) + '</span></div>' +
          '<div class="dt-chips">' + g.tests.map(function (t) { return '<span class="dt-chip">' + esc(t) + '</span>'; }).join("") + '</div>' +
          '<p class="dt-why">' + esc(g.why) + '</p></div>';
      });
      html += '</div>';
    }

    if (m.symTests.length) {
      html += '<div class="dt-group"><div class="dt-gtitle"><i class="fa-solid fa-stethoscope" aria-hidden="true"></i>Belirtilerinize göre</div><div class="dt-list">';
      var VISIBLE = 6;
      var rowHtml = function (t) {
        return '<div class="dt-row"><span class="dt-chip">' + esc(t.name) + '</span><span class="dt-for">' + esc(t.symptoms.join(" · ")) + '</span></div>';
      };
      m.symTests.slice(0, VISIBLE).forEach(function (t) { html += rowHtml(t); });
      if (m.symTests.length > VISIBLE) {
        html += '<details class="dt-more"><summary>Diğer ' + (m.symTests.length - VISIBLE) + ' test <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>' +
          '<div class="dt-list">' + m.symTests.slice(VISIBLE).map(rowHtml).join("") + '</div></details>';
      }
      html += '</div>';
      if (m.droppedCovered) html += '<p class="dt-note">Girdiğiniz tahlillerle örtüşen ' + m.droppedCovered + ' test listeden çıkarıldı.</p>';
      html += '</div>';
    }

    if (m.baseline.length) {
      html += '<div class="dt-group"><div class="dt-gtitle"><i class="fa-solid fa-vials" aria-hidden="true"></i>Güncel tahlil yok: genel başlangıç paneli</div>' +
        '<div class="dt-chips">' + m.baseline.map(function (t) { return '<span class="dt-chip">' + esc(t) + '</span>'; }).join("") + '</div></div>';
    }

    if (!total) {
      html += '<p class="dt-empty">Girilen değerlere göre ek bir test önerisi oluşmadı. Kontrol zamanlaması için hekiminize danışabilirsiniz.</p>';
    }

    html += '<div class="dt-foot"><span>Tanı veya talimat değildir; hangi testlerin yapılacağına hekim karar verir.</span>' +
      (total ? '<button type="button" class="dt-copy" id="dtCopyBtn"><i class="fa-regular fa-copy" aria-hidden="true"></i> Listeyi kopyala</button>' : "") + '</div></div>';

    host.innerHTML = html;
    host.classList.remove("hidden");
    host.style.display = "block";

    var btn = $("dtCopyBtn");
    if (btn) btn.addEventListener("click", function () {
      var txt = plainText(m);
      var done = function () { if (typeof showToast === "function") showToast("Kopyalandı", "Test listesi panoya alındı.", "success"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt, done); });
      else fallbackCopy(txt, done);
    });
  }

  function fallbackCopy(text, cb) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); cb(); } catch (_) {}
    ta.remove();
  }

  window.renderDoctorTestsSection = render;
  /* Sadeleştirilmiş Klinik Analiz görünümü (js/clinical-simple.js) için ortak yardımcılar */
  window.VitaClinicalData = {
    collectLabs: collectLabs, evalLab: evalLab, canon: canon, norm: norm, LAB_NAMES: LAB_NAMES, LAB_UNITS: LAB_UNITS,
    selectedSymptomMetas: selectedSymptomMetas, FOLLOW_UP: FOLLOW_UP,
    isCovered: function (testName) { var keys = Object.keys(collectLabs()); return keys.some(function (k) { return COVERED_BY[k] && COVERED_BY[k].test(testName); }); }
  };
  window.computeDoctorTests = compute;
})();
