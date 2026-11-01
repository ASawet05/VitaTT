/* Klinik Analiz sayfası: bilgisiz kullanıcı için sade görünüm.
   1) Özet + "Ne yapmalısınız?"  2) Değerlerim (yalnızca girilenler)  3) Belirtilerim için doktora sorulacaklar.
   Teknik ayrıntılar (böbrek kartları, değerlendirme notları, AI sentez) "Ayrıntıları göster" arkasındadır. */
(function () {
  "use strict";

  /* Her değer için sade dil: ne anlama geliyor + hangi besinler. Tanı veya doz önerisi değildir. */
  var ADVICE = {
    ferritin: {
      low: { meaning: "Vücudun demir deposu azalmış görünüyor.", food: "Kırmızı et, karaciğer, mercimek, nohut, ıspanak. C vitaminiyle (limon, biber) birlikte yiyin; çay ve kahveyi yemekten uzak içirin." },
      high: { meaning: "Ferritin yüksek çıkmış; enflamasyon veya başka nedenlerle olabilir.", food: "" }
    },
    b12: { low: { meaning: "B12 düşük; sinir ve kan hücreleri için önemli bir vitamin.", food: "Et, balık, yumurta, süt, yoğurt, peynir." } },
    folate: { low: { meaning: "Folat düşük görünüyor.", food: "Koyu yeşil yapraklılar, mercimek, nohut, portakal." } },
    d3: {
      low: { meaning: "D vitamini düşük görünüyor.", food: "Yağlı balık, yumurta sarısı; öğle saatlerinde kısa süreli güneş." },
      high: { meaning: "D vitamini yüksek; kullandığınız bir takviye varsa hekimle konuşun.", food: "" }
    },
    mg: {
      low: { meaning: "Magnezyum düşük görünüyor.", food: "Badem, ceviz, kabak çekirdeği, ıspanak, tam tahıllar." },
      high: { meaning: "Magnezyum yüksek; böbrek ve kullandığınız ürünler gözden geçirilmeli.", food: "" }
    },
    ca: {
      low: { meaning: "Kalsiyum düşük görünüyor.", food: "Süt, yoğurt, peynir, susam, kuru incir." },
      high: { meaning: "Kalsiyum yüksek; nedeni hekimle araştırılmalı.", food: "" }
    },
    zinc: { low: { meaning: "Çinko düşük görünüyor.", food: "Et, yumurta, nohut, kabak çekirdeği, tam tahıllar." } },
    hb: {
      low: { meaning: "Hemoglobin düşük; kansızlık olabilir.", food: "Demirden ve B12'den zengin besinler (kırmızı et, baklagiller, yumurta)." },
      high: { meaning: "Hemoglobin yüksek; nedeni hekimle değerlendirilmeli.", food: "" }
    },
    mcv: {
      low: { meaning: "Alyuvarlar küçük; çoğunlukla demir eksikliğiyle ilişkilidir.", food: "" },
      high: { meaning: "Alyuvarlar büyük; B12/folat eksikliği ile ilişkili olabilir.", food: "" }
    },
    crp: { high: { meaning: "CRP yüksek; vücutta bir iltihabi durum olabilir.", food: "" } },
    alt: { high: { meaning: "Karaciğer enzimi (ALT) yüksek.", food: "" } },
    creatinine: { high: { meaning: "Böbrek süzme değeriniz normalin dışında.", food: "" } }
  };
  var NUTRIENT_LABEL = { D3_K2: "D vitamini", B12: "B12", Folat: "Folat", Demir: "Demir", Magnezyum: "Magnezyum", Kalsiyum: "Kalsiyum", "Çinko": "Çinko" };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function fmt(n) { return String(Math.round(n * 100) / 100).replace(".", ","); }
  function D() { return window.VitaClinicalData; }

  function refText(key) {
    try {
      var own = state.labReferences && state.labReferences[key];
      if (own) return String(own);
      if (typeof getVitaAppLabReference === "function") return String(getVitaAppLabReference(key, (state.user && state.user.gender) || "K"));
    } catch (_) {}
    return "";
  }

  /* Belirtiye özgü acil/alarm işaretleri (tanı değil; ne zaman acil başvurulacağını söyler) */
  var RED_FLAGS = {
    numbness: { crit: true, t: "Uyuşma: ani veya tek taraflı ise acildir", d: "Yüzde, kolda veya bacakta ani başlayan tek taraflı uyuşma ya da güçsüzlük, konuşma veya görme bozukluğu inme belirtisi olabilir: 112'yi arayın. Yavaş seyreden uyuşma için hekim değerlendirmesi planlayın." },
    muscle_weakness: { crit: true, t: "Güçsüzlük: ani başlıyorsa acildir", d: "Ani başlayan güçsüzlük, yutma veya konuşma güçlüğü, idrar ya da dışkı kontrolünde kayıp veya nefes darlığı eşlik ediyorsa 112'yi arayın." },
    balance_difficulty: { crit: true, t: "Denge kaybı: ani başlıyorsa acildir", d: "Ani başlayan denge veya yürüme bozukluğu; yüzde sarkma, kol güçsüzlüğü, konuşma bozukluğu, şiddetli baş ağrısı ya da bayılma ile birlikteyse 112'yi arayın." },
    headache: { crit: true, t: "Baş ağrısı: alarm belirtilerini bilin", d: "Ani başlayan çok şiddetli ağrı, ateş ve ense sertliği, görme veya konuşma bozukluğu, bilinç değişikliği ya da baş travması sonrası ağrı varsa 112'yi arayın." },
    restlessness: { crit: true, t: "Çarpıntı: göğüs ağrısı veya bayılma varsa acil", d: "Çarpıntıyla birlikte göğüs ağrısı, nefes darlığı, bayılma veya devam eden düzensiz kalp atışı varsa acil servise başvurun." },
    orthostatic_dizziness: { crit: true, t: "Baş dönmesi: bayılma veya siyah dışkı varsa acil", d: "Bayılma, göğüs ağrısı, siyah veya kanlı dışkı ya da kusma eşlik ediyorsa acil servise başvurun. Kansızlığın nedeni olarak gizli kanama araştırılmalıdır." },
    unexplained_swelling: { crit: true, t: "Şişlik: nefes darlığı veya tek bacak şişliği acil", d: "Nefes darlığı, göğüs ağrısı ya da tek bacakta ani şişlik, ağrı ve kızarıklık varsa acil başvurun. Ödemin nedeni kalp, böbrek, karaciğer veya ilaç olabilir; vitamin ya da mineral eksikliği olarak yorumlanmamalıdır." },
    dark_nail_change: { crit: false, t: "Tırnakta koyu çizgi: dermatoloji muayenesi gerekir", d: "Yeni, genişleyen, tek tırnaktaki veya kanayan koyu çizgi/leke melanom açısından dermatolojik değerlendirme gerektirir; vitamin eksikliği olarak yorumlanmamalıdır." },
    sun_sensitive_rash: { crit: false, t: "Güneşe duyarlı döküntü: hekim değerlendirmesi", d: "Ateş, eklem ağrısı, ağız yaraları veya yaygın döküntü eşlik ediyorsa gecikmeden hekime başvurun; otoimmün hastalıklar ve ilaç reaksiyonları ayırt edilmelidir." },
    lip_twitching: { crit: false, t: "Seğirme ve kasılma: şiddetliyse aynı gün hekim", d: "Dudak çevresi ve parmaklarda uyuşma, kasılma veya kramp düşük kalsiyum/magnezyum belirtisi olabilir; şiddetliyse ya da çarpıntıyla birlikteyse aynı gün hekime başvurun." },
    easy_bruising: { crit: false, t: "Kolay morarma ve kanama: hekim kontrolü", d: "Sık burun veya diş eti kanaması, açıklanamayan yaygın morarma, ateş ya da halsizlik varsa hemogram (trombosit) için gecikmeden hekime başvurun. Kan sulandırıcı kullanıyorsanız hekiminize bildirin." },
    bleeding_gums: { crit: false, t: "Kolay morarma ve kanama: hekim kontrolü", d: "Sık burun veya diş eti kanaması, açıklanamayan yaygın morarma, ateş ya da halsizlik varsa hemogram (trombosit) için gecikmeden hekime başvurun. Kan sulandırıcı kullanıyorsanız hekiminize bildirin." }
  };

  function parseRangeText(text) {
    var m = String(text || "").replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*[–\-—]\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var a = Number(m[1]), b = Number(m[2]);
    return a < b ? [a, b] : null;
  }

  function build() {
    var d = D();
    var labs = d.collectLabs();
    var egfr = state.lastCDSS && state.lastCDSS.egfrResult && Number(state.lastCDSS.egfrResult.egfr) > 0 ? Math.round(Number(state.lastCDSS.egfrResult.egfr)) : null;

    var rows = [];
    Object.keys(labs).forEach(function (k) {
      var ev = d.evalLab(k, labs[k].value);
      var dir = ev.low ? "low" : (ev.high ? "high" : (ev.borderline ? "border" : "ok"));
      var extra = "";
      if (k === "creatinine" && egfr !== null) {
        extra = " · eGFR " + egfr;
        if (egfr < 60 && dir === "ok") dir = "high";
      }
      rows.push({ key: k, name: d.LAB_NAMES[k], value: labs[k].value, unit: d.LAB_UNITS[k], extra: extra, dir: dir, critical: ev.critical, source: labs[k].source, ref: refText(k) });
    });
    /* Önceki ölçüm (aynı değer için bir önceki kayıt): gelişim bilgisi bu sayfada gösterilir */
    var hist = (Array.isArray(state.labHistory) ? state.labHistory.slice() : []).filter(function (r) { return r && r.date; })
      .sort(function (a, b) { return new Date(b.date + "T00:00:00").getTime() - new Date(a.date + "T00:00:00").getTime(); });
    var improved = [];
    rows.forEach(function (r) {
      var withVal = hist.filter(function (h) { var n = Number(String(h[r.key]).replace(",", ".")); return h[r.key] !== null && h[r.key] !== undefined && h[r.key] !== "" && isFinite(n); });
      if (withVal.length < 2) return;
      var prevV = Number(String(withVal[1][r.key]).replace(",", "."));
      var range = parseRangeText(refText(r.key));
      r.prev = { value: prevV, date: withVal[1].date };
      var prevOut = range ? (prevV < range[0] || prevV > range[1]) : false;
      var distOf = function (v) { return !range ? 0 : (v < range[0] ? range[0] - v : (v > range[1] ? v - range[1] : 0)); };
      var dNow = distOf(Number(r.value)), dPrev = distOf(prevV);
      if (prevOut && dNow === 0) { r.trend = "Normale ulaştı"; r.trendCls = "vs-t-good"; improved.push(r.name); }
      else if (range && dNow < dPrev) { r.trend = "Normale yaklaştı"; r.trendCls = "vs-t-good"; }
      else if (range && dNow > dPrev) { r.trend = "Normalden uzaklaştı"; r.trendCls = "vs-t-bad"; }
      else if (Number(r.value) === prevV) { r.trend = "Değişmedi"; r.trendCls = "vs-t-flat"; }
    });
    var bad = rows.filter(function (r) { return r.dir !== "ok"; }).sort(function (a, b) { return (b.critical ? 1 : 0) - (a.critical ? 1 : 0); });
    var ok = rows.filter(function (r) { return r.dir === "ok"; });

    /* Testler: tek bir birleşik, tekrarsız liste (sorunlu tahliller + belirtiler) */
    var testMap = {}, testOrder = [];
    var addTest = function (name, why, fromLab) {
      var n = d.norm(name);
      if (!testMap[n]) { testMap[n] = { name: d.canon(name), why: [], lab: false }; testOrder.push(n); }
      var t = testMap[n];
      if (why && t.why.indexOf(why) === -1) t.why.push(why);
      if (fromLab) t.lab = true;
    };
    bad.forEach(function (r) {
      var f = d.FOLLOW_UP[r.key] && d.FOLLOW_UP[r.key][r.dir === "border" ? "low" : r.dir];
      if (!f) return;
      f.tests.slice(0, 3).forEach(function (t) {
        /* Girilmiş ve normal bir tahlille zaten karşılanan testi önerme (tekrar testleri hariç) */
        if (d.isCovered(t) && !f.keep && !/tekrar/i.test(t)) return;
        addTest(t, r.name + (r.dir === "high" ? " yüksek" : " düşük"), true);
      });
    });

    /* Belirtiler: yalnızca ad + olası eksikler; testleri birleşik listeye gider */
    var syms = d.selectedSymptomMetas().map(function (m) {
      var nutrients = (Array.isArray(m.nutrients) ? m.nutrients : []).map(function (n) { return NUTRIENT_LABEL[n] || n; });
      var name = m.symptomName || m.medicalName;
      /* Belirti başına en önemli 2 test (listenin başındakiler) */
      String(m.suggestedLab || "").split(",").map(function (s) { return s.trim(); })
        .filter(function (t) { return t && !d.isCovered(t); })
        .slice(0, 2)
        .forEach(function (t) { addTest(t, name, false); });
      return { name: name, nutrients: nutrients };
    });

    var tests = testOrder.map(function (n, i) { var o = testMap[n]; o._i = i; return o; })
      .sort(function (a, b) { return (b.why.length - a.why.length) || ((b.lab ? 1 : 0) - (a.lab ? 1 : 0)) || (a._i - b._i); });

    /* Güvenlik uyarıları: motorun ürettiği kutudan okunur; böbrek uyarıları "Değerlerim" satırına taşınır */
    var safety = [], kidney = [];
    var box = $("contraindicationAlertContainer");
    if (box) {
      Array.prototype.forEach.call(box.querySelectorAll("strong"), function (st) {
        var raw = (st.textContent || "").replace(/\s+/g, " ").trim();
        if (!raw) return;
        var p = st.nextElementSibling;
        var detail = p && p.tagName === "P" ? (p.textContent || "").replace(/\s+/g, " ").trim() : "";
        var item = { title: shortTitle(raw), detail: detail, crit: /⛔/.test(raw) };
        /* Yalnızca GENEL böbrek mesajları kreatinin satırına taşınır.
           İlaca/takviyeye özgü olanlar (ör. "Metformin & Azalmış GFR") hasta güvenliği için ayrı uyarı olarak kalır. */
        var generalKidney = /EMN[İI]YET K[İI]L[İI]D[İI]|B[öo]brek Fonksiyonu G[üu]venlik Uyar[ıi]s[ıi]/i.test(raw);
        var kidneyRelated = /b[öo]brek|kidney|renal|egfr/i.test(raw);
        if (kidneyRelated && generalKidney) kidney.push(item); else safety.push(item);
      });
    }
    var kidneyRow = rows.filter(function (r) { return r.key === "creatinine"; })[0];
    if (kidney.length && kidneyRow) {
      kidneyRow.kidneyNote = true;
      if (kidney.some(function (k) { return k.crit; }) && kidneyRow.dir === "ok") kidneyRow.dir = "high";
      kidneyRow.critical = kidneyRow.critical || kidney.some(function (k) { return k.crit; });
      if (bad.indexOf(kidneyRow) === -1 && kidneyRow.dir !== "ok") { bad.push(kidneyRow); ok = ok.filter(function (r) { return r !== kidneyRow; }); }
    } else if (kidney.length) {
      /* Kreatinin girilmemiş ama böbrek riski bildirilmiş: tek satırlık uyarı olarak göster */
      safety.push({ title: "Böbrek: ilaç ve mineral takviyesi başlamadan hekime danışın", detail: kidney[0].detail || "", crit: false });
    }

    /* ---- Hasta güvenliği: öncelikli uyarılar (en üstte) ---- */
    var pri = [];
    var user = state.user || {};
    var ageNum = Number(user.age);
    if (isFinite(ageNum) && ageNum > 0 && ageNum < 18) {
      pri.push({ title: "18 yaş altı: yetişkin referansları kullanılıyor", crit: false,
        detail: "Bu uygulama yetişkin referans aralıklarını ve kurallarını kullanır. Çocuk ve ergenlerde değerler farklıdır; sonuçları çocuk/aile hekiminizle değerlendirin. Takviye önerisi üretilmez." });
    }
    var pStage = user.gender === "E" ? "" : (user.pregnancyStage || (user.pregnancyLactation ? "lactation" : ""));
    if (pStage === "t1" || pStage === "t2" || pStage === "t3") {
      var tri = { t1: "1. trimester", t2: "2. trimester", t3: "3. trimester" }[pStage];
      pri.unshift({ title: "Gebelik (" + tri + "): gebelik referansları uygulandı", crit: false,
        detail: "Hemoglobin sınırı " + (pStage === "t2" ? "10,5" : "11") + " g/dL, kreatinin normali 0,4–0,8 mg/dL olarak değerlendirildi. eGFR formülleri gebelikte geçerli olmadığı için hesaplanmaz. Bu uygulama bu dönemde takviye adayı üretmez; vitamin, mineral ve bitkisel ürünleri doğum hekimi, ebe veya eczacı onayı olmadan kullanmayın. Tüm sonuçları doğum hekiminizle değerlendirin." });
      pri.push({ title: "Gebelikte acil belirtiler", crit: true,
        detail: "Şiddetli baş ağrısı, görme bozukluğu, yüz veya ellerde ani şişme, üst karın ağrısı, vajinal kanama, sıvı gelmesi, bebek hareketlerinde azalma, ateş ya da nefes darlığı varsa gecikmeden acil servise veya doğum hekimine başvurun (112)." });
    } else if (pStage === "lactation") {
      pri.unshift({ title: "Emzirme: ilaç ve takviye kararlarını hekim/eczacı ile verin", crit: false,
        detail: "Bu uygulama yetişkin kadın referanslarını kullanır. Bazı ilaçlar, bitkisel ürünler ve yüksek doz vitaminler süte geçebilir; takviye adayı üretilmez. Karar için hekim veya eczacıya danışın." });
    }
    var symKeys = state.selectedSymptoms instanceof Set ? Array.from(state.selectedSymptoms) : (Array.isArray(state.selectedSymptomsArray) ? state.selectedSymptomsArray : []);
    var seenRed = {};
    symKeys.forEach(function (k) {
      var rf = RED_FLAGS[k];
      if (rf && !seenRed[rf.t]) { seenRed[rf.t] = true; pri.push({ title: rf.t, detail: rf.d, crit: !!rf.crit }); }
    });
    /* Çok sapmış (acil) tahliller: kaynaklı metinle, gecikmeden hekime yönlendirme */
    var ev2 = window.VitaLabEvidence;
    if (ev2 && ev2.evaluate) {
      var gnd = (user.gender === "E") ? "E" : "K";
      var crpV = labs.crp ? labs.crp.value : null, hbV = labs.hb ? labs.hb.value : null;
      rows.forEach(function (r) {
        var R = null;
        try { R = ev2.evaluate(r.key, r.value, { gender: gnd, age: ageNum, crp: crpV, hb: hbV, reference: (state.labReferences && state.labReferences[r.key]) || "" }); } catch (_) {}
        if (!R || R.status !== "urgent") return;
        var stem = r.name.toLocaleLowerCase("tr-TR").split(" ")[0];
        var dup = safety.concat(kidney).some(function (s) { return s.title.toLocaleLowerCase("tr-TR").indexOf(stem) > -1; });
        if (dup) return;
        pri.push({ title: r.name + " " + fmt(r.value) + " " + r.unit + ": gecikmeden hekim değerlendirmesi", detail: R.message || "", crit: true });
      });
    }
    safety = pri.concat(safety);

    var recall = state.lastCDSS && state.lastCDSS.recallInfo && state.lastCDSS.recallInfo.dateFormatted ? String(state.lastCDSS.recallInfo.dateFormatted) : "";

    return { rows: rows, bad: bad, ok: ok, syms: syms, tests: tests, hasLab: rows.length > 0, safety: safety, recall: recall, improved: improved };
  }

  /* Uzun, büyük harfli güvenlik başlıklarını tek satırlık sade cümleye çevir */
  function shortTitle(raw) {
    var c = raw.replace(/^[^A-Za-zÇĞİÖŞÜçğıöşü]+/, "").replace(/\s+/g, " ").trim();
    var lc = c.toLocaleLowerCase("tr-TR");
    if (/hiperkalsemi/.test(lc)) return "Kalsiyum yüksek: D vitamini ve kalsiyum takviyesi kullanmayın";
    if (/hepatik|\bALT\b/.test(c)) return "ALT yüksek: yüksek doz takviye yalnızca hekim kontrolünde";
    var kd = c.match(/Kidney Safety\)\s*:\s*(.+)$/i);
    if (kd) return "Böbrek ve ilaç: " + kd[1].trim();
    c = c.replace(/\s*\([^)]*\)\s*$/, "").replace(/\s+AKTİF\b/i, "").replace(/\s*-\s*ALT.*$/i, "").trim();
    if (c === c.toLocaleUpperCase("tr-TR")) c = c.charAt(0) + c.slice(1).toLocaleLowerCase("tr-TR");
    return c;
  }

  var CHIP = { low: ["Düşük", "vs-low"], high: ["Yüksek", "vs-high"], border: ["Sınırda", "vs-border"], ok: ["Normal", "vs-ok"] };
  var ARROW = { low: "↓", high: "↑", border: "↓", ok: "" };

  function summaryHtml(m) {
    var title, sub = "";
    var nBad = m.bad.length;
    if (nBad) {
      title = "Dikkat edilmesi gereken " + nBad + " değer var";
    } else if (m.hasLab && m.syms.length) {
      title = "Girdiğiniz değerler normal görünüyor";
      sub = "Belirtileriniz için doktorunuzla konuşabileceğiniz testler aşağıda.";
    } else if (m.hasLab) {
      title = "Girdiğiniz değerler normal görünüyor";
      sub = "Belirtiniz seçilmedi. Şikâyetiniz varsa “Belirtileri düzenle” ile ekleyebilirsiniz.";
    } else {
      title = "Belirtilerinize göre kontrol edilebilecek testler hazır";
      sub = "Kesin bilgi için kan tahlili değerlerinizi girin.";
    }

    if (m.improved && m.improved.length) sub = (sub ? sub + " " : "") + "🎉 " + m.improved.join(", ") + (m.improved.length > 1 ? " normale ulaştı." : " normale ulaştı.");

    var steps = [];
    if (m.tests.length) steps.push({ t: "Doktorunuza gidin, aşağıdaki testleri isteyin", b: '<button type="button" class="vs-btn" data-vs="tests">Testleri gör</button>' });
    var lowFood = m.bad.some(function (r) { return r.dir !== "high" && ADVICE[r.key] && ADVICE[r.key].low && ADVICE[r.key].low.food; });
    if (lowFood) steps.push({ t: "Bu besinleri sofranıza ekleyin", b: '<button type="button" class="vs-btn vs-btn-ghost" data-vs="food">Besinlere git</button>' });
    if (!m.hasLab) steps.push({ t: "Tahlil sonucunuz varsa girin; öneriler netleşir", b: '<button type="button" class="vs-btn vs-btn-ghost" data-vs="labs">Tahlil gir</button>' });
    if (nBad) steps.push({ t: "Takviyeye hekiminize danışmadan başlamayın", b: "" });

    var html = '<section class="vs-card vs-hero"><div class="vs-hero-top"><span class="vs-hero-ico" aria-hidden="true"><i class="fa-solid fa-clipboard-check"></i></span><div>' +
      '<h2>' + esc(title) + '</h2>' + (sub ? '<p>' + esc(sub) + '</p>' : "") + '</div></div>';
    if (steps.length) {
      html += '<div class="vs-steps"><div class="vs-steps-title">Ne yapmalısınız?</div><ol>' +
        steps.map(function (s) { return '<li><span>' + esc(s.t) + '</span>' + s.b + '</li>'; }).join("") + '</ol></div>';
    }
    html += '<div class="vs-hero-actions"><button type="button" class="vs-btn vs-btn-ghost" data-vs="report"><i class="fa-solid fa-user-doctor" aria-hidden="true"></i> Hekim raporu</button>' +
      '<button type="button" class="vs-btn vs-btn-ghost" data-vs="edit"><i class="fa-solid fa-pen-to-square" aria-hidden="true"></i> Belirtileri düzenle</button></div></section>';
    return html;
  }

  /* Güvenlik uyarıları: başlığın hemen altında, her biri tek satır; dokununca ayrıntı açılır */
  function safetyHtml(m) {
    if (!m.safety.length) return "";
    var html = '<section class="vs-card vs-safety"><h3 class="vs-h"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> Güvenlik uyarıları <span class="vs-count">' + m.safety.length + '</span></h3>';
    m.safety.forEach(function (s) {
      html += '<details class="vs-warn' + (s.crit ? " vs-warn-crit" : "") + '"><summary><span class="vs-warn-t">' + esc(s.title) + '</span>' +
        (s.detail ? '<i class="fa-solid fa-chevron-down vs-chev" aria-hidden="true"></i>' : "") + '</summary>' +
        (s.detail ? '<div class="vs-warn-body">' + esc(s.detail) + '</div>' : "") + '</details>';
    });
    return html + '</section>';
  }

  function valuesHtml(m) {
    if (!m.hasLab) return "";
    var html = '<section class="vs-card"><h3 class="vs-h"><i class="fa-solid fa-flask-vial" aria-hidden="true"></i> Değerlerim</h3>';
    m.bad.forEach(function (r) {
      var adv = ADVICE[r.key] && (r.dir === "high" ? ADVICE[r.key].high : ADVICE[r.key].low) || (ADVICE[r.key] && (ADVICE[r.key].low || ADVICE[r.key].high));
      var chip = CHIP[r.dir];
      if (r.key === "creatinine" && typeof isPregnantNow === "function" && isPregnantNow()) {
        adv = { meaning: "Gebelikte böbrek süzme hızı artar, bu yüzden kreatinin normalde düşüktür (0,4–0,8 mg/dL). Bu değer gebelik için yüksek sayılır; tansiyon yüksekliği, baş ağrısı, görme bozukluğu veya ödem varsa acildir. Her durumda doğum hekiminize bildirin.", food: "" };
      }
      html += '<details class="vs-val' + (r.critical ? " vs-val-crit" : "") + '"><summary>' +
        '<span class="vs-val-name">' + esc(r.name) + '</span>' +
        '<span class="vs-val-num">' + esc(fmt(r.value)) + ' <small>' + esc(r.unit) + esc(r.extra) + '</small></span>' +
        '<span class="vs-chip ' + chip[1] + '">' + chip[0] + '</span><i class="fa-solid fa-chevron-down vs-chev" aria-hidden="true"></i></summary>' +
        '<div class="vs-val-body">';
      if (adv && adv.meaning) html += '<p>' + esc(adv.meaning) + '</p>';
      if (r.prev && r.trend) html += '<p class="vs-trend ' + r.trendCls + '">Önceki ölçüm: ' + esc(fmt(r.prev.value)) + ' (' + esc(r.prev.date.split("-").reverse().join(".")) + ') → şimdi ' + esc(fmt(r.value)) + ' · <b>' + esc(r.trend) + '</b></p>';
      if (r.kidneyNote) html += '<p class="vs-safe-line"><i class="fa-solid fa-shield-heart" aria-hidden="true"></i> İlaç ve takviye (özellikle ağrı kesici ve mineral) kullanmadan önce hekime danışın.</p>';
      if (r.ref) html += '<p class="vs-ref">Referans: ' + esc(r.ref) + '</p>';
      html += '</div></details>';
    });
    if (m.ok.length) {
      html += '<div class="vs-okrow"><span class="vs-ok-title">Normal</span>' + m.ok.map(function (r) {
        return '<span class="vs-okchip">' + esc(r.name) + ' <b>' + esc(fmt(r.value)) + '</b></span>';
      }).join("") + '</div>';
    }
    html += '</section>';
    return html;
  }

  function symptomsHtml(m) {
    if (!m.syms.length) return "";
    var VISIBLE = 5;
    var one = function (s) {
      return '<div class="vs-sym"><div class="vs-sym-name">' + esc(s.name) + '</div>' +
        (s.nutrients.length ? '<div class="vs-sym-for">Olası eksik: ' + s.nutrients.map(esc).join(", ") + '</div>' : "") + '</div>';
    };
    var html = '<section class="vs-card"><h3 class="vs-h"><i class="fa-solid fa-stethoscope" aria-hidden="true"></i> Belirtileriniz</h3>' +
      m.syms.slice(0, VISIBLE).map(one).join("");
    if (m.syms.length > VISIBLE) {
      html += '<details class="vs-more"><summary>Diğer ' + (m.syms.length - VISIBLE) + ' belirti <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>' +
        m.syms.slice(VISIBLE).map(one).join("") + '</details>';
    }
    return html + '</section>';
  }

  /* Doktordan istenebilecek testler: sayfada yalnızca BU kartta, tekrarsız */
  function recallHtml(m) {
    return m.recall ? '<div class="vs-recall" title="Bu tarih yalnızca uygulama içi hatırlatmadır; kontrol zamanını doktorunuz belirler."><i class="fa-solid fa-calendar-check" aria-hidden="true"></i> Kontrol tahlili hatırlatması: <b>' + esc(m.recall) + '</b></div>' : "";
  }

  function testsHtml(m) {
    if (!m.tests.length) return m.recall ? '<section class="vs-card vs-card-slim">' + recallHtml(m) + '</section>' : "";
    var VISIBLE = 6;
    var row = function (t) {
      return '<div class="vs-test"><span class="vs-test-name">' + esc(t.name) + '</span>' +
        (t.why.length ? '<span class="vs-test-why">' + t.why.map(esc).join(" · ") + '</span>' : "") + '</div>';
    };
    var html = '<section class="vs-card" id="vsTests"><div class="vs-h-row"><h3 class="vs-h"><i class="fa-solid fa-user-doctor" aria-hidden="true"></i> Doktordan isteyebileceğiniz testler</h3>' +
      '<button type="button" class="vs-copy" data-vs="copy"><i class="fa-regular fa-copy" aria-hidden="true"></i> Kopyala</button></div>' +
      m.tests.slice(0, VISIBLE).map(row).join("");
    if (m.tests.length > VISIBLE) {
      html += '<details class="vs-more"><summary>Diğer ' + (m.tests.length - VISIBLE) + ' test <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></summary>' +
        m.tests.slice(VISIBLE).map(row).join("") + '</details>';
    }
    return html + recallHtml(m) + '</section>';
  }

  function plainText(m) {
    var L = ["VitaTakip - doktordan istenebilecek testler", ""];
    m.tests.forEach(function (t) { L.push("- " + t.name + (t.why.length ? " (" + t.why.join(", ") + ")" : "")); });
    L.push("");
    L.push("Not: Tanı veya talimat değildir; kararı hekim verir.");
    return L.join("\n");
  }

  var current = null;

  function render(show) {
    var host = $("vitaSimpleHost");
    if (!host) return;
    if (show === false) { host.classList.add("hidden"); host.innerHTML = ""; return; }
    var m;
    try { m = build(); } catch (e) { console.warn("[VitaTakip] clinical-simple:", e); return; }
    current = m;
    /* Sıra: özet → güvenlik uyarıları → değerlerim → belirtiler → testler (+ hatırlatma) */
    host.innerHTML = summaryHtml(m) + safetyHtml(m) + valuesHtml(m) + symptomsHtml(m) + testsHtml(m);
    host.classList.remove("hidden");
  }

  function onClick(e) {
    var t = e.target.closest && e.target.closest("[data-vs]");
    if (!t) return;
    var a = t.getAttribute("data-vs");
    if (a === "copy" && current) {
      var txt = plainText(current);
      var done = function () { if (typeof showToast === "function") showToast("Kopyalandı", "Liste panoya alındı.", "success"); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done); else done();
    } else if (a === "tests") {
      var tt = $("vsTests");
      if (tt) tt.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (a === "food") {
      var f = $("foodAlternativesSection");
      if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (a === "labs") { if (typeof navigateToView === "function") navigateToView("view-labs"); }
    else if (a === "report") { if (typeof transferToDoctorReport === "function") transferToDoctorReport(); else if (typeof navigateToView === "function") navigateToView("view-report"); }
    else if (a === "edit") {
      if (typeof editSymptomsFromClinicalResults === "function") editSymptomsFromClinicalResults();
      else if (typeof navigateToView === "function") navigateToView("view-neyim");
    }
  }

  document.addEventListener("click", onClick);
  window.renderVitaSimple = render;
})();
