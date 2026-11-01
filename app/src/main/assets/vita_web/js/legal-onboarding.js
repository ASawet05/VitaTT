/* VitaTakip ilk açılış yasal onay ekranı.
   Tıbbi sorumluluk reddi ve KVKK özeti tek yerde toplanır; onay localStorage'da saklanır. */
(function () {
  "use strict";
  var KEY = "vitatakip_legal_accepted";

  function accepted() {
    try { return localStorage.getItem(KEY) === "true"; } catch (_) { return false; }
  }

  var css = [
    "#vitaLegalOnboarding{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;padding:12px;background:rgba(2,6,23,.88);backdrop-filter:blur(8px);opacity:0;transition:opacity .35s ease}",
    "#vitaLegalOnboarding.vl-show{opacity:1}",
    "#vitaLegalOnboarding.vl-hide{opacity:0;pointer-events:none}",
    "#vitaLegalOnboarding .vl-card{width:100%;max-width:520px;max-height:96dvh;overflow-y:auto;border-radius:24px;background:#fff;box-shadow:0 25px 60px rgba(0,0,0,.45);transform:translateY(14px) scale(.98);transition:transform .35s ease}",
    "#vitaLegalOnboarding.vl-show .vl-card{transform:none}",
    "#vitaLegalOnboarding.vl-hide .vl-card{transform:translateY(-10px) scale(.98)}",
    "#vitaLegalOnboarding .vl-head{padding:22px 20px 16px;text-align:center;color:#fff;background:linear-gradient(135deg,#0f172a,#0f766e);border-radius:24px 24px 0 0}",
    "#vitaLegalOnboarding .vl-logo{width:60px;height:60px;margin:0 auto 10px;border-radius:16px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden}",
    "#vitaLegalOnboarding .vl-logo img{width:100%;height:100%;object-fit:cover}",
    "#vitaLegalOnboarding h1{margin:0;font-size:22px;font-weight:900;letter-spacing:-.01em}",
    "#vitaLegalOnboarding .vl-sub{margin:4px 0 0;font-size:12px;color:#99f6e4}",
    "#vitaLegalOnboarding .vl-body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:12px;color:#334155;font-size:12px;line-height:1.55}",
    "#vitaLegalOnboarding .vl-box{border-radius:16px;padding:12px 14px;border:1px solid #fcd34d;background:#fffbeb;color:#451a03}",
    "#vitaLegalOnboarding .vl-box.vl-kvkk{border-color:#7dd3fc;background:#f0f9ff;color:#0c4a6e}",
    "#vitaLegalOnboarding h2{margin:0 0 6px;font-size:13px;font-weight:900}",
    "#vitaLegalOnboarding ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}",
    "#vitaLegalOnboarding p{margin:0}",
    "#vitaLegalOnboarding .vl-link{margin-top:8px;display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:6px 12px;border-radius:10px;border:1px solid #38bdf8;background:#fff;color:#0369a1;font-size:11px;font-weight:800;cursor:pointer}",
    "#vitaLegalOnboarding .vl-link:hover{background:#e0f2fe}",
    "#vitaLegalOnboarding label.vl-check{display:flex;gap:10px;align-items:flex-start;cursor:pointer;font-size:12px;font-weight:700;color:#0f172a}",
    "#vitaLegalOnboarding label.vl-check input{width:20px;height:20px;margin-top:1px;flex-shrink:0;accent-color:#0f766e;cursor:pointer}",
    "#vitaLegalOnboarding .vl-btn{min-height:46px;width:100%;border:0;border-radius:14px;font-size:14px;font-weight:900;color:#fff;background:linear-gradient(90deg,#0f766e,#14b8a6);cursor:pointer;transition:opacity .2s,transform .1s}",
    "#vitaLegalOnboarding .vl-btn:active:not(:disabled){transform:scale(.98)}",
    "#vitaLegalOnboarding .vl-btn:disabled{opacity:.4;cursor:not-allowed;filter:grayscale(.4)}"
  ].join("\n");

  var html = [
    '<div class="vl-card" role="dialog" aria-modal="true" aria-labelledby="vlTitle">',
    '  <div class="vl-head">',
    '    <div class="vl-logo"><img src="icons/icon-192.png" alt="VitaTakip logosu" onerror="this.parentNode.textContent=\'\\uD83E\\uDE7A\'"></div>',
    '    <h1 id="vlTitle">VitaTakip</h1>',
    '    <p class="vl-sub">Kişiselleştirilmiş Sağlık &amp; Karar Destek Portalı</p>',
    '  </div>',
    '  <div class="vl-body">',
    '    <section class="vl-box">',
    '      <h2>📋 Tıbbi Sorumluluk Reddi</h2>',
    '      <ul>',
    '        <li>VitaTakip; kullanıcılara yönelik bir <strong>EĞİTİM</strong> ve <strong>KLİNİK KARAR DESTEK</strong> aracıdır.</li>',
    '        <li>Uygulama kesinlikle tıbbi tanı <strong>KOYMAZ</strong>, tedavi <strong>BAŞLATMAZ</strong> ve reçete <strong>DÜZENLEMEZ</strong>.</li>',
    '        <li>Sunulan tüm analiz ve takviye eşleşmeleri genel referans niteliğindedir; hata veya eksiklik içerebilir.</li>',
    '        <li>Nihai karar ve tedavi planı hastayı bizzat muayene eden yetkili hekime aittir.</li>',
    '        <li>Acil sağlık durumlarında lütfen derhal <strong>112 Acil Servis</strong>\'e veya en yakın sağlık kuruluşuna başvurunuz.</li>',
    '      </ul>',
    '    </section>',
    '    <section class="vl-box vl-kvkk">',
    '      <h2>ℹ️ Kişisel Verilerin Korunması (KVKK)</h2>',
    '      <p>Girdiğiniz tahlil, belirti ve profil bilgileri öncelikli olarak cihazınızın yerel hafızasında (yerel depolama) işlenir. Uygulama harici üçüncü taraflarla reklam veya profilleme amacıyla veri paylaşımı yapmaz.</p>',
    '      <button type="button" class="vl-link" id="vlReadPolicy">Gizlilik Politikası ve KVKK Metnini Oku</button>',
    '    </section>',
    '    <label class="vl-check"><input type="checkbox" id="vlAgree"><span>Tıbbi Sorumluluk Reddi\'ni ve KVKK Aydınlatma Metni\'ni okudum, kabul ediyorum.</span></label>',
    '    <button type="button" class="vl-btn" id="vlAccept" disabled>Kabul Et ve Devam Et</button>',
    '  </div>',
    '</div>'
  ].join("\n");

  function showOnboarding() {
    if (document.getElementById("vitaLegalOnboarding")) return;
    var style = document.createElement("style");
    style.id = "vitaLegalOnboardingStyle";
    style.textContent = css;
    document.head.appendChild(style);

    var root = document.createElement("div");
    root.id = "vitaLegalOnboarding";
    root.innerHTML = html;
    document.body.appendChild(root);
    document.documentElement.style.overflow = "hidden";

    var agree = root.querySelector("#vlAgree");
    var btn = root.querySelector("#vlAccept");

    agree.addEventListener("change", function () { btn.disabled = !agree.checked; });

    root.querySelector("#vlReadPolicy").addEventListener("click", function () {
      if (typeof window.openKvkkInfoModal === "function") window.openKvkkInfoModal();
    });

    btn.addEventListener("click", function () {
      if (!agree.checked) return;
      try { localStorage.setItem(KEY, "true"); } catch (_) {}
      root.classList.add("vl-hide");
      document.documentElement.style.overflow = "";
      setTimeout(function () {
        root.remove();
        style.remove();
        if (typeof window.navigateToView === "function") {
          try { window.navigateToView("view-home"); } catch (_) {}
        }
      }, 380);
    });

    requestAnimationFrame(function () { root.classList.add("vl-show"); });
    setTimeout(function () { agree.focus(); }, 400);
  }

  function init() {
    if (!accepted()) showOnboarding();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
