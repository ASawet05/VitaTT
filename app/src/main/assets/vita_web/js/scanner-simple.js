/* Barkod okuyucu (ilaç ekle) sadeleştirmesi: tek arama kutusu (ad veya barkod) + kamera.
   Eski kanal seçici ve elle giriş paneli gizlenir; mantık değişmez (tüm id'ler yerinde). */
(function () {
  "use strict";
  function $(id) { return document.getElementById(id); }
  function hide(el) { if (el) el.classList.add("vsm-hide"); }

  function init() {
    var modal = $("barcodeScannerModal"); if (!modal) return;
    modal.classList.add("vsm");

    /* Kanal seçici kartı (a/b/c) ve elle giriş paneli gizlenir */
    var chBtn = $("btnScannerChannelName"); if (chBtn) hide(chBtn.closest(".rounded-2xl"));
    hide($("scannerChannelPanelManual"));
    var quick = $("barcodeTrDatabaseQuickSelect"); if (quick) hide(quick.parentElement);

    /* Uzun uyarı/not kutuları */
    Array.prototype.forEach.call(modal.querySelectorAll("div"), function (d) {
      var t = (d.firstElementChild && d.firstElementChild.tagName === "STRONG") ? d.firstElementChild.textContent : "";
      if (/^\s*Önemli:/.test(t)) hide(d);
    });

    /* Metinler */
    var lab = modal.querySelector('label[for="barcodeNameAutocompleteInput"]');
    if (lab) lab.innerHTML = '<i class="fa-solid fa-magnifying-glass mr-1.5 text-teal-700"></i>İlaç adı veya barkod numarası';
    var inp = $("barcodeNameAutocompleteInput");
    if (inp) inp.setAttribute("placeholder", "İlaç adı veya barkod yazın");
    var st = $("barcodeStartCameraBtn");
    if (st) st.innerHTML = '<i class="fa-solid fa-camera mr-1"></i>Kamerayla barkod tara';
  }

  /* Barkod yazıldı ama listede yoksa: çevrimiçi ara düğmesi */
  var origSearch = window.onScannerNameSearchInput;
  if (typeof origSearch === "function") {
    window.onScannerNameSearchInput = function (q) {
      var r = origSearch.apply(this, arguments);
      try {
        var digits = String(q || "").replace(/\D/g, "");
        var box = $("barcodeNameAutocompleteResults");
        if (box && digits.length >= 8 && /bulunamadı/.test(box.textContent)) {
          var b = document.createElement("button");
          b.type = "button"; b.className = "vsm-online";
          b.innerHTML = '<i class="fa-solid fa-globe" aria-hidden="true"></i> Bu barkodu çevrimiçi ara';
          b.onclick = function () { if (typeof handleBarcodeDetected === "function") handleBarcodeDetected(digits, "Elle girilen barkod"); };
          box.appendChild(b);
        }
      } catch (_) {}
      return r;
    };
  }

  /* Barkod okununca titreşim geri bildirimi */
  var origDet = window.handleBarcodeDetected;
  if (typeof origDet === "function") {
    window.handleBarcodeDetected = function () {
      try { if (navigator.vibrate) navigator.vibrate(60); } catch (_) {}
      return origDet.apply(this, arguments);
    };
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true }); else init();
})();
