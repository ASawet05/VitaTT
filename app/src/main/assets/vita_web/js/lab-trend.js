/* Tahlillerim: "Tahlil gelişimim" — sade, kompakt gelişim grafiği.
   Her biyobelirteç için tek satır: son değer, durum, mini grafik (referans bandıyla) ve değişim.
   Satıra basınca tek ölçekli, değer etiketli ayrıntılı grafik açılır. Çizgi karışıklığı yoktur. */
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

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function num(v) { if (v === null || v === undefined || v === "") return null; var n = Number(String(v).replace(",", ".")); return isFinite(n) ? n : null; }
  function fmt(n) { var r = Math.round(n * 100) / 100; return String(r).replace(".", ","); }
  function shortDate(d) { var p = String(d).split("-"); return p.length === 3 ? p[2] + "." + p[1] + "." + p[0].slice(2) : String(d); }

  /* Referans aralığı: kullanıcının girdiği aralık > uygulama genel aralığı > yedek değer */
  function parseRange(text) {
    var m = String(text || "").replace(/,/g, ".").match(/(\d+(?:\.\d+)?)\s*[–\-—]\s*(\d+(?:\.\d+)?)/);
    if (!m) return null;
    var a = Number(m[1]), b = Number(m[2]);
    return a < b ? [a, b] : null;
  }
  function rangeFor(key) {
    try {
      var own = state.labReferences && state.labReferences[key];
      var r = parseRange(own);
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
    var out = [];
    META.forEach(function (m) {
      var pts = [];
      hist.forEach(function (r) { var v = num(r[m.key]); if (v !== null) pts.push({ date: r.date, v: v }); });
      if (pts.length) out.push({ meta: m, pts: pts, range: rangeFor(m.key) });
    });
    return { dates: hist.length, list: out };
  }

  function statusOf(v, range) {
    if (!range) return "ok";
    if (v < range[0]) return "low";
    if (v > range[1]) return "high";
    return "ok";
  }
  function dist(v, range) {
    if (!range) return 0;
    if (v < range[0]) return range[0] - v;
    if (v > range[1]) return v - range[1];
    return 0;
  }
  var CHIP = { low: ["Düşük", "lt-low"], high: ["Yüksek", "lt-high"], ok: ["Normal", "lt-ok"] };

  /* Son iki ölçüm arasındaki değişimin sade yorumu */
  function trendOf(s) {
    var n = s.pts.length;
    if (n < 2) return null;
    var a = s.pts[n - 2].v, b = s.pts[n - 1].v, r = s.range;
    var da = dist(a, r), db = dist(b, r);
    var diff = b - a, sign = diff > 0 ? "+" : (diff < 0 ? "−" : "");
    var txt = sign + fmt(Math.abs(diff));
    if (r && da > 0 && db === 0) return { cls: "lt-good", icon: "↗", label: "Normale ulaştı", delta: txt };
    if (r && db > da) return { cls: "lt-bad", icon: diff > 0 ? "↑" : "↓", label: "Normalden uzaklaştı", delta: txt };
    if (r && db < da) return { cls: "lt-good", icon: diff > 0 ? "↑" : "↓", label: "Normale yaklaştı", delta: txt };
    if (diff === 0) return { cls: "lt-flat", icon: "→", label: "Değişmedi", delta: "0" };
    return { cls: "lt-flat", icon: diff > 0 ? "↑" : "↓", label: "Aralıkta", delta: txt };
  }

  function domain(s) {
    var vals = s.pts.map(function (p) { return p.v; });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (s.range) {
      var r0 = s.range[0], r1 = s.range[1];
      if (hi < r0) { hi = r0 + (r0 - lo) * 0.5; }        /* hepsi altta: bandın yalnızca alt kısmını göster */
      else if (lo > r1) { lo = r1 - (hi - r1) * 0.5; }   /* hepsi üstte: bandın yalnızca üst kısmını göster */
      else { lo = Math.min(lo, r0); hi = Math.max(hi, r1); }
    }
    if (hi === lo) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.12;
    return [lo - pad, hi + pad];
  }

  /* Mini grafik (satır içi) */
  function spark(s) {
    var W = 92, H = 30, P = 3, d = domain(s);
    var X = function (i) { return s.pts.length === 1 ? W / 2 : P + (W - 2 * P) * i / (s.pts.length - 1); };
    var Y = function (v) { return H - P - (H - 2 * P) * (v - d[0]) / (d[1] - d[0]); };
    var g = '<svg class="lt-spark" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true">';
    if (s.range) { var by1 = Math.max(0, Y(s.range[1])), by2 = Math.min(H, Y(s.range[0])); g += '<rect x="0" y="' + by1.toFixed(1) + '" width="' + W + '" height="' + Math.max(1, by2 - by1).toFixed(1) + '" fill="#dcfce7"/>'; }
    if (s.pts.length > 1) g += '<polyline fill="none" stroke="#64748b" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" points="' +
      s.pts.map(function (p, i) { return X(i).toFixed(1) + "," + Y(p.v).toFixed(1); }).join(" ") + '"/>';
    s.pts.forEach(function (p, i) {
      var last = i === s.pts.length - 1;
      var st = statusOf(p.v, s.range);
      g += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '" r="' + (last ? 3.2 : 2) + '" fill="' + (last ? (st === "ok" ? "#16a34a" : "#ea580c") : "#94a3b8") + '"/>';
    });
    return g + "</svg>";
  }

  /* Ayrıntılı grafik */
  function big(s) {
    var W = 320, H = 170, L = 38, R = 14, T = 18, B = 28, d = domain(s);
    var n = s.pts.length;
    var X = function (i) { return n === 1 ? (L + W - R) / 2 : L + (W - L - R) * i / (n - 1); };
    var Y = function (v) { return T + (H - T - B) * (1 - (v - d[0]) / (d[1] - d[0])); };
    var g = '<svg class="lt-big" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(s.meta.name) + ' değişimi">';
    if (s.range) {
      /* Band, çizim alanına sınırlanır (geniş aralıklarda taşmaz) */
      var top = T, bottom = H - B;
      var y1 = Math.max(top, Y(s.range[1])), y2 = Math.min(bottom, Y(s.range[0]));
      if (y2 > y1) {
        g += '<rect x="' + L + '" y="' + y1.toFixed(1) + '" width="' + (W - L - R) + '" height="' + Math.max(1, y2 - y1).toFixed(1) + '" fill="#dcfce7"/>';
        g += '<text x="' + (W - R - 2) + '" y="' + (y1 + 10).toFixed(1) + '" text-anchor="end" font-size="9" fill="#15803d" font-weight="700">Normal aralık</text>';
      }
      [s.range[0], s.range[1]].forEach(function (v) {
        var yy = Y(v);
        if (yy < top || yy > bottom) return; /* alan dışındaki sınır çizilmez */
        g += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + yy.toFixed(1) + '" y2="' + yy.toFixed(1) + '" stroke="#86efac" stroke-dasharray="3 3" stroke-width="1"/>';
        g += '<text x="' + (L - 4) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end" font-size="9" fill="#64748b">' + fmt(v) + '</text>';
      });
    }
    if (n > 1) g += '<polyline fill="none" stroke="' + s.meta.color + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" points="' +
      s.pts.map(function (p, i) { return X(i).toFixed(1) + "," + Y(p.v).toFixed(1); }).join(" ") + '"/>';
    var step = n > 6 ? 2 : 1;
    s.pts.forEach(function (p, i) {
      var st = statusOf(p.v, s.range), x = X(i), y = Y(p.v);
      var up = y > T + 18; /* değer etiketi nokta üstüne, yer yoksa altına */
      g += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4.5" fill="#fff" stroke="' + (st === "ok" ? "#16a34a" : "#ea580c") + '" stroke-width="2.4"/>';
      if (i % step === 0 || i === n - 1) {
        g += '<text x="' + x.toFixed(1) + '" y="' + (up ? y - 9 : y + 17).toFixed(1) + '" text-anchor="middle" font-size="10.5" font-weight="800" fill="#0f172a">' + fmt(p.v) + '</text>';
        g += '<text x="' + x.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (i === 0 && n > 1 ? "start" : (i === n - 1 && n > 1 ? "end" : "middle")) + '" font-size="9.5" fill="#64748b">' + shortDate(p.date) + '</text>';
      }
    });
    return g + "</svg>";
  }

  function render() {
    var mount = $("labsRechartsMultiLineMount");
    if (!mount) return false;
    var data = series();
    if (data.dates < 2) {
      mount.innerHTML = '<div class="lt-empty"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><div><strong>Gelişim grafiği için en az 2 farklı tarihte tahlil gerekir.</strong>' +
        '<span>' + (data.dates === 1 ? "Şu an 1 tahlil kayıtlı. Yeni bir tahlil eklediğinizde değişiminiz burada görünür." : "Tahlil sonuçlarınızı girip kaydedin.") + '</span></div></div>';
      var st0 = $("biomarkerChartCard"); if (st0) st0.classList.remove("hidden");
      return true;
    }

    var open = {};
    Array.prototype.forEach.call(mount.querySelectorAll("details[data-lt][open]"), function (d) { open[d.getAttribute("data-lt")] = true; });

    var rows = data.list.map(function (s) {
      var last = s.pts[s.pts.length - 1], st = statusOf(last.v, s.range);
      return { s: s, last: last, st: st, tr: trendOf(s) };
    }).sort(function (a, b) { return (a.st === "ok" ? 1 : 0) - (b.st === "ok" ? 1 : 0); });

    var bad = rows.filter(function (r) { return r.st !== "ok"; }).length;
    var html = '<div class="lt-sum"><span>' + data.dates + ' tahlil · ' + rows.length + ' değer</span>' +
      '<span class="' + (bad ? "lt-sum-warn" : "lt-sum-ok") + '">' + (bad ? bad + " değer takipte" : "Tümü normal aralıkta") + '</span></div>';

    rows.forEach(function (r) {
      var s = r.s, chip = CHIP[r.st];
      html += '<details class="lt-row" data-lt="' + s.meta.key + '"' + (open[s.meta.key] ? " open" : "") + '><summary>' +
        '<span class="lt-dot" style="background:' + s.meta.color + '"></span>' +
        '<span class="lt-name">' + esc(s.meta.name) + '</span>' + spark(s) +
        '<span class="lt-val"><b>' + esc(fmt(r.last.v)) + '</b><small>' + esc(s.meta.unit) + '</small></span>' +
        '<span class="lt-chip ' + chip[1] + '">' + chip[0] + '</span><i class="fa-solid fa-chevron-down lt-chev" aria-hidden="true"></i></summary>' +
        '<div class="lt-body">' + big(s) +
        '<div class="lt-foot">' +
        (r.tr ? '<span class="lt-trend ' + r.tr.cls + '">' + r.tr.icon + ' ' + esc(r.tr.label) + ' (' + esc(r.tr.delta) + ' ' + esc(s.meta.unit) + ')</span>' : "") +
        (s.range ? '<span class="lt-ref">Normal: ' + esc(fmt(s.range[0])) + '–' + esc(fmt(s.range[1])) + ' ' + esc(s.meta.unit) + '</span>' : "") +
        '</div></div></details>';
    });
    mount.innerHTML = html;
    var card = $("biomarkerChartCard"); if (card) card.classList.remove("hidden");
    return true;
  }

  window.VitaLabTrend = { render: render, series: series };
})();
