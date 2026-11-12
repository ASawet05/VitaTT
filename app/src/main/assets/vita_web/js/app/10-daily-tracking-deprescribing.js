function renderDailyTab() {
      if (!state.user) return;
      updateLabApplicationReferenceHints();
      const p = state.user;

      document.getElementById("profileCardName").textContent = p.name || "Kullanıcı";
      document.getElementById("profileCardAgeGender").textContent = `${p.age} Yaş / ${p.gender === 'E' ? 'Erkek' : 'Kadın'}`;
      document.getElementById("profileCardHeightWeight").textContent = `${p.height} cm / ${p.weight} kg`;
      
      const bmiEl = document.getElementById("profileCardBmi");
      bmiEl.className = `font-black px-2 py-0.5 rounded text-[11px] ${p.bmiBadgeColor}`;
      bmiEl.textContent = `${p.bmi} - ${p.bmiCategory}`;

      document.getElementById("profileCardActivity").textContent = p.activity === "fitness" ? "Fitness" : (p.activity === "moderate" ? "Orta Düzey" : "Masa Başı");
      const chronicDisplayList = [
        ...(Array.isArray(p.chronic) ? p.chronic : []),
        ...(Array.isArray(p.medications) ? p.medications : [])
      ];
      document.getElementById("profileCardChronic").textContent = chronicDisplayList.length ? chronicDisplayList.join(", ") : "Yok";

      updateDynamicTargetHydration();
      document.getElementById("homeHydrationText").textContent = `${state.hydration.current} / ${state.hydration.target} ml tamamlandı`;
      const ratio = Math.min(100, Math.round((state.hydration.current / state.hydration.target) * 100));
      document.getElementById("homeHydrationBar").style.width = `${ratio}%`;

      const todaySupplements = state.supplements.filter(s => isSupplementScheduledToday(s));
      const morningItems = todaySupplements.filter(s => s.timing === "Sabah");
      const noonItems = todaySupplements.filter(s => s.timing === "Öğle");
      const eveningItems = todaySupplements.filter(s => s.timing === "Akşam" || s.timing === "Gece");

      document.getElementById("dashMorningCount").textContent = `${morningItems.filter(i => i.taken).length}/${morningItems.length}`;
      document.getElementById("dashNoonCount").textContent = `${noonItems.filter(i => i.taken).length}/${noonItems.length}`;
      document.getElementById("dashEveningCount").textContent = `${eveningItems.filter(i => i.taken).length}/${eveningItems.length}`;

      const total = todaySupplements.length;
      const taken = todaySupplements.filter(i => i.taken).length;
      const vitaScore = total > 0 ? Math.round((taken / total) * 70 + Math.min(1, state.hydration.current / state.hydration.target) * 30) : Math.round(Math.min(1, state.hydration.current / state.hydration.target) * 100);

      const dashVitaEl = document.getElementById("dashVitaSkor");
      if (dashVitaEl) dashVitaEl.textContent = `${vitaScore}%`;

      const checklistContainer = document.getElementById("supplementChecklistContainer");
      if (!checklistContainer) return;
      checklistContainer.innerHTML = "";

      if (total === 0) {
        checklistContainer.innerHTML = `
          <div class="text-center py-3 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            <i class="fa-solid fa-pills text-amber-500 mr-1"></i> Henüz takviye yok. “Takviye Ekle” ile başlayın.
          </div>
        `;
      } else {
        const groups = [
          { timing: "Sabah", label: "Sabah protokolü", icon: "fa-sun text-amber-500", items: morningItems },
          { timing: "Öğle", label: "Öğle protokolü", icon: "fa-utensils text-sky-500", items: noonItems },
          { timing: "Akşam", label: "Akşam protokolü", icon: "fa-moon text-indigo-500", items: eveningItems }
        ];

        groups.forEach(g => {
          if (g.items.length === 0) return;

          const groupEl = document.createElement("div");
          groupEl.className = "space-y-2.5";
          groupEl.innerHTML = `
            <div class="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700">
              <i class="fa-solid ${g.icon}"></i>
              <span>${g.label}</span>
              <span class="text-[10px] text-slate-400 font-normal">(${g.items.filter(i=>i.taken).length}/${g.items.length} alındı)</span>
              <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); markTimingTaken(${safeJsStringAttribute(g.timing)})" class="ml-auto min-h-9 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[10px] font-black text-emerald-800 hover:bg-emerald-100" title="Bu zaman dilimindeki tüm takviyeleri alındı olarak işaretler">Tümünü Alındı İşaretle</button>
            </div>
          `;

          g.items.forEach(item => {
            const card = document.createElement("div");
            card.className = `p-3.5 sm:p-4 rounded-2xl border transition-all ${
              item.taken 
                ? "bg-teal-50/70 border-teal-200" 
                : "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
            }`;

            const bioStatus = getSupplementBiomarkerStatus(item);
            let deprescribingBadgeHtml = "";
            let criticalWarningIconHtml = "";

            if (bioStatus) {
              const isCreatine = (bioStatus.key === 'creatinine');
              const hasKidneyChronic = (state.user.chronic || []).includes("kidney");
              const hasEgfrRisk = state.lastCDSS?.egfrResult && (state.lastCDSS.egfrResult.riskLevel === 'high' || state.lastCDSS.egfrResult.riskLevel === 'severe');

              if (isCreatine && (bioStatus.val > getCreatinineUpperLimit() || hasKidneyChronic || hasEgfrRisk)) {
                deprescribingBadgeHtml = `
                  <div class="mt-2.5 p-2.5 rounded-xl bg-rose-50 border-2 border-rose-400 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm animate-bounce-short">
                    <span class="font-black text-[11px] text-rose-900">⛔ Yüksek Kreatinin Nedeniyle Yasaklı (${bioStatus.val} mg/dL)</span>
                    <button type="button" onclick="deleteSupplementItem(${safeJsStringAttribute(item.id)})" class="px-2.5 py-1 rounded bg-rose-600 text-white text-[10px] font-black cursor-pointer">Listeden Çıkar</button>
                  </div>
                `;
              } else if (bioStatus.evalResult.isToxic) {
                criticalWarningIconHtml = `
                  <details class="relative shrink-0">
                    <summary class="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg text-base hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300 [&::-webkit-details-marker]:hidden" aria-label="Kritik laboratuvar uyarısı ayrıntılarını aç" title="Kritik sonuç uyarısı">⚠️</summary>
                    <div class="absolute right-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-950 shadow-lg">
                      <p class="text-[11px] font-bold leading-relaxed">Kritik yüksek sonuç olasılığı (${escapeHtmlText(bioStatus.val)}): Sonucu hekiminizle gecikmeden değerlendirin. Kullanımı kendi kararınızla değiştirmeyin.</p>
                      <button type="button" onclick="deleteSupplementItem(${safeJsStringAttribute(item.id)})" class="mt-2 rounded bg-rose-600 px-2.5 py-1.5 text-[10px] font-black text-white cursor-pointer">Takip listesinden çıkar</button>
                    </div>
                  </details>
                `;
              } else if (bioStatus.evalResult.tier === 'optimal') {
                criticalWarningIconHtml = `
                  <details class="relative shrink-0">
                    <summary class="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-lg text-base hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300 [&::-webkit-details-marker]:hidden" aria-label="Tahlil değeri optimal uyarısı ayrıntılarını aç" title="Tahlil değeri optimal">✅</summary>
                    <div class="absolute right-0 top-full z-30 mt-1 w-72 max-w-[80vw] rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-emerald-950 shadow-lg">
                      <p class="text-[11px] font-bold leading-relaxed">Tahlil değeri referans aralığında (${escapeHtmlText(bioStatus.val)}) – takviyeye devam veya ara verme kararı hekimle verilmelidir.</p>
                      <button type="button" onclick="deleteSupplementItem(${safeJsStringAttribute(item.id)})" class="mt-2 rounded border border-emerald-400 bg-white px-2.5 py-1.5 text-[10px] font-black text-emerald-900 cursor-pointer">Takip listesinden çıkar</button>
                    </div>
                  </details>
                `;
              }
            }

            let formSelectorHtml = "";
            if (item.formKey && FORM_DOSAGE_CONFIG[item.formKey]) {
              const cfg = FORM_DOSAGE_CONFIG[item.formKey];
              const formKeys = Object.keys(cfg.forms);

              const getFormIcon = (f) => {
                if (f === "Damla") return "💧";
                if (f.includes("Kapsul") || f.includes("Kapsül")) return "💊";
                if (f.includes("Sprey")) return "💨";
                if (f.includes("Saşe")) return "✉️";
                if (f.includes("Toz")) return "🥄";
                if (f.includes("Sıvı")) return "🧪";
                return "🔘";
              };

              formSelectorHtml = `
                <div class="mt-3 p-2.5 bg-gradient-to-r from-teal-50/90 to-emerald-50/60 border border-teal-200/90 rounded-xl">
                  <div class="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <label class="text-[11px] font-black text-teal-950 flex items-center gap-1.5">
                      <i class="fa-solid fa-shapes text-teal-600"></i>
                      <span>Farmasötik Form Seçici:</span>
                    </label>
                    <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-300">
                      Aktif: ${escapeHtmlText(item.selectedForm ? item.selectedForm.replace('_', ' ') : 'Standart')}
                    </span>
                  </div>

                  <div class="flex flex-wrap gap-1 mt-1">
                    ${formKeys.map(f => `
                      <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); changeDailySupplementForm(${safeJsStringAttribute(item.id)}, ${safeJsStringAttribute(f)})" class="px-2.5 py-1 rounded-lg text-[10px] font-black transition flex items-center gap-1 cursor-pointer ${
                        item.selectedForm === f 
                          ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-700' 
                          : 'bg-white hover:bg-teal-100 text-teal-900 border border-teal-200'
                      }">
                        <span>${getFormIcon(f)}</span>
                        <span>${escapeHtmlText(f.replace('_', ' '))}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              `;
            }

            const itemInteractions = (typeof getSupplementItemInteractions === "function")
              ? getSupplementItemInteractions(item)
              : [];
            const itemInteractionHtml = itemInteractions.length > 0 ? `
              <div class="mt-2.5 space-y-1.5">
                ${itemInteractions.map(ix => `
                  <div class="p-2.5 rounded-xl border ${ix.severity === 'danger' ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-amber-50 border-amber-300 text-amber-950'} text-[11px]">
                    <div class="flex flex-wrap items-center justify-between gap-1">
                      <strong class="font-black">${escapeHtmlText(ix.title)}</strong>
                      <span class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-white/80 border ${ix.severity === 'danger' ? 'border-rose-200 text-rose-800' : 'border-amber-200 text-amber-800'}">${escapeHtmlText(ix.severityLabel || 'Etkileşim')}</span>
                    </div>
                    <p class="text-[10px] mt-0.5 leading-relaxed opacity-90">${escapeHtmlText(ix.actionText)}</p>
                  </div>
                `).join("")}
              </div>
            ` : "";

            // Misantha Tipi Kutu, Stok ve Kalan Gün Sayacı (Pill & Days Counter)
            normalizeSupplementStockFields(item);
            const kalanAdet = item.kalanAdet;
            const toplamKutuAdedi = item.toplamKutuAdedi;
            const gunlukDoz = item.gunlukDoz;
            const kalanGun = Math.floor(kalanAdet / gunlukDoz);
            const isCriticalStock = kalanGun <= 3;
            const stockBadgeHtml = isCriticalStock
              ? `<span class="misantha-stock-critical-badge" data-testid="critical-stock-badge"><i class="fa-solid fa-triangle-exclamation"></i><span>Kritik Stok: ${kalanGun} gün yetecek (${kalanAdet} tablet kaldı)</span></span>`
              : `<span class="misantha-stock-normal-badge" data-testid="normal-stock-badge"><i class="fa-solid fa-boxes-stacked"></i><span>Stok: ${kalanAdet}/${toplamKutuAdedi} tablet · ${kalanGun} gün yetecek (Günlük doz: ${gunlukDoz})</span></span>`;

            const misanthaStockBarHtml = `
              <div class="misantha-stock-bar">
                <div class="flex flex-wrap items-center gap-1.5">
                  ${stockBadgeHtml}
                  ${item.doseText ? `<span class="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">${escapeHtmlText(item.doseText)}</span>` : ""}
                </div>
                <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); refillSupplementBox(${safeJsStringAttribute(item.id)})" class="misantha-refill-btn" title="Biten kutuyu yenile (+${toplamKutuAdedi} adet ekle)">
                  <i class="fa-solid fa-box-open"></i>
                  <span>Yeni Kutu Ekle (+Stok)</span>
                </button>
              </div>
            `;

            card.innerHTML = `
              <div class="flex items-start justify-between gap-2 sm:gap-3">
                <div class="flex items-start gap-2.5 sm:gap-3 min-w-0 flex-1">
                  <input type="checkbox" ${item.taken ? "checked" : ""} onchange="if(window.SoundEffects) SoundEffects.playClick(); toggleSupplementStatus(${safeJsStringAttribute(item.id)})" class="mt-1 h-4 w-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer flex-shrink-0" title="İçtim / Alındı olarak işaretle">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center justify-between gap-2">
                      <h5 class="min-w-0 flex-1 break-words text-xs font-black sm:text-sm ${item.taken ? 'line-through text-slate-400' : 'text-navy-900'}">${escapeHtmlText(item.name)}</h5>
                      ${criticalWarningIconHtml}
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                      <span class="text-[10px] text-sky-800 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200"><i class="fa-regular fa-clock mr-1"></i>${escapeHtmlText(getSupplementTimeLabel(item))}</span>
                      <span class="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200"><i class="fa-regular fa-calendar mr-1"></i>${escapeHtmlText(getSupplementScheduleDaysLabel(item))}</span>
                    </div>
                    ${misanthaStockBarHtml}
                    ${item.instruction ? `
                      <div class="mt-2">
                        <button type="button" aria-expanded="false" onclick="if(window.SoundEffects) SoundEffects.playClick(); const info=this.nextElementSibling; const opening=info.classList.contains('hidden'); info.classList.toggle('hidden'); this.setAttribute('aria-expanded', String(opening));" class="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-300">
                          <i class="fa-solid fa-circle-exclamation text-amber-600" aria-hidden="true"></i>
                          Kullanım bilgisi
                        </button>
                        <div class="hidden mt-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-sm leading-relaxed text-slate-700">
                          ${escapeHtmlText(item.instruction)}
                        </div>
                      </div>` : ''}
                    ${itemInteractionHtml}
                    ${deprescribingBadgeHtml}
                    ${formSelectorHtml}
                  </div>
                </div>
                <button onclick="if(window.SoundEffects) SoundEffects.playClick(); deleteSupplementItem(${safeJsStringAttribute(item.id)})" title="Listeden Çıkar" class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg text-xs transition cursor-pointer">
                  <i class="fa-solid fa-trash-can"></i>
                </button>
              </div>
            `;
            groupEl.appendChild(card);
          });
          checklistContainer.appendChild(groupEl);
        });
      }

      renderDynamicAbsorptionPanel();
      renderChrononutritionTimeline();
      detectSupplementConflicts();
      if (window.VitaRechartsDashboard && typeof window.VitaRechartsDashboard.renderAll === "function") {
        window.VitaRechartsDashboard.renderAll();
      }
    }

    /* =========================================================================
       MİSANTHA TİPİ KUTU, STOK VE KALAN GÜN SAYACI (PILL & DAYS COUNTER)
       ========================================================================= */
    function normalizeSupplementStockFields(item) {
      if (!item || typeof item !== "object") return item;
      const boxCount = Number(item.toplamKutuAdedi);
      item.toplamKutuAdedi = Number.isFinite(boxCount) && boxCount >= 1 ? Math.round(boxCount) : 30;
      const dailyDose = Number(item.gunlukDoz);
      item.gunlukDoz = Number.isFinite(dailyDose) && dailyDose >= 1 ? Math.round(dailyDose) : 1;
      const rem = Number(item.kalanAdet);
      item.kalanAdet = Number.isFinite(rem) && rem >= 0 ? Math.round(rem) : item.toplamKutuAdedi;
      return item;
    }

    function calculateSupplementRemainingDays(item) {
      normalizeSupplementStockFields(item);
      return Math.floor(item.kalanAdet / item.gunlukDoz);
    }

    function refillSupplementBox(id, customAddAmount) {
      const item = (state.supplements || []).find(s => s.id === id);
      if (!item) return;
      normalizeSupplementStockFields(item);
      const addCount = Number.isFinite(Number(customAddAmount)) && Number(customAddAmount) > 0
        ? Math.round(Number(customAddAmount))
        : item.toplamKutuAdedi;
      item.kalanAdet = Math.max(0, item.kalanAdet + addCount);
      if (item.kalanAdet > item.toplamKutuAdedi) {
        item.toplamKutuAdedi = item.kalanAdet;
      }
      saveState();
      renderDailyTab();
      const kalanGun = Math.floor(item.kalanAdet / item.gunlukDoz);
      showToast(
        "Yeni Kutu Eklendi (+Stok)",
        `${item.name} stoğuna +${addCount} adet eklendi. Güncel stok: ${item.kalanAdet} tablet (${kalanGun} gün yetecek).`,
        "success"
      );
    }

    function updateManualModalStockPreview(syncRemaining = false) {
      const boxInput = document.getElementById("manualSupBoxCount");
      const remInput = document.getElementById("manualSupRemainingCount");
      const doseInput = document.getElementById("manualSupDailyDose");
      const badge = document.getElementById("modalMisanthaDaysPreviewBadge");
      if (!boxInput || !remInput || !doseInput) return;
      const boxVal = Math.max(1, parseInt(boxInput.value, 10) || 30);
      if (syncRemaining) {
        remInput.value = String(boxVal);
      }
      const remVal = Math.max(0, parseInt(remInput.value, 10) || 0);
      const doseVal = Math.max(1, parseInt(doseInput.value, 10) || 1);
      const kalanGun = Math.floor(remVal / doseVal);
      if (badge) {
        badge.textContent = kalanGun <= 3
          ? `Kritik Stok: ${kalanGun} gün yetecek (${remVal} tablet kaldı)`
          : `${kalanGun} gün yetecek (${remVal} tablet)`;
        badge.className = kalanGun <= 3
          ? "text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300"
          : "text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white text-indigo-800 border border-indigo-200";
      }
    }

    function updateBarcodeModalStockPreview() {
      const boxInput = document.getElementById("barcodeSupplementBoxCount");
      const doseInput = document.getElementById("barcodeSupplementDailyDose");
      const preview = document.getElementById("barcodeSupplementDaysPreview");
      if (!boxInput || !doseInput || !preview) return;
      const boxVal = Math.max(1, parseInt(boxInput.value, 10) || 30);
      const doseVal = Math.max(1, parseInt(doseInput.value, 10) || 1);
      const kalanGun = Math.floor(boxVal / doseVal);
      preview.textContent = kalanGun <= 3
        ? `Kritik Stok: ${kalanGun} gün yetecek (${boxVal} tablet kaldı)`
        : `${kalanGun} gün yetecek (${boxVal} adet)`;
      preview.className = kalanGun <= 3
        ? "text-xs font-black text-rose-700 mt-0.5"
        : "text-xs font-black text-teal-800 mt-0.5";
    }

    window.normalizeSupplementStockFields = normalizeSupplementStockFields;
    window.calculateSupplementRemainingDays = calculateSupplementRemainingDays;
    window.refillSupplementBox = refillSupplementBox;
    window.updateManualModalStockPreview = updateManualModalStockPreview;
    window.updateBarcodeModalStockPreview = updateBarcodeModalStockPreview;

    function changeDailySupplementForm(itemId, newForm) {
      const item = state.supplements.find(s => s.id === itemId);
      if (!item || !item.formKey || !FORM_DOSAGE_CONFIG[item.formKey]) return;

      const cfg = FORM_DOSAGE_CONFIG[item.formKey];
      const formFn = cfg.forms[newForm];
      if (!formFn) return;

      const w = state.user ? state.user.weight : 70;
      const evaluated = formFn(w);

      item.selectedForm = newForm;
      item.doseText = evaluated.doseText;
      item.subText = evaluated.subText;
      item.timing = evaluated.timing;
      item.instruction = evaluated.instruction;

      saveState();
      renderDailyTab();
      detectSupplementConflicts();
      showToast("Form Güncellendi", `${item.name} formu "${newForm.replace('_', ' ')}" olarak seçildi.`, "success");
    }

    function markTimingTaken(timing) {
      const validTimings = ["Sabah", "Öğle", "Akşam", "Gece"];
      if (!validTimings.includes(timing)) return;
      const items = (state.supplements || []).filter(item => {
        if (!isSupplementScheduledToday(item)) return false;
        if (timing === "Akşam") return item.timing === "Akşam" || item.timing === "Gece";
        return item.timing === timing;
      });
      if (!items.length) { showToast("Takviye Bulunamadı", "Bu zaman diliminde işaretlenecek takviye yok.", "info"); return; }
      items.forEach(item => {
        normalizeSupplementStockFields(item);
        if (!item.taken) {
          item.kalanAdet = Math.max(0, item.kalanAdet - item.gunlukDoz);
        }
        item.taken = true;
      });
      const saved = saveState();
      renderDailyTab();
      if (window.SoundEffects) SoundEffects.playSuccess();
      showToast("Zaman Dilimi Güncellendi", `${timing} grubundaki ${items.length} takviye alındı olarak işaretlendi ve stoktan düşüldü.${saved === false ? " Ancak tarayıcı kayıt işlemi başarısız olmuş olabilir." : ""}`, saved === false ? "warning" : "success");
    }

    function toggleSupplementStatus(id) {
      const item = state.supplements.find(s => s.id === id);
      if (item) {
        normalizeSupplementStockFields(item);
        const becomingTaken = !item.taken;
        item.taken = becomingTaken;
        if (becomingTaken) {
          item.kalanAdet = Math.max(0, item.kalanAdet - item.gunlukDoz);
        } else {
          item.kalanAdet = Math.min(item.toplamKutuAdedi, item.kalanAdet + item.gunlukDoz);
        }
        const kalanGun = Math.floor(item.kalanAdet / item.gunlukDoz);
        saveState();
        renderDailyTab();
        showToast(
          item.taken ? "İçtim / Alındı İşaretlendi" : "İşaret Kaldırıldı",
          item.taken
            ? `${item.name}: Kalan stok ${item.kalanAdet} tablet (${kalanGun} gün yetecek).`
            : `${item.name} durumu geri alındı (Stok: ${item.kalanAdet}).`,
          item.taken ? (kalanGun <= 3 ? "warning" : "success") : "info"
        );
      }
    }

    function deleteSupplementItem(id) {
      state.supplements = state.supplements.filter(s => s.id !== id);
      saveState();
      renderDailyTab();
      checkPendingSymptomReviews();
      detectSupplementConflicts();
      showToast("Takviye Kaldırıldı", "Takviye listenizden çıkarıldı.", "info");
    }

    function addWater(amount) {
      state.hydration.current += amount;
      saveState();
      renderDailyTab();
      showToast("Su Tüketimi Eklendi", `+${amount} ml su kaydedildi.`, "success");
    }

    /* =========================================================================
       TAKVİYE EKLE MODALI -> "KUTU VE BARKOD / KAREKOD" & GEMINI VISION MOTORU
       ========================================================================= */
    let addSupHtml5QrInstance = null;
    let addSupMediaStream = null;
    let addSupScanLoopActive = false;

    function populateAddSupQuickDbSelect() {
      const sel = document.getElementById("addSupQuickDbSelect");
      const badge = document.getElementById("addSupDbBadge");
      const db = Array.isArray(window.VITA_SUPPLEMENT_DB) ? window.VITA_SUPPLEMENT_DB : [];
      if (badge) {
        badge.textContent = `${db.length} Takviye Aktif`;
      }
      if (!sel) return;
      sel.innerHTML = `<option value="">— ${db.length} Popüler Takviyeden Seçin (Orzaks, VeNatura, Solgar, Magnimore, Möller's...) —</option>` +
        db.map(item => `<option value="${escapeHtmlText(item.barcode)}">${escapeHtmlText(item.urunAdi)} (${escapeHtmlText(item.marka)}) — [${escapeHtmlText(item.barcode)}]</option>`).join("");
    }

    function stopScanner() {
      addSupScanLoopActive = false;
      if (addSupHtml5QrInstance) {
        const inst = addSupHtml5QrInstance;
        addSupHtml5QrInstance = null;
        try {
          Promise.resolve(inst.stop()).catch(() => {}).finally(() => {
            try { inst.clear(); } catch (e) {}
          });
        } catch (e) {}
      }
      if (addSupMediaStream) {
        try {
          addSupMediaStream.getTracks().forEach(t => t.stop());
        } catch (e) {}
        addSupMediaStream = null;
      }
      const readerEl = document.getElementById("addSupQrReader");
      if (readerEl) {
        readerEl.querySelectorAll("video").forEach(v => {
          try {
            if (v.srcObject && typeof v.srcObject.getTracks === "function") {
              v.srcObject.getTracks().forEach(t => t.stop());
            }
            v.pause();
            v.srcObject = null;
          } catch (e) {}
        });
      }
      const videoEl = document.getElementById("addSupCameraVideo");
      if (videoEl) {
        try {
          if (videoEl.srcObject && typeof videoEl.srcObject.getTracks === "function") {
            videoEl.srcObject.getTracks().forEach(t => t.stop());
          }
          videoEl.pause();
          videoEl.srcObject = null;
        } catch (e) {}
        videoEl.classList.add("hidden");
      }
      const wrapper = document.getElementById("addSupCameraViewportWrapper");
      if (wrapper) wrapper.classList.add("hidden");
      const startBtn = document.getElementById("btnAddSupStartCamera");
      const stopBtn = document.getElementById("btnAddSupStopCamera");
      if (startBtn) startBtn.classList.remove("hidden");
      if (stopBtn) stopBtn.classList.add("hidden");
    }

    function enforceAddSupModalInlineVideo() {
      const wrapper = document.getElementById("addSupCameraViewportWrapper");
      if (!wrapper) return;
      wrapper.querySelectorAll("video").forEach(v => {
        v.setAttribute("playsinline", "true");
        v.setAttribute("webkit-playsinline", "true");
        v.setAttribute("muted", "true");
        v.playsInline = true;
        v.muted = true;
        v.style.maxHeight = "220px";
        v.style.width = "100%";
        v.style.objectFit = "cover";
      });
    }

    async function startAddSupModalScanner() {
      stopScanner();
      const wrapper = document.getElementById("addSupCameraViewportWrapper");
      const readerEl = document.getElementById("addSupQrReader");
      const videoEl = document.getElementById("addSupCameraVideo");
      const statusEl = document.getElementById("addSupCameraLiveStatus");
      const startBtn = document.getElementById("btnAddSupStartCamera");
      const stopBtn = document.getElementById("btnAddSupStopCamera");
      const fallbackBox = document.getElementById("addSupFallbackConfirmBox");
      if (fallbackBox) fallbackBox.classList.add("hidden");

      if (typeof window.ensureCameraPermissionForFeature === "function") {
        const hasPerm = await window.ensureCameraPermissionForFeature("barcode", {
          sourceModal: "addSupplementModal"
        });
        if (!hasPerm) {
          if (typeof window.updateCameraPermissionUI === "function") window.updateCameraPermissionUI();
          showAddSupFeedback(
            `🔒 Kamera erişim onayı kapalı veya reddedildi. Barkod okuyucuyu kullanmak için <button type="button" onclick="if(typeof openCameraPermissionsInSettings==='function')openCameraPermissionsInSettings();" class="underline font-black text-indigo-800 hover:text-indigo-950 ml-1 cursor-pointer">Ayarlar &gt; İzinler &gt; Kamera Erişim Onayı</button> menüsünden izni etkinleştirin.`,
            "warning",
            true
          );
          return;
        }
      } else if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.requestCameraPermission === "function") {
        try {
          window.AndroidVitaBridge.requestCameraPermission();
        } catch (_) {}
      }

      if (wrapper) wrapper.classList.remove("hidden");
      if (startBtn) startBtn.classList.add("hidden");
      if (stopBtn) stopBtn.classList.remove("hidden");
      if (statusEl) statusEl.textContent = "Kamera hazırlanıyor (EAN-13 / Karekod)...";

      let Html5QrClass = window.Html5Qrcode;
      if (typeof Html5QrClass !== "function" && typeof loadHtml5QrCodeLibrary === "function") {
        try {
          Html5QrClass = await loadHtml5QrCodeLibrary();
        } catch (_) {}
      }

      if (typeof Html5QrClass === "function" && readerEl) {
        try {
          readerEl.classList.remove("hidden");
          addSupHtml5QrInstance = new Html5QrClass("addSupQrReader");
          await addSupHtml5QrInstance.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
            (decodedText) => {
              if (decodedText) {
                handleAddSupBarcodeDecoded(decodedText);
              }
            },
            () => {}
          );
          enforceAddSupModalInlineVideo();
          setTimeout(enforceAddSupModalInlineVideo, 350);
          if (typeof updateCameraPermissionUI === "function") updateCameraPermissionUI();
          if (statusEl) statusEl.textContent = "Kamerayı takviye kutusunun barkoduna odaklayın...";
          return;
        } catch (err) {
          addSupHtml5QrInstance = null;
          if (readerEl) readerEl.classList.add("hidden");
        }
      }

      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
        stopScanner();
        showAddSupFeedback("Bu cihazda doğrudan kamera akışı açılamadı. 'Fotoğraf Çek / AI ile Kutuyu Tanı' butonuna basarak kutu fotoğrafı çekebilir veya 30 hazır takviye listesinden seçebilirsiniz.", "warning");
        return;
      }

      try {
        addSupMediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (typeof updateCameraPermissionUI === "function") updateCameraPermissionUI();
        if (videoEl) {
          videoEl.srcObject = addSupMediaStream;
          videoEl.setAttribute("playsinline", "true");
          videoEl.setAttribute("webkit-playsinline", "true");
          videoEl.setAttribute("muted", "true");
          videoEl.muted = true;
          videoEl.classList.remove("hidden");
          await videoEl.play();
        }
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code", "data_matrix"] });
          addSupScanLoopActive = true;
          if (statusEl) statusEl.textContent = "Kamera aktif. Barkodu çerçeveye hizalayın...";
          const scanTick = async () => {
            if (!addSupScanLoopActive || !videoEl) return;
            try {
              const codes = await detector.detect(videoEl);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                handleAddSupBarcodeDecoded(codes[0].rawValue);
                return;
              }
            } catch (e) {}
            if (addSupScanLoopActive) requestAnimationFrame(scanTick);
          };
          requestAnimationFrame(scanTick);
        } else if (typeof loadZXingBrowser === "function" && videoEl) {
          try {
            const zxing = await loadZXingBrowser();
            const reader = new zxing.BrowserMultiFormatReader();
            addSupScanLoopActive = true;
            if (statusEl) statusEl.textContent = "Kamera aktif (ZXing). Barkodu çerçeveye hizalayın...";
            await reader.decodeFromVideoDevice(undefined, videoEl, (res) => {
              if (res && res.getText && addSupScanLoopActive) {
                handleAddSupBarcodeDecoded(res.getText());
              }
            });
          } catch (_) {
            if (statusEl) {
              statusEl.textContent = "Kamera açık. Barkod algılanamazsa 'Fotoğraf Çek / AI ile Kutuyu Tanı' butonuna dokunun.";
            }
          }
        } else if (statusEl) {
          statusEl.textContent = "Kamera açık. Barkod algılanamazsa 'Fotoğraf Çek / AI ile Kutuyu Tanı' butonuna dokunun.";
        }
      } catch (err) {
        stopScanner();
        if (typeof window.updateCameraPermissionUI === "function") window.updateCameraPermissionUI();
        showAddSupFeedback(
          `Kamera izni bekleniyor veya kamera başlatılamadı. <button type="button" onclick="if(typeof openCameraPermissionsInSettings==='function')openCameraPermissionsInSettings();" class="underline font-black text-indigo-800 hover:text-indigo-950 ml-1 cursor-pointer">Ayarlar &gt; İzinler &gt; Kamera Erişim Onayı</button> bölümünden izni onaylayabilir veya hazır listeden seçebilirsiniz.`,
          "warning",
          true
        );
      }
    }

    function showAddSupFeedback(message, tone = "success", allowHtml = false) {
      const box = document.getElementById("addSupBarcodeFeedbackBox");
      if (!box) return;
      box.classList.remove("hidden");
      if (tone === "success") {
        box.className = "rounded-xl border border-emerald-300 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-950";
      } else if (tone === "warning") {
        box.className = "rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs font-bold text-amber-950";
      } else {
        box.className = "rounded-xl border border-indigo-200 bg-indigo-50 p-2.5 text-xs font-bold text-indigo-950";
      }
      if (allowHtml) {
        box.innerHTML = message;
      } else {
        box.textContent = message;
      }
    }

    function fillAddSupplementModalFormFromItem(item) {
      if (!item) return;
      const catalogSelect = document.getElementById("modalCatalogSelect");
      if (catalogSelect) {
        catalogSelect.value = "custom";
        onCatalogSelectChange("custom");
      }
      const nameInput = document.getElementById("manualSupName");
      const brandActiveInput = document.getElementById("manualSupBrandActive");
      const formInput = document.getElementById("manualSupFormText");
      const doseInput = document.getElementById("manualSupDose");
      const boxCountInput = document.getElementById("manualSupBoxCount");
      const remCountInput = document.getElementById("manualSupRemainingCount");
      const dailyDoseInput = document.getElementById("manualSupDailyDose");
      const timingSelect = document.getElementById("manualSupTiming");
      const hungerInput = document.getElementById("manualSupHungerNote");

      if (nameInput && item.urunAdi) nameInput.value = item.urunAdi;
      if (brandActiveInput) {
        const brandPart = (item.marka || "").trim();
        const activePart = (item.etkenMadde || "").trim();
        brandActiveInput.value = brandPart && activePart ? `${brandPart} — ${activePart}` : (brandPart || activePart || "");
      }
      if (formInput && item.form) formInput.value = item.form;
      if (doseInput && item.dozaj) doseInput.value = item.dozaj;

      const kutuAdedi = Number(item.kutuAdedi) > 0 ? Math.round(Number(item.kutuAdedi)) : 30;
      const gunlukDoz = Number(item.gunlukDoz) > 0 ? Math.round(Number(item.gunlukDoz)) : 1;
      if (boxCountInput) boxCountInput.value = String(kutuAdedi);
      if (remCountInput) remCountInput.value = String(kutuAdedi);
      if (dailyDoseInput) dailyDoseInput.value = String(gunlukDoz);

      if (timingSelect && item.zamanBloku) {
        const validOptions = ["Sabah", "Öğle", "Akşam", "Gece"];
        if (validOptions.includes(item.zamanBloku)) {
          timingSelect.value = item.zamanBloku;
        }
      }
      if (hungerInput && item.aclikDurumu) {
        hungerInput.value = item.aclikDurumu;
      }

      updateManualModalStockPreview(false);
      if (typeof updateModalLiveInteractionPreview === "function") {
        updateModalLiveInteractionPreview();
      }
    }

    function handleAddSupBarcodeDecoded(decodedText) {
      const cleanBarcode = String(decodedText || "").trim();
      if (!cleanBarcode) {
        showToast("Barkod Boş", "Lütfen geçerli bir EAN-13 barkod numarası veya ürün adı girin.", "warning");
        return;
      }

      const barcodeInput = document.getElementById("addSupBarcodeInput");
      if (barcodeInput) barcodeInput.value = cleanBarcode;

      const fallbackBox = document.getElementById("addSupFallbackConfirmBox");
      if (fallbackBox) fallbackBox.classList.add("hidden");

      // Kamera video akışı arkada açık kalmayacak şekilde temiz kapatılsın
      stopScanner();

      const digitsOnly = cleanBarcode.replace(/\D/g, "");
      const lowerQuery = cleanBarcode.toLocaleLowerCase("tr-TR");

      // 1. ÖNCE VITA_SUPPLEMENT_DB (Takviye Veri Tabanı) içerisinde barkod veya isimle ara
      const supDb = Array.isArray(window.VITA_SUPPLEMENT_DB) ? window.VITA_SUPPLEMENT_DB : [];
      const supFound = supDb.find(item =>
        item.barcode === cleanBarcode ||
        (digitsOnly.length >= 8 && item.barcode === digitsOnly) ||
        item.urunAdi.toLocaleLowerCase("tr-TR").includes(lowerQuery) ||
        item.marka.toLocaleLowerCase("tr-TR").includes(lowerQuery) ||
        item.etkenMadde.toLocaleLowerCase("tr-TR").includes(lowerQuery)
      );

      if (supFound) {
        fillAddSupplementModalFormFromItem(supFound);
        const msg = `Ürün Tanındı: ${supFound.urunAdi}`;
        showAddSupFeedback(`✅ ${msg} (${supFound.marka} • ${supFound.form} • ${supFound.dozaj} • ${supFound.kutuAdedi} Adet)`, "success");
        if (window.SoundEffects) SoundEffects.playSuccess();
        showToast(msg, `${supFound.marka} — ${supFound.etkenMadde} form alanlarına otomatik aktarıldı.`, "success");
        return;
      }

      // 2. VITA_PRESCRIPTION_DRUG_DB (Reçeteli İlaç) içerisinde mi kontrol et
      const rxDb = Array.isArray(window.VITA_PRESCRIPTION_DRUG_DB) ? window.VITA_PRESCRIPTION_DRUG_DB : [];
      const rxFound = rxDb.find(item =>
        item.barcode === cleanBarcode ||
        (digitsOnly.length >= 8 && item.barcode === digitsOnly) ||
        item.urunAdi.toLocaleLowerCase("tr-TR").includes(lowerQuery)
      );

      if (rxFound) {
        if (typeof window.registerPrescriptionDrugToShield === "function") {
          window.registerPrescriptionDrugToShield(rxFound, { openDrawer: true });
        }
        const depletionNotice = Array.isArray(rxFound.tuketilenBesinler) && rxFound.tuketilenBesinler.length > 0
          ? ` • Tüketilen Besinler: ${rxFound.tuketilenBesinler.join(", ")} (Tahlil Takibi Önerilir)`
          : "";
        showAddSupFeedback(
          `🛡️ Bu ürün reçeteli bir ilaçtır ve İlaç Kalkanına eklendi: ${rxFound.urunAdi} (${rxFound.etkenMadde} • ${rxFound.kategori}). Kural: ${rxFound.etkilesimKurali}${depletionNotice}`,
          "warning"
        );
        return;
      }

      // 3. İkisinde de yoksa: AI Kutu Tanıma Fallback
      showAddSupFeedback(`⚠️ Ürün veritabanında bulunamadı (${cleanBarcode}). Kutu fotoğrafını çekerek AI ile tanımak ister misiniz?`, "warning");
      if (fallbackBox) fallbackBox.classList.remove("hidden");
    }

    async function triggerGeminiBoxScan() {
      stopScanner();
      if (typeof window.ensureCameraPermissionForFeature === "function") {
        const hasPerm = await window.ensureCameraPermissionForFeature("ai_photo", {
          sourceModal: "addSupplementModal"
        });
        if (!hasPerm) {
          if (typeof window.updateCameraPermissionUI === "function") window.updateCameraPermissionUI();
          showAddSupFeedback(
            `🔒 Yapay zeka kutu fotoğraf analizi için kamera erişim onayı gereklidir. <button type="button" onclick="if(typeof openCameraPermissionsInSettings==='function')openCameraPermissionsInSettings();" class="underline font-black text-indigo-800 hover:text-indigo-950 ml-1 cursor-pointer">Ayarlar &gt; İzinler &gt; Kamera Erişim Onayı</button> menüsünden izni onaylayın.`,
            "warning",
            true
          );
          return;
        }
      }
      const fileInput = document.getElementById("addSupAiPhotoInput");
      if (fileInput) {
        fileInput.value = "";
        fileInput.click();
      }
    }

    function convertAddSupFileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = String(reader.result || "");
          const commaIdx = dataUrl.indexOf(",");
          resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
        };
        reader.onerror = () => reject(new Error("Görsel okunamadı."));
        reader.readAsDataURL(file);
      });
    }

    async function handleAddSupAiPhotoInput(event) {
      const file = event?.target?.files?.[0];
      if (!file) return;

      if (typeof window.ensureCameraPermissionForFeature === "function") {
        const hasPerm = await window.ensureCameraPermissionForFeature("ai_photo", {
          sourceModal: "addSupplementModal"
        });
        if (!hasPerm) {
          if (event?.target) event.target.value = "";
          showAddSupFeedback(
            `🔒 Kamera ve AI Fotoğraf Analizi izni kapalıdır. <button type="button" onclick="if(typeof openCameraPermissionsInSettings==='function')openCameraPermissionsInSettings();" class="underline font-black text-indigo-800 hover:text-indigo-950 ml-1 cursor-pointer">Ayarlar &gt; İzinler</button> menüsünden kamera erişimini onaylayın.`,
            "warning",
            true
          );
          return;
        }
      }

      const fallbackBox = document.getElementById("addSupFallbackConfirmBox");
      if (fallbackBox) fallbackBox.classList.add("hidden");

      showAddSupFeedback("⏳ Kutu fotoğrafı barkod ve Yapay Zeka (AI Vision + Yerel Klinik Motor) ile analiz ediliyor, lütfen bekleyin...", "info");

      try {
        // 1. Önce fotoğraftaki barkodu doğrudan okumayı dene (BarcodeDetector varsa)
        if ("BarcodeDetector" in window) {
          try {
            const bitmap = await createImageBitmap(file);
            const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "qr_code", "data_matrix"] });
            const codes = await detector.detect(bitmap);
            if (codes && codes.length > 0 && codes[0].rawValue) {
              handleAddSupBarcodeDecoded(codes[0].rawValue);
              return;
            }
          } catch (_) {}
        }

        const base64Data = await convertAddSupFileToBase64(file);
        const mimeType = file.type || "image/jpeg";
        const promptText = 'Bu ilaç veya takviye kutusu üzerindeki ürün adını, markasını, etken maddesini, farmasötik formunu (tablet, kapsül, saşe, damla vb.), birim dozajını (mg, mcg, IU) ve kutudaki toplam adet bilgisini şu JSON formatında çıkar: {"urunAdi": "", "marka": "", "etkenMadde": "", "form": "", "dozaj": "", "kutuAdedi": 30, "gunlukDoz": 1, "zamanBloku": "Sabah", "aclikDurumu": "Tok"}. Sadece saf JSON döndür.';

        let parsedJson = null;
        let usedLocalEngine = false;

        if (typeof window.callGeminiWithFallback === "function") {
          const aiResp = await window.callGeminiWithFallback(promptText, base64Data, mimeType, {
            expectBoxJson: true,
            fileName: file.name || "",
            mode: "supplement",
            showFallbackToast: true
          });
          usedLocalEngine = Boolean(aiResp.usedLocalFallback);
          const cleaned = String(aiResp.text || "").replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          const firstBrace = cleaned.indexOf("{");
          const lastBrace = cleaned.lastIndexOf("}");
          parsedJson = JSON.parse(firstBrace >= 0 && lastBrace > firstBrace ? cleaned.slice(firstBrace, lastBrace + 1) : cleaned);
        } else if (typeof window.LocalClinicalFallbackEngine === "function") {
          usedLocalEngine = true;
          parsedJson = JSON.parse(window.LocalClinicalFallbackEngine(promptText, base64Data, {
            expectBoxJson: true,
            fileName: file.name || "",
            mode: "supplement"
          }));
        }

        /* Cihazda fotoğraftan yazı okuma yoktur: eşleşme yoksa ürün uydurulmaz. */
        if (!parsedJson || !parsedJson.urunAdi) {
          throw new Error("Ürün fotoğraftan tanınamadı. Bu sürümde fotoğraftan yazı okuma yok ve fotoğraf hiçbir yere gönderilmez. Listeden seçin, barkodu okutun veya ürün adını elle yazın.");
        }

        fillAddSupplementModalFormFromItem({
          urunAdi: parsedJson.urunAdi || "",
          marka: parsedJson.marka || "",
          etkenMadde: parsedJson.etkenMadde || "",
          form: parsedJson.form || "",
          dozaj: parsedJson.dozaj || "",
          kutuAdedi: Number(parsedJson.kutuAdedi) > 0 ? Number(parsedJson.kutuAdedi) : 30,
          gunlukDoz: Number(parsedJson.gunlukDoz) > 0 ? Number(parsedJson.gunlukDoz) : 1,
          zamanBloku: parsedJson.zamanBloku || "Sabah",
          aclikDurumu: parsedJson.aclikDurumu || "Tok"
        });

        const recognizedTitle = parsedJson.urunAdi || "Kutu Bilgileri";
        const engineLabel = "Yerel ürün listesi eşleşmesi";
        showAddSupFeedback(`${engineLabel}: ${recognizedTitle} form alanlarına aktarıldı. Kutudaki bilgilerle karşılaştırıp doğrulayın.`, "success");
        if (window.SoundEffects) SoundEffects.playSuccess();
        showToast(`Eşleşme bulundu: ${recognizedTitle}`, "Bilgileri kutudaki etiketle karşılaştırıp doğrulayın.", "success");
      } catch (err) {
        showAddSupFeedback(`Kutu görseli işlenirken uyarı: ${err?.message || "Lütfen yukarıdaki 30 popüler takviye listesinden seçin veya ürün adını girin."}`, "warning");
      }
    }

    window.stopScanner = stopScanner;
    window.startAddSupModalScanner = startAddSupModalScanner;
    window.handleAddSupBarcodeDecoded = handleAddSupBarcodeDecoded;
    window.triggerGeminiBoxScan = triggerGeminiBoxScan;
    window.handleAddSupAiPhotoInput = handleAddSupAiPhotoInput;
    window.fillAddSupplementModalFormFromItem = fillAddSupplementModalFormFromItem;

    function openAddSupplementModal() {
      const modal = document.getElementById("addSupplementModal");
      if (!modal) return;
      modal.classList.remove("hidden");
      modal.style.display = "flex";
      stopScanner();
      populateAddSupQuickDbSelect();
      if (typeof window.updateCameraPermissionUI === "function") {
        window.updateCameraPermissionUI();
      }

      const barcodeInput = document.getElementById("addSupBarcodeInput");
      const feedbackBox = document.getElementById("addSupBarcodeFeedbackBox");
      const fallbackBox = document.getElementById("addSupFallbackConfirmBox");
      if (barcodeInput) barcodeInput.value = "";
      if (feedbackBox) { feedbackBox.classList.add("hidden"); feedbackBox.textContent = ""; }
      if (fallbackBox) fallbackBox.classList.add("hidden");

      const nameInput = document.getElementById("manualSupName");
      const brandActiveInput = document.getElementById("manualSupBrandActive");
      const formInput = document.getElementById("manualSupFormText");
      const doseInput = document.getElementById("manualSupDose");
      const hungerInput = document.getElementById("manualSupHungerNote");
      const timingSelect = document.getElementById("manualSupTiming");
      if (nameInput) nameInput.value = "";
      if (brandActiveInput) brandActiveInput.value = "";
      if (formInput) formInput.value = "";
      if (doseInput) doseInput.value = "";
      if (hungerInput) hungerInput.value = "";
      if (timingSelect) timingSelect.value = "Sabah";

      const boxInput = document.getElementById("manualSupBoxCount");
      const remInput = document.getElementById("manualSupRemainingCount");
      const dailyDoseInput = document.getElementById("manualSupDailyDose");
      if (boxInput) boxInput.value = "30";
      if (remInput) remInput.value = "30";
      if (dailyDoseInput) dailyDoseInput.value = "1";
      updateManualModalStockPreview(false);

      const catalogSelect = document.getElementById("modalCatalogSelect");
      if (catalogSelect) {
        catalogSelect.value = "custom";
        onCatalogSelectChange("custom");
      }
    }

    function closeAddSupplementModal() {
      stopScanner();
      const modal = document.getElementById("addSupplementModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
    }

    function onCatalogSelectChange(catalogKey) {
      const customNameBox = document.getElementById("modalCustomNameContainer");
      const formBox = document.getElementById("modalFormSelectorContainer");
      const customDoseBox = document.getElementById("modalCustomDoseContainer");
      const formSelect = document.getElementById("modalFormSelect");
      const quickPills = document.getElementById("modalFormQuickPills");

      if (customNameBox) customNameBox.classList.remove("hidden");
      if (customDoseBox) customDoseBox.classList.remove("hidden");

      if (catalogKey === "custom") {
        if (formBox) formBox.classList.add("hidden");
        if (typeof updateModalLiveInteractionPreview === "function") updateModalLiveInteractionPreview();
        return;
      }

      if (formBox) formBox.classList.remove("hidden");

      const cfg = FORM_DOSAGE_CONFIG[catalogKey];
      if (!cfg) return;

      const availableForms = Object.keys(cfg.forms);
      const defaultForm = cfg.defaultForm || availableForms[0];

      if (formSelect) {
        formSelect.innerHTML = availableForms.map(f => `<option value="${f}" ${f === defaultForm ? 'selected' : ''}>${f.replace('_', ' ')}</option>`).join('');
      }

      if (quickPills) {
        quickPills.innerHTML = availableForms.map(f => `
          <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); onModalFormOptionChange('${f}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
            f === defaultForm ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-700' : 'bg-white hover:bg-teal-100 text-teal-900 border border-teal-200'
          }">
            <span>${f.replace('_', ' ')}</span>
          </button>
        `).join('');
      }

      onModalFormOptionChange(defaultForm);
    }

    function onModalFormOptionChange(chosenForm) {
      const catalogKey = document.getElementById("modalCatalogSelect").value;
      const cfg = FORM_DOSAGE_CONFIG[catalogKey];
      if (!cfg) return;

      const formSelect = document.getElementById("modalFormSelect");
      if (formSelect) formSelect.value = chosenForm;

      const quickPills = document.getElementById("modalFormQuickPills");
      if (quickPills) {
        const availableForms = Object.keys(cfg.forms);
        quickPills.innerHTML = availableForms.map(f => `
          <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); onModalFormOptionChange('${f}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center gap-1 cursor-pointer ${
            f === chosenForm ? 'bg-teal-600 text-white shadow-sm ring-1 ring-teal-700' : 'bg-white hover:bg-teal-100 text-teal-900 border border-teal-200'
          }">
            <span>${f.replace('_', ' ')}</span>
          </button>
        `).join('');
      }

      const w = state.user ? state.user.weight : 70;
      const evaluated = cfg.forms[chosenForm](w);

      const dosePrev = document.getElementById("modalDosePreview");
      if (dosePrev) dosePrev.textContent = `${evaluated.doseText} (${evaluated.timing})`;
      const instPrev = document.getElementById("modalInstructionPreview");
      if (instPrev) instPrev.textContent = evaluated.instruction;

      const nameInput = document.getElementById("manualSupName");
      const formInput = document.getElementById("manualSupFormText");
      const doseInput = document.getElementById("manualSupDose");
      const timingSelect = document.getElementById("manualSupTiming");
      const hungerInput = document.getElementById("manualSupHungerNote");
      if (nameInput) nameInput.value = cfg.name;
      if (formInput) formInput.value = chosenForm.replace('_', ' ');
      if (doseInput) doseInput.value = evaluated.doseText;
      if (timingSelect && evaluated.timing) timingSelect.value = evaluated.timing;
      if (hungerInput && evaluated.instruction) hungerInput.value = evaluated.instruction;

      if (typeof updateModalLiveInteractionPreview === "function") updateModalLiveInteractionPreview();
    }

    function commitManualSupplement() {
      const catalogKey = document.getElementById("modalCatalogSelect").value;

      const nowDate = new Date();
      const todayIso = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}-${String(nowDate.getDate()).padStart(2, "0")}`;
      const toplamKutuAdedi = Math.max(1, parseInt(document.getElementById("manualSupBoxCount")?.value, 10) || 30);
      const kalanAdet = Math.max(0, parseInt(document.getElementById("manualSupRemainingCount")?.value, 10) ?? toplamKutuAdedi);
      const gunlukDoz = Math.max(1, parseInt(document.getElementById("manualSupDailyDose")?.value, 10) || 1);

      if (catalogKey === "custom") {
        const name = (document.getElementById("manualSupName")?.value || "").trim();
        const brandActive = (document.getElementById("manualSupBrandActive")?.value || "").trim();
        const timing = document.getElementById("manualSupTiming")?.value || "Sabah";
        const dose = (document.getElementById("manualSupDose")?.value || "").trim() || "Etiket / hekim planındaki miktarı girin";
        const customForm = (document.getElementById("manualSupFormText")?.value || "").trim() || null;
        const hungerNote = (document.getElementById("manualSupHungerNote")?.value || "").trim();
        const barcodeVal = (document.getElementById("addSupBarcodeInput")?.value || "").trim() || null;

        if (!name) { showToast("Eksik Ad", "Lütfen ürün adını giriniz veya barkod okutunuz.", "warning"); return; }

        const subParts = [customForm, brandActive].filter(Boolean);
        const instructionText = [
          hungerNote ? `Açlık/Tokluk & Emilim: ${hungerNote}.` : "",
          brandActive ? `İçerik: ${brandActive}.` : "",
          "Hekiminizin belirttiği talimatlara uygun alınız."
        ].filter(Boolean).join(" ");

        state.supplements.push({
          id: `sup_man_${Date.now()}`,
          name,
          barcode: barcodeVal,
          markaEtken: brandActive || null,
          formKey: null,
          selectedForm: customForm,
          timing,
          doseText: hungerNote ? `${dose} • ${hungerNote}` : dose,
          aclikDurumu: hungerNote || null,
          toplamKutuAdedi,
          kalanAdet,
          gunlukDoz,
          subText: subParts.length ? subParts.join(" · ") : "Hekim Tavsiyeli Tanımlama",
          instruction: instructionText,
          addedDate: Date.now(),
          taken: false,
          scheduleDays: [1, 2, 3, 4, 5, 6, 0],
          scheduledDate: todayIso
        });
      } else {
        const cfg = FORM_DOSAGE_CONFIG[catalogKey];
        const chosenForm = document.getElementById("modalFormSelect").value;
        const scheduleDays = [1, 2, 3, 4, 5, 6, 0];
        const w = state.user ? state.user.weight : 70;
        const evaluated = cfg.forms[chosenForm](w);

        const existing = state.supplements.find(s => s.formKey === catalogKey);
        if (existing) {
          existing.selectedForm = chosenForm;
          existing.doseText = evaluated.doseText;
          existing.subText = evaluated.subText;
          existing.timing = evaluated.timing;
          existing.instruction = evaluated.instruction;
          existing.toplamKutuAdedi = toplamKutuAdedi;
          existing.kalanAdet = kalanAdet;
          existing.gunlukDoz = gunlukDoz;
          existing.scheduledDate = todayIso;
        } else {
          state.supplements.push({
            id: `sup_cat_${Date.now()}`,
            name: cfg.name, formKey: catalogKey, selectedForm: chosenForm,
            timing: evaluated.timing, doseText: evaluated.doseText,
            toplamKutuAdedi, kalanAdet, gunlukDoz,
            subText: evaluated.subText, instruction: evaluated.instruction,
            addedDate: Date.now(), taken: false, scheduleDays, scheduledDate: todayIso
          });
        }
      }

      saveState();
      closeAddSupplementModal();
      renderDailyTab();
      checkPendingSymptomReviews();
      detectSupplementConflicts();
      showToast("Takviye Eklendi", "Takip listenize ve kutu stok sayacına kaydedildi.", "success");
    }
/* CDSS DEMOGRAFİ VE CANLI ÖZET SENKRONİZASYONU */
    function syncCDSSDemographics() {
      if (!state.user) return;
      const p = state.user;

      const patientBadge = document.getElementById("neyimPatientBadge");
      if (patientBadge) patientBadge.textContent = p.name || "Kullanıcı";
      const ageBadge = document.getElementById("neyimAgeBadge");
      if (ageBadge) ageBadge.innerHTML = `<i class="fa-solid fa-cake-candles text-amber-400 mr-1"></i> Yaş: <strong>${escapeHtmlText(p.age)}</strong>`;
      const weightBadge = document.getElementById("neyimWeightBadge");
      if (weightBadge) weightBadge.innerHTML = `<i class="fa-solid fa-weight-scale text-emerald-400 mr-1"></i> Kilo: <strong>${escapeHtmlText(p.weight)} kg</strong>`;
      const bmiBadge = document.getElementById("neyimBmiBadge");
      if (bmiBadge) bmiBadge.innerHTML = `<i class="fa-solid fa-calculator text-sky-400 mr-1"></i> VKİ: <strong>${escapeHtmlText(p.bmi)}</strong>`;
      const genderBadge = document.getElementById("neyimGenderBadge");
      if (genderBadge) genderBadge.innerHTML = `<i class="fa-solid fa-venus-mars text-rose-400 mr-1"></i> Cinsiyet: <strong>${p.gender === 'E' ? 'Erkek' : 'Kadın'}</strong>`;

      const actBadge = document.getElementById("neyimAutoActivityBadge");
      const profSum = document.getElementById("neyimAutoProfileSummary");
      let activityText = p.activity === "fitness" ? "Fitness / Ağırlık" : (p.activity === "moderate" ? "Orta Düzey" : "Masa Başı");

      if (actBadge) actBadge.textContent = activityText;
      if (profSum) {
        profSum.innerHTML = `
          <p><strong>Biyolojik Durum:</strong> ${escapeHtmlText(p.age)} Yaş, ${escapeHtmlText(p.weight)} kg (VKİ: ${escapeHtmlText(p.bmi)})</p>
          <p><strong>Kayıtlı İlaçlar / Kronik:</strong> ${escapeHtmlText(p.chronic && p.chronic.length ? p.chronic.join(', ') : 'Bilinen yok')}</p>
        `;
      }

      const labDateBadge = document.getElementById("neyimAutoLabDateBadge");
      const labSum = document.getElementById("neyimAutoLabSummary");
      const latestSaved = (state.labHistory && state.labHistory.length > 0) ? state.labHistory[0] : null;
      const labs = state.labValues || {};

      const filledLabs = [];
      if (labs.d3 !== null && labs.d3 !== undefined) filledLabs.push(`D3: ${labs.d3}`);
      if (labs.b12 !== null && labs.b12 !== undefined) filledLabs.push(`B12: ${labs.b12}`);
      if (labs.ferritin !== null && labs.ferritin !== undefined) filledLabs.push(`Ferritin: ${labs.ferritin}`);
      if (labs.mg !== null && labs.mg !== undefined) filledLabs.push(`Mg: ${labs.mg}`);
      if (labs.ca !== null && labs.ca !== undefined) filledLabs.push(`Ca: ${labs.ca}`);
      if (labs.zinc !== null && labs.zinc !== undefined) filledLabs.push(`Çinko: ${labs.zinc}`);
      if (labs.creatinine !== null && labs.creatinine !== undefined) filledLabs.push(`Kreatinin: ${labs.creatinine}`);
      if (labs.folate !== null && labs.folate !== undefined) filledLabs.push(`Folat: ${labs.folate}`);
      if (labs.alt !== null && labs.alt !== undefined) filledLabs.push(`ALT: ${labs.alt}`);
      if (labs.hb !== null && labs.hb !== undefined) filledLabs.push(`Hb: ${labs.hb}`);
      if (labs.mcv !== null && labs.mcv !== undefined) filledLabs.push(`MCV: ${labs.mcv}`);
      if (labs.crp !== null && labs.crp !== undefined) filledLabs.push(`CRP: ${labs.crp}`);

      if (filledLabs.length > 0) {
        if (labDateBadge) labDateBadge.textContent = latestSaved ? `Son Tahlil: ${latestSaved.date}` : "Güncel Kayıt";
        if (labSum) labSum.innerHTML = `<p class="font-mono text-xs text-navy-900">${filledLabs.map(escapeHtmlText).join(' • ')}</p>`;
      } else {
        if (labDateBadge) labDateBadge.textContent = "Tahlil Yok";
        if (labSum) labSum.innerHTML = `<p class="italic text-slate-400">Henüz tahlil girilmedi - Semptom bazlı ön triyaj yapılacak</p>`;
      }


    }

    const VITATAKIP_LAB_DRAFT_FIELDS = [
      ["inputLabD3", "d3"], ["inputLabB12", "b12"], ["inputLabFerritin", "ferritin"],
      ["inputLabMg", "mg"], ["inputLabCalcium", "ca"], ["inputLabZinc", "zinc"],
      ["inputLabCreatinine", "creatinine"], ["inputLabFolate", "folate"], ["inputLabAlt", "alt"],
      ["inputLabHb", "hb"], ["inputLabMcv", "mcv"], ["inputLabCrp", "crp"]
    ];
    // Kullanıcının elle boşalttığı tahlil alanları: boşaltılan alanın kayıttan da silinmesi için izlenir.
    const labFieldTouched = new Set();
    document.addEventListener("input", function (e) {
      const id = e.target && e.target.id;
      if (!id || !VITATAKIP_LAB_DRAFT_FIELDS.some(([fieldId]) => fieldId === id)) return;
      // Yalnızca "son kullanıcı olayı alanı boş bıraktı" ise silme niyeti sayılır; programatik temizlik olay üretmez.
      if (String(e.target.value || "").trim() === "") labFieldTouched.add(id); else labFieldTouched.delete(id);
    });
    const VITA_LAB_REFERENCE_FIELDS = [
      ["inputLabRef-d3", "d3"], ["inputLabRef-b12", "b12"], ["inputLabRef-ferritin", "ferritin"],
      ["inputLabRef-mg", "mg"], ["inputLabRef-ca", "ca"], ["inputLabRef-zinc", "zinc"],
      ["inputLabRef-creatinine", "creatinine"], ["inputLabRef-folate", "folate"], ["inputLabRef-alt", "alt"],
      ["inputLabRef-hb", "hb"], ["inputLabRef-mcv", "mcv"], ["inputLabRef-crp", "crp"]
    ];

    function saveLabDraft() {
      if (!activeUserId) return;
      const values = {};
      let hasValue = false;
      VITATAKIP_LAB_DRAFT_FIELDS.forEach(([id, key]) => {
        const input = document.getElementById(id);
        const value = input ? input.value : "";
        values[key] = value;
        if (String(value).trim() !== "") hasValue = true;
      });
      const references = {};
      VITA_LAB_REFERENCE_FIELDS.forEach(([id, key]) => {
        const input = document.getElementById(id);
        const value = input ? String(input.value || "") : "";
        references[key] = value;
        if (value.trim()) hasValue = true;
      });
      const dateInput = document.getElementById("inputLabDate");
      try {
        const key = `vitatakip_labdraft_${activeUserId}`;
        if (!hasValue) {
          safeLocalStorageRemoveItem(key);
          return;
        }
        safeLocalStorageSetItem(key, JSON.stringify({ values, references, date: dateInput ? dateInput.value : "", savedAt: Date.now() }));
      } catch (e) {
        console.warn("Tahlil taslağı tarayıcı belleğine kaydedilemedi.", e);
      }
    }

    function restoreLabDraft() {
      if (!activeUserId) return;
      let draft = null;
      try { draft = JSON.parse(safeLocalStorageGetItem(`vitatakip_labdraft_${activeUserId}`) || "null"); }
      catch (e) { draft = null; }
      if (!draft || !draft.values) return;
      VITATAKIP_LAB_DRAFT_FIELDS.forEach(([id, key]) => {
        const input = document.getElementById(id);
        if (input && (input.value === "" || input.value === null) && draft.values[key] !== undefined) {
          input.value = draft.values[key] === null ? "" : String(draft.values[key]);
        }
      });
      VITA_LAB_REFERENCE_FIELDS.forEach(([id, key]) => {
        const input = document.getElementById(id);
        const value = draft.references?.[key];
        if (input && input.value.trim() === "" && value !== undefined && String(value).trim() !== "") input.value = String(value);
        if (value !== undefined && String(value).trim()) state.labReferences[key] = String(value).trim();
      });
      const dateInput = document.getElementById("inputLabDate");
      if (dateInput && draft.date) dateInput.value = draft.date;
      // Taslak değerleri DOM'a programatik yazıldığında input olayı tetiklenmez; renkli geri bildirimi yenile.
      if (Array.isArray(VITA_LAB_INPUTS)) VITA_LAB_INPUTS.forEach(([inputId, key]) => updateVitaLabLiveFeedback(inputId, key));
    }

    function clearLabDraft() {
      if (!activeUserId) return;
      labFieldTouched.clear();
      try { safeLocalStorageRemoveItem(`vitatakip_labdraft_${activeUserId}`); } catch (e) {}
    }

    function getParsedLabInput(inputId) {
      const el = document.getElementById(inputId);
      if (!el || String(el.value ?? "").trim() === "") return null;
      return parseVitaLabDecimal(el.value);
    }

    let pendingLabRecordConflict = null;

    function saveCurrentLabRecordWithDate() {
      const dateInput = document.getElementById("inputLabDate");
      const dateVal = (dateInput && dateInput.value) || vitaLocalToday();
      if (dateVal > vitaLocalToday()) {
        showToast("Tarihi kontrol edin", "Tahlil tarihi bugünden sonra olamaz.", "warning");
        return;
      }
      const values = {
        d3: getParsedLabInput("inputLabD3"),
        b12: getParsedLabInput("inputLabB12"),
        ferritin: getParsedLabInput("inputLabFerritin"),
        mg: getParsedLabInput("inputLabMg"),
        ca: getParsedLabInput("inputLabCalcium"),
        zinc: getParsedLabInput("inputLabZinc"),
        creatinine: getParsedLabInput("inputLabCreatinine"),
        folate: getParsedLabInput("inputLabFolate"),
        alt: getParsedLabInput("inputLabAlt"),
        hb: getParsedLabInput("inputLabHb"),
        mcv: getParsedLabInput("inputLabMcv"),
        crp: getParsedLabInput("inputLabCrp")
      };
      if (Object.values(values).every(value => value === null)) {
        showToast("Boş Sonuç", "Lütfen en az bir tahlil değeri giriniz.", "warning");
        return;
      }
      /* Yazım/birim hatası: fizyolojik olarak mümkün olmayan değerler kaydedilmez (negatif, sıfır, aşırı büyük). */
      const implausible = Object.entries(values).filter(([key, value]) => typeof isVitaLabValuePlausible === "function" && !isVitaLabValuePlausible(key, value));
      if (implausible.length) {
        const labelOf = key => (VITA_LAB_APP_REFERENCE_META[key] && VITA_LAB_APP_REFERENCE_META[key].name) || key;
        const detail = implausible.map(([key, value]) => {
          const range = (window.VITA_LAB_PLAUSIBLE_RANGES || {})[key];
          return `${labelOf(key)}: ${value}${range ? ` (beklenen ${range[0]}–${range[1]} ${range[2]})` : ""}`;
        }).join("; ");
        showToast("Değeri kontrol edin", `Şu değer(ler) ölçülebilir aralığın dışında; birim veya yazım hatası olabilir: ${detail}`, "warning");
        return;
      }

      const recordReferences = {};
      VITA_LAB_REFERENCE_FIELDS.forEach(([id, key]) => {
        const entered = String(document.getElementById(id)?.value || "").trim();
        if (entered) recordReferences[key] = entered;
      });
      const genderAtTest = state.user?.gender || "K";
      const record = {
        id: `lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: dateVal,
        ...values,
        references: recordReferences,
        applicationReferences: getVitaAppLabReferenceMap(genderAtTest),
        genderAtTest,
        timestamp: new Date(`${dateVal}T${new Date().toTimeString().slice(0, 8)}`).getTime() || Date.now(),
        timeLabel: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      const existing = state.labHistory.find(item => item.date === dateVal);
      if (existing) {
        pendingLabRecordConflict = record;
        const modal = document.getElementById("labDateConflictModal");
        const existingLabel = document.getElementById("labConflictExistingSummary");
        if (existingLabel) existingLabel.textContent = `${dateVal}${existing.timeLabel ? ` · ${existing.timeLabel}` : ""} tarihli kayıt zaten var. Ne yapmak istersiniz?`;
        if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
        else {
          const choice = window.confirm("Bu tarihte tahlil kaydı zaten var. Tamam: üzerine yaz; İptal: yeni saat olarak ekle.");
          resolveLabDateConflict(choice ? "update" : "add");
        }
        return;
      }
      commitLabRecord(record, "new");
    }

    function resolveLabDateConflict(action) {
      const modal = document.getElementById("labDateConflictModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
      if (!pendingLabRecordConflict) return;
      const incoming = pendingLabRecordConflict;
      pendingLabRecordConflict = null;
      if (action === "cancel") return;
      commitLabRecord(incoming, action === "update" ? "update" : "add");
    }

    function commitLabRecord(record, mode) {
      const cleanRecord = typeof safeStructuredClone === "function" ? safeStructuredClone(record) : { ...record };
      if (mode === "update") {
        const existingIndex = state.labHistory.findIndex(item => item.date === cleanRecord.date);
        if (existingIndex >= 0) {
          cleanRecord.id = state.labHistory[existingIndex].id;
          state.labHistory[existingIndex] = cleanRecord;
        } else state.labHistory.push(cleanRecord);
      } else {
        if (mode === "add") {
          cleanRecord.id = `lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          cleanRecord.timeLabel = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
          cleanRecord.timestamp = new Date(`${cleanRecord.date}T${new Date().toTimeString().slice(0, 8)}`).getTime() || Date.now();
        }
        state.labHistory.push(cleanRecord);
      }
      state.labHistory.sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
      state.labValues = typeof buildLabValuesFromRecord === "function"
        ? buildLabValuesFromRecord(state.labHistory[0] || cleanRecord)
        : { d3: cleanRecord.d3, b12: cleanRecord.b12, ferritin: cleanRecord.ferritin, iron: cleanRecord.iron ?? null, tsat: cleanRecord.tsat ?? null, mg: cleanRecord.mg, ca: cleanRecord.ca, zinc: cleanRecord.zinc, creatinine: cleanRecord.creatinine, folate: cleanRecord.folate, alt: cleanRecord.alt, hb: cleanRecord.hb ?? null, hgb: cleanRecord.hb ?? null, mcv: cleanRecord.mcv ?? null, crp: cleanRecord.crp ?? null };
      state.labReferences = typeof safeStructuredClone === "function"
        ? safeStructuredClone((state.labHistory[0] || cleanRecord).references || {})
        : { ...((state.labHistory[0] || cleanRecord).references || {}) };

      if (typeof invalidateClinicalAnalysisCache === "function") {
        invalidateClinicalAnalysisCache({ clearDOM: true });
      }
      clearLabDraft();
      VITATAKIP_LAB_DRAFT_FIELDS.forEach(([id]) => {
        const input = document.getElementById(id);
        if (input) input.value = "";
      });
      VITA_LAB_REFERENCE_FIELDS.forEach(([id]) => {
        const input = document.getElementById(id);
        if (input) input.value = "";
      });
      if (Array.isArray(VITA_LAB_INPUTS)) VITA_LAB_INPUTS.forEach(([inputId, key]) => updateVitaLabLiveFeedback(inputId, key));

      saveState();
      syncCDSSDemographics();
      if (typeof executeCDSSRules === "function") {
        executeCDSSRules();
      }
      renderLabHistoryUI();
      renderBiomarkerTrendChart();
      evaluateTrendAndDecisionSupport(true);
      checkDeprescribingOpportunities();
      renderDailyTab();
      renderReportTab();
      if (typeof renderSettingsView === "function") renderSettingsView();
      const rangeModal = document.getElementById("vitaLabRangesModal");
      if (rangeModal) rangeModal.classList.remove("is-open");
      const label = mode === "update" ? "Tahlil Güncellendi" : mode === "add" ? "Aynı Tarihe Yeni Kayıt Eklendi" : "Tahlil Kaydedildi";
      showToast(label, `${cleanRecord.date}${cleanRecord.timeLabel ? ` ${cleanRecord.timeLabel}` : ""} tarihli tahlil arşive kaydedildi.`, "success");
    }

    function persistCurrentLabInputsToState(options = {}) {
      const dateInput = document.getElementById("inputLabDate");
      const dateVal = (dateInput && dateInput.value) || vitaLocalToday();
      const enteredValues = {
        d3: getParsedLabInput("inputLabD3"),
        b12: getParsedLabInput("inputLabB12"),
        ferritin: getParsedLabInput("inputLabFerritin"),
        mg: getParsedLabInput("inputLabMg"),
        ca: getParsedLabInput("inputLabCalcium"),
        zinc: getParsedLabInput("inputLabZinc"),
        creatinine: getParsedLabInput("inputLabCreatinine"),
        folate: getParsedLabInput("inputLabFolate"),
        alt: getParsedLabInput("inputLabAlt"),
        hb: getParsedLabInput("inputLabHb"),
        mcv: getParsedLabInput("inputLabMcv"),
        crp: getParsedLabInput("inputLabCrp")
      };
      const hasAnyEnteredValue = Object.values(enteredValues).some(v => v !== null && v !== undefined && Number.isFinite(v));

      const enteredRefs = {};
      VITA_LAB_REFERENCE_FIELDS.forEach(([id, key]) => {
        const entered = String(document.getElementById(id)?.value || "").trim();
        if (entered) enteredRefs[key] = entered;
      });

      if (!Array.isArray(state.labHistory)) {
        state.labHistory = [];
      }

      // Kullanıcı bir alana yazıp sonra bilerek boşalttıysa bu "silme" niyetidir: değer kayıttan da kazınır.
      const existingForDate = state.labHistory.findIndex(item => item && item.date === dateVal);
      const clearedKeys = VITATAKIP_LAB_DRAFT_FIELDS
        .filter(([id, key]) => labFieldTouched.has(id) && enteredValues[key] === null)
        .map(([, key]) => key);
      const applyEdit = hasAnyEnteredValue || (clearedKeys.length > 0 && existingForDate >= 0);

      if (applyEdit) {
        if (typeof invalidateClinicalAnalysisCache === "function") {
          invalidateClinicalAnalysisCache({ clearDOM: false });
        }
        const genderAtTest = state.user?.gender || "K";
        const existingIndex = existingForDate;
        const baseRecord = existingIndex >= 0 ? state.labHistory[existingIndex] : null;
        const pickLabValue = key => enteredValues[key] !== null
          ? enteredValues[key]
          : (clearedKeys.includes(key) ? null : (baseRecord?.[key] ?? null));
        const mergedRecord = {
          id: baseRecord?.id || `lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          date: dateVal,
          d3: pickLabValue("d3"),
          b12: pickLabValue("b12"),
          ferritin: pickLabValue("ferritin"),
          mg: pickLabValue("mg"),
          ca: pickLabValue("ca"),
          zinc: pickLabValue("zinc"),
          creatinine: pickLabValue("creatinine"),
          folate: pickLabValue("folate"),
          alt: pickLabValue("alt"),
          hb: pickLabValue("hb"),
          mcv: pickLabValue("mcv"),
          crp: pickLabValue("crp"),
          references: { ...(baseRecord?.references || {}), ...enteredRefs },
          applicationReferences: typeof getVitaAppLabReferenceMap === "function" ? getVitaAppLabReferenceMap(genderAtTest) : {},
          genderAtTest,
          timestamp: baseRecord?.timestamp || new Date(`${dateVal}T${new Date().toTimeString().slice(0, 8)}`).getTime() || Date.now(),
          timeLabel: baseRecord?.timeLabel || new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
        };

        // Tüm değerleri boşalan kayıt arşivde tutulmaz (tam temizlik).
        const recordIsEmpty = ["d3", "b12", "ferritin", "mg", "ca", "zinc", "creatinine", "folate", "alt", "hb", "mcv", "crp"]
          .every(k => mergedRecord[k] === null || mergedRecord[k] === undefined);
        if (recordIsEmpty) {
          if (existingIndex >= 0) state.labHistory.splice(existingIndex, 1);
        } else if (existingIndex >= 0) {
          state.labHistory[existingIndex] = mergedRecord;
        } else {
          state.labHistory.push(mergedRecord);
        }
        labFieldTouched.clear();
        state.labHistory.sort((a, b) => Number(b.timestamp || new Date(b.date || 0).getTime() || 0) - Number(a.timestamp || new Date(a.date || 0).getTime() || 0));
        if (state.labHistory.length === 0) {
          state.labValues = typeof createEmptyLabValuesState === "function" ? createEmptyLabValuesState() : {};
          try {
            if (activeUserId) {
              ["labs", "labreferences", "labhistory", "labdraft"].forEach(k => safeLocalStorageRemoveItem(`vitatakip_${k}_${activeUserId}`));
            }
            safeLocalStorageRemoveItem("currentLabResults");
            safeLocalStorageRemoveItem("labArchiveHistory");
          } catch (_) {}
        } else
        state.labValues = typeof buildLabValuesFromRecord === "function"
          ? buildLabValuesFromRecord(state.labHistory[0] || mergedRecord)
          : { ...enteredValues };
        state.labReferences = typeof safeStructuredClone === "function"
          ? safeStructuredClone((state.labHistory[0] || mergedRecord).references || {})
          : { ...((state.labHistory[0] || mergedRecord).references || {}) };
        saveLabDraft();
      } else {
        clearLabDraft();
        if (state.labHistory.length > 0) {
          state.labValues = typeof buildLabValuesFromRecord === "function"
            ? buildLabValuesFromRecord(state.labHistory[0])
            : { ...state.labHistory[0] };
          state.labReferences = typeof safeStructuredClone === "function"
            ? safeStructuredClone(state.labHistory[0].references || {})
            : { ...(state.labHistory[0].references || {}) };
        } else {
          state.labValues = typeof createEmptyLabValuesState === "function"
            ? createEmptyLabValuesState()
            : { d3: null, b12: null, ferritin: null, iron: null, tsat: null, mg: null, ca: null, zinc: null, creatinine: null, folate: null, alt: null, hb: null, hgb: null, rbc: null, hct: null, mcv: null, crp: null, hba1c: null, tsh: null, ft4: null };
          state.labReferences = typeof createEmptyLabReferencesState === "function" ? createEmptyLabReferencesState() : {};
        }
      }

      if (typeof saveState === "function") {
        saveState();
      }
      if (typeof syncCDSSDemographics === "function") {
        syncCDSSDemographics();
      }
      if (!options.silentUI) {
        renderLabHistoryUI();
        renderBiomarkerTrendChart();
      } else if (window.VitaRechartsDashboard && typeof window.VitaRechartsDashboard.renderAll === "function") {
        window.VitaRechartsDashboard.renderAll();
      }
      return { hasAnyEnteredValue, values: typeof safeStructuredClone === "function" ? safeStructuredClone(state.labValues) : { ...state.labValues }, labHistoryCount: Array.isArray(state.labHistory) ? state.labHistory.length : 0 };
    }

    function proceedFromLabsToNeyim() {
      persistCurrentLabInputsToState({ silentUI: true });
      if (typeof navigateToView === "function") {
        navigateToView("view-neyim");
      }
      window.scrollTo(0, 0);
    }

    window.persistCurrentLabInputsToState = persistCurrentLabInputsToState;
    window.proceedFromLabsToNeyim = proceedFromLabsToNeyim;

    let labHistoryFilterMode = "all";
    let labHistoryRestorePending = false;
    let labHistoryShowAll = false;

    function setLabHistoryFilter(mode) {
      labHistoryFilterMode = ["all", "normal", "out"].includes(mode) ? mode : "all";
      labHistoryShowAll = false;
      renderLabHistoryUI();
    }

    function toggleLabHistoryShowAll() {
      labHistoryShowAll = !labHistoryShowAll;
      renderLabHistoryUI();
    }

    function toggleLabHistoryRecord(detailsId, toggle) {
      const details = document.getElementById(detailsId);
      if (!details || !toggle) return;
      const isOpening = details.classList.contains("hidden");
      details.classList.toggle("hidden", !isOpening);
      toggle.setAttribute("aria-expanded", isOpening ? "true" : "false");
      const icon = toggle.querySelector("[data-lab-record-chevron]");
      if (icon) {
        icon.classList.toggle("fa-chevron-down", !isOpening);
        icon.classList.toggle("fa-chevron-up", isOpening);
      }
    }

    function parseLabReferenceRange(reference) {
      const text = String(reference || "").trim().replace(/[–—−]/g, "-").replace(/,/g, ".");
      if (!text) return null;
      const nums = text.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) || [];
      if ((/<=|≤|<|less than|under/i.test(text)) && nums.length === 1) return { min: null, max: nums[0], comparator: "lt" };
      if ((/>=|≥|>|greater than|over/i.test(text)) && nums.length === 1) return { min: nums[0], max: null, comparator: "gt" };
      if (nums.length === 2 && /-|to|ile|arası|arasi/i.test(text)) return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]), comparator: "range" };
      return null;
    }

    function getProvidedLabRangeStatus(value, reference, key) {
      if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return null;
      if (key && !isVitaLabReferenceCompatible(key, reference)) return null;
      const range = parseLabReferenceRange(reference);
      if (!range) return null;
      const num = Number(value);
      if (range.comparator === "lt") return num <= range.max ? "within" : "outside";
      if (range.comparator === "gt") return num >= range.min ? "within" : "outside";
      return num < range.min || num > range.max ? "outside" : "within";
    }

    function getProvidedLabRangeBadge(value, reference, key) {
      const status = getProvidedLabRangeStatus(value, reference, key);
      if (!status) return "";
      const label = status === "within" ? "Lab/PDF aralığında" : "Lab/PDF aralığı dışında";
      const classes = status === "within" ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-300 bg-amber-50 text-amber-900";
      return `<span class="inline-flex rounded-lg border ${classes} px-1.5 py-0.5 text-[9px] font-bold" title="Girilen laboratuvar referans aralığıyla sayısal karşılaştırma; tanı değildir">${label}</span>`;
    }

    function parseLabNumericValue(value) {
      if (value === null || value === undefined || value === "") return null;
      const normalized = String(value).trim().replace(",", ".");
      const match = normalized.match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/);
      if (!match) return null;
      const parsed = Number(match[0]);
      return Number.isFinite(parsed) ? parsed : null;
    }

    const LAB_HISTORY_METRICS = [
      { key: "d3", label: "D vitamini (25-OH)", unit: "ng/mL" },
      { key: "b12", label: "B12 vitamini", unit: "pg/mL" },
      { key: "ferritin", label: "Ferritin", unit: "ng/mL" },
      { key: "mg", label: "Magnezyum", unit: "mg/dL" },
      { key: "ca", label: "Kalsiyum", unit: "mg/dL" },
      { key: "zinc", label: "Çinko", unit: "µg/dL" },
      { key: "creatinine", label: "Kreatinin", unit: "mg/dL" },
      { key: "folate", label: "Folat (B9)", unit: "ng/mL" },
      { key: "alt", label: "ALT", unit: "U/L" },
      { key: "hb", label: "Hemoglobin", unit: "g/dL" },
      { key: "mcv", label: "MCV", unit: "fL" },
      { key: "crp", label: "CRP", unit: "mg/L" }
    ];

    function getLabHistoryMetric(record, metric) {
      const rawValue = record?.[metric.key];
      const numericValue = parseLabNumericValue(rawValue);
      if (numericValue === null) return null;

      const facilityReference = String(record?.references?.[metric.key] || "").trim();
      const facilityStatus = facilityReference
        ? getProvidedLabRangeStatus(numericValue, facilityReference, metric.key)
        : null;
      const reference = facilityStatus
        ? facilityReference
        : String(record?.applicationReferences?.[metric.key] || getVitaAppLabReference(metric.key, record?.genderAtTest || state.user?.gender || "K"));
      const status = facilityStatus || getProvidedLabRangeStatus(numericValue, reference, metric.key);
      return {
        ...metric,
        value: rawValue,
        status,
        reference,
        referenceSource: facilityStatus ? "lab" : "app"
      };
    }

    function labRecordExceedsHepaticSafety(record) {
      const value = parseLabNumericValue(record?.alt);
      return value !== null && value > 50;
    }

    function labRecordHasPortalOutOfRange(record) {
      return LAB_HISTORY_METRICS.some(metric => getLabHistoryMetric(record, metric)?.status === "outside");
    }

    function updateLabHistoryFilterButtons() {
      const definitions = [
        ["all", "labHistoryFilterAll"], ["normal", "labHistoryFilterNormal"], ["out", "labHistoryFilterOut"]
      ];
      definitions.forEach(([mode, id]) => {
        const button = document.getElementById(id);
        if (!button) return;
        const active = labHistoryFilterMode === mode;
        button.className = active
          ? "min-h-9 rounded-xl border border-teal-300 bg-teal-50 px-3 py-2 text-[11px] font-bold text-teal-900"
          : "min-h-9 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold text-slate-600 hover:bg-slate-50";
        button.setAttribute("aria-pressed", active ? "true" : "false");
      });
    }

    function renderLabHistoryUI() {
      const displayLocale = "tr-TR";
      const container = document.getElementById("labHistoryListContainer");
      const badge = document.getElementById("labHistoryCountBadge");
      const showAllButton = document.getElementById("labHistoryShowAllButton");
      const showAllWrap = document.getElementById("labHistoryShowAllWrap");
      const dateFilter = document.getElementById("labHistoryDateFilter");
      if (!container) return;
      updateLabHistoryFilterButtons();

      if (badge) badge.textContent = `${state.labHistory.length} Tahlil${labHistoryRestorePending ? " · Eşitleniyor" : " Kayıtlı"}`;
      const selectedDate = dateFilter?.value || "all";
      if (dateFilter) {
        const dates = [...new Set(state.labHistory.map(item => item.date).filter(Boolean))]
          .sort((a, b) => b.localeCompare(a));
        if (selectedDate !== "all" && !dates.includes(selectedDate)) dateFilter.value = "all";
        const activeDate = dates.includes(selectedDate) ? selectedDate : "all";
        dateFilter.innerHTML = `<option value="all">Tüm tarihler</option>${dates.map(date => {
          const parsedDate = new Date(`${date}T00:00:00`);
          const label = Number.isNaN(parsedDate.getTime()) ? date : parsedDate.toLocaleDateString(displayLocale, { day: "numeric", month: "long", year: "numeric" });
          return `<option value="${escapeHtmlText(date)}">${escapeHtmlText(label)}</option>`;
        }).join("")}`;
        dateFilter.value = activeDate;
      }
      if (showAllButton) {
        showAllButton.classList.add("hidden");
        showAllButton.classList.remove("inline-flex");
        showAllButton.setAttribute("aria-expanded", "false");
      }
      if (showAllWrap) showAllWrap.classList.add("hidden");
      if (!labHistoryShowAll) {
        container.classList.add("max-h-72", "overflow-y-auto");
      }

      if (state.labHistory.length === 0) {
        labHistoryShowAll = false;
        const pendingCopy = labHistoryRestorePending ? `<p class="mt-1 text-xs font-semibold text-teal-700" role="status">Yerel arşiv kontrol ediliyor; kayıtlar birazdan güncellenecek.</p>` : "";
        container.innerHTML = `<div class="m-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center vita-feedback-enter"><div class="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-50 text-teal-700"><i class="fa-solid fa-flask-vial text-lg"></i></div><p class="text-sm font-bold text-slate-700">Henüz kayıtlı tahlil yok</p><p class="mt-1 text-xs text-slate-500">Tarih seçip kan tahlili değerlerinizi girin. İsterseniz e-Nabız PDF dosyanızı da yükleyebilirsiniz.</p>${pendingCopy}<button type="button" onclick="document.getElementById('inputLabD3')?.focus();" class="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-bold text-teal-800 hover:bg-teal-50"><i class="fa-solid fa-plus"></i> İlk tahlilimi gir</button></div>`;
        return;
      }

      const searchInput = document.getElementById("labHistorySearchInput");
      const query = String(searchInput?.value || "").trim().toLocaleLowerCase("tr-TR");
      const activeDate = dateFilter?.value || "all";
      const filteredRecords = state.labHistory.map(record => {
        const dateMatches = activeDate === "all" || record.date === activeDate;
        const dateSearch = [record.date, record.timeLabel].some(value => String(value || "").toLocaleLowerCase("tr-TR").includes(query));
        const metrics = LAB_HISTORY_METRICS.map(metric => getLabHistoryMetric(record, metric)).filter(Boolean);
        const searchMatches = !query || dateSearch
          ? metrics
          : metrics.filter(metric => [metric.label, metric.value, metric.reference].some(value => String(value || "").toLocaleLowerCase("tr-TR").includes(query)));
        const statusMatches = searchMatches.filter(metric => labHistoryFilterMode === "all"
          || (labHistoryFilterMode === "normal" && metric.status === "within")
          || (labHistoryFilterMode === "out" && metric.status === "outside"));
        return { record, metrics, statusMatches, dateMatches };
      }).filter(item => item.dateMatches && item.statusMatches.length > 0);
      const normalCount = filteredRecords.reduce((count, item) => count + item.metrics.filter(metric => metric.status === "within").length, 0);
      const outCount = filteredRecords.reduce((count, item) => count + item.metrics.filter(metric => metric.status === "outside").length, 0);
      const recordCount = filteredRecords.length;
      const visibleRecordCount = labHistoryShowAll ? recordCount : Math.min(recordCount, 2);
      const visibleEntries = filteredRecords.slice(0, visibleRecordCount);
      const summary = document.getElementById("labHistoryFilterSummary");
      if (summary) {
        const statusLabel = labHistoryFilterMode === "all" ? "Tüm sonuçlar" : labHistoryFilterMode === "normal" ? "Normal sonuçlar" : "Referans dışı sonuçlar";
        const dateLabel = activeDate === "all" ? "Tüm tarihler" : new Date(`${activeDate}T00:00:00`).toLocaleDateString(displayLocale);
        const restoreStatus = labHistoryRestorePending ? " · Yerel arşiv eşitleniyor…" : "";
        summary.textContent = `${recordCount} kayıt · ${normalCount} normal · ${outCount} referans dışı ölçüm · ${statusLabel} · ${dateLabel}${restoreStatus}`;
      }
      if (!filteredRecords.length) {
        labHistoryShowAll = false;
        container.classList.add("max-h-72", "overflow-y-auto");
        const pendingCopy = labHistoryRestorePending ? `<p class="mt-1 text-[11px] text-teal-700" role="status">Yerel arşiv kontrol ediliyor; kayıtlar birazdan güncellenecek.</p>` : "";
        container.innerHTML = `<div class="m-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center"><p class="text-xs font-bold text-slate-700">Bu ölçütlerde kayıt bulunamadı</p><p class="mt-1 text-[11px] text-slate-500">Tarih, arama metni veya sonuç durumunu değiştirin.</p>${pendingCopy}<button type="button" onclick="document.getElementById('labHistorySearchInput').value=''; document.getElementById('labHistoryDateFilter').value='all'; setLabHistoryFilter('all')" class="mt-2 min-h-9 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-[11px] font-bold text-teal-800">Filtreleri temizle</button></div>`;
        return;
      }

      container.classList.toggle("max-h-72", !labHistoryShowAll);
      container.classList.toggle("overflow-y-auto", !labHistoryShowAll);
      if (showAllButton && recordCount > 2) {
        if (showAllWrap) showAllWrap.classList.remove("hidden");
        showAllButton.classList.remove("hidden");
        showAllButton.classList.add("inline-flex");
        showAllButton.setAttribute("aria-expanded", labHistoryShowAll ? "true" : "false");
        const label = document.getElementById("labHistoryShowAllLabel");
        const icon = document.getElementById("labHistoryShowAllIcon");
        if (label) label.textContent = labHistoryShowAll ? "Daha az göster" : `Tümünü gör (${recordCount})`;
        if (icon) {
          icon.classList.toggle("fa-chevron-down", !labHistoryShowAll);
          icon.classList.toggle("fa-chevron-up", labHistoryShowAll);
        }
      }

      const statusPill = (status, compact = false) => {
        const styles = status === "within"
          ? ["bg-sky-50 text-sky-700", "Normal"]
          : status === "outside"
            ? ["bg-rose-50 text-rose-700", "Referans dışı"]
            : ["bg-slate-100 text-slate-600", "Aralık yok"];
        return `<span class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${compact ? "text-[9px]" : "text-[10px]"} font-bold ${styles[0]}"><i class="fa-solid ${status === "within" ? "fa-circle-check" : status === "outside" ? "fa-circle-exclamation" : "fa-circle-question"}" aria-hidden="true"></i>${styles[1]}</span>`;
      };
      const formatRecordDate = date => {
        const parsed = new Date(`${date}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) return escapeHtmlText(date || "Tarih yok");
        return `<span class="block text-xl font-black leading-none">${parsed.toLocaleDateString(displayLocale, { day: "numeric" })}</span><span class="mt-1 block text-[10px] font-bold">${parsed.toLocaleDateString(displayLocale, { month: "long" })}</span><span class="mt-0.5 block text-[10px]">${parsed.toLocaleDateString(displayLocale, { year: "numeric" })}</span>`;
      };
      const renderMetric = metric => {
        const isOut = metric.status === "outside";
        const isNormal = metric.status === "within";
        const cardClass = isOut ? "border-rose-200 bg-rose-50/70" : isNormal ? "border-teal-100 bg-teal-50/50" : "border-slate-200 bg-slate-50";
        const valueClass = isOut ? "text-rose-700" : isNormal ? "text-slate-900" : "text-slate-700";
        const rangeLabel = metric.referenceSource === "lab" ? "Referans" : "Yaklaşık karşılaştırma aralığı";
        const referenceNote = metric.referenceSource === "lab" ? "" : `<span class="block text-[9px] text-slate-400">Genel uygulama aralığı; laboratuvar referansı değildir</span>`;
        return `<div class="rounded-xl border p-3 ${cardClass}">
          <div class="flex items-start justify-between gap-2"><span class="text-[11px] font-bold text-slate-700">${escapeHtmlText(metric.label)}</span>${statusPill(metric.status, true)}</div>
          <div class="mt-1.5 flex items-baseline gap-1.5"><span class="text-base font-black ${valueClass}">${escapeHtmlText(metric.value)}</span><span class="text-[10px] text-slate-500">${escapeHtmlText(metric.unit)}</span></div>
          <div class="mt-1.5 border-t border-slate-200/70 pt-1.5 text-[10px] text-slate-600"><strong>${rangeLabel}:</strong> ${escapeHtmlText(metric.reference || "Belirtilmemiş")}${referenceNote}</div>
        </div>`;
      };
      container.innerHTML = `
        <div class="space-y-3 border-0 p-0">
          ${visibleEntries.map(({ record, metrics, statusMatches }, index) => {
            const normalResults = metrics.filter(metric => metric.status === "within").length;
            const outResults = metrics.filter(metric => metric.status === "outside").length;
            const visibleKeys = new Set(statusMatches.map(metric => metric.key));
            const visibleMetrics = metrics.filter(metric => visibleKeys.has(metric.key));
            const expanded = labHistoryFilterMode !== "all" || activeDate !== "all" || Boolean(query);
            const detailsId = `lab-history-details-${index}`;
            return `<article class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div class="flex items-center gap-3 border-b border-slate-100 p-3 sm:p-4">
                <button aria-controls="${detailsId}" aria-expanded="${expanded ? "true" : "false"}" class="flex min-w-0 flex-1 items-center gap-3 text-left" onclick="toggleLabHistoryRecord('${detailsId}', this)" type="button">
                <span class="flex h-[68px] w-[68px] shrink-0 flex-col items-center justify-center rounded-xl bg-navy-900 text-white text-center">${formatRecordDate(record.date)}</span>
                <span class="min-w-0 flex-1">
                  <span class="block text-xs font-black text-navy-900">Tahlil sonuçları</span>
                  <span class="mt-0.5 block text-[10px] text-slate-500">${record.timeLabel ? `Kayıt saati: ${escapeHtmlText(record.timeLabel)}` : "Kayıtlı laboratuvar ölçümleri"}</span>
                  <span class="mt-2 flex flex-wrap gap-1.5">${statusPill("within", true).replace("Normal", `${normalResults} Normal`)}${statusPill("outside", true).replace("Referans dışı", `${outResults} Referans dışı`)}</span>
                </span>
                <i aria-hidden="true" class="fa-solid ${expanded ? "fa-chevron-up" : "fa-chevron-down"} text-slate-500 text-xs" data-lab-record-chevron></i>
                </button>
                <button aria-label="Bu tarihli tahlil kaydını sil" class="inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600" onclick="deleteLabRecord(${safeJsStringAttribute(record.id)})" title="Kaydı sil" type="button"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button>
              </div>
              <div class="${expanded ? "" : "hidden"} grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:p-4" id="${detailsId}">${visibleMetrics.map(renderMetric).join("")}</div>
            </article>`;
          }).join("")}
        </div>`;
    }

    function deleteLabRecord(id) {
      state.labHistory = (state.labHistory || []).filter(r => String(r.id) !== String(id));
      temporarilyParsedLabResults = {};
      temporarilyParsedPdfDate = null;
      temporarilyParsedPdfEgfr = null;
      clearLabDraft();

      VITATAKIP_LAB_DRAFT_FIELDS.forEach(([inputId]) => {
        const input = document.getElementById(inputId);
        if (input) input.value = "";
      });
      VITA_LAB_REFERENCE_FIELDS.forEach(([inputId]) => {
        const input = document.getElementById(inputId);
        if (input) input.value = "";
      });

      if (state.labHistory.length > 0) {
        const latest = state.labHistory[0];
        state.labValues = typeof buildLabValuesFromRecord === "function"
          ? buildLabValuesFromRecord(latest)
          : { d3: latest.d3, b12: latest.b12, ferritin: latest.ferritin, iron: latest.iron ?? null, tsat: latest.tsat ?? null, mg: latest.mg, ca: latest.ca, zinc: latest.zinc, creatinine: latest.creatinine, folate: latest.folate, alt: latest.alt ?? null, hb: latest.hb ?? null, hgb: latest.hb ?? null, mcv: latest.mcv ?? null, crp: latest.crp ?? null };
        state.labReferences = typeof safeStructuredClone === "function"
          ? safeStructuredClone(latest.references || {})
          : { ...(latest.references || {}) };
        VITA_LAB_REFERENCE_FIELDS.forEach(([inputId, key]) => {
          const input = document.getElementById(inputId);
          if (input) input.value = String(state.labReferences?.[key] || "");
        });
      } else {
        state.labValues = typeof createEmptyLabValuesState === "function"
          ? createEmptyLabValuesState()
          : { d3: null, b12: null, ferritin: null, iron: null, tsat: null, mg: null, ca: null, zinc: null, creatinine: null, folate: null, alt: null, hb: null, hgb: null, rbc: null, hct: null, mcv: null, crp: null, hba1c: null, tsh: null, ft4: null };
        state.labReferences = typeof createEmptyLabReferencesState === "function" ? createEmptyLabReferencesState() : {};
        try {
          if (activeUserId) {
            safeLocalStorageRemoveItem(`vitatakip_labs_${activeUserId}`);
            safeLocalStorageRemoveItem(`vitatakip_labreferences_${activeUserId}`);
            safeLocalStorageRemoveItem(`vitatakip_labhistory_${activeUserId}`);
            safeLocalStorageRemoveItem(`vitatakip_labdraft_${activeUserId}`);
          }
          safeLocalStorageRemoveItem("currentLabResults");
          safeLocalStorageRemoveItem("labArchiveHistory");
        } catch (_) {}
      }

      if (Array.isArray(VITA_LAB_INPUTS)) {
        VITA_LAB_INPUTS.forEach(([inputId, key]) => updateVitaLabLiveFeedback(inputId, key));
      }

      if (typeof invalidateClinicalAnalysisCache === "function") {
        invalidateClinicalAnalysisCache({ clearDOM: true });
      }
      saveState();
      if (typeof canRunClinicalAnalysis === "function" && canRunClinicalAnalysis() && typeof executeCDSSRules === "function") {
        executeCDSSRules();
      }
      syncCDSSDemographics();
      renderLabHistoryUI();
      renderBiomarkerTrendChart();
      evaluateTrendAndDecisionSupport(false);
      renderDailyTab();
      renderReportTab();
      if (typeof renderSettingsView === "function") renderSettingsView();
      showToast("Tahlil Silindi", "Silinen tahlil verileri arşivin yanı sıra aktif bellek ve klinik analizlerden tamamen temizlendi.", "info");
    }

    function renderBiomarkerTrendChart() {
      if (window.VitaRechartsDashboard && typeof window.VitaRechartsDashboard.renderAll === "function") {
        window.VitaRechartsDashboard.renderAll();
      }
      const card = document.getElementById("biomarkerChartCard");
      if (card) card.classList.remove("hidden");
      const canvas = document.getElementById("labTrendChart");
      const select = document.getElementById("labTrendMetricSelect");
      const rangeText = document.getElementById("labTrendRangeText");
      if (!card || !canvas) return;
      if (!Array.isArray(state.labHistory) || state.labHistory.length < 2) {
        if (labTrendChartInstance) { labTrendChartInstance.destroy(); labTrendChartInstance = null; }
        if (rangeText) rangeText.textContent = "Tekil Chart.js grafiği için en az iki farklı tarihte kayıtlı tahlil gerekir; üstteki Recharts çoklu çizgi panelinden örnek veya kayıtlı trendleri inceleyebilirsiniz.";
        return;
      }
      const metricMap = {
        d3: { label: "D vitamini (25-OH D3)", unit: "ng/mL", color: "#14b8a6" },
        b12: { label: "B12 vitamini", unit: "pg/mL", color: "#6366f1" },
        ferritin: { label: "Ferritin", unit: "ng/mL", color: "#e11d48" },
        mg: { label: "Magnezyum", unit: "mg/dL", color: "#f59e0b" },
        ca: { label: "Kalsiyum", unit: "mg/dL", color: "#0284c7" },
        zinc: { label: "Çinko", unit: "μg/dL", color: "#7c3aed" },
        creatinine: { label: "Kreatinin", unit: "mg/dL", color: "#ea580c" },
        folate: { label: "Folat (B9)", unit: "ng/mL", color: "#0f766e" },
        alt: { label: "ALT", unit: "U/L", color: "#be123c" },
        hb: { label: "Hemoglobin", unit: "g/dL", color: "#dc2626" },
        mcv: { label: "MCV", unit: "fL", color: "#9333ea" },
        crp: { label: "CRP", unit: "mg/L", color: "#475569" }
      };
      const metricKey = metricMap[select?.value] ? select.value : "d3";
      const metric = metricMap[metricKey];
      const chronological = [...state.labHistory].sort((a, b) => {
        const ta = Number(a.timestamp || (a.date ? new Date(a.date + "T00:00:00").getTime() : 0));
        const tb = Number(b.timestamp || (b.date ? new Date(b.date + "T00:00:00").getTime() : 0));
        return ta - tb;
      }).filter(r => r && r.date && r[metricKey] !== null && r[metricKey] !== undefined && Number.isFinite(Number(r[metricKey])));

      if (labTrendChartInstance) { labTrendChartInstance.destroy(); labTrendChartInstance = null; }
      if (document.getElementById("acc-labtrend")?.classList.contains("hidden")) return;
      if (chronological.length < 2) {
        if (rangeText) rangeText.textContent = `${metric.label} için en az iki tarihli, sayısal ölçüm gerekli.`;
        card.classList.remove("hidden");
        return;
      }

      if (!window.Chart) {
        if (rangeText) rangeText.textContent = "Trend grafiği bileşeni yükleniyor… VitaTakip'in diğer bölümleri kullanılabilir.";
        if (!window.__vitaChartLoadingPromise) {
          window.__vitaChartLoadingPromise = loadVitaOptionalScript("vendor/chartjs/chart.umd.js", "Chart", 12000)
            .then(() => { window.__vitaChartLoadingPromise = null; renderBiomarkerTrendChart(); })
            .catch(error => {
              console.warn("Trend grafiği kitaplığı yüklenemedi; uygulamanın diğer bölümleri kullanılmaya devam edebilir.", error);
              if (rangeText) rangeText.textContent = "Trend grafiği yüklenemedi. İnternet bağlantınızı kontrol edin; tahlil kaydı ve uygulamanın diğer bölümleri kullanılabilir.";
            });
        }
        return;
      }

      const prettyDate = dateText => {
        const parts = String(dateText).split("-");
        return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : String(dateText);
      };
      const ctx = canvas.getContext("2d");
      labTrendChartInstance = new Chart(ctx, {
        type: "line",
        data: {
          labels: chronological.map(r => prettyDate(r.date)),
          datasets: [{
            label: `${metric.label} (${metric.unit})`,
            data: chronological.map(r => Number(r[metricKey])),
            borderColor: metric.color,
            backgroundColor: metric.color,
            pointBackgroundColor: metric.color,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 7,
            borderWidth: 3,
            tension: 0.32,
            cubicInterpolationMode: "monotone",
            fill: false,
            spanGaps: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: "index" },
          plugins: {
            legend: { position: "top", labels: { boxWidth: 12, font: { size: 11, weight: "bold" } } },
            tooltip: { callbacks: { label: context => `${context.dataset.label}: ${context.parsed.y} ${metric.unit}` } }
          },
          scales: {
            y: { title: { display: true, text: metric.unit }, ticks: { maxTicksLimit: 6 } },
            x: { title: { display: true, text: "Tahlil tarihi (eskiden yeniye)" }, ticks: { maxRotation: 0, autoSkip: true } }
          }
        }
      });

      const first = chronological[0];
      const latest = chronological[chronological.length - 1];
      const monthSpan = Math.max(0, Math.round((new Date(latest.date + "T00:00:00").getTime() - new Date(first.date + "T00:00:00").getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
      if (rangeText) rangeText.textContent = `${chronological.length} ölçüm · ${prettyDate(first.date)} – ${prettyDate(latest.date)} · yaklaşık ${monthSpan} aylık zaman aralığı. Noktalar kaydedilen ölçümleri temsil eder; aradaki çizgi ölçüm yapılmayan günlerdeki gerçek sonucu göstermez.`;
    }

        /* BOYLAMSAL TREND KARŞILAŞTIRMASI VE NORMALİTE POPUP TETİKLEYİCİSİ */
    function evaluateTrendAndDecisionSupport(triggerPopup = false) {
      const alertSection = document.getElementById("trendAlertSection");
      if (!alertSection) return;

      if (!state.labHistory || state.labHistory.length < 2) {
        alertSection.classList.add("hidden");
        alertSection.innerHTML = "";
        return;
      }

      const curr = state.labHistory[0];
      const prev = state.labHistory[1];
      const gender = state.user ? state.user.gender : 'K';

      const params = [
        { key: 'd3', name: 'D Vitamini (25-OH D3)', unit: 'ng/mL' },
        { key: 'b12', name: 'B12 Vitamini', unit: 'pg/mL' },
        { key: 'ferritin', name: 'Ferritin (Demir Deposu)', unit: 'ng/mL' },
        { key: 'mg', name: 'Magnezyum', unit: 'mg/dL' },
        { key: 'ca', name: 'Total Kalsiyum', unit: 'mg/dL' },
        { key: 'zinc', name: 'Serum Çinko', unit: 'µg/dL' },
        { key: 'creatinine', name: 'Serum Kreatinin', unit: 'mg/dL', inverseMarker: true },
        { key: 'folate', name: 'Folat (B9)', unit: 'ng/mL' },
        { key: 'alt', name: 'ALT (Karaciğer Enzimi)', unit: 'U/L', inverseMarker: true },
        { key: 'hb', name: 'Hemoglobin', unit: 'g/dL' },
        { key: 'mcv', name: 'MCV', unit: 'fL' },
        { key: 'crp', name: 'CRP', unit: 'mg/L', inverseMarker: true }
      ];

      const trendMessages = [];
      const popupAlerts = [];

      params.forEach(p => {
        const cVal = curr[p.key];
        const pVal = prev[p.key];
        if (cVal !== null && cVal !== undefined && pVal !== null && pVal !== undefined) {
          const cEval = KDSSRuleEngine.evaluate(p.key, cVal, gender);
          const pEval = KDSSRuleEngine.evaluate(p.key, pVal, gender);

          if (pEval.isLow && cEval.tier === 'optimal') {
            const msg = `🎉 ${p.name} değeriniz ${pVal} ${p.unit} seviyesinden ${cVal} ${p.unit} referans aralığına yükseldi. Takviyeyi sürdürme, azaltma veya bırakma kararını hekiminizle verin.`;
            trendMessages.push({ type: 'optimal', text: msg });
            popupAlerts.push({ message: msg });
          } else if (p.inverseMarker && pEval.isHigh && cEval.tier === 'optimal') {
            const msg = `🎉 ${p.name} değeriniz ${pVal} ${p.unit} seviyesinden ${cVal} ${p.unit} normal referans aralığına geriledi.`;
            trendMessages.push({ type: 'optimal', text: msg });
          } else if (cEval.isToxic) {
            const msg = `⛔ ${p.name} değeriniz ${cVal} ${p.unit} ile kritik yüksek aralıkta olabilir. Sonucu gecikmeden hekiminizle görüşün; reçeteli tedavinizi veya takviyelerinizi kendi kendinize kesmeyin ya da değiştirmeyin.`;
            trendMessages.push({ type: 'toxic', text: msg });
            popupAlerts.push({ message: msg });
          } else if (p.inverseMarker && !pEval.isHigh && cEval.isHigh) {
            const msg = `⚠️ ${p.name} değeriniz ${pVal} ➔ ${cVal} ${p.unit} yönünde yükselerek referans üst sınırını aştı; hekiminizle değerlendirmeniz önerilir.`;
            trendMessages.push({ type: 'toxic', text: msg });
          } else if (!p.inverseMarker && cVal > pVal && cEval.isLow) {
            trendMessages.push({
              type: 'improving',
              text: `📈 ${p.name} değeriniz ${pVal} ➔ ${cVal} ${p.unit} yönünde artış gösteriyor ancak henüz referans aralığına ulaşmadı; devam veya değişiklik kararı için hekiminize danışın.`
            });
          }
        }
      });

      alertSection.classList.remove("hidden");
      if (trendMessages.length > 0) {
        alertSection.innerHTML = trendMessages.map(m => `
          <div class="p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-3 ${
            m.type === 'toxic' ? 'bg-rose-50 border-rose-300 text-rose-950' :
            (m.type === 'optimal' ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-teal-50 border-teal-200 text-teal-900')
          }">
            <span class="font-bold leading-relaxed">${escapeHtmlText(m.text)}</span>
            <span class="px-2 py-0.5 rounded font-black bg-white border text-[10px] whitespace-nowrap">Hekim Danışmanlığı</span>
          </div>
        `).join('');
      } else {
        alertSection.innerHTML = `
          <div class="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-900 flex items-center justify-between">
            <span class="flex items-center gap-2"><i class="fa-solid fa-chart-line text-teal-600"></i> Birden fazla tahlil kaydedildi (${prev.date} ➔ ${curr.date}); karşılaştırmalı trend analizi aktif.</span>
            <span class="px-2 py-0.5 rounded font-black bg-teal-600 text-white text-[10px]">Aktif Trend</span>
          </div>
        `;
      }

      if (triggerPopup && popupAlerts.length > 0) {
        openNormalityPopup(popupAlerts);
      }
    }

    function openNormalityPopup() {
      return; // Tahlillerim sayfasında bildirim penceresi gösterilmez; yorumlar Klinik Analiz sayfasındadır.
    }

    function closeNormalityPopup() {
      const modal = document.getElementById("normalityPopupModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
    }

    /* AKILLI DEPRESCRIBING MOTORU */
    function checkDeprescribingOpportunities() {
      if (!state.supplements || state.supplements.length === 0) return;
      pendingDeprescribingItems = [];

      state.supplements.forEach(sup => {
        const bio = getSupplementBiomarkerStatus(sup);
        if (bio) {
          const isCreatine = (bio.key === 'creatinine');
          const hasKidneyChronic = (state.user?.chronic || []).includes("kidney");
          if (isCreatine && (bio.val > getCreatinineUpperLimit() || hasKidneyChronic)) {
            pendingDeprescribingItems.push({
              id: sup.id,
              name: sup.name,
              reason: `Kreatinin (${bio.val} mg/dL) veya böbrek öyküsü nedeniyle bu takviyenin uygunluğu hekimle gecikmeden değerlendirilmelidir. Kullanımı kendi kararınızla başlatmayın, kesmeyin veya değiştirmeyin.`,
              badge: "Renal Güvenlik Kilidi",
              isDanger: true
            });
          } else if (bio.evalResult.isToxic) {
            pendingDeprescribingItems.push({
              id: sup.id,
              name: sup.name,
              reason: `Son tahlil değeri (${bio.val}) kritik yüksek olabilir. Sonucu hekimle gecikmeden değerlendirin; tedaviyi veya takviyeyi kendi kararınızla kesmeyin ya da dozunu değiştirmeyin.`,
              badge: "Toksisite Uyarısı",
              isDanger: true
            });
          } else if (bio.evalResult.tier === 'optimal') {
            pendingDeprescribingItems.push({
              id: sup.id,
              name: sup.name,
              reason: `Son tahlil değeri (${bio.val}) hedef aralığa ulaşmış olabilir. Yükleme/idame planı hekimle gözden geçirilmelidir; bu uyarı tek başına bırakma önerisi değildir.`,
              badge: "Hedefe Ulaşıldı",
              isDanger: false
            });
          }
        }
      });

      if (pendingDeprescribingItems.length > 0) {
        const modal = document.getElementById("deprescribingModal");
        const content = document.getElementById("deprescribingModalContent");
        if (modal && content) {
          content.innerHTML = pendingDeprescribingItems.map(item => `
            <div class="p-3.5 rounded-2xl border ${item.isDanger ? 'bg-rose-50 border-rose-300 text-rose-950' : 'bg-emerald-50 border-emerald-300 text-emerald-950'} text-xs space-y-1">
              <div class="flex items-center justify-between">
                <strong class="font-black text-xs">${escapeHtmlText(item.name)}</strong>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${item.isDanger ? 'bg-rose-200 text-rose-900' : 'bg-emerald-200 text-emerald-900'}">${escapeHtmlText(item.badge)}</span>
              </div>
              <p class="text-[11px] leading-relaxed">${escapeHtmlText(item.reason)}</p>
            </div>
          `).join('');
          modal.classList.remove("hidden");
          modal.style.display = "flex";
        }
      }
    }

    function resolveDeprescribingSync(shouldRemove) {
      const modal = document.getElementById("deprescribingModal");
      if (shouldRemove && pendingDeprescribingItems.length > 0) {
        const removeIds = new Set(pendingDeprescribingItems.map(i => i.id));
        state.supplements = state.supplements.filter(s => !removeIds.has(s.id));
        saveState();
        renderDailyTab();
        renderReportTab();
        if (window.SoundEffects) SoundEffects.playSuccess();
        showToast("Liste Eşzamanlandı", `${removeIds.size} adet takviye günlük takip listenizden çıkarıldı.`, "success");
      }
      pendingDeprescribingItems = [];
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
    }

    /* CDSS ÇALIŞTIRMA & TÜM ANEMİ / eGFR / HEPATİK / İLAÇ KURALLARI */
    