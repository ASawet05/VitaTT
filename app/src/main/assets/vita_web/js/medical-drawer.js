/* VitaTakip kalıcı yasal uyarı şeridi + "Tıbbi Sorumluluk Reddi" alt çekmecesi.
   Tüm sayfalarda geçerlidir. Stiller .vms-* / .vmd-* önekiyle kapsamlıdır.
   Genel fonksiyonlar: openMedicalDrawer(), closeMedicalDrawer() */
(function () {
  "use strict";

  var css = [
    /* --- Kalıcı şerit --- */
    ".vms-strip{position:fixed;left:0;right:0;bottom:var(--vms-bottom,0px);z-index:44;display:flex;align-items:center;gap:8px;width:100%;min-height:34px;padding:7px 12px;border:0;border-top:1px solid #f5deb3;background:#FFF8E7;color:#7c4a03;font:600 11.5px/1.2 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;text-align:left;cursor:pointer;-webkit-tap-highlight-color:transparent}",
    ".vms-strip:hover{background:#fff3d6}",
    ".vms-strip:focus-visible{outline:2px solid #d97706;outline-offset:-2px}",
    ".vms-strip .vms-ico{flex:0 0 auto;font-size:14px;line-height:1}",
    ".vms-strip .vms-txt{flex:1 1 auto;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}",
    ".vms-strip .vms-arrow{flex:0 0 auto;font-size:16px;font-weight:800;line-height:1;opacity:.75}",
    /* İçerik şeridin altında kalmasın */
    "body main{padding-bottom:calc(50px + env(safe-area-inset-bottom)) !important}",
    "@media (max-width:767px){body main{padding-bottom:calc(6.25rem + 50px + env(safe-area-inset-bottom)) !important}",
    "body #vita-ai-widget{bottom:calc(4.65rem + env(safe-area-inset-bottom) + var(--vms-h,36px)) !important}}",
    "@media print{.vms-strip,.vmd-root{display:none !important}}",
    /* --- Alt çekmece --- */
    ".vmd-root{position:fixed;inset:0;z-index:110;display:flex;align-items:flex-end;justify-content:center;visibility:hidden;pointer-events:none;transition:visibility 0s linear .32s}",
    ".vmd-root.vmd-open{visibility:visible;pointer-events:auto;transition-delay:0s}",
    ".vmd-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.4);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px);opacity:0;transition:opacity .3s ease}",
    ".vmd-root.vmd-open .vmd-backdrop{opacity:1}",
    ".vmd-sheet{position:relative;width:100%;max-width:560px;max-height:90dvh;overflow-y:auto;overscroll-behavior:contain;background:#fff;border-radius:22px 22px 0 0;box-shadow:0 -12px 40px rgba(15,23,42,.28);padding:6px 20px max(18px,env(safe-area-inset-bottom));transform:translateY(100%);transition:transform .32s cubic-bezier(.22,.9,.3,1);color:#334155;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}",
    ".vmd-root.vmd-open .vmd-sheet{transform:translateY(0)}",
    ".vmd-sheet.vmd-dragging{transition:none}",
    ".vmd-handle-area{padding:10px 0 12px;cursor:grab;touch-action:none}",
    ".vmd-handle{width:42px;height:5px;margin:0 auto;border-radius:999px;background:#cbd5e1}",
    ".vmd-title{display:flex;align-items:center;gap:10px;margin:0 0 10px;font-size:18px;font-weight:800;color:#0f172a}",
    ".vmd-title span{font-size:22px}",
    ".vmd-lead{margin:0 0 10px;font-size:13.5px;line-height:1.55}",
    ".vmd-list{margin:0 0 12px;padding-left:20px;display:flex;flex-direction:column;gap:7px;font-size:13px;line-height:1.5}",
    ".vmd-foot{margin:0 0 16px;font-size:11.5px;color:#64748b;line-height:1.45}",
    ".vmd-btn{display:block;width:100%;min-height:48px;border:0;border-radius:14px;background:#2563eb;color:#fff;font-size:15px;font-weight:800;cursor:pointer;transition:background .15s,transform .1s}",
    ".vmd-btn:hover{background:#1d4ed8}.vmd-btn:active{transform:scale(.985)}",
    ".vmd-btn:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}",
    "@media (prefers-reduced-motion:reduce){.vmd-sheet,.vmd-backdrop{transition:none}}"
  ].join("\n");

  var stripHtml =
    '<span class="vms-ico" aria-hidden="true">ℹ️</span>' +
    '<span class="vms-txt">Eğitim ve klinik karar destek amaçlıdır — tanı koymaz, nihai karar hekime aittir.</span>' +
    '<span class="vms-arrow" aria-hidden="true">›</span>';

  var sheetHtml =
    '<div class="vmd-backdrop" data-vmd-close></div>' +
    '<section class="vmd-sheet" role="dialog" aria-modal="true" aria-labelledby="vmdTitle">' +
    '  <div class="vmd-handle-area" id="vmdHandleArea"><div class="vmd-handle"></div></div>' +
    '  <h2 class="vmd-title" id="vmdTitle"><span aria-hidden="true">🏥</span>Tıbbi Sorumluluk Reddi</h2>' +
    '  <p class="vmd-lead">VitaTakip; kullanıcılara yönelik bir <strong>EĞİTİM</strong> ve <strong>KLİNİK KARAR DESTEK</strong> aracıdır.</p>' +
    '  <ul class="vmd-list">' +
    '    <li>Uygulama tıbbi tanı <strong>KOYMAZ</strong>, tedavi <strong>BAŞLATMAZ</strong> ve reçete <strong>DÜZENLEMEZ</strong>.</li>' +
    '    <li>Sunulan tüm bilgiler (takviye etkileşimleri, olası eksiklik eşleşmeleri, eGFR rozetleri) genel referans amaçlıdır; eksiklik veya hata içerebilir.</li>' +
    '    <li>Nihai tıbbi karar, hastayı bizzat muayene ve takip eden yetkili hekime aittir.</li>' +
    '    <li>Kullanıcılar hekimine danışmadan ilaç veya takviye dozlarını değiştirmemelidir.</li>' +
    '    <li>Acil durumlarda lütfen derhal <strong>112 Acil Çağrı Merkezi</strong>\'ni arayın veya en yakın sağlık kuruluşuna başvurun.</li>' +
    '  </ul>' +
    '  <p class="vmd-foot">Uygulamayı kullanarak bu koşulları kabul etmiş sayılırsınız.</p>' +
    '  <button type="button" class="vmd-btn" data-vmd-close>Anladım</button>' +
    '</section>';

  var strip, root, sheet, lastFocus = null;

  function layout() {
    /* Mobil alt gezinme varsa şerit onun hemen üstüne oturur. */
    var nav = document.querySelector(".vita-mobile-nav");
    var navH = 0;
    if (nav && getComputedStyle(nav).display !== "none") navH = nav.offsetHeight;
    document.documentElement.style.setProperty("--vms-bottom", navH + "px");
    if (strip) document.documentElement.style.setProperty("--vms-h", strip.offsetHeight + "px");
  }

  function openMedicalDrawer() {
    if (!root) return;
    lastFocus = document.activeElement;
    sheet.style.transform = "";
    root.classList.add("vmd-open");
    document.documentElement.style.overflow = "hidden";
    setTimeout(function () { var b = root.querySelector(".vmd-btn"); if (b) b.focus(); }, 320);
  }

  function closeMedicalDrawer() {
    if (!root) return;
    root.classList.remove("vmd-open");
    sheet.style.transform = "";
    document.documentElement.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (_) {} }
  }

  function enableSwipeDown() {
    var area = root.querySelector("#vmdHandleArea");
    var startY = 0, dy = 0, dragging = false;

    function start(e) {
      dragging = true; dy = 0;
      startY = (e.touches ? e.touches[0] : e).clientY;
      sheet.classList.add("vmd-dragging");
    }
    function move(e) {
      if (!dragging) return;
      dy = Math.max(0, (e.touches ? e.touches[0] : e).clientY - startY);
      sheet.style.transform = "translateY(" + dy + "px)";
    }
    function end() {
      if (!dragging) return;
      dragging = false;
      sheet.classList.remove("vmd-dragging");
      if (dy > 90) closeMedicalDrawer(); else sheet.style.transform = "";
    }
    area.addEventListener("touchstart", start, { passive: true });
    area.addEventListener("touchmove", move, { passive: true });
    area.addEventListener("touchend", end);
    area.addEventListener("touchcancel", end);
    area.addEventListener("mousedown", function (e) {
      start(e);
      function mm(ev) { move(ev); }
      function mu() { document.removeEventListener("mousemove", mm); document.removeEventListener("mouseup", mu); end(); }
      document.addEventListener("mousemove", mm);
      document.addEventListener("mouseup", mu);
    });
  }

  function init() {
    if (document.getElementById("vitaMedicalStrip")) return;

    var style = document.createElement("style");
    style.id = "vitaMedicalDrawerStyle";
    style.textContent = css;
    document.head.appendChild(style);

    strip = document.createElement("button");
    strip.type = "button";
    strip.id = "vitaMedicalStrip";
    strip.className = "vms-strip no-print";
    strip.setAttribute("aria-haspopup", "dialog");
    strip.setAttribute("aria-label", "Tıbbi sorumluluk reddini aç");
    strip.innerHTML = stripHtml;
    strip.addEventListener("click", openMedicalDrawer);
    document.body.appendChild(strip);

    root = document.createElement("div");
    root.id = "vitaMedicalDrawer";
    root.className = "vmd-root no-print";
    root.innerHTML = sheetHtml;
    document.body.appendChild(root);
    sheet = root.querySelector(".vmd-sheet");

    root.addEventListener("click", function (e) {
      if (e.target.closest("[data-vmd-close]")) closeMedicalDrawer();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && root.classList.contains("vmd-open")) closeMedicalDrawer();
    });
    enableSwipeDown();

    layout();
    window.addEventListener("resize", layout);
    window.addEventListener("orientationchange", layout);
    /* Nav sonradan çizilirse yeniden hesapla */
    setTimeout(layout, 300);
    setTimeout(layout, 1500);
  }

  window.openMedicalDrawer = openMedicalDrawer;
  window.closeMedicalDrawer = closeMedicalDrawer;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
