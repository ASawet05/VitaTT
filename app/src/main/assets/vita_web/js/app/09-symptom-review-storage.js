function checkPendingSymptomReviews() {
      const banner = document.getElementById("pendingReviewAlertBanner");
      if (!banner) return;

      if (!state.supplements || state.supplements.length === 0) {
        banner.classList.add("hidden");
        banner.style.display = "none";
        banner.innerHTML = "";
        return;
      }

      if (!state.supplementReviews || typeof state.supplementReviews !== 'object') {
        state.supplementReviews = {};
      }

      const now = Date.now();
      const dueSupplements = [];

      state.supplements.forEach(sup => {
        if (!sup.addedDate) sup.addedDate = Date.now();

        const fKey = sup.formKey;
        const cfg = fKey && FORM_DOSAGE_CONFIG[fKey] ? FORM_DOSAGE_CONFIG[fKey] : null;
        const latencyDays = (cfg && cfg.reviewDays) ? cfg.reviewDays : 30;
        const reviewDueTime = sup.addedDate + (latencyDays * 24 * 60 * 60 * 1000);

        const isReviewed = state.supplementReviews && state.supplementReviews[sup.id] && state.supplementReviews[sup.id].completed === true;

        if (now >= reviewDueTime && !isReviewed) {
          dueSupplements.push({ sup, latencyDays, weeks: Math.round(latencyDays / 7) });
        }
      });

      if (dueSupplements.length > 0) {
        const target = dueSupplements[0];
        banner.classList.remove("hidden");
        banner.style.display = "block";
        banner.innerHTML = `
          <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-navy-900 border-2 border-indigo-400 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4 animate-bounce-short">
            <div class="flex items-start gap-3.5">
              <div class="w-11 h-11 rounded-2xl bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 flex items-center justify-center text-xl flex-shrink-0">
                <i class="fa-solid fa-hourglass-half"></i>
              </div>
              <div>
                <span class="text-[10px] font-black uppercase tracking-wider text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/40 inline-block">
                  Klinik İlerleme & Biyolojik Yanıt Kontrolü
                </span>
                <h4 class="text-sm sm:text-base font-black text-white mt-1">
                  ${target.weeks}. Hafta ${target.sup.name} Kontrolü: İlgili şikayetleriniz ne durumda?
                </h4>
                <p class="text-xs text-indigo-100/90 mt-0.5 leading-relaxed">
                  Bu takviyenin vücutta kararlı konsantrasyona ve doku onarımına ulaşması için gereken biyolojik süre (${target.latencyDays} gün) tamamlanmıştır. Başlangıçta bildirdiğiniz semptomların durumunu hekiminizle paylaşmak üzere işaretleyiniz.
                </p>
              </div>
            </div>

            <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); openSymptomReviewModal('${target.sup.id}')" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-400 hover:from-teal-600 hover:to-emerald-500 text-navy-950 font-black text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap self-start md:self-center active:scale-95">
              <i class="fa-solid fa-clipboard-check"></i>
              <span>Hızlı Değerlendirme Yap</span>
            </button>
          </div>
        `;
      } else {
        banner.classList.add("hidden");
        banner.style.display = "none";
        banner.innerHTML = "";
      }
    }

    function openSymptomReviewModal(supplementId) {
      const sup = state.supplements.find(s => s.id === supplementId);
      if (!sup) return;

      activeReviewSupplementId = supplementId;
      const modal = document.getElementById("symptomReviewModal");
      const title = document.getElementById("symptomReviewModalTitle");
      const intro = document.getElementById("symptomReviewModalIntro");
      const container = document.getElementById("symptomReviewItemsContainer");
      const noticeBox = document.getElementById("symptomReviewNoticeBox");

      if (noticeBox) noticeBox.classList.add("hidden");

      const fKey = sup.formKey;
      const cfg = fKey && FORM_DOSAGE_CONFIG[fKey] ? FORM_DOSAGE_CONFIG[fKey] : null;
      const weeks = cfg ? Math.round(cfg.reviewDays / 7) : 4;

      if (title) title.textContent = `${weeks}. Hafta ${escapeHtmlText(sup.name)} Klinik Kontrolü`;
      if (intro) {
        intro.textContent = `${escapeHtmlText(sup.name)} takviyesinin kararlı doku doygunluğuna ulaşması için beklenen süre dolmuştur. Bu takviyeyle ilişkili başlangıç şikayetlerinizin mevcut durumunu işaretleyiniz:`;
      }

      const relatedSymptomKeys = Object.keys(ANAMNESIS_DICTIONARY).filter(key => {
        const item = ANAMNESIS_DICTIONARY[key];
        const matchForm = item.formKey && item.formKey === sup.formKey;
        const matchName = item.nutrients.some(n => sup.name.toLowerCase().includes(n.toLowerCase()));
        return (matchForm || matchName) && state.selectedSymptoms.has(key);
      });

      const finalKeys = relatedSymptomKeys.length > 0 ? relatedSymptomKeys : Object.keys(ANAMNESIS_DICTIONARY).filter(k => ANAMNESIS_DICTIONARY[k].formKey === sup.formKey).slice(0, 2);

      if (container) {
        if (finalKeys.length === 0) {
          container.innerHTML = `
            <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Bu takviyeyle ilişkili spesifik bir şikayet bulunmamaktadır. Genel iyilik durumunuzu değerlendirebilirsiniz.
            </div>
          `;
        } else {
          container.innerHTML = finalKeys.map(k => {
            const meta = ANAMNESIS_DICTIONARY[k];
            const isResolved = state.resolvedSymptoms && state.resolvedSymptoms.has(k);
            return `
              <div class="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2">
                <div class="flex items-start justify-between gap-2">
                  <div>
                    <strong class="font-bold text-xs text-navy-900 block">${meta.medicalName}</strong>
                    <span class="text-[11px] text-slate-500 italic block mt-0.5">"${meta.question}"</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-1">
                  <label class="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border cursor-pointer text-xs font-bold transition ${isResolved ? 'bg-white border-slate-200 text-slate-700' : 'bg-amber-100 text-amber-900 border-amber-300'}">
                    <input type="radio" name="review_sym_${k}" value="ongoing" ${!isResolved ? 'checked' : ''} onchange="onSymptomReviewRadioChange()" class="text-amber-600 focus:ring-amber-500">
                    <span>Hala Devam Ediyor</span>
                  </label>

                  <label class="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border cursor-pointer text-xs font-bold transition ${isResolved ? 'bg-emerald-100 text-emerald-950 border-emerald-300' : 'bg-white border-slate-200 text-slate-700'}">
                    <input type="radio" name="review_sym_${k}" value="resolved" ${isResolved ? 'checked' : ''} onchange="onSymptomReviewRadioChange()" class="text-emerald-600 focus:ring-emerald-500">
                    <span>Tamamen Geçti 🎉</span>
                  </label>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      if (modal) {
        modal.classList.remove("hidden");
        modal.style.display = "flex";
      }
    }

    function onSymptomReviewRadioChange() {
      const noticeBox = document.getElementById("symptomReviewNoticeBox");
      const resolvedRadios = document.querySelectorAll('#symptomReviewItemsContainer input[type="radio"][value="resolved"]:checked');
      if (noticeBox) {
        if (resolvedRadios.length > 0) noticeBox.classList.remove("hidden");
        else noticeBox.classList.add("hidden");
      }
    }

    function closeSymptomReviewModal() {
      const modal = document.getElementById("symptomReviewModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.style.display = "none";
      }
      activeReviewSupplementId = null;
    }

    function submitSymptomReviewDecisions() {
      if (!activeReviewSupplementId) return;

      const radios = document.querySelectorAll('#symptomReviewItemsContainer input[type="radio"]:checked');
      let resolvedCount = 0;

      radios.forEach(r => {
        const symKey = r.name.replace("review_sym_", "");
        if (r.value === "resolved") {
          state.resolvedSymptoms.add(symKey);
          state.selectedSymptoms.delete(symKey);
          resolvedCount++;
        } else {
          state.resolvedSymptoms.delete(symKey);
          state.selectedSymptoms.add(symKey);
        }
      });

      if (!state.supplementReviews || typeof state.supplementReviews !== 'object') {
        state.supplementReviews = {};
      }

      state.supplementReviews[activeReviewSupplementId] = {
        completed: true,
        reviewTimestamp: Date.now(),
        reviewDate: new Date().toLocaleDateString("tr-TR"),
        hasResolved: resolvedCount > 0
      };

      saveState();
      closeSymptomReviewModal();
      checkPendingSymptomReviews();
      syncAnamnesisCardsUI();
      renderDailyTab();
      renderReportTab();

      if (resolvedCount > 0) {
        if (window.SoundEffects) SoundEffects.playSuccess();
        showToast("Klinik İlerleme Kaydedildi", "Şikayetinizin gerilediği hekim konsültasyon raporunuza işlendi.", "success");
      } else {
        showToast("Takip Güncellendi", "Semptomların devam ettiği kaydedildi.", "info");
      }
    }

    function toggleAnamnesisCard(cardEl, symptomKey) {
      if (!(state.selectedSymptoms instanceof Set)) {
        state.selectedSymptoms = new Set(Array.isArray(state.selectedSymptoms) ? state.selectedSymptoms : []);
      }
      const dot = cardEl.querySelector(".check-dot");
      if (state.selectedSymptoms.has(symptomKey)) {
        state.selectedSymptoms.delete(symptomKey);
        cardEl.classList.remove("border-indigo-500", "bg-indigo-50/70", "ring-1", "ring-indigo-400", "is-selected", "selected");
        cardEl.classList.add("border-slate-200", "bg-white");
        cardEl.setAttribute("aria-pressed", "false");
        if (dot) { dot.className = "w-4 h-4 rounded-full border border-slate-300 check-dot"; dot.innerHTML = ""; }
      } else {
        state.selectedSymptoms.add(symptomKey);
        cardEl.classList.add("border-indigo-500", "bg-indigo-50/70", "ring-1", "ring-indigo-400", "is-selected");
        cardEl.classList.remove("border-slate-200", "bg-white");
        cardEl.setAttribute("aria-pressed", "true");
        if (dot) { dot.className = "w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] check-dot shadow-sm"; dot.innerHTML = '<i class="fa-solid fa-check"></i>'; }
      }
      state.selectedSymptomsArray = Array.from(state.selectedSymptoms);
      try {
        if (typeof safeLocalStorageSetItem === "function") {
          safeLocalStorageSetItem("vitatakip_selected_symptoms_array", JSON.stringify(state.selectedSymptomsArray));
        }
      } catch (_) {}
      updateAnamnesisTabCounts();
      saveState();
    }

    function syncAnamnesisCardsUI() {
      if (!(state.selectedSymptoms instanceof Set)) {
        state.selectedSymptoms = new Set(Array.isArray(state.selectedSymptoms) ? state.selectedSymptoms : []);
      }
      document.querySelectorAll(".anamnesis-card").forEach(card => {
        const match = card.getAttribute("onclick")?.match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/);
        if (match && match[1]) {
          const key = match[1];
          const dot = card.querySelector(".check-dot");
          if (state.selectedSymptoms.has(key)) {
            card.classList.add("border-indigo-500", "bg-indigo-50/70", "ring-1", "ring-indigo-400", "is-selected");
            card.classList.remove("border-slate-200", "bg-white");
            card.setAttribute("aria-pressed", "true");
            if (dot) { dot.className = "w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] check-dot shadow-sm"; dot.innerHTML = '<i class="fa-solid fa-check"></i>'; }
          } else {
            card.classList.remove("border-indigo-500", "bg-indigo-50/70", "ring-1", "ring-indigo-400", "is-selected", "selected");
            card.classList.add("border-slate-200", "bg-white");
            card.setAttribute("aria-pressed", "false");
            if (dot) { dot.className = "w-4 h-4 rounded-full border border-slate-300 check-dot"; dot.innerHTML = ""; }
          }
        }
      });
      state.selectedSymptomsArray = Array.from(state.selectedSymptoms);
      updateAnamnesisTabCounts();
    }

    /* IndexedDB genişletilmiş yerel veri katmanı: localStorage eski tarayıcılar için yedektir. */
    let vitaIndexedDbPromise = null;
    let vitaIndexedDbWriteQueue = Promise.resolve();
    let vitaIndexedDbNoticeShown = false;
    let vitaExtendedLastStamp = 0;
    let vitaDoctorNotesPersistTimer = null;

    function openVitaIndexedDB() {
      if (!window.indexedDB) return Promise.reject(new Error("IndexedDB bu tarayıcıda desteklenmiyor."));
      if (vitaIndexedDbPromise) return vitaIndexedDbPromise;
      vitaIndexedDbPromise = new Promise((resolve, reject) => {
        let request;
        try { request = window.indexedDB.open("VitaTakipLocalDB", 1); }
        catch (error) { reject(error); return; }
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains("extendedData")) db.createObjectStore("extendedData", { keyPath: "userId" });
          if (!db.objectStoreNames.contains("pdfScanLogs")) db.createObjectStore("pdfScanLogs", { keyPath: "id" });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("IndexedDB açılamadı."));
        request.onblocked = () => reject(new Error("IndexedDB başka bir sekmede güncelleniyor; sekmeyi yenileyip yeniden deneyin."));
      }).catch(error => { vitaIndexedDbPromise = null; throw error; });
      return vitaIndexedDbPromise;
    }

    function vitaIndexedDbRequest(storeName, mode, method, valueOrKey) {
      return openVitaIndexedDB().then(db => new Promise((resolve, reject) => {
        let tx;
        try { tx = db.transaction(storeName, mode); }
        catch (error) { reject(error); return; }
        const store = tx.objectStore(storeName);
        let request;
        let result;
        try { request = method === "get" ? store.get(valueOrKey) : method === "getAll" ? store.getAll() : store.put(valueOrKey); }
        catch (error) { reject(error); return; }
        // Request success tek başına transaction'ın commit edildiğini garanti etmez.
        // Okuma/yazma sonucunu transaction complete olduktan sonra bildiriyoruz.
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => reject(request.error || new Error("IndexedDB işlemi tamamlanamadı."));
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error || request.error || new Error("IndexedDB işlemi başarısız oldu."));
        tx.onabort = () => reject(tx.error || new Error("IndexedDB işlemi iptal edildi."));
      }));
    }

    function cloneVitaJson(value, fallbackValue) {
      try {
        const encoded = JSON.stringify(value);
        return encoded === undefined ? fallbackValue : JSON.parse(encoded);
      } catch (error) {
        console.warn("VitaTakip yerel anlık görüntü kopyalanamadı; güvenli varsayılan kullanılıyor.", error);
        return fallbackValue;
      }
    }

    function buildVitaExtendedSnapshot(userId, updatedAt = Date.now()) {
      return {
        userId: String(userId), snapshotVersion: 2, updatedAt: Number(updatedAt) || Date.now(),
        user: cloneVitaJson(state.user, null),
        supplements: cloneVitaJson(Array.isArray(state.supplements) ? state.supplements : [], []),
        hydration: cloneVitaJson(state.hydration || { current: 0, target: 2450 }, { current: 0, target: 2450 }),
        labHistory: cloneVitaJson(Array.isArray(state.labHistory) ? state.labHistory : [], []),
        labValues: cloneVitaJson(state.labValues || {}, {}),
        labReferences: cloneVitaJson(state.labReferences || {}, {}),
        selectedSymptoms: Array.from(state.selectedSymptoms || []),
        resolvedSymptoms: Array.from(state.resolvedSymptoms || []),
        supplementReviews: cloneVitaJson(state.supplementReviews || {}, {}),
        lastCDSS: cloneVitaJson(state.lastCDSS, null),
        doctorNotes: activeUserId === String(userId)
          ? String(document.getElementById("doctorNotesInput")?.value ?? safeLocalStorageGetItem(`vitatakip_notes_${userId}`) ?? "")
          : (safeLocalStorageGetItem(`vitatakip_notes_${userId}`) || "")
      };
    }

    function nextVitaExtendedStamp(userId) {
      const lastSaved = Number(safeLocalStorageGetItem(`vitatakip_extended_updated_${userId}`) || 0) || 0;
      vitaExtendedLastStamp = Math.max(Date.now(), vitaExtendedLastStamp + 1, lastSaved + 1);
      return vitaExtendedLastStamp;
    }

    function shouldRestoreVitaExtendedSnapshot(stored, localStamp) {
      const storedStamp = Number(stored && stored.updatedAt) || 0;
      const local = Number(localStamp) || 0;
      // Eşit zaman damgasında IndexedDB tercih edilir: eski sürüm, localStorage yazımı
      // başarısız olsa da aynı damgayı yazabiliyordu. Yeni sürüm damgaları monoton artırır.
      return Boolean(stored && storedStamp > 0 && storedStamp >= local);
    }

    function isVitaActiveUser(userId) {
      return Boolean(userId) && String(activeUserId || "") === String(userId);
    }

    function persistVitaExtendedData(userId, updatedAt = Date.now()) {
      if (!userId || !window.indexedDB) return Promise.resolve(false);
      const snapshot = buildVitaExtendedSnapshot(userId, updatedAt);
      vitaIndexedDbWriteQueue = vitaIndexedDbWriteQueue.then(() => vitaIndexedDbRequest("extendedData", "readwrite", "put", snapshot)).then(() => true).catch(error => {
        if (!vitaIndexedDbNoticeShown) {
          vitaIndexedDbNoticeShown = true;
          console.warn("VitaTakip IndexedDB yazımı başarısız; localStorage yedeği korunuyor.", error);
        }
        return false;
      });
      return vitaIndexedDbWriteQueue;
    }

    async function restoreVitaExtendedData(userId) {
      if (!userId || !window.indexedDB) return false;
      const normalizedUserId = String(userId);
      try {
        const stored = await vitaIndexedDbRequest("extendedData", "readonly", "get", normalizedUserId);
        const localStamp = Number(safeLocalStorageGetItem(`vitatakip_extended_updated_${normalizedUserId}`) || 0) || 0;
        if (!stored) {
          // Asenkron okuma sırasında hesap değişmiş olabilir. Yeni kullanıcının state'ini
          // yanlışlıkla önceki kullanıcının anahtarıyla IndexedDB'ye yazma.
          if (isVitaActiveUser(normalizedUserId)) {
            await persistVitaExtendedData(normalizedUserId, Math.max(localStamp, Date.now()));
          }
          return false;
        }

        if (shouldRestoreVitaExtendedSnapshot(stored, localStamp)) {
          if (!isVitaActiveUser(normalizedUserId)) return false;

          // v1 eski anlık görüntüleri yalnızca bu alanları içerir. Eksik alanlar
          // localStorage'dan yüklenen mevcut state'i korur; v2 tam state'i geri yükler.
          if (stored.snapshotVersion >= 2) {
            if (stored.user && typeof stored.user === "object") state.user = stored.user;
            if (Array.isArray(stored.supplements)) state.supplements = stored.supplements;
            if (stored.hydration && typeof stored.hydration === "object") state.hydration = stored.hydration;
            if (stored.supplementReviews && typeof stored.supplementReviews === "object") state.supplementReviews = stored.supplementReviews;
            if (stored.lastCDSS && typeof stored.lastCDSS === "object") state.lastCDSS = stored.lastCDSS;
            if (typeof stored.doctorNotes === "string") safeLocalStorageSetItem(`vitatakip_notes_${normalizedUserId}`, stored.doctorNotes);
          }
          if (Array.isArray(stored.labHistory)) state.labHistory = stored.labHistory;
          if (stored.labValues && typeof stored.labValues === "object") state.labValues = stored.labValues;
          if (stored.labReferences && typeof stored.labReferences === "object") state.labReferences = stored.labReferences;
          if (Array.isArray(stored.selectedSymptoms) && stored.selectedSymptoms.length > 0) {
            state.selectedSymptoms = new Set([...(state.selectedSymptoms || []), ...stored.selectedSymptoms]);
          }
          state.selectedSymptomsArray = Array.from(state.selectedSymptoms || []);
          if (Array.isArray(stored.resolvedSymptoms)) state.resolvedSymptoms = new Set(stored.resolvedSymptoms);
          if (!state.lastCDSS && state.selectedSymptoms instanceof Set && state.selectedSymptoms.size > 0 && typeof executeCDSSRules === "function") {
            executeCDSSRules();
          }

          // Restore sonrası localStorage'ı mümkün olduğunca eşitle. Quota sorunu varsa
          // saveState tam snapshot'ı tekrar IndexedDB'ye de kuyruğa alır.
          saveState();
          return true;
        }

        // LocalStorage kesin olarak daha yeni ise onu esas alıp IndexedDB snapshot'ını güncelle.
        // Ancak hesap değiştiyse başka kullanıcının aktif state'ini bu userId'ye yazma.
        if (!isVitaActiveUser(normalizedUserId)) return false;
        await persistVitaExtendedData(normalizedUserId, localStamp || Date.now());
      } catch (error) {
        console.warn("IndexedDB kayıtları okunamadı; localStorage yedeği kullanılmaya devam ediliyor.", error);
      }
      return false;
    }

    async function logVitaPdfScan(userId, file, pageCount, detectedCount) {
      if (!userId || !file) return;
      const log = {
        id: `pdfscan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId: String(userId), fileName: String(file.name || "Tahlil.pdf").slice(0, 160),
        fileSizeBytes: Number(file.size || 0), pageCount: Number(pageCount || 0),
        detectedTestCount: Number(detectedCount || 0), scannedAt: new Date().toISOString()
      };
      const fallbackKey = `vitatakip_pdfscanlogs_${userId}`;
      const history = readStoredJSON(fallbackKey, []);
      safeLocalStorageSetItem(fallbackKey, JSON.stringify([...((Array.isArray(history) ? history : [])), log].slice(-40)));
      if (window.indexedDB) {
        try { await vitaIndexedDbRequest("pdfScanLogs", "readwrite", "put", log); }
        catch (error) { console.warn("PDF tarama günlüğü IndexedDB'ye yazılamadı; localStorage yedeği mevcut.", error); }
      }
    }

    function mergeVitaPdfScanLogs(indexedRows, fallbackRows, userId) {
      const wantedUser = String(userId || "");
      const byId = new Map();
      // Önce fallback'i ekle, sonra IndexedDB kayıtlarını ekleyerek aynı id için
      // IndexedDB sürümünü önceliklendir. İki kaynak boşken de [] döndürür.
      [...(Array.isArray(fallbackRows) ? fallbackRows : []), ...(Array.isArray(indexedRows) ? indexedRows : [])].forEach(row => {
        if (!row || String(row.userId || "") !== wantedUser || !row.id) return;
        byId.set(String(row.id), row);
      });
      return Array.from(byId.values())
        .sort((a, b) => String(b.scannedAt || "").localeCompare(String(a.scannedAt || "")))
        .slice(0, 100);
    }

    async function getVitaPdfScanLogs(userId = activeUserId) {
      if (!userId) return [];
      const fallback = readStoredJSON(`vitatakip_pdfscanlogs_${userId}`, []);
      if (window.indexedDB) {
        try {
          const rows = await vitaIndexedDbRequest("pdfScanLogs", "readonly", "getAll");
          return mergeVitaPdfScanLogs(rows, fallback, userId);
        } catch (error) { console.warn("PDF tarama günlüğü IndexedDB'den okunamadı; localStorage yedeği birleştiriliyor.", error); }
      }
      return mergeVitaPdfScanLogs([], fallback, userId);
    }

    function isVitaLabReferenceCompatible(key, referenceText) {
      const text = String(referenceText || "").toLowerCase().replace(/[μµ]/g, "u").replace(/\s+/g, "");
      if (!text) return false;
      const units = ["ng/ml", "ug/ml", "ug/dl", "pg/ml", "mg/dl", "mmol/l", "nmol/l", "pmol/l", "umol/l", "ug/l", "u/l", "iu/l", "g/dl", "g/l", "fl", "mg/l", "meq/l"];
      const detected = units.find(unit => text.includes(unit));
      const allowed = {
        d3: ["ng/ml", "nmol/l"], b12: ["pg/ml", "ng/l", "pmol/l"], ferritin: ["ng/ml", "ug/l", "pmol/l"], mg: ["mg/dl", "mmol/l", "meq/l"],
        ca: ["mg/dl", "mmol/l"], zinc: ["ug/dl", "umol/l"], creatinine: ["mg/dl", "umol/l"], folate: ["ng/ml", "nmol/l"], alt: ["u/l", "iu/l"],
        hb: ["g/dl", "g/l"], mcv: ["fl"], crp: ["mg/l", "mg/dl"]
      }[key] || [];
      if (detected) return allowed.includes(detected);
      // Birim yazılmamışsa fakat sayısal aralık parametrenin makul sınırları içindeyse uyumlu kabul et
      const range = parseVitaLabReferenceRange(referenceText);
      if (!range) return false;
      const plausible = {
        d3: [1, 250], b12: [20, 5000], ferritin: [1, 5000], mg: [0.3, 10],
        ca: [4, 20], zinc: [5, 500], creatinine: [0.1, 15], folate: [0.2, 100], alt: [0, 500],
        hb: [3, 25], mcv: [40, 150], crp: [0, 500]
      }[key];
      if (!plausible) return false;
      const [lo, hi] = plausible;
      const minOk = !Number.isFinite(range.min) || (range.min >= lo * 0.2 && range.min <= hi);
      const maxOk = !Number.isFinite(range.max) || (range.max >= lo && range.max <= hi * 1.5);
      return minOk && maxOk;
    }

    function parseVitaLabReferenceRange(referenceText) {
      const text = String(referenceText || "").replace(/,/g, ".").trim();
      if (!text) return null;
      const range = text.match(/(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)/);
      if (range) return { min: Number(range[1]), max: Number(range[2]) };
      const comparator = text.match(/([<>≤≥])\s*(-?\d+(?:\.\d+)?)/);
      if (!comparator) return null;
      const n = Number(comparator[2]);
      if (comparator[1] === "<" || comparator[1] === "≤") return { min: -Infinity, max: n };
      return { min: n, max: Infinity };
    }

    const VITA_LAB_INPUTS = [
      ["inputLabD3", "d3"], ["inputLabB12", "b12"], ["inputLabFerritin", "ferritin"],
      ["inputLabMg", "mg"], ["inputLabCalcium", "ca"], ["inputLabZinc", "zinc"],
      ["inputLabCreatinine", "creatinine"], ["inputLabFolate", "folate"], ["inputLabAlt", "alt"],
      ["inputLabHb", "hb"], ["inputLabMcv", "mcv"], ["inputLabCrp", "crp"]
    ];

    function parseVitaLabDecimal(raw) {
      if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
      const normalized = String(raw ?? "").trim().replace(/\s+/g, "").replace(/,/g, ".");
      if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;
      const value = Number(normalized);
      return Number.isFinite(value) ? value : null;
    }
    function updateVitaLabLiveFeedback(inputId, key) {
      const input = document.getElementById(inputId);
      if (!input) return;
      let status = document.getElementById(`vitaLabFeedback-${key}`);
      if (!status) {
        status = document.createElement("div");
        status.id = `vitaLabFeedback-${key}`;
        status.className = "vita-lab-live-status vita-neutral";
        status.setAttribute("aria-live", "polite");
        const wrapper = input.closest(".relative") || input.parentElement;
        if (wrapper && wrapper.parentElement) wrapper.parentElement.insertBefore(status, wrapper.nextSibling);
      }
      input.classList.remove("border-emerald-500", "border-amber-500", "border-rose-500", "ring-1", "ring-emerald-200", "ring-amber-200", "ring-rose-200");
      const raw = String(input.value || "").trim();
      if (!raw || parseVitaLabDecimal(raw) === null) {
        status.className = "vita-lab-live-status vita-neutral";
        status.textContent = raw ? "Sayısal bir değer girin." : "";
        return;
      }
      const val = parseVitaLabDecimal(raw);
      const result = KDSSRuleEngine.evaluate(key, val, state.user?.gender || "K", state.labReferences?.[key] || '');
      const parsedReference = isVitaLabReferenceCompatible(key, state.labReferences?.[key] || "") ? parseVitaLabReferenceRange(state.labReferences?.[key]) : null;
      const outsideReference = parsedReference && (val < parsedReference.min || val > parsedReference.max);
      let tone = "good", message = parsedReference ? "✓ Hastane referans aralığında (ön bilgilendirme)" : "✓ Genel aralıkta (laboratuvar referansı girilmedi)", border = "border-emerald-500", ring = "ring-emerald-200";
      if (result.status) {
        // VitaLabEvidence tabanlı durumlar: referans aralığı, klinik değerlendirme ve belirsizlik ayrı gösterilir.
        if (result.status === "urgent") {
          tone = "danger"; message = "⛔ Acil klinik değerlendirme gerekli — hekime başvurun"; border = "border-rose-500"; ring = "ring-rose-200";
        } else if (result.status === "not_assessable") {
          tone = "warn"; message = "⚠ Birim veya referans aralığı doğrulanamadı; değerlendirme yapılamadı"; border = "border-amber-500"; ring = "ring-amber-200";
        } else if (result.status === "borderline") {
          tone = "warn"; message = "⚠ Sınırda — ek değerlendirme gerekebilir; tek başına takviye gereksinimini kesinleştirmez"; border = "border-amber-500"; ring = "ring-amber-200";
        } else if (result.status === "below_ref" || result.status === "above_ref") {
          tone = "warn"; message = `⚠ ${result.status === "below_ref" ? "Referans altı" : "Referans üstü"}${result.referenceSource === "lab" ? "" : " (genel aralığa göre)"} — klinik önem diğer bulgularla değerlendirilmeli`; border = "border-amber-500"; ring = "ring-amber-200";
        } else {
          message = result.referenceSource === "lab" ? "✓ Laboratuvar referans aralığında" : "✓ Genel aralıkta (laboratuvar referansı girilmedi)";
        }
      } else if (result.tier === "critical_low" || result.tier === "critical_high" || result.isToxic) {
        tone = "danger"; message = `⛔ Kritik Düzey — hekim değerlendirmesi gerekli (${result.statusText || "güvenlik eşiği"})`; border = "border-rose-500"; ring = "ring-rose-200";
      } else if (result.tier === "borderline_low" || result.tier === "high" || outsideReference) {
        tone = "warn"; message = `⚠ ${outsideReference ? "Hastane referans aralığı dışında" : result.statusText || "Sınırda Düşük / Sınırda Değer"} — hekimle değerlendirin`; border = "border-amber-500"; ring = "ring-amber-200";
      }
      input.classList.add(border, "ring-1", ring);
      status.className = `vita-lab-live-status vita-${tone}`;
      status.textContent = message;
    }

    function installVitaLabLiveFeedback() {
      VITA_LAB_INPUTS.forEach(([inputId, key]) => {
        const input = document.getElementById(inputId);
        if (!input || input.dataset.vitaLiveFeedbackInstalled === "true") return;
        input.dataset.vitaLiveFeedbackInstalled = "true";
        input.addEventListener("input", () => updateVitaLabLiveFeedback(inputId, key));
        input.addEventListener("change", () => updateVitaLabLiveFeedback(inputId, key));
        updateVitaLabLiveFeedback(inputId, key);
      });
    }

    function saveState() {
      if (!activeUserId) return false;
      const userId = String(activeUserId);
      try {
        const writes = [];
        if (state.user) writes.push([`vitatakip_user_${userId}`, JSON.stringify(state.user)]);
        writes.push(
          [`vitatakip_supplements_${userId}`, JSON.stringify(state.supplements)],
          [`vitatakip_hydration_${userId}`, JSON.stringify(state.hydration)],
          [`vitatakip_labs_${userId}`, JSON.stringify(state.labValues)],
          [`vitatakip_labreferences_${userId}`, JSON.stringify(state.labReferences || {})],
          [`vitatakip_labhistory_${userId}`, JSON.stringify(state.labHistory)],
          [`vitatakip_symptoms_${userId}`, JSON.stringify(Array.from(state.selectedSymptoms))],
          [`vitatakip_resolved_symptoms_${userId}`, JSON.stringify(Array.from(state.resolvedSymptoms))],
          [`vitatakip_reviews_${userId}`, JSON.stringify(state.supplementReviews || {})]
        );
        if (state.lastCDSS) writes.push([`vitatakip_cdss_${userId}`, JSON.stringify(state.lastCDSS)]);
        let allSaved = true;
        writes.forEach(([key, value]) => { if (!safeLocalStorageSetItem(key, value)) allSaved = false; });

        const updatedAt = nextVitaExtendedStamp(userId);
        if (allSaved) {
          const stampOk = safeLocalStorageSetItem(`vitatakip_extended_updated_${userId}`, String(updatedAt));
          const markerOk = safeLocalStorageSetItem(`vitatakip_local_save_complete_${userId}`, "true");
          allSaved = stampOk && markerOk;
        } else {
          // Önemli: eksik localStorage yazımında güncel damga yazılmaz. Böylece IndexedDB
          // snapshot'ı daha yeni kalır ve bir sonraki açılışta geri yükleme kazanır.
          safeLocalStorageSetItem(`vitatakip_local_save_complete_${userId}`, "false");
        }

        // IndexedDB tam snapshot'tır; localStorage yazımı başarılı olsa da senkronize edilir.
        persistVitaExtendedData(userId, updatedAt);
        try {
          if (typeof isCloudAutoSyncEnabled === "function" && isCloudAutoSyncEnabled() && typeof getLinkedGoogleCloudAccount === "function") {
            const linkedAcc = getLinkedGoogleCloudAccount();
            if (linkedAcc && linkedAcc.connected && linkedAcc.email && typeof syncDataToCloudNow === "function") {
              syncDataToCloudNow(false);
            }
          }
        } catch (cloudSyncErr) {
          console.warn("Otomatik bulut yedekleme sırasında uyarı:", cloudSyncErr);
        }
        return allSaved;
      } catch (error) {
        notifyLocalStorageProblem(error);
        // Senkron serialize/depola hatasına rağmen IndexedDB yedeklemesini dene.
        try { persistVitaExtendedData(userId, nextVitaExtendedStamp(userId)); } catch (_) {}
        return false;
      }
    }

    function calculateBmiValue(heightCm, weightKg) {
      if (!heightCm || !weightKg) return { bmi: 0, category: "Belirsiz", badgeColor: "bg-slate-100 text-slate-700", isAdipose: false };
      const heightM = heightCm / 100;
      const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));
      let category = "İdeal Kilo", badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300", isAdipose = false;

      if (bmi < 18.5) { category = "Zayıf"; badgeColor = "bg-amber-50 text-amber-800 border-amber-300"; }
      else if (bmi >= 18.5 && bmi <= 24.9) { category = "İdeal Kilo"; badgeColor = "bg-emerald-50 text-emerald-800 border-emerald-300"; }
      else if (bmi >= 25.0 && bmi <= 29.9) { category = "Fazla Kilolu"; badgeColor = "bg-amber-50 text-amber-800 border-amber-300"; isAdipose = true; }
      else { category = "Obezite"; badgeColor = "bg-rose-50 text-rose-800 border-rose-300"; isAdipose = true; }

      return { bmi, category, badgeColor, isAdipose };
    }

    function recalculateUserBmi() {
      if (!state.user) return;
      const res = calculateBmiValue(state.user.height, state.user.weight);
      state.user.bmi = res.bmi;
      state.user.bmiCategory = res.category;
      state.user.bmiBadgeColor = res.badgeColor;
      state.user.isAdipose = res.isAdipose;
    }

    function updateDynamicTargetHydration() {
      if (state.user && state.user.weight) {
        const baseWater = Math.round(state.user.weight * 35);
        let supplementBonus = 0;

        if (state.supplements && state.supplements.length > 0) {
          state.supplements.forEach(sup => {
            const key = ((sup.formKey || "") + " " + (sup.name || "")).toLowerCase();
            if (key.includes("kreatin") || key.includes("creatine")) supplementBonus += 400;
            else if (key.includes("kolajen") || key.includes("collagen")) supplementBonus += 250;
            else if (key.includes("magnezyum") || key.includes("demir")) supplementBonus += 200;
            else supplementBonus += 150;
          });
        }

        state.hydration.baseTarget = baseWater;
        state.hydration.supplementBonus = supplementBonus;
        state.hydration.target = baseWater + supplementBonus;

        const hydrationTagEl = document.getElementById("homeHydrationTag");
        if (hydrationTagEl) {
          const chronicList = Array.isArray(state.user.chronic) ? state.user.chronic : [];
          const hasRenalOrDiuretic = chronicList.includes("kidney") || chronicList.includes("diuretic");
          if (hasRenalOrDiuretic) {
            hydrationTagEl.textContent = "⚠️ Böbrek / Diüretik: Sıvı Miktarını Hekiminize Göre Ayarlayın";
            hydrationTagEl.className = "text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300";
          } else {
            hydrationTagEl.textContent = "35ml/kg + Takviye Bonusu";
            hydrationTagEl.className = "text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800";
          }
        }
      }
    }

    function updateTimeBasedGreetings() {
      const now = new Date();
      const hour = now.getHours();
      let slot = "İyi Günler";
      if (hour >= 6 && hour < 12) slot = "Günaydın";
      else if (hour >= 12 && hour < 18) slot = "Tünaydın";
      else slot = "İyi Akşamlar";

      if (state.user) {
        const p = state.user;
        const stageInfo = getLifeStageProfile(p.age);

        const hTime = document.getElementById("homeGreetingTime");
        const hName = document.getElementById("homeGreetingName");
        const hBmi = document.getElementById("homeGreetingBmi");
        const hDesc = document.getElementById("homeGreetingDesc");
        const headerName = document.getElementById("headerUserName");
        const drawerName = document.getElementById("drawerUserName");
        const drawerBmi = document.getElementById("drawerBmiBadge");
        const drawerHW = document.getElementById("drawerUserWeightHeight");

        if (hTime) hTime.textContent = slot;
        if (hName) hName.textContent = `${slot}, ${p.name || 'Kullanıcı'}!`;
        if (hBmi) hBmi.textContent = `VKİ: ${p.bmi} (${p.bmiCategory})`;
        if (hDesc) {
          hDesc.innerHTML = `
            <span>${escapeHtmlText(stageInfo.stage)}</span> • 
            <span class="font-bold text-teal-200">${escapeHtmlText(p.weight)} kg, ${escapeHtmlText(p.height)} cm</span> • 
            <span>${escapeHtmlText(stageInfo.desc)}</span>
          `;
        }
        if (headerName) headerName.textContent = p.name || "Kullanıcı";
        if (drawerName) drawerName.textContent = p.name || "Kullanıcı";
        if (drawerBmi) drawerBmi.textContent = `VKİ: ${p.bmi}`;
        if (drawerHW) drawerHW.textContent = `${p.weight} kg / ${p.height} cm`;

      }
    }

    function getLifeStageProfile(age) {
      if (age >= 1 && age <= 5) return { stage: "Erken Çocukluk Evresi (1-5 Yaş)", desc: "Kemik mineral matrisi ve nöronal sinaptogenez evresidir." };
      else if (age <= 12) return { stage: "Okul Çağı Evresi (6-12 Yaş)", desc: "Yoğun kognitif faaliyet ve bağışıklık adaptasyonu evresidir." };
      else if (age <= 18) return { stage: "Adölesan / Ergenlik Evresi (13-18 Yaş)", desc: "Hızlı boy uzaması ve kas kütlesi dengesi izlenmelidir." };
      else if (age <= 34) return { stage: "Genç Yetişkinlik Evresi (19-34 Yaş)", desc: "Hücresel ATP sentezi, mitokondriyal enerji ve endojen doku dengesi." };
      else if (age <= 49) return { stage: "Olgun Yetişkinlik Evresi (35-49 Yaş)", desc: "Beslenme, belirtiler ve sağlık geçmişi kişiye göre değerlendirilmelidir; yaş tek başına takviye gereksinimini göstermez." };
      else if (age <= 64) return { stage: "Orta Yaş & Geçiş Evresi (50-64 Yaş)", desc: "Bazı besinlerin emilimi ve kemik sağlığı kişiye göre değişebilir; belirtiler ve tahlillerle birlikte değerlendirilmelidir." };
      else return { stage: "İleri Yaş / Geriatrik Koruma Evresi (65+ Yaş)", desc: "Kas gücü, kemik sağlığı, böbrek işlevi, beslenme ve kullanılan ilaçlar kişiye göre değerlendirilmelidir." };
    }

    function openProfileModal(canClose = true) {
      const modal = document.getElementById("profileModal");
      const closeBtn = document.getElementById("btnProfileModalClose");
      const title = document.getElementById("profileModalTitle");

      const firstRunNotice = document.getElementById("profileFirstRunNotice");
      if (canClose) {
        if (closeBtn) closeBtn.classList.remove("hidden");
        if (title) title.textContent = "Biyolojik Profilinizi, İlaçlarınızı & Boy/Kilonuzu Düzenleyin";
        if (firstRunNotice) firstRunNotice.classList.remove("is-visible");
      } else {
        if (closeBtn) closeBtn.classList.add("hidden");
        if (title) title.textContent = "VitaTakip Profilinizi Oluşturun";
        if (firstRunNotice) firstRunNotice.classList.add("is-visible");
      }

      if (state.user) {
        document.getElementById("modalInputName").value = state.user.name || "";
        document.getElementById("modalInputAge").value = state.user.age || 28;
        document.getElementById("modalInputGender").value = state.user.gender || "K";
        document.getElementById("modalInputHeight").value = state.user.height || 168;
        document.getElementById("modalInputWeight").value = state.user.weight || 68;
        document.getElementById("modalInputActivity").value = state.user.activity || "sedentary";
        const lifestyleValues = [["modalDietPattern", state.user.dietPattern || "unspecified"], ["modalFishPerWeek", state.user.fishPerWeek || "unspecified"], ["modalRedMeatPerWeek", state.user.redMeatPerWeek || "unspecified"], ["modalSunExposure", state.user.sunExposureDaily || "unspecified"]];
        lifestyleValues.forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.value = value; });

        const chronicBoxes = document.querySelectorAll('input[name="modal_chronic"]');
        chronicBoxes.forEach(b => { b.checked = (state.user.chronic || []).includes(b.value); });
        const customMedInput = document.getElementById("modalCustomMedications");
        if (customMedInput) {
          customMedInput.value = Array.isArray(state.user.medications) ? state.user.medications.join(", ") : "";
        }
        const noneBox = document.getElementById("modalChronicNone");
        if (noneBox) {
          const hasAnyMed = (state.user.chronic && state.user.chronic.length > 0) || (state.user.medications && state.user.medications.length > 0);
          noneBox.checked = !hasAnyMed;
        }
      }
      restoreProfileDraft();

      if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
    }

    function closeProfileModal() {
      const modal = document.getElementById("profileModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
      startVitaSpotlightIfFirstVisit();
    }

    function toggleModalChronicNone(noneCheckbox) {
      if (noneCheckbox.checked) {
        document.querySelectorAll('input[name="modal_chronic"]').forEach(cb => { cb.checked = false; });
        const customMedInput = document.getElementById("modalCustomMedications");
        if (customMedInput) customMedInput.value = "";
      }
    }

    function saveProfileDraft() {
      if (!activeUserId) return;
      const getValue = id => {
        const el = document.getElementById(id);
        return el ? el.value : "";
      };
      const draft = {
        name: getValue("modalInputName"), age: getValue("modalInputAge"), gender: getValue("modalInputGender"),
        height: getValue("modalInputHeight"), weight: getValue("modalInputWeight"), activity: getValue("modalInputActivity"),
        dietPattern: getValue("modalDietPattern"), fishPerWeek: getValue("modalFishPerWeek"), redMeatPerWeek: getValue("modalRedMeatPerWeek"), sunExposureDaily: getValue("modalSunExposure"),
        chronic: Array.from(document.querySelectorAll('input[name="modal_chronic"]:checked')).map(el => el.value),
        customMedications: getValue("modalCustomMedications"),
        none: !!document.getElementById("modalChronicNone")?.checked,
        savedAt: Date.now()
      };
      try { safeLocalStorageSetItem(`vitatakip_profiledraft_${activeUserId}`, JSON.stringify(draft)); } catch (e) {}
    }

    function restoreProfileDraft() {
      if (!activeUserId) return;
      let draft = null;
      try { draft = JSON.parse(safeLocalStorageGetItem(`vitatakip_profiledraft_${activeUserId}`) || "null"); } catch (e) {}
      if (!draft) return;
      const pairs = [["modalInputName","name"],["modalInputAge","age"],["modalInputGender","gender"],["modalInputHeight","height"],["modalInputWeight","weight"],["modalInputActivity","activity"],["modalDietPattern","dietPattern"],["modalFishPerWeek","fishPerWeek"],["modalRedMeatPerWeek","redMeatPerWeek"],["modalSunExposure","sunExposureDaily"],["modalCustomMedications","customMedications"]];
      pairs.forEach(([id,key]) => {
        const el = document.getElementById(id);
        if (el && draft[key] !== undefined && draft[key] !== "") el.value = draft[key];
      });
      document.querySelectorAll('input[name="modal_chronic"]').forEach(el => { el.checked = Array.isArray(draft.chronic) && draft.chronic.includes(el.value); });
      const noneBox = document.getElementById("modalChronicNone");
      if (noneBox) noneBox.checked = !!draft.none || ((!Array.isArray(draft.chronic) || draft.chronic.length === 0) && !draft.customMedications);
    }

    function clearProfileDraft() {
      if (!activeUserId) return;
      try { safeLocalStorageRemoveItem(`vitatakip_profiledraft_${activeUserId}`); } catch (e) {}
    }

    function saveUserProfileFromModal() {
      const name = document.getElementById("modalInputName").value.trim();
      const age = parseInt(document.getElementById("modalInputAge").value);
      const gender = document.getElementById("modalInputGender").value;
      const height = parseFloat(document.getElementById("modalInputHeight").value);
      const weight = parseFloat(document.getElementById("modalInputWeight").value);
      const activity = document.getElementById("modalInputActivity").value;

      if (!name || isNaN(age) || isNaN(height) || isNaN(weight)) {
        showToast("Eksik Bilgi", "Lütfen tüm zorunlu alanları doldurunuz.", "warning");
        return;
      }

      const users = getUsersDb();
      const currentAccount = users.find(u => u.id === activeUserId);
      if (currentAccount && currentAccount.fullName !== name) {
        currentAccount.fullName = name;
        saveUsersDb(users);
      }

      const chronic = [];
      let medications = [];
      const noneBox = document.getElementById("modalChronicNone");
      if (!noneBox || !noneBox.checked) {
        document.querySelectorAll('input[name="modal_chronic"]:checked').forEach(cb => chronic.push(cb.value));
        const customMedStr = (document.getElementById("modalCustomMedications")?.value || "").trim();
        if (customMedStr) {
          medications = customMedStr.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
          if (typeof VITA_CLINICAL_DRUG_NUTRIENT_DB !== "undefined") {
            medications.forEach(med => {
              const lower = med.toLowerCase();
              VITA_CLINICAL_DRUG_NUTRIENT_DB.quickMedicationClasses.forEach(cls => {
                if (cls.keywords.some(kw => lower.includes(kw)) && !chronic.includes(cls.code)) {
                  chronic.push(cls.code);
                }
              });
            });
          }
        }
      }

      const bmiData = calculateBmiValue(height, weight);
      state.user = { name, age, gender, height, weight, bmi: bmiData.bmi, bmiCategory: bmiData.category, bmiBadgeColor: bmiData.badgeColor, isAdipose: bmiData.isAdipose, chronic, medications, activity,
        dietPattern: document.getElementById("modalDietPattern")?.value || "unspecified",
        fishPerWeek: document.getElementById("modalFishPerWeek")?.value || "unspecified",
        redMeatPerWeek: document.getElementById("modalRedMeatPerWeek")?.value || "unspecified",
        sunExposureDaily: document.getElementById("modalSunExposure")?.value || "unspecified" };

      recalculateSupplementsForNewWeight();
      updateDynamicTargetHydration();
      saveState();
      clearProfileDraft();
      closeProfileModal();
      try { renderAllAppViews(); }
      catch (renderError) { console.error("Profil kaydedildi ancak bazı ekranlar yenilenemedi:", renderError); }
      showToast("Profil Güncellendi", `VKİ: ${state.user.bmi} (${state.user.bmiCategory})`, "success");
    }

    function recalculateSupplementsForNewWeight() {
      if (!state.user || !state.supplements.length) return;
      const w = state.user.weight;
      state.supplements.forEach(item => {
        if (item.formKey && FORM_DOSAGE_CONFIG[item.formKey]) {
          const cfg = FORM_DOSAGE_CONFIG[item.formKey];
          const formFn = cfg.forms[item.selectedForm];
          if (formFn) {
            const evaluated = formFn(w);
            item.doseText = evaluated.doseText;
            item.subText = evaluated.subText;
            item.instruction = evaluated.instruction;
            item.timing = evaluated.timing;
          }
        }
      });
    }

    function renderAllAppViews() {
      if (removeLegacyDemoSupplements() && activeUserId) {
        safeLocalStorageSetItem(`vitatakip_supplements_${activeUserId}`, JSON.stringify(state.supplements));
      }
      updateTimeBasedGreetings();
      renderDailyTab();
      syncCDSSDemographics();
      syncAnamnesisCardsUI();
      renderLabHistoryUI();
      evaluateTrendAndDecisionSupport(false);
      detectSupplementConflicts();
      checkPendingSymptomReviews();
      if (state.activeTab === "view-labs") renderBiomarkerTrendChart();
      renderReportTab();
      if (typeof refreshCloudSyncUI === "function") refreshCloudSyncUI();
    }

    let toastTimeout = null;
    function showToast(title, message, type = "success") {
      const toast = document.getElementById("toastNotification");
      const titleEl = document.getElementById("toastTitle");
      const msgEl = document.getElementById("toastMessage");
      const iconEl = document.getElementById("toastIcon");
      const containerEl = document.getElementById("toastIconContainer");
      if (!toast) return;

      titleEl.textContent = title;
      msgEl.textContent = message;

      if (type === "success") {
        containerEl.className = "w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center flex-shrink-0";
        iconEl.className = "fa-solid fa-check";
      } else if (type === "warning") {
        containerEl.className = "w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0";
        iconEl.className = "fa-solid fa-triangle-exclamation";
      } else if (type === "info") {
        containerEl.className = "w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0";
        iconEl.className = "fa-solid fa-circle-info";
      } else {
        containerEl.className = "w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0";
        iconEl.className = "fa-solid fa-circle-exclamation";
      }

      toast.classList.remove("translate-y-20", "opacity-0", "pointer-events-none");
      toast.classList.add("translate-y-0", "opacity-100");

      if (toastTimeout) clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.add("translate-y-20", "opacity-0", "pointer-events-none");
        toast.classList.remove("translate-y-0", "opacity-100");
      }, 3500);
    }

    function renderDynamicAbsorptionPanel() {
      const container = document.getElementById("dynamicAbsorptionPanel");
      if (!container) return;
      container.innerHTML = "";

      if (state.supplements.length === 0) {
        container.innerHTML = `
          <div class="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs flex items-center gap-2.5">
            <i class="fa-solid fa-circle-info text-teal-600 text-sm flex-shrink-0"></i>
            <p class="leading-relaxed">Takip listenizde takviye olduğunda emilim ve etkileşim kuralları burada aktifleşir.</p>
          </div>
        `;
        return;
      }

      const supNames = state.supplements.map(s => (s.name + " " + (s.formKey || "")).toLowerCase());
      const chronicList = state.user?.chronic || [];

      const hasIron = supNames.some(n => n.includes("demir") || n.includes("iron") || /\bfe\b/.test(n));
      const hasCalcium = supNames.some(n => n.includes("kalsiyum") || n.includes("calcium"));
      const hasD3 = supNames.some(n => n.includes("d3") || n.includes("d vitamini") || n.includes("d3_k2"));
      const hasOmega3 = supNames.some(n => n.includes("omega") || n.includes("balık yağı") || n.includes("epa"));
      const hasMg = supNames.some(n => n.includes("magnezyum") || n.includes("magnesium"));
      const hasB12 = supNames.some(n => n.includes("b12") || n.includes("kobalamin") || n.includes("cobalamin"));
      const hasFolate = supNames.some(n => n.includes("folat") || n.includes("folik") || n.includes("5-mthf"));

      const hasPPI = chronicList.includes("ppi");
      const hasMetformin = chronicList.includes("metformin");
      const hasDiuretic = chronicList.includes("diuretic");

      const rulesFound = [];

      if (hasPPI) {
        rulesFound.push({
          type: "danger", icon: "fa-capsules", color: "border-amber-300 bg-amber-50 text-amber-950",
          title: "⚠️ İlaç Etkileşimi: Mide Koruyucu (PPI) & Emilim Azalması",
          text: "Mide asidiniz baskılandığı için gıdalardan ve standart tabletlerden B12, Demir ve Magnezyum emilimi ciddi oranda bozulur. Hekim önerisiyle Dilaltı B12 ve Lipozomal Demir formları değerlendirilmelidir."
        });
      }

      if (hasMetformin) {
        rulesFound.push({
          type: "warning", icon: "fa-pills", color: "border-sky-300 bg-sky-50 text-sky-950",
          title: "⚠️ İlaç Etkileşimi: Metformin & B12 Emilim Azalması",
          text: "Metformin, bağırsak kalsiyum bağımlı B12 vitamin emilimini azaltır. Sublingual aktif B12 formunu hekiminizle değerlendiriniz."
        });
      }

      if (hasDiuretic) {
        rulesFound.push({
          type: "warning", icon: "fa-prescription-bottle-medical", color: "border-indigo-300 bg-indigo-50 text-indigo-950",
          title: "⚠️ İlaç Etkileşimi: Tansiyon Diüretikleri & Magnezyum Kaybı",
          text: "İdrar söktürücü tansiyon ilaçları böbreklerden magnezyum atılımını hızlandırır. Şelatlı magnezyum desteği hekim gözetiminde planlanabilir."
        });
      }

      if (hasIron && hasCalcium) {
        rulesFound.push({
          type: "danger", icon: "fa-triangle-exclamation", color: "border-rose-300 bg-rose-50 text-rose-900",
          title: "⚠️ Kritik Antagonizma: Demir & Kalsiyum Çakışması",
          text: "Listenizde hem Demir hem Kalsiyum bulunmaktadır. Aynı anda alınmamalı, aralarında en az 3 saat bırakılmalıdır!"
        });
      }

      if (hasB12 && hasFolate) {
        rulesFound.push({
          type: "synergy", icon: "fa-dna", color: "border-teal-300 bg-teal-50 text-teal-950",
          title: "✨ Metilasyon Sinerjisi: B12 & Folat (5-MTHF) Ortaklığı",
          text: "B12 Vitamini ile Aktif Folat aynı hücresel metilasyon döngüsünde sinerjiktir. Sabah birlikte alınmaları biyoyararlanımı artırır."
        });
      }

      if (hasIron) {
        rulesFound.push({
          type: "iron", icon: "fa-droplet", color: "border-rose-200 bg-rose-50/60 text-rose-950",
          title: "🩸 Demir Protokolü & Gün Aşırı Emilim Kuralı",
          text: "Süt ürünleri, yumurta ve çay/kahveden en az 2 saat ayrı tutunuz. Emilimi artırmak için C vitamini ile alınız. Hepsidin blokajını engellemek için gün aşırı alım önerilir. Hekim reçetesi şarttır."
        });
      }

      if (hasD3) {
        const drops = state.user && state.user.weight ? Math.round(state.user.weight / 10) : 7;
        rulesFound.push({
          type: "d3", icon: "fa-sun", color: "border-amber-200 bg-amber-50/60 text-amber-950",
          title: `☀️ D3 / K2 Vitamini Protokolü (~${drops} Damla/Gün Simülasyonu)`,
          text: `Yağda çözünen bir vitamindir. Kilonuza orantılı simülasyon dozu yağ içeren bir ana öğünle birlikte alınmalıdır. Kesin dozu hekiminiz kan tahlilinize göre onaylamalıdır.`
        });
      }

      if (hasOmega3) {
        rulesFound.push({
          type: "omega3", icon: "fa-fish", color: "border-teal-200 bg-teal-50/60 text-teal-950",
          title: "🐟 Omega-3 Balık Yağı Protokolü",
          text: `Günün en zengin ana öğünüyle birlikte alınız. Aç karnına alındığında reflü yapabilir. Hekim kontrolünde kullanılmalıdır.`
        });
      }

      if (hasMg) {
        rulesFound.push({
          type: "mg", icon: "fa-bolt", color: "border-indigo-200 bg-indigo-50/60 text-indigo-950",
          title: "⚡ Magnezyum Protokolü",
          text: "Kas gevşemesi ve uyku kalitesini desteklemek için akşam yatmadan 1-2 saat önce alınız. Hekim önerisine danışınız."
        });
      }

      rulesFound.forEach(rule => {
        const card = document.createElement("div");
        card.className = `p-3.5 rounded-xl border ${rule.color} text-xs space-y-1`;
        card.innerHTML = `
          <strong class="font-bold flex items-center gap-1.5"><i class="fa-solid ${rule.icon}"></i> ${escapeHtmlText(rule.title)}</strong>
          <p class="text-[11px] leading-relaxed opacity-95">${escapeHtmlText(rule.text)}</p>
        `;
        container.appendChild(card);
      });
    }

    function renderChrononutritionTimeline() {
      const container = document.getElementById("chrononutritionTimelineContainer");
      if (!container) return;
      container.innerHTML = "";

      const morningItems = state.supplements.filter(s => (s.timing === "Sabah" || s.timing === "morning") && isSupplementScheduledToday(s));
      const noonItems = state.supplements.filter(s => (s.timing === "Öğle" || s.timing === "noon") && isSupplementScheduledToday(s));
      const eveningItems = state.supplements.filter(s => (s.timing === "Akşam" || s.timing === "evening") && isSupplementScheduledToday(s));

      const slots = [
        { time: "08:00", title: "Sabah - Yağlı Öğün Penceresi", desc: "Yağda eriyen D3/K2, enerji stimülasyonu sağlayan dilaltı B12 ve Metilfolat (B9). (Hekim kontrolünde)", icon: "fa-sun text-amber-500", items: morningItems, badgeClass: "bg-amber-50 text-amber-800 border-amber-200" },
        { time: "13:00", title: "Öğle - Antagonizma Engeli Penceresi", desc: "Kahvaltıdaki kalsiyum ve çay/kahveden uzakta C vitaminli Demir, Omega-3 ve Kreatin.", icon: "fa-utensils text-sky-500", items: noonItems, badgeClass: "bg-sky-50 text-sky-800 border-sky-200" },
        { time: "21:30", title: "Gece - Derin Uyku & Relaksasyon", desc: "GABA aktivasyonu, kas gevşemesi ve hücresel onarım için Magnezyum ve Kolajen.", icon: "fa-moon text-indigo-500", items: eveningItems, badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200" }
      ];

      slots.forEach(slot => {
        const row = document.createElement("div");
        row.className = "flex items-start gap-2.5 sm:gap-4 p-3.5 sm:p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 transition min-w-0";

        let itemsHtml = slot.items.length === 0
          ? `<span class="text-[11px] text-slate-400 italic">Bu zaman diliminde kayıtlı takviyeniz bulunmuyor.</span>`
          : slot.items.map(item => `
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${item.taken ? 'bg-teal-100 text-teal-800 line-through' : 'bg-white text-navy-900 border border-slate-200'}">
              <i class="fa-solid fa-capsules text-teal-600 text-[10px]"></i> ${escapeHtmlText(item.name)}
            </span>
          `).join(" ");

        row.innerHTML = `
          <div class="text-center flex-shrink-0 w-11 sm:w-14">
            <span class="text-xs sm:text-sm font-black text-navy-900 block">${slot.time}</span>
            <i class="fa-solid ${slot.icon} text-sm sm:text-base mt-1"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <h4 class="text-xs font-bold text-navy-900 truncate">${slot.title}</h4>
              <span class="text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded border ${slot.badgeClass} flex-shrink-0">${slot.items.length} Ajan</span>
            </div>
            <p class="text-[11px] text-slate-500 mt-0.5 leading-relaxed">${slot.desc}</p>
            <div class="mt-2.5 flex flex-wrap gap-1.5">${itemsHtml}</div>
          </div>
        `;
        container.appendChild(row);
      });
    }

    function getSupplementBiomarkerStatus(item) {
      if (!state.user) return null;
      const gender = state.user.gender || 'K';
      const labs = state.labValues || {};
      let key = null;
      const fKey = (item.formKey || "").toLowerCase();
      const name = (item.name || "").toLowerCase();

      if (fKey === "d3_k2" || name.includes("d3") || name.includes("d vitamini")) key = 'd3';
      else if (fKey === "b12" || name.includes("b12") || name.includes("kobalamin")) key = 'b12';
      else if (fKey === "demir" || name.includes("demir") || name.includes("ferritin") || /\bfe\b/.test(name)) key = 'ferritin';
      else if (fKey === "magnezyum" || name.includes("magnezyum") || /\bmg\b/.test(name)) key = 'mg';
      else if (fKey === "folat" || name.includes("folat") || name.includes("folik") || name.includes("5-mthf")) key = 'folate';
      else if (fKey === "kreatin" || name.includes("kreatin") || name.includes("creatine")) key = 'creatinine';
      else if (name.includes("çinko") || name.includes("zinc")) key = 'zinc';
      else if (name.includes("kalsiyum") || name.includes("calcium")) key = 'ca';

      if (!key || labs[key] === null || labs[key] === undefined || isNaN(labs[key])) return null;

      const evalResult = KDSSRuleEngine.evaluate(key, labs[key], gender, state.labReferences?.[key] || '');
      return { key, val: labs[key], evalResult };
    }

    /* GÜNLÜK TAKİP LİSTESİ RENDER */
    