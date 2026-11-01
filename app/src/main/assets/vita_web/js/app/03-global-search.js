function handleGlobalSearch(query) {
      const q = normalizeTurkishText(query.trim());
      const resultsContainer = document.getElementById("globalSearchResults");
      const clearBtn = document.getElementById("clearSearchBtn");

      if (!resultsContainer) return;

      if (!q) {
        resultsContainer.classList.add("hidden");
        resultsContainer.innerHTML = "";
        if (clearBtn) clearBtn.classList.add("hidden");
        return;
      }

      if (clearBtn) clearBtn.classList.remove("hidden");

      const matches = [];

      const modules = [
        { title: "Ana Sayfa & Günlük Protokol", desc: "Bugün alınacak takviyeler, zamanlama ve hidrasyon takibi", view: "view-home", icon: "fa-calendar-check text-teal-600" },
        { title: "Tahlillerim & e-Nabız PDF", desc: "Kan değerleri girişi, PDF okuyucu ve grafik zaman serisi", view: "view-labs", icon: "fa-flask-vial text-sky-600" },
        { title: "NeyimVar? Anamnez & CDSS", desc: "Semptom triyajı, böbrek eGFR analizi ve şelat form önerileri", view: "view-neyim", icon: "fa-clipboard-question text-amber-600" },
        { title: "Doktora Götürülecek Rapor", desc: "Hasta sağlık özeti, HL7 FHIR dışa aktarma ve PDF yazdırma", view: "view-report", icon: "fa-file-waveform text-rose-600" }
      ];

      modules.forEach(m => {
        if (normalizeTurkishText(m.title).includes(q) || normalizeTurkishText(m.desc).includes(q)) {
          matches.push({
            type: "Modül",
            title: m.title,
            sub: m.desc,
            icon: m.icon,
            action: () => { navigateToView(m.view); clearGlobalSearch(); }
          });
        }
      });

      Object.keys(FORM_DOSAGE_CONFIG).forEach(key => {
        const item = FORM_DOSAGE_CONFIG[key];
        if (normalizeTurkishText(item.name).includes(q) || normalizeTurkishText(key).includes(q)) {
          matches.push({
            type: "Takviye Kataloğu",
            title: item.name,
            sub: "Hekim kontrolünde katalogdan ekleyin veya inceleyin",
            icon: "fa-capsules text-indigo-600",
            action: () => {
              navigateToView("view-home");
              openAddSupplementModal();
              const sel = document.getElementById("modalCatalogSelect");
              if (sel) { sel.value = key; onCatalogSelectChange(key); }
              clearGlobalSearch();
            }
          });
        }
      });

      Object.keys(ANAMNESIS_DICTIONARY).forEach(symKey => {
        const sym = ANAMNESIS_DICTIONARY[symKey];
        if (normalizeTurkishText(sym.question).includes(q) || normalizeTurkishText(sym.medicalName).includes(q) || sym.nutrients.some(n => normalizeTurkishText(n).includes(q))) {
          matches.push({
            type: "Semptom Anamnezi",
            title: sym.medicalName,
            sub: sym.question,
            icon: "fa-stethoscope text-amber-600",
            action: () => {
              navigateToView("view-neyim");
              switchAnamnesisCategoryTab(sym.catId);
              clearGlobalSearch();
            }
          });
        }
      });

      if (matches.length === 0) {
        resultsContainer.innerHTML = `
          <div class="p-4 text-center text-xs text-slate-500">
            <i class="fa-solid fa-circle-exclamation text-amber-500 text-sm mb-1 block"></i>
            "<strong>${escapeHtmlText(query)}</strong>" ile ilgili bir modül, takviye veya semptom bulunamadı.
          </div>
        `;
      } else {
        resultsContainer.innerHTML = `
          <div class="p-2 divide-y divide-slate-100">
            ${matches.slice(0, 6).map((m, idx) => `
              <div onclick="executeSearchAction(${idx})" class="p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                  <i class="fa-solid ${m.icon} text-base flex-shrink-0"></i>
                  <div class="min-w-0">
                    <span class="text-[9px] font-black uppercase tracking-wider text-slate-400 block">${m.type}</span>
                    <strong class="text-xs text-navy-900 block truncate">${m.title}</strong>
                    <span class="text-[10px] text-slate-500 block truncate">${m.sub}</span>
                  </div>
                </div>
                <i class="fa-solid fa-arrow-right text-xs text-slate-400 flex-shrink-0"></i>
              </div>
            `).join('')}
          </div>
        `;
        window._activeSearchMatches = matches;
      }

      resultsContainer.classList.remove("hidden");
    }

    function executeSearchAction(idx) {
      if (window._activeSearchMatches && window._activeSearchMatches[idx]) {
        window._activeSearchMatches[idx].action();
      }
    }

    function clearGlobalSearch() {
      const input = document.getElementById("globalSearchInput");
      const resultsContainer = document.getElementById("globalSearchResults");
      const clearBtn = document.getElementById("clearSearchBtn");
      if (input) input.value = "";
      if (resultsContainer) {
        resultsContainer.classList.add("hidden");
        resultsContainer.innerHTML = "";
      }
      if (clearBtn) clearBtn.classList.add("hidden");
    }

    document.addEventListener("click", function(e) {
      const searchBox = document.getElementById("globalSearchInput");
      const results = document.getElementById("globalSearchResults");
      if (results && searchBox && !searchBox.contains(e.target) && !results.contains(e.target)) {
        results.classList.add("hidden");
      }
    });

    /* SEKMELİ ANAMNEZ VE AKORDEON MOTORU */
    