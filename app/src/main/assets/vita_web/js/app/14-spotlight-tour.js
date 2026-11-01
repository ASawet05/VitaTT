const VITA_SPOTLIGHT_STEPS = [
      { view: "view-home", selector: "#headerProfileButton", title: "1. Profil ve Klinik Güvenlik Kalkanı", description: "Boy, kilo, yaş, biyolojik cinsiyet ve düzenli kullandığınız ilaçları (PPI, Metformin, Kan Sulandırıcı vb.) profilinize girin. Bu bilgiler su hedefini, eGFR böbrek hesabını ve ilaç-takviye çakışma kontrollerini yönetir." },
      { view: "view-labs", selector: "#guideLabsTarget", title: "2. Tahlillerim & Otomatik e-Nabız PDF", description: "e-Nabız PDF'inizi yüklediğinizde tahlil tarihi, referans aralıkları, D3, B12, Ferritin, Hemoglobin, MCV, CRP ve Kreatinin (otomatik eGFR hesabıyla) tek tıkla çekilir ve Kayıtlar arşivinde referans uyumuyla gösterilir." },
      { view: "view-neyim", selector: "#guideNeyimTarget", title: "3. NeyimVar? 7 Adımlı Sihirbaz & Görsel Örnekler", description: "Belirtilerinizi 7 adımda işaretleyin. Yanında (?) simgesi bulunan ağız, dil, cilt, saç ve tırnak belirtilerinde gerçek klinik görsel örnekleri açarak karşılaştırma yapabilirsiniz." },
      { view: "view-clinical-results", selector: "#mobile-nav-view-clinical-results", title: "4. Klinik Analiz & Bileşik Kanıt Motoru", description: "Hemoglobin, MCV ve CRP değerleriniz Ferritin, B12, Folat, D3, Kalsiyum ve Magnezyum ile birlikte çapraz analiz edilir (ör. enflamasyonda maskelenmiş demir eksikliği, mikrositer/makrositer örüntüler ve güvenlik uyarıları)." },
      { view: "view-home", selector: "#guideDailyProtocolTarget", title: "5. Günlük Protokol & Barkod Okuyucu", description: "Hekiminizin önerdiği takviyeleri sabah, öğle ve akşam gruplarında takip edin veya kutu barkodunu/fotoğrafını tarayarak çizelgenize ekleyin." },
      { view: "view-report", selector: "#btnPrintFridgeReport", title: "6. Hekim Raporu & A4 Buzdolabı Çizelgesi", description: "Boylamasına tahlil trendinizi, eGFR böbrek notunuzu ve klinik bulgularınızı içeren Hekim Raporunu veya Buzdolabı Çizelgesini tek tıkla yazdırın." }
    ];
    let vitaSpotlightStepIndex = 0;
    let vitaSpotlightResizeHandler = null;

    function startVitaSpotlightTour(manual = true) {
      if (!activeUserId) { showToast("Önce giriş yapın", "Kullanım turunu başlatmak için önce hesabınıza giriş yapın.", "warning"); return; }
      if (window.SoundEffects) SoundEffects.playClick();
      vitaSpotlightStepIndex = 0;
      const layer = document.getElementById("vitaSpotlightLayer");
      if (!layer) { showToast("Rehber açılamadı", "Tur öğesi bulunamadı. Sayfayı yenileyip tekrar deneyin.", "error"); return; }
      closeOnboardingModal();
      layer.classList.remove("hidden");
      if (vitaSpotlightResizeHandler) window.removeEventListener("resize", vitaSpotlightResizeHandler);
      vitaSpotlightResizeHandler = () => positionVitaSpotlightTarget();
      window.addEventListener("resize", vitaSpotlightResizeHandler, { passive: true });
      showVitaSpotlightStep(0);
    }

    function showVitaSpotlightStep(index) {
      const step = VITA_SPOTLIGHT_STEPS[index];
      if (!step) return finishVitaSpotlightTour(true);
      vitaSpotlightStepIndex = index;
      if (state.activeTab !== step.view) navigateToView(step.view);
      const titleEl = document.getElementById("vitaTourTitle");
      const descEl = document.getElementById("vitaTourDescription");
      const count = document.getElementById("vitaTourCount");
      const previous = document.getElementById("vitaTourPrevious");
      const next = document.getElementById("vitaTourNext");
      if (count) count.textContent = `${index + 1} / ${VITA_SPOTLIGHT_STEPS.length}`;
      if (titleEl) titleEl.textContent = step.title;
      if (descEl) descEl.textContent = step.description;
      if (previous) previous.disabled = index === 0;
      if (next) next.innerHTML = index === VITA_SPOTLIGHT_STEPS.length - 1 ? 'Turu Bitir <i class="fa-solid fa-check ml-1"></i>' : 'İleri <i class="fa-solid fa-arrow-right ml-1"></i>';
      const target = document.querySelector(step.selector);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      window.setTimeout(positionVitaSpotlightTarget, 260);
    }

    function positionVitaSpotlightTarget() {
      const step = VITA_SPOTLIGHT_STEPS[vitaSpotlightStepIndex];
      const hole = document.getElementById("vitaSpotlightHole");
      const tooltip = document.getElementById("vitaTourTooltip");
      if (!hole || !tooltip || !step) return;
      const target = document.querySelector(step.selector);
      if (!target) {
        hole.style.display = "none";
        tooltip.style.left = "14px";
        tooltip.style.top = `${Math.max(14, window.innerHeight / 2 - 90)}px`;
        return;
      }
      hole.style.display = "block";
      const rect = target.getBoundingClientRect();
      const pad = 6;
      const left = Math.max(6, rect.left - pad);
      const top = Math.max(6, rect.top - pad);
      const width = Math.min(window.innerWidth - left - 6, Math.max(40, rect.width + pad * 2));
      const height = Math.min(window.innerHeight - top - 6, Math.max(36, rect.height + pad * 2));
      hole.style.left = `${left}px`; hole.style.top = `${top}px`; hole.style.width = `${width}px`; hole.style.height = `${height}px`;
      const tooltipWidth = Math.min(390, window.innerWidth - 28);
      const tooltipHeight = tooltip.offsetHeight || 190;
      let tipTop = rect.bottom + 18;
      if (tipTop + tooltipHeight > window.innerHeight - 12) tipTop = rect.top - tooltipHeight - 18;
      tipTop = Math.max(10, Math.min(window.innerHeight - tooltipHeight - 10, tipTop));
      let tipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
      tipLeft = Math.max(14, Math.min(window.innerWidth - tooltipWidth - 14, tipLeft));
      tooltip.style.left = `${tipLeft}px`; tooltip.style.top = `${tipTop}px`;
    }

    function moveVitaSpotlightTour(delta) {
      if (window.SoundEffects) SoundEffects.playClick();
      const next = vitaSpotlightStepIndex + delta;
      if (next < 0) return;
      if (next >= VITA_SPOTLIGHT_STEPS.length) return finishVitaSpotlightTour(true);
      showVitaSpotlightStep(next);
    }

    function finishVitaSpotlightTour(markSeen = true) {
      const layer = document.getElementById("vitaSpotlightLayer");
      if (layer) layer.classList.add("hidden");
      if (vitaSpotlightResizeHandler) window.removeEventListener("resize", vitaSpotlightResizeHandler);
      vitaSpotlightResizeHandler = null;
      if (markSeen && activeUserId) safeLocalStorageSetItem(`vitatakip_spotlight_seen_${activeUserId}`, "true");
      if (markSeen) showToast("Rehber tamamlandı", "VitaTakip'in temel modüllerini artık menüden açabilirsiniz.", "success");
    }

    function startVitaSpotlightIfFirstVisit() {
      if (!activeUserId || safeLocalStorageGetItem(`vitatakip_spotlight_seen_${activeUserId}`) === "true") return;
      window.setTimeout(() => {
        if (activeUserId && document.getElementById("profileModal")?.classList.contains("hidden")) startVitaSpotlightTour(false);
      }, 500);
    }

    /* A4 BUZDOLABI ÇİZELGESİ */
    