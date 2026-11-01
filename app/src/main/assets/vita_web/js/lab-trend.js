/* Tahlillerim: "Tahlil gelişim grafiği" — açılır/kapanır kart, tek biyobelirteç seçimi,
   o tahlile göre dinamik Y ekseni, referans bandı, tarih ekseni, dokununca ayrıntı. */
(function () {
  "use strict";

  var META = [
    { key: "d3", name: "D vitamini", unit: "ng/mL", color: "#0d9488" },
    { key: "b12", name: "B12", unit: "pg/mL", color: "#4f46e5" },
    { key: "ferritin", name: "Ferritin", unit: "ng/mL", color: "#e11d48" },
    { key: "hb", name: "Hemoglobin", unit: "g/dL", color: "#dc2626" },
    { key: "mg", name: "Magnezyum", unit: "mg/dL", color: "#d97706" },
    { key: "folate", name: "Folat", unit: "ng/mL", color: "#059669" },
    { key: "ca", name: "Kalsiyum", unit: "mg/dL", color: "#0284c7" },
    { key: "zinc", name: "Çinko", unit: "µg/dL", color: "#7c3aed" },
    { key: "creatinine", name: "Kreatinin", unit: "mg/dL", color: "#ea580c" },
    { key: "alt", name: "ALT", unit: "U/L", color: "#be123c" },
    { key: "mcv", name: "MCV", unit: "fL", color: "#9333ea" },
    { key: "crp", name: "CRP", unit: "mg/L", color: "#475569" }
  ];
  var FALLBACK_RANGE = {
    d3: [20, 50], b12: [200, 900], ferritin: [15, 150], hb: [12, 16], mg: [1.8, 2.3], folate: [4, 20],
    ca: [8.6, 10.2], zinc: [70, 120], creatinine: [0.6, 1.2], alt: [7, 35], mcv: [80, 100], crp: [0, 5]
  };

  var selectedKey = null;
  var closed = true; /* varsayılan: kapalı */

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) { if (v === null || v === undefined || v === "") return null; var n = Number(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function fmtD(n, dec) { return Number(n).toFixed(dec).replace(".", ","); }
  function dmy(d) { var p = String(d).split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : String(d); }
  function dmyShort(d) { var p = String(d).split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0].slice(2) : String(d); }

  function parseRange(text) {
    var m = String(text || "").replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*[–\-—]\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var a = Number(m[1]), b = Number(m[2]);
    return a < b ? [a, b] : null;
  }
  /* Referans: kullanıcının rapor aralığı > uygulama genel aralığı > yedek */
  function rangeFor(key) {
    try {
      var r = parseRange(state.labReferences && state.labReferences[key]);
      if (r) return r;
      if (typeof getVitaAppLabReference === "function") {
        r = parseRange(getVitaAppLabReference(key, (state.user && state.user.gender) || "K"));
        if (r) return r;
      }
    } catch (_) {}
    return FALLBACK_RANGE[key] || null;
  }

  function series() {
    var hist = (typeof state !== "undefined" && Array.isArray(state.labHistory)) ? state.labHistory.slice() : [];
    hist = hist.filter(function (r) { return r && r.date; }).sort(function (a, b) {
      return new Date(a.date + "T00:00:00").getTime() - new Date(b.date + "T00:00:00").getTime();
    });
    var list = [];
    META.forEach(function (m) {
      var pts = [];
      hist.forEach(function (r) { var v = num(r[m.key]); if (v !== null) pts.push({ date: r.date, v: v }); });
      if (pts.length) list.push({ meta: m, pts: pts, range: rangeFor(m.key) });
    });
    return { dates: hist.length, list: list };
  }

  /* "Güzel" eksen basamağı (1, 2, 2.5, 5 × 10ⁿ) ve gereken ondalık sayısı */
  function niceStep(span, target) {
    var raw = span / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nf * mag;
  }
  function decimalsOf(step) { var s = String(Math.round(step * 1e6) / 1e6); var i = s.indexOf("."); return i < 0 ? 0 : s.length - i - 1; }

  /* Dinamik ölçek: ölçümler + referans bandı birlikte görünür; kenar boşluğu %10 */
  function scale(s) {
    var vals = s.pts.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (s.range) { lo = Math.min(lo, s.range[0]); hi = Math.max(hi, s.range[1]); }
    if (hi === lo) { hi += Math.abs(hi) * 0.1 || 1; lo -= Math.abs(lo) * 0.1 || 1; }
    var pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
    if (lo < 0 && Math.min.apply(null, vals) >= 0 && (!s.range || s.range[0] >= 0)) lo = 0; /* negatif eksen yok */
    var step = niceStep(hi - lo, 4), dec = decimalsOf(step);
    var min = Math.floor(lo / step) * step, max = Math.ceil(hi / step) * step;
    var ticks = []; for (var t = min; t <= max + step / 2; t += step) ticks.push(Math.round(t * 1e6) / 1e6);
    /* değer etiketleri için gereken hassasiyet: ölçümlerin kendi ondalığı */
    var vd = 0; vals.forEach(function (v) { var d = decimalsOf(v); if (d > vd) vd = d; });
    return { min: min, max: max, ticks: ticks, dec: dec, vdec: Math.min(3, vd) };
  }

  function statusOf(v, range) { if (!range) return "ok"; return v < range[0] ? "low" : (v > range[1] ? "high" : "ok"); }
  var STATUS_TXT = { low: "Düşük", high: "Yüksek", ok: "Normal" };

  function chart(s) {
    var W = 340, H = 232, L = 44, R = 14, T = 16, B = 44;
    var sc = scale(s), n = s.pts.length;
    var X = function (i) { return n === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (n - 1); };
    var Y = function (v) { return T + (H - T - B) * (1 - (v - sc.min) / (sc.max - sc.min)); };
    var g = '<svg class="lt-chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(s.meta.name) + ' (' + esc(s.meta.unit) + ') ölçüm trendi">';
    /* referans bandı */
    if (s.range) {
      var y1 = Y(s.range[1]), y2 = Y(s.range[0]);
      g += '<rect x="' + L + '" y="' + y1.toFixed(1) + '" width="' + (W - L - R) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="#dcfce7" opacity=".7"/>';
    }
    /* Y ızgarası ve etiketleri */
    sc.ticks.forEach(function (t) {
      var y = Y(t);
      g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#e2e8f0" stroke-width="1"/>' +
        '<text x="' + (L - 5) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" font-size="9.5" fill="#64748b">' + fmtD(t, sc.dec) + '</text>';
    });
    g += '<text x="' + (L - 5) + '" y="' + (T - 5) + '" text-anchor="end" font-size="9" font-weight="700" fill="#475569">' + esc(s.meta.unit) + '</text>';
    /* referans sınır çizgileri */
    if (s.range) {
      [s.range[0], s.range[1]].forEach(function (v) {
        g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(v).toFixed(1) + '" y2="' + Y(v).toFixed(1) + '" stroke="#4ade80" stroke-dasharray="4 3" stroke-width="1.1"/>';
      });
    }
    /* X ekseni */
    g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="#94a3b8" stroke-width="1"/>';
    var every = n > 8 ? Math.ceil(n / 6) : 1;
    s.pts.forEach(function (p, i) {
      if (i % every !== 0 && i !== n - 1) return;
      var anchor = n > 1 ? (i === 0 ? "start" : (i === n - 1 ? "end" : "middle")) : "middle";
      g += '<text x="' + X(i).toFixed(1) + '" y="' + (H - B + 13) + '" text-anchor="' + anchor + '" font-size="9.5" fill="#475569">' + esc(dmyShort(p.date)) + '</text>';
    });
    g += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 8) + '" text-anchor="middle" font-size="10" fill="#64748b">Tahlil tarihi (eskiden yeniye)</text>';
    /* çizgi + noktalar */
    if (n > 1) g += '<polyline fill="none" stroke="' + s.meta.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' +
      s.pts.map(function (p, i) { return X(i).toFixed(1) + "," + Y(p.v).toFixed(1); }).join(" ") + '"/>';
    s.pts.forEach(function (p, i) {
      var st = statusOf(p.v, s.range);
      g += '<circle class="lt-pt" tabindex="0" data-i="' + i + '" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="5" fill="#fff" stroke="' + (st === "ok" ? s.meta.color : "#ea580c") + '" stroke-width="2.6">' +
        '<title>' + esc(dmy(p.date)) + ' · ' + esc(fmtD(p.v, sc.vdec)) + ' ' + esc(s.meta.unit) + '</title></circle>';
    });
    return { svg: g + "</svg>", sc: sc };
  }

  function monthsBetween(a, b) {
    var d = (new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000;
    return d / 30.44;
  }

  var current = null;

  function render() {
    var mount = $("labsRechartsMultiLineMount");
    if (!mount) return false;
    var card = $("biomarkerChartCard"); if (card) card.classList.remove("hidden");
    syncHeader();
    var data = series();
    if (!data.list.length) {
      current = null;
      mount.innerHTML = '<div class="lt-empty"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><div><strong>Henüz grafik için ölçüm yok</strong><span>Tahlil sonuçlarınızı girip kaydedin; değişiminiz burada görünür.</span></div></div>';
      return true;
    }
    if (!data.list.some(function (s) { return s.meta.key === selectedKey; })) selectedKey = data.list[0].meta.key;
    var s = data.list.filter(function (x) { return x.meta.key === selectedKey; })[0];
    current = s;
    var c = chart(s);

    var opts = data.list.map(function (x) {
      return '<option value="' + x.meta.key + '"' + (x.meta.key === selectedKey ? " selected" : "") + '>' + esc(x.meta.name) + ' (' + esc(x.meta.unit) + ')</option>';
    }).join("");
    var n = s.pts.length, first = s.pts[0].date, last = s.pts[n - 1].date;
    var summary;
    if (n === 1) {
      summary = "1 ölçüm · " + dmy(first) + ". Trend görmek için yeni bir tarihte tahlil ekleyin. Noktalar kaydedilen ölçümleri temsil eder.";
    } else {
      var mo = monthsBetween(first, last);
      var span = mo >= 0.5 ? "yaklaşık " + Math.max(1, Math.round(mo)) + " aylık zaman aralığı" : "1 aydan kısa zaman aralığı";
      summary = n + " ölçüm · " + dmy(first) + " – " + dmy(last) + " · " + span + ". Noktalar kaydedilen ölçümleri temsil eder; aradaki çizgi ölçüm yapılmayan günlerdeki gerçek sonucu göstermez.";
    }

    mount.innerHTML =
      '<p class="lt-intro">Ölçümleri tarih sırasıyla inceleyin. Ölçeklerin birbirini bastırmaması için tek biyobelirteç seçin.</p>' +
      '<label class="lt-label" for="ltSelect">Grafikte gösterilecek tahlil</label>' +
      '<select id="ltSelect" class="lt-select">' + opts + '</select>' +
      '<div class="lt-legend"><span><i class="lt-sw" style="background:' + s.meta.color + '"></i>' + esc(s.meta.name) + ' (' + esc(s.meta.unit) + ')</span>' +
      (s.range ? '<span><i class="lt-sw lt-sw-band"></i>Referans aralığı ' + esc(fmtD(s.range[0], Math.max(decimalsOf(s.range[0]), decimalsOf(s.range[1])))) + '–' + esc(fmtD(s.range[1], Math.max(decimalsOf(s.range[0]), decimalsOf(s.range[1])))) + '</span>' : "") + '</div>' +
      '<div class="lt-chartwrap">' + c.svg + '<div class="lt-tip" id="ltTip" role="status" aria-live="polite"></div></div>' +
      '<p class="lt-sumtxt">' + esc(summary) + '</p>' +
      '<p class="lt-legal">Grafik görsel karşılaştırma içindir. Referans aralığı ve klinik yorum; laboratuvar, yaş, cinsiyet, ilaçlar ve sağlık öyküsüyle birlikte bir hekim tarafından değerlendirilmelidir.</p>';
    return true;
  }

  /* Üzerine gelince / dokununca ayrıntı */
  function showTip(i) {
    var tip = $("ltTip"), s = current; if (!tip || !s) return;
    var p = s.pts[i], sc = scale(s), st = statusOf(p.v, s.range);
    tip.innerHTML = '<b>' + esc(dmy(p.date)) + '</b> · ' + esc(fmtD(p.v, sc.vdec)) + ' ' + esc(s.meta.unit) + ' <span class="lt-t-' + st + '">' + STATUS_TXT[st] + '</span>';
    tip.classList.add("on");
  }
  document.addEventListener("mouseover", function (e) { var c = e.target.closest && e.target.closest(".lt-pt"); if (c) showTip(Number(c.getAttribute("data-i"))); });
  document.addEventListener("click", function (e) { var c = e.target.closest && e.target.closest(".lt-pt"); if (c) showTip(Number(c.getAttribute("data-i"))); });
  document.addEventListener("focusin", function (e) { var c = e.target.closest && e.target.closest(".lt-pt"); if (c) showTip(Number(c.getAttribute("data-i"))); });
  document.addEventListener("change", function (e) { if (e.target && e.target.id === "ltSelect") { selectedKey = e.target.value; render(); } });

  /* Açılır/kapanır: pürüzsüz */
  function syncHeader() {
    var c = $("acc-labtrend"), t = $("labTrendAccordionToggle"), l = $("label-acc-labtrend"), i = $("icon-acc-labtrend");
    if (!c) return;
    c.classList.toggle("lt-closed", closed);
    c.classList.remove("hidden");
    if (!closed && c.style.maxHeight !== "none") c.style.maxHeight = "none";
    if (closed) c.style.maxHeight = "0px";
    if (t) t.setAttribute("aria-expanded", closed ? "false" : "true");
    if (l) l.textContent = closed ? "Göster" : "Gizle";
    if (i) { i.classList.toggle("fa-chevron-down", closed); i.classList.toggle("fa-chevron-up", !closed); }
  }
  function toggle() {
    var c = $("acc-labtrend"); if (!c) return;
    closed = !closed;
    if (!closed) {
      render();
      c.classList.remove("lt-closed");
      c.style.maxHeight = "0px";
      c.getBoundingClientRect();
      c.style.maxHeight = c.scrollHeight + "px";
      setTimeout(function () { if (!closed) c.style.maxHeight = "none"; }, 320);
    } else {
      c.style.maxHeight = c.scrollHeight + "px";
      c.getBoundingClientRect();
      c.classList.add("lt-closed");
      c.style.maxHeight = "0px";
    }
    var t = $("labTrendAccordionToggle"), l = $("label-acc-labtrend"), i = $("icon-acc-labtrend");
    if (t) t.setAttribute("aria-expanded", closed ? "false" : "true");
    if (l) l.textContent = closed ? "Göster" : "Gizle";
    if (i) { i.classList.toggle("fa-chevron-down", closed); i.classList.toggle("fa-chevron-up", !closed); }
  }

  window.VitaLabTrend = { render: render, series: series, toggle: toggle, scale: scale, isClosed: function () { return closed; } };
})();
