let activeAnamnesisTab = "cat-A";

    function switchAnamnesisCategoryTab(catId) {
      activeAnamnesisTab = catId;
      const categories = ["cat-A", "cat-B", "cat-C", "cat-D", "cat-E", "cat-F", "cat-G"];

      categories.forEach(id => {
        const panel = document.getElementById(`anamnesis-panel-${id}`);
        const btn = document.getElementById(`btn-anamnesis-${id}`);
        if (panel) {
          if (id === catId) panel.classList.remove("hidden");
          else panel.classList.add("hidden");
        }
        if (btn) {
          btn.setAttribute("aria-pressed", String(id === catId));
          if (id === catId) {
            btn.className = "anamnesis-tab-btn px-3.5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 whitespace-nowrap cursor-pointer bg-navy-900 text-white shadow-sm";
          } else {
            btn.className = "anamnesis-tab-btn px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap cursor-pointer bg-white hover:bg-slate-100 text-slate-700 border border-slate-200";
          }
        }
      });

      const categoryOrder = ["cat-A", "cat-B", "cat-C", "cat-D", "cat-E", "cat-F", "cat-G"];
      const categoryIndex = categoryOrder.indexOf(catId);
      const progressLabel = document.getElementById("anamnesisCategoryProgressLabel");
      const progressBar = document.getElementById("anamnesisCategoryProgressBar");
      if (progressLabel) progressLabel.textContent = `Adım ${Math.max(0, categoryIndex) + 1} / ${categoryOrder.length}`;
      if (progressBar) progressBar.style.width = `${((Math.max(0, categoryIndex) + 1) / categoryOrder.length) * 100}%`;
      const progress = document.getElementById("anamnesisCategoryProgress");
      if (progress) {
        progress.setAttribute("aria-valuemax", String(categoryOrder.length));
        progress.setAttribute("aria-valuenow", String(Math.max(0, categoryIndex) + 1));
        progress.setAttribute("aria-valuetext", `Adım ${Math.max(0, categoryIndex) + 1} / ${categoryOrder.length}`);
        progress.setAttribute("aria-label", `${String.fromCharCode(65 + Math.max(0, categoryIndex))} adımı`);
      }
      const tabStrip = document.getElementById("anamnesisCategoryTabButtons");
      const activeButton = document.getElementById(`btn-anamnesis-${catId}`);
      if (tabStrip && activeButton && window.innerWidth < 768) {
        const left = activeButton.offsetLeft - (tabStrip.clientWidth - activeButton.clientWidth) / 2;
        tabStrip.scrollTo({ left: Math.max(0, left), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      }
      if (activeUserId) {
        try { safeLocalStorageSetItem(`vitatakip_anamnesis_category_${activeUserId}`, catId); } catch (e) {}
      }
      updateAnamnesisTabCounts();
    }

    function updateAnamnesisTabCounts() {
      const counts = { "cat-A": 0, "cat-B": 0, "cat-C": 0, "cat-D": 0, "cat-E": 0, "cat-F": 0, "cat-G": 0 };
      let total = 0;

      if (state.selectedSymptoms) {
        state.selectedSymptoms.forEach(symKey => {
          const meta = ANAMNESIS_DICTIONARY[symKey];
          if (meta && meta.catId && counts[meta.catId] !== undefined) {
            counts[meta.catId]++;
            total++;
          }
        });
      }

      Object.keys(counts).forEach(catId => {
        const badge = document.getElementById(`anamnesisTabBadge-${catId}`);
        if (badge) {
          const c = counts[catId];
          badge.textContent = c;
          const isActive = (catId === activeAnamnesisTab);
          if (c > 0) {
            badge.className = "px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-400 text-navy-950 shadow-sm";
          } else {
            badge.className = isActive
              ? "px-1.5 py-0.2 rounded-full text-[10px] font-black bg-white/20 text-white"
              : "px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600";
          }
        }
      });

      const totalBadge = document.getElementById("totalSelectedSymptomsBadge");
      if (totalBadge) {
        totalBadge.textContent = `${total} Belirti Seçildi`;
        if (total > 0) {
          totalBadge.className = "text-[11px] font-black px-3 py-1 rounded-full bg-indigo-600 text-white shadow-sm";
        } else {
          totalBadge.className = "text-[11px] font-black px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200";
        }
      }
      renderSpecificityLabPreview();
    }

    function renderSpecificityLabPreview() {
      const container = document.getElementById("specificityPredictionContainer");
      if (!container) return;
      const selected = Array.from(state.selectedSymptoms || [])
        .map(key => ({ key, meta: ANAMNESIS_DICTIONARY[key] }))
        .filter(item => item.meta && item.meta.specificityWeight >= 3);
      if (!selected.length) {
        container.classList.add("hidden");
        container.innerHTML = "";
        return;
      }
      const uniqueTests = [...new Set(selected.map(item => item.meta.suggestedLab).filter(Boolean))];
      container.classList.remove("hidden");
      container.innerHTML = `
        <div class="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-2 shadow-sm">
          <strong class="font-black flex items-center gap-2"><i class="fa-solid fa-flask-vial text-amber-700"></i> Yüksek Olasılıklı Biyokimyasal Açık Öngörüsü</strong>
          <p class="text-[11px] leading-relaxed">Seçtiğiniz bazı semptomlar ilgili biyokimyasal değerlendirmeyi hekiminizle öncelikli konuşmayı destekleyebilir. Bu ağırlıklar doğrulanmış Bayes olasılığı veya tanı değildir; tahlil olmadan eksiklik varlığı varsayılmaz.</p>
          <div class="flex flex-wrap gap-1.5">${selected.map(item => `<span class="rounded-lg border border-amber-300 bg-white px-2 py-1 text-[10px] font-bold">${escapeHtmlText(item.meta.medicalName)} · öncelik 3/3</span>`).join("")}</div>
          <div class="rounded-xl border border-amber-200 bg-white p-3"><strong>Hekimle görüşülebilecek testler</strong><ul class="mt-1 list-disc pl-4 space-y-1">${uniqueTests.map(test => `<li>${escapeHtmlText(test)}</li>`).join("")}</ul></div>
        </div>`;
    }

    function toggleAccordionSection(sectionId) {
      const content = document.getElementById(sectionId);
      const icon = document.getElementById(`icon-${sectionId}`);
      const label = document.getElementById(`label-${sectionId}`);
      if (!content) return;

      const isHidden = content.classList.contains("hidden");
      const toggle = content.parentElement?.querySelector('[aria-controls="' + sectionId + '"]');
      if (isHidden) {
        if (toggle) toggle.setAttribute("aria-expanded", "true");
        content.classList.remove("hidden");
        if (icon) {
          icon.classList.remove("fa-chevron-down");
          icon.classList.add("fa-chevron-up");
        }
        if (label) {
          label.textContent = sectionId === "acc-findings" ? "Daralt" : "Gizle";
        }
        if (sectionId === "acc-labtrend") window.requestAnimationFrame(() => renderBiomarkerTrendChart());
      } else {
        if (toggle) toggle.setAttribute("aria-expanded", "false");
        content.classList.add("hidden");
        if (icon) {
          icon.classList.remove("fa-chevron-up");
          icon.classList.add("fa-chevron-down");
        }
        if (label) {
          label.textContent = sectionId === "acc-findings" ? "Genişlet" : "Göster";
        }
      }
    }

    /* 3. MODÜL: 5 KADEMELİ KLİNİK KARAR DESTEK (KDSS) KURAL MOTORU (HEPATİK ALT DESTEKLİ) */
    