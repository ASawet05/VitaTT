function openAppDrawer() {
      const drawer = document.getElementById("appDrawer");
      const backdrop = document.getElementById("drawerBackdrop");
      if (drawer && backdrop) {
        drawer.classList.remove("-translate-x-full");
        backdrop.classList.remove("opacity-0", "pointer-events-none");
        backdrop.classList.add("opacity-100");
      }
    }

    function closeAppDrawer() {
      const drawer = document.getElementById("appDrawer");
      const backdrop = document.getElementById("drawerBackdrop");
      if (drawer && backdrop) {
        drawer.classList.add("-translate-x-full");
        backdrop.classList.remove("opacity-100");
        backdrop.classList.add("opacity-0", "pointer-events-none");
      }
    }

    function toggleHeaderProfileMenu(event) {
      if (event && typeof event.stopPropagation === "function") {
        event.stopPropagation();
      }
      const menu = document.getElementById("headerProfileDropdownMenu");
      const btn = document.getElementById("headerProfileButton");
      if (!menu) return;
      const isHidden = menu.classList.contains("hidden");
      if (isHidden) {
        if (typeof refreshCloudSyncUI === "function") refreshCloudSyncUI();
        menu.classList.remove("hidden");
        if (btn) btn.setAttribute("aria-expanded", "true");
      } else {
        menu.classList.add("hidden");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    }

    function closeHeaderProfileMenu() {
      const menu = document.getElementById("headerProfileDropdownMenu");
      const btn = document.getElementById("headerProfileButton");
      if (menu) menu.classList.add("hidden");
      if (btn) btn.setAttribute("aria-expanded", "false");
    }

    document.addEventListener("click", function (evt) {
      const wrapper = document.getElementById("headerProfileMenuWrapper");
      if (wrapper && !wrapper.contains(evt.target)) {
        closeHeaderProfileMenu();
      }
    });

    document.addEventListener("keydown", function (evt) {
      if (evt.key === "Escape") {
        closeHeaderProfileMenu();
      }
    });

    function renderSettingsView() {
      const p = (typeof state !== "undefined" && state.user) ? state.user : defaultUserProfile;
      const nameEl = document.getElementById("settingsProfileName");
      const ageGenderEl = document.getElementById("settingsProfileAgeGender");
      const bodyMetricsEl = document.getElementById("settingsProfileBodyMetrics");
      const medsSummaryEl = document.getElementById("settingsProfileMedsSummary");
      const dataSummaryEl = document.getElementById("settingsDataSummaryText");

      if (nameEl) nameEl.textContent = p.name || "Kullanıcı";
      if (ageGenderEl) {
        const gLabel = p.gender === "E" ? "Erkek" : "Kadın";
        ageGenderEl.textContent = `${p.age || 28} yaş • ${gLabel}`;
      }
      if (bodyMetricsEl) {
        const h = p.height || 170;
        const w = p.weight || 68;
        const bmiInfo = typeof calculateBMI === "function" ? calculateBMI(w, h) : { bmi: "-" };
        bodyMetricsEl.textContent = `${h} cm / ${w} kg (VKİ: ${bmiInfo.bmi})`;
      }
      if (medsSummaryEl) {
        const chronicArr = Array.isArray(p.chronic) ? p.chronic : [];
        const medsArr = Array.isArray(p.medications) ? p.medications : [];
        const total = chronicArr.length + medsArr.length;
        medsSummaryEl.textContent = total > 0
          ? `${total} aktif kayıt (${[...medsArr, ...chronicArr].slice(0, 3).join(", ")})`
          : "Kayıtlı ilaç yok";
      }
      if (dataSummaryEl && typeof state !== "undefined") {
        const supCount = Array.isArray(state.supplements) ? state.supplements.length : 0;
        const labCount = Array.isArray(state.labHistory) ? state.labHistory.length : 0;
        const symCount = state.selectedSymptoms instanceof Set ? state.selectedSymptoms.size : 0;
        dataSummaryEl.textContent = `${supCount} takviye • ${labCount} tahlil kaydı • ${symCount} belirti`;
      }

      if (typeof updateNotificationToggleUI === "function") {
        updateNotificationToggleUI();
      }
      if (typeof updateApiKeyUI === "function") {
        updateApiKeyUI();
      }
      if (typeof window.renderPwaNotificationSmartChecklist === "function") {
        window.renderPwaNotificationSmartChecklist();
      }
      if (typeof refreshCloudSyncUI === "function") {
        refreshCloudSyncUI();
      }
    }

    function navigateToView(viewId) {
      if (window.TTSVoice) TTSVoice.stop();
      if (window.SoundEffects) SoundEffects.playNavigate();
      closeAppDrawer();
      closeHeaderProfileMenu();
      state.activeTab = viewId;

      const allViews = ["view-home", "view-labs", "view-neyim", "view-clinical-results", "view-report", "view-settings"];
      allViews.forEach(v => {
        const el = document.getElementById(v);
        if (el) {
          el.classList.add("hidden");
          el.classList.remove("show", "active", "active-module");
          el.style.display = "";
          el.setAttribute("aria-hidden", "true");
          el.dataset.viewState = "hidden";
        }
      });

      const target = document.getElementById(viewId);
      if (target) {
        target.classList.remove("hidden", "vita-view-enter");
        target.classList.add("show", "active", "active-module");
        target.style.display = "block";
        target.removeAttribute("hidden");
        target.setAttribute("aria-hidden", "false");
        target.dataset.viewState = "show";
        void target.offsetWidth;
        target.classList.add("vita-view-enter");
        target.addEventListener("animationend", () => target.classList.remove("vita-view-enter"), { once: true });
      }

      allViews.forEach(v => {
        const btn = document.getElementById(`drawer-nav-${v}`);
        if (btn) {
          if (v === "view-settings") {
            btn.className = v === viewId
              ? "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-teal-600 text-white font-bold transition text-left cursor-pointer shadow-md"
              : "w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:text-white hover:bg-navy-800 transition text-left cursor-pointer";
          } else if (v === viewId) {
            btn.className = "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl bg-teal-600 text-white font-bold transition text-left cursor-pointer shadow-md";
          } else {
            btn.className = "w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-slate-200 hover:text-white hover:bg-navy-800 transition text-left cursor-pointer";
          }
        }
      });
      updateMobileNavigation(viewId);

      const headerBar = document.getElementById("viewHeaderBar");
      const titleEl = document.getElementById("currentViewTitle");

      if (viewId === "view-home") {
        if (headerBar) headerBar.classList.add("hidden");
        renderDailyTab();
        checkPendingSymptomReviews();
        detectSupplementConflicts();
      } else {
        if (headerBar) headerBar.classList.remove("hidden");
        const titles = {
          "view-labs": "Laboratuvar Tahlillerim & e-Nabız PDF Arşivi",
          "view-neyim": "NeyimVar? Belirti değerlendirmesi",
          "view-clinical-results": "Klinik Karar Analizi Sonuçları",
          "view-report": "Doktor Görüşmesi İçin Hasta Özeti",
          "view-settings": "Ayarlar & Uygulama Yönetimi"
        };
        if (titleEl) titleEl.textContent = titles[viewId] || "Modül";

        if (viewId === "view-labs") {
          restoreLabDraft();
          syncCDSSDemographics();
          renderLabHistoryUI();
          evaluateTrendAndDecisionSupport(false);
          renderBiomarkerTrendChart();
        } else if (viewId === "view-neyim") {
          if (typeof persistCurrentLabInputsToState === "function") {
            persistCurrentLabInputsToState({ silentUI: true });
          }
          const inlineNeyimRes = document.getElementById("neyimTriageEgfrResultContainer");
          if (inlineNeyimRes) {
            inlineNeyimRes.classList.add("hidden");
            inlineNeyimRes.innerHTML = "";
          }
          syncCDSSDemographics();
          syncAnamnesisCardsUI();
          ensureCDSSResultsView();
        } else if (viewId === "view-clinical-results") {
          if (typeof persistCurrentLabInputsToState === "function") {
            persistCurrentLabInputsToState({ silentUI: true });
          }
          if (typeof syncSelectedSymptomsFromDOM === "function") {
            syncSelectedSymptomsFromDOM();
          }
          if (typeof evaluateClinicalAnalysisState === "function") {
            evaluateClinicalAnalysisState();
          } else {
            const hasDataOrSymptoms = typeof canRunClinicalAnalysis === "function"
              ? canRunClinicalAnalysis()
              : ((state.selectedSymptoms instanceof Set && state.selectedSymptoms.size > 0) || Boolean(state.lastCDSS));
            if (hasDataOrSymptoms && typeof executeCDSSRules === "function") {
              executeCDSSRules();
            }
          }
          ensureCDSSResultsView();
          if (typeof renderClinicalKidneySafetyWarningUI === "function") {
            renderClinicalKidneySafetyWarningUI(state.lastKidneySafetyAnalysis || null);
          }
        } else if (viewId === "view-report") {
          if (typeof persistCurrentLabInputsToState === "function") {
            persistCurrentLabInputsToState({ silentUI: true });
          }
          renderReportTab();
        } else if (viewId === "view-settings") {
          renderSettingsView();
        }
      }

      window.scrollTo(0, 0);
    }

    function navigateToModule(moduleId) {
      const moduleMap = {
        "module-neyim-var": "view-neyim",
        "module-neyim": "view-neyim",
        "module-clinical-results": "view-clinical-results",
        "module-labs": "view-labs",
        "module-report": "view-report",
        "module-home": "view-home",
        "module-settings": "view-settings"
      };
      const targetViewId = moduleMap[moduleId] || moduleId;
      navigateToView(targetViewId);
      if (targetViewId === "view-neyim" && typeof syncAnamnesisCardsUI === "function") {
        syncAnamnesisCardsUI();
      }
      window.scrollTo(0, 0);
    }
    window.navigateToModule = navigateToModule;

    function updateMobileNavigation(viewId) {
      ["view-home", "view-labs", "view-neyim", "view-clinical-results", "view-report"].forEach(id => {
        const button = document.getElementById(`mobile-nav-${id}`);
        if (!button) return;
        if (id === viewId) button.setAttribute("aria-current", "page");
        else button.removeAttribute("aria-current");
      });
    }

    function ensureCDSSResultsView() {
      const inlineNeyimRes = document.getElementById("neyimTriageEgfrResultContainer");
      if (inlineNeyimRes) {
        inlineNeyimRes.classList.add("hidden");
        inlineNeyimRes.innerHTML = "";
      }
      const container = document.getElementById("cdssResultContainer");
      const resultsView = document.getElementById("view-clinical-results");
      if (container && resultsView && container.parentElement !== resultsView) {
        resultsView.appendChild(container);
      }
      const synthesisCard = document.getElementById("aiClinicalSynthesisCardShell");
      if (synthesisCard && container && synthesisCard.parentElement !== container) {
        container.insertBefore(synthesisCard, container.firstChild);
      }
      if (container) {
        const orderedIds = state.lastCDSS && state.lastCDSS.hasNoCurrentLabs
          ? ["lifeStageCard", "triageLabRecommendationsContainer", "cdssKidneySafetyWarningContainer", "contraindicationAlertContainer", "aiClinicalSynthesisCardShell", "cdssFindingsSection", "protocolRecommendationSection", "foodAlternativesSection", "cdssRecallContainer", "specificityPredictionContainer"]
          : ["lifeStageCard", "aiClinicalSynthesisCardShell", "contraindicationAlertContainer", "cdssKidneySafetyWarningContainer", "triageLabRecommendationsContainer", "cdssFindingsSection", "protocolRecommendationSection", "foodAlternativesSection", "cdssRecallContainer", "specificityPredictionContainer"];
        orderedIds.forEach(id => {
          const section = document.getElementById(id);
          if (section && section.parentElement === container) container.appendChild(section);
        });
      }

      const canAnalyze = typeof canRunClinicalAnalysis === "function"
        ? canRunClinicalAnalysis()
        : (typeof hasAnySymptomOrLabForClinicalAnalysis === "function"
          ? hasAnySymptomOrLabForClinicalAnalysis()
          : ((state.selectedSymptoms instanceof Set && state.selectedSymptoms.size > 0) ||
             (Array.isArray(state.selectedSymptomsArray) && state.selectedSymptomsArray.length > 0) ||
             Boolean(window.VitaLabInsights && VitaLabInsights.hasAnyLab && VitaLabInsights.hasAnyLab()) ||
             (Array.isArray(state.labHistory) && state.labHistory.length > 0)));
      const shouldShowResults = Boolean(canAnalyze);

      const synthesisButton = document.getElementById("btnGenerateAiSummary");
      const synthesisHint = document.getElementById("aiClinicalSynthesisHint");
      if (synthesisButton) synthesisButton.disabled = !shouldShowResults;
      if (synthesisHint) synthesisHint.classList.toggle("hidden", shouldShowResults);

      const emptyState = document.getElementById("cdssResultsEmptyState");
      const overview = document.getElementById("cdssResultsOverview");
      const triageBanner = document.getElementById("clinicalResultsTriageEgfrBanner");
      if (emptyState) {
        if (shouldShowResults) {
          emptyState.classList.add("hidden");
          emptyState.classList.remove("show");
          emptyState.style.setProperty("display", "none", "important");
        } else {
          emptyState.classList.remove("hidden");
          emptyState.classList.add("show");
          emptyState.style.display = "block";
        }
      }
      if (overview) {
        if (shouldShowResults) {
          overview.classList.remove("hidden");
          overview.classList.add("show");
          overview.style.display = "block";
        } else {
          overview.classList.add("hidden");
          overview.classList.remove("show");
          overview.style.display = "none";
        }
      }
      if (container) {
        if (shouldShowResults) {
          container.classList.remove("hidden");
          container.classList.add("show");
          container.style.display = "block";
        } else {
          container.classList.add("hidden");
          container.classList.remove("show");
          container.style.display = "none";
        }
      }
      if (triageBanner) {
        if (shouldShowResults && triageBanner.innerHTML.trim() !== "") {
          triageBanner.classList.remove("hidden");
          triageBanner.classList.add("show");
          triageBanner.style.display = "block";
        } else if (!shouldShowResults) {
          triageBanner.classList.add("hidden");
          triageBanner.classList.remove("show");
          triageBanner.style.display = "none";
        }
      }

      const findingCount = document.getElementById("cdssOverviewFindingCount");
      if (findingCount && state.lastCDSS) {
        const findings = Array.isArray(state.lastCDSS.findings) ? state.lastCDSS.findings.length : 0;
        const warnings = Array.isArray(state.lastCDSS.contraindications) ? state.lastCDSS.contraindications.length : 0;
        findingCount.textContent = warnings
          ? `${findings} değerlendirme notu · ${warnings} önemli uyarı`
          : `${findings} değerlendirme notu`;
      }
    }

    function switchTab(tabId) {
      const map = {
        "tab-daily": "view-home",
        "tab-labs": "view-labs",
        "tab-neyim": "view-neyim",
        "tab-report": "view-report",
        "tab-settings": "view-settings"
      };
      navigateToView(map[tabId] || tabId);
    }

    /* GLOBAL ARAMA MOTORU */