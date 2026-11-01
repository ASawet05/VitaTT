/* Gün değişimi (00:00) sıfırlaması, hesap değişiminde API anahtarı alanı ve kompakt sayfa davranışları. */
(function () {
  "use strict";

  /* 1) Gün değişince: su sayacı ve "bugün alındı" işaretleri sıfırlanır — uygulama açıkken de. */
  function today() { return new Date().toLocaleDateString("tr-TR"); }
  function checkDay() {
    try {
      if (typeof activeUserId === "undefined" || !activeUserId || typeof checkMidnightReset !== "function") return;
      var last = localStorage.getItem("vitatakip_lastActiveDate_" + activeUserId);
      if (last && last !== today()) {
        checkMidnightReset(activeUserId);
        if (typeof renderDailyTab === "function") renderDailyTab();
        if (typeof updateDynamicTargetHydration === "function") updateDynamicTargetHydration();
        renderSymptomCheck();
        if (typeof showToast === "function") showToast("Yeni gün", "Su sayacı ve günlük takviye listesi yenilendi.", "info");
      }
    } catch (e) { console.warn("[VitaTakip] gün kontrolü:", e); }
  }
  function scheduleMidnight() {
    var now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2);
    setTimeout(function () { checkDay(); scheduleMidnight(); }, Math.max(1000, next - now));
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) checkDay(); });
  window.addEventListener("focus", checkDay);
  window.addEventListener("pageshow", checkDay);
  setInterval(checkDay, 60000);
  scheduleMidnight();

  /* 2) Hesap değişince API anahtarı alanı o hesabın anahtarını (yoksa boş) göstersin. */
  var lastUid = null;
  setInterval(function () {
    try {
      var uid = typeof activeUserId !== "undefined" ? activeUserId : null;
      if (uid !== lastUid) { lastUid = uid; if (typeof updateApiKeyUI === "function") updateApiKeyUI(); setTimeout(renderSymptomCheck, 600); }
    } catch (_) {}
  }, 1000);

  /* 2b) Günlük "belirtiler hâlâ var mı?" kontrolü (günde bir kez, ana sayfada) */
  function sympKey() { return typeof activeUserId !== "undefined" && activeUserId ? "vitatakip_symptomcheck_" + activeUserId : ""; }
  function symptomMetas() {
    try { return (window.VitaClinicalData && VitaClinicalData.selectedSymptomMetas) ? VitaClinicalData.selectedSymptomMetas() : []; } catch (_) { return []; }
  }
  function symptomName(key) {
    try { var d = ANAMNESIS_DICTIONARY[key]; return (d && (d.symptomName || d.medicalName)) || key; } catch (_) { return key; }
  }
  function markChecked() { var k = sympKey(); if (k) localStorage.setItem(k, today()); }
  function removeSymptom(key) {
    var card = Array.prototype.find.call(document.querySelectorAll(".anamnesis-card"), function (c) {
      var m = (c.getAttribute("onclick") || "").match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/); return m && m[1] === key;
    });
    if (card && typeof toggleAnamnesisCard === "function") { toggleAnamnesisCard(card, key); return; }
    state.selectedSymptoms.delete(key); state.selectedSymptomsArray = Array.from(state.selectedSymptoms);
    if (activeUserId) localStorage.setItem("vitatakip_symptoms_" + activeUserId, JSON.stringify(state.selectedSymptomsArray));
    if (typeof invalidateClinicalAnalysisCache === "function") invalidateClinicalAnalysisCache({ clearDOM: true });
    if (typeof saveState === "function") saveState();
    if (typeof renderReportTab === "function") renderReportTab();
  }
  function renderSymptomCheck() {
    try {
      var host = document.getElementById("symptomDailyCheck");
      var home = document.getElementById("view-home");
      if (!home) return;
      if (!host) {
        host = document.createElement("div"); host.id = "symptomDailyCheck";
        var hero = home.firstElementChild; // karşılama kartının hemen altı
        home.insertBefore(host, hero && hero.nextSibling ? hero.nextSibling : null);
      }
      var key = sympKey();
      var keys = state.selectedSymptoms instanceof Set ? Array.from(state.selectedSymptoms) : [];
      if (!key || !keys.length || localStorage.getItem(key) === today()) { host.innerHTML = ""; host.className = "hidden"; return; }
      host.className = "sdc";
      host.innerHTML = '<div class="sdc-h"><b>Belirtileriniz hâlâ var mı?</b><button type="button" class="sdc-all">Hepsi aynı</button></div>' +
        keys.map(function (k) {
          return '<div class="sdc-r" data-k="' + k + '"><span>' + String(symptomName(k)).replace(/[<>&]/g, "") + '</span><span class="sdc-b"><button type="button" class="sdc-yes">Hâlâ var</button><button type="button" class="sdc-no">Geçti</button></span></div>';
        }).join("");
      host.onclick = function (e) {
        var t = e.target.closest("button"); if (!t) return;
        if (window.SoundEffects && SoundEffects.playClick) SoundEffects.playClick();
        if (t.classList.contains("sdc-all")) { markChecked(); renderSymptomCheck(); return; }
        var row = t.closest(".sdc-r"); if (!row) return;
        if (t.classList.contains("sdc-no")) {
          removeSymptom(row.getAttribute("data-k"));
          if (typeof showToast === "function") showToast("Belirti kaldırıldı", "Klinik Analiz ve rapor güncellendi.", "success");
        }
        row.remove();
        if (!host.querySelector(".sdc-r")) { markChecked(); renderSymptomCheck(); }
      };
    } catch (e) { console.warn("[VitaTakip] belirti kontrolü:", e); }
  }
  window.renderSymptomDailyCheck = renderSymptomCheck;

  /* 3) Tahlillerim: az kayıt varken grafik ve filtreleri gizle */
  function labsCompact() {
    try {
      var n = Array.isArray(state.labHistory) ? state.labHistory.length : 0;
      var chart = document.getElementById("biomarkerChartCard");
      if (chart) chart.classList.toggle("hidden", n < 1);
      var box = document.querySelector("#acc-labhistory > div.mb-3");
      if (box) box.classList.toggle("hidden", n < 3);
    } catch (_) {}
  }
  /* renderLabHistoryUI sarmalanmaz (uygulamanın kendi testi işlev metnini okur): rozet değişince uygula */
  function watchBadge() {
    var b = document.getElementById("labHistoryCountBadge");
    if (b && window.MutationObserver) new MutationObserver(labsCompact).observe(b, { childList: true, characterData: true, subtree: true });
  }
  document.addEventListener("DOMContentLoaded", watchBadge);
  if (document.readyState !== "loading") watchBadge();
  if (typeof window.navigateToView === "function") {
    var nav = window.navigateToView;
    window.navigateToView = function (v) { var r = nav.apply(this, arguments); if (v === "view-labs") labsCompact(); if (v === "view-home") renderSymptomCheck(); return r; };
  }
  document.addEventListener("DOMContentLoaded", labsCompact);
  window.vitaLabsCompact = labsCompact;
})();
