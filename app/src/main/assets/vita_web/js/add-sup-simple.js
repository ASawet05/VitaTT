/* Takviye ekle penceresi: tek arama kutusu (ad veya barkod), canlı öneriler, fener düğmesi, titreşim geri bildirimi. */
(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function lc(s) { return String(s || "").toLocaleLowerCase("tr-TR"); }
  function db() { return typeof getCombinedTurkishBarcodeDb === "function" ? getCombinedTurkishBarcodeDb() : []; }

  function box() { return $("vsAddSuggest"); }
  function clearSuggest() { var b = box(); if (b) { b.classList.add("hidden"); b.innerHTML = ""; } }

  function search(value) {
    var b = box(); if (!b) return;
    var q = lc(value).trim();
    if (!q) { clearSuggest(); return; }
    var digits = q.replace(/\D/g, "");
    var rows = "";

    /* Barkod gibi görünüyorsa önce "bu barkodu ara" satırı */
    if (digits.length >= 8 && digits.length >= q.replace(/\s/g, "").length - 1) {
      rows += '<button type="button" class="vsa-sg" data-bc="' + esc(digits) + '"><span class="vsa-sg-ico"><i class="fa-solid fa-barcode"></i></span>' +
        '<span class="vsa-sg-t"><b>Barkodu ara</b><small>' + esc(digits) + '</small></span></button>';
    }
    var matches = db().filter(function (it) {
      return lc(it.name).indexOf(q) > -1 || lc(it.brand).indexOf(q) > -1 || lc(it.ingredients).indexOf(q) > -1 || (digits.length >= 4 && String(it.barcode).indexOf(digits) > -1);
    });
    /* Önce takviyeler, sonra ilaçlar */
    matches.sort(function (a, b2) { return (a.type === "supplement" ? 0 : 1) - (b2.type === "supplement" ? 0 : 1); });
    matches.slice(0, 6).forEach(function (it) {
      var rx = it.type === "medication";
      rows += '<button type="button" class="vsa-sg" data-bc="' + esc(it.barcode) + '"><span class="vsa-sg-ico' + (rx ? " rx" : "") + '"><i class="fa-solid ' + (rx ? "fa-prescription-bottle-medical" : "fa-capsules") + '"></i></span>' +
        '<span class="vsa-sg-t"><b>' + esc(it.name) + '</b><small>' + esc([it.brand, it.form || it.ingredients].filter(Boolean).join(" · ")) + '</small></span>' +
        (rx ? '<span class="vsa-sg-tag">İlaç → kalkan</span>' : "") + '</button>';
    });
    if (!rows) {
      rows = '<div class="vsa-sg-empty"><span><b>“' + esc(value.trim()) + '”</b> listede yok.</span>' +
        '<button type="button" data-own="1"><i class="fa-solid fa-pen" aria-hidden="true"></i> Bu adla elle ekle</button></div>';
    }
    b.innerHTML = rows;
    b.classList.remove("hidden");
  }

  function pick(barcode, name) {
    clearSuggest();
    if (typeof handleAddSupBarcodeDecoded === "function") handleAddSupBarcodeDecoded(barcode);
    var inp = $("addSupBarcodeInput");
    if (inp && name) inp.value = name;
  }

  function useOwnName() {
    var inp = $("addSupBarcodeInput"), nm = $("manualSupName");
    if (nm && inp) { nm.value = inp.value.trim(); nm.dispatchEvent(new Event("input", { bubbles: true })); nm.focus(); }
    clearSuggest();
  }

  window.vsAddSearch = search;
  window.vsAddSearchKey = function (e) {
    if (e.key === "Escape") { clearSuggest(); return; }
    if (e.key !== "Enter") return;
    e.preventDefault();
    var first = box() && box().querySelector("[data-bc]");
    if (first) pick(first.getAttribute("data-bc"));
    else if (box() && box().querySelector("[data-own]")) useOwnName();
    else if (typeof handleAddSupBarcodeDecoded === "function") handleAddSupBarcodeDecoded(e.target.value);
  };

  document.addEventListener("click", function (e) {
    var sg = e.target.closest && e.target.closest("#vsAddSuggest [data-bc]");
    if (sg) { pick(sg.getAttribute("data-bc"), sg.querySelector("b") && sg.querySelector("b").textContent); return; }
    if (e.target.closest && e.target.closest("#vsAddSuggest [data-own]")) { useOwnName(); return; }
    if (!(e.target.closest && e.target.closest(".vsa-search, #vsAddSuggest"))) clearSuggest();
  });

  /* Barkod/ürün tanındığında: titreşim + forma kaydır */
  var origDecoded = window.handleAddSupBarcodeDecoded;
  if (typeof origDecoded === "function") {
    window.handleAddSupBarcodeDecoded = function () {
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (_) {}
      var r = origDecoded.apply(this, arguments);
      setTimeout(function () {
        var nm = $("manualSupName");
        if (nm && nm.value) { try { nm.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_) {} }
      }, 250);
      return r;
    };
  }

  /* Modal her açılışında temiz başlasın */
  var origOpen = window.openAddSupplementModal;
  if (typeof origOpen === "function") {
    window.openAddSupplementModal = function () {
      var r = origOpen.apply(this, arguments);
      clearSuggest();
      var more = document.querySelector("#addSupplementModal .vsa-more"); if (more) more.open = false;
      var card = document.querySelector("#addSupplementModal .vsa-card"); if (card) card.scrollTop = 0;
      return r;
    };
  }

  /* Fener (torch): kamera akışı destekliyorsa düğme gösterilir */
  function torchTrack(root) {
    var vids = root.querySelectorAll("video");
    for (var i = 0; i < vids.length; i++) {
      var s = vids[i].srcObject;
      if (s && s.getVideoTracks) { var t = s.getVideoTracks()[0]; if (t) return t; }
    }
    return null;
  }
  function setupTorch(wrapperId, boxSel) {
    var wrap = $(wrapperId); if (!wrap) return;
    var host = wrap.querySelector(boxSel) || wrap;
    var btn = host.querySelector(".vsa-torch");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button"; btn.className = "vsa-torch hidden"; btn.setAttribute("aria-label", "Feneri aç/kapat");
      btn.innerHTML = '<i class="fa-solid fa-bolt"></i>';
      host.appendChild(btn);
      var on = false;
      btn.addEventListener("click", function () {
        var t = torchTrack(wrap); if (!t) return;
        on = !on;
        t.applyConstraints({ advanced: [{ torch: on }] }).then(function () { btn.classList.toggle("on", on); }).catch(function () { on = !on; });
      });
    }
    var check = function () {
      var t = torchTrack(wrap), ok = false;
      try { ok = !!(t && t.getCapabilities && t.getCapabilities().torch); } catch (_) {}
      /* Yalnızca durum gerçekten değişirse DOM'a dokun (aksi halde gözlemci sonsuz döngüye girer) */
      if (btn.classList.contains("hidden") === ok) btn.classList.toggle("hidden", !ok);
      if (!ok && btn.classList.contains("on")) btn.classList.remove("on");
    };
    /* Yalnızca video eklenip çıkarıldığında kontrol et; sınıf değişimlerini izleme */
    new MutationObserver(check).observe(wrap, { childList: true, subtree: true });
    setInterval(function () { if (!wrap.classList.contains("hidden")) check(); }, 1200);
  }
  function init() {
    setupTorch("addSupCameraViewportWrapper", ".vsa-cam-box");
    setupTorch("scannerChannelPanelCamera", "#barcodeCameraViewport");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();

/* İlaç kontrolü çekmecesi: ad yazınca öneriler (reçeteli ilaç veritabanından) */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }
  function lc(s) { return String(s || "").toLocaleLowerCase("tr-TR"); }
  function box() { return $("vsMedSuggest"); }
  function clear() { var b = box(); if (b) { b.classList.add("hidden"); b.innerHTML = ""; } }

  window.vsMedSearch = function (value) {
    var b = box(); if (!b) return;
    var q = lc(value).trim();
    if (q.length < 2) { clear(); return; }
    var db = Array.isArray(window.VITA_PRESCRIPTION_DRUG_DB) ? window.VITA_PRESCRIPTION_DRUG_DB : [];
    var hits = db.filter(function (d) { return lc(d.urunAdi).indexOf(q) > -1 || lc(d.etkenMadde).indexOf(q) > -1 || lc(d.kategori).indexOf(q) > -1; }).slice(0, 6);
    if (!hits.length) {
      b.innerHTML = '<div class="vsa-sg-empty"><span><b>“' + esc(value.trim()) + '”</b> listede yok.</span><button type="button" data-med-own="1"><i class="fa-solid fa-plus" aria-hidden="true"></i> Bu adla ekle</button></div>';
    } else {
      b.innerHTML = hits.map(function (d) {
        return '<button type="button" class="vsa-sg" data-med="' + esc(d.urunAdi) + '"><span class="vsa-sg-ico rx"><i class="fa-solid fa-prescription-bottle-medical"></i></span>' +
          '<span class="vsa-sg-t"><b>' + esc(d.urunAdi) + '</b><small>' + esc([d.etkenMadde, d.kategori].filter(Boolean).join(" · ")) + '</small></span></button>';
      }).join("");
    }
    b.classList.remove("hidden");
  };

  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("#vsMedSuggest [data-med], #vsMedSuggest [data-med-own]");
    if (t) {
      var inp = $("quickAddMedInput");
      if (inp && t.getAttribute("data-med")) inp.value = t.getAttribute("data-med");
      clear();
      if (typeof addQuickMedicationFromInput === "function") addQuickMedicationFromInput();
      return;
    }
    if (!(e.target.closest && e.target.closest(".vsd-input, #vsMedSuggest"))) clear();
  });
})();
