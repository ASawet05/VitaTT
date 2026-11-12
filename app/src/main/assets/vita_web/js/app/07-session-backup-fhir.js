function checkMidnightReset(userId) {
      if (!userId) return;
      const todayStr = new Date().toLocaleDateString("tr-TR");
      const lastDateKey = `vitatakip_lastActiveDate_${userId}`;
      const lastActiveDate = safeLocalStorageGetItem(lastDateKey);

      if (lastActiveDate && lastActiveDate !== todayStr) {
        if (state.hydration) {
          state.hydration.current = 0;
        }
        if (Array.isArray(state.supplements)) {
          state.supplements.forEach(s => { s.taken = false; });
        }
        safeLocalStorageSetItem(lastDateKey, todayStr);
        saveState();
      } else if (!lastActiveDate) {
        safeLocalStorageSetItem(lastDateKey, todayStr);
      }
    }

    function loadUserSessionData(userId) {
      labHistoryRestorePending = Boolean(userId && window.indexedDB);
      let savedAnamnesisCategory = "cat-A";
      try {
        const candidate = safeLocalStorageGetItem(`vitatakip_anamnesis_category_${userId}`);
        if (["cat-A", "cat-B", "cat-C", "cat-D", "cat-E", "cat-F", "cat-G"].includes(candidate)) savedAnamnesisCategory = candidate;
      } catch (e) {}
      resetApplicationDOMAndState();
      const users = getUsersDb();
      const currentAccount = users.find(x => x.id === userId);
      const savedUser = safeLocalStorageGetItem(`vitatakip_user_${userId}`);
      
      if (savedUser) {
        try {
          state.user = JSON.parse(savedUser);
          if (currentAccount && (!state.user.name || state.user.name.trim() === "")) state.user.name = currentAccount.fullName;
          recalculateUserBmi();
        } catch (e) {
          state.user = { ...defaultUserProfile, name: currentAccount ? currentAccount.fullName : "Kullanıcı" };
        }
      } else {
        state.user = { ...defaultUserProfile, name: currentAccount ? currentAccount.fullName : "Kullanıcı" };
      }

      const storedSupplements = readStoredJSON(`vitatakip_supplements_${userId}`, []);
      state.supplements = Array.isArray(storedSupplements) ? storedSupplements : [];
      if (removeLegacyDemoSupplements()) {
        safeLocalStorageSetItem(`vitatakip_supplements_${userId}`, JSON.stringify(state.supplements));
      }
      const storedHydration = readStoredJSON(`vitatakip_hydration_${userId}`, { current: 0, target: 2450 });
      state.hydration = storedHydration && typeof storedHydration === "object" ? { current: 0, target: 2450, ...storedHydration } : { current: 0, target: 2450 };
      const storedLabHistory = readStoredJSON(`vitatakip_labhistory_${userId}`, []);
      state.labHistory = Array.isArray(storedLabHistory) ? storedLabHistory : [];
      const parsedLabs = readStoredJSON(`vitatakip_labs_${userId}`, {});
      if (state.labHistory.length > 0) {
        state.labValues = buildLabValuesFromRecord(state.labHistory[0]);
      } else {
        state.labValues = buildLabValuesFromRecord(parsedLabs && typeof parsedLabs === "object" ? parsedLabs : {});
      }
      const parsedLabReferences = readStoredJSON(`vitatakip_labreferences_${userId}`, {});
      state.labReferences = parsedLabReferences && typeof parsedLabReferences === "object" ? parsedLabReferences : {};
      if (!Object.keys(state.labReferences || {}).length && state.labHistory[0]?.references) state.labReferences = { ...state.labHistory[0].references };
      const storedSymptoms = readStoredJSON(`vitatakip_symptoms_${userId}`, []);
      state.selectedSymptoms = new Set(Array.isArray(storedSymptoms) ? storedSymptoms : []);
      state.selectedSymptomsArray = Array.from(state.selectedSymptoms);
      const storedResolvedSymptoms = readStoredJSON(`vitatakip_resolved_symptoms_${userId}`, []);
      state.resolvedSymptoms = new Set(Array.isArray(storedResolvedSymptoms) ? storedResolvedSymptoms : []);
      const storedReviews = readStoredJSON(`vitatakip_reviews_${userId}`, {});
      state.supplementReviews = storedReviews && typeof storedReviews === "object" ? storedReviews : {};
      invalidateClinicalAnalysisCache({ clearDOM: true });

      checkMidnightReset(userId);

      const docNotesEl = document.getElementById("doctorNotesInput");
      if (docNotesEl) docNotesEl.value = safeLocalStorageGetItem(`vitatakip_notes_${userId}`) || "";

      updateDynamicTargetHydration();
      updateTimeBasedGreetings();
      restoreLabDraft();
      switchAnamnesisCategoryTab(savedAnamnesisCategory);

      const hasClinicalTrigger = typeof canRunClinicalAnalysis === "function"
        ? canRunClinicalAnalysis()
        : (state.selectedSymptoms.size > 0 || (Array.isArray(state.labHistory) && state.labHistory.length > 0));
      if (hasClinicalTrigger && typeof executeCDSSRules === "function") {
        executeCDSSRules();
      }
      // IndexedDB'de localStorage kotası nedeniyle yazılamayan/yenilenmiş arşiv varsa oturumdan sonra yükle.
      restoreVitaExtendedData(userId).then(restored => {
        if (activeUserId !== userId) return;
        labHistoryRestorePending = false;
        if (restored) {
          invalidateClinicalAnalysisCache({ clearDOM: true });
          if (typeof canRunClinicalAnalysis === "function" && canRunClinicalAnalysis() && typeof executeCDSSRules === "function") {
            executeCDSSRules();
          }
          renderAllAppViews();
          showToast("Yerel Arşiv Yüklendi", "Tahlil geçmişi ve semptom kayıtları tarayıcı içi veritabanından eşitlendi.", "info");
        } else {
          renderLabHistoryUI();
        }
      }).catch(error => {
        console.warn("IndexedDB geri yükleme başarısız; localStorage kayıtları korunuyor.", error);
        if (activeUserId === userId) {
          labHistoryRestorePending = false;
          renderLabHistoryUI();
        }
      });
    }

    /* Dosya kaydetme: Android uygulamasında yerel köprü (İndirilenler klasörü), tarayıcıda Blob bağlantısı.
       WebView data:/blob: indirmelerini kendiliğinden kaydetmediği için köprü zorunludur. */
    function vitaSaveTextFile(fileName, mimeType, text) {
      const safeFile = String(fileName || "VitaTakip.json").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 120);
      const bridge = window.AndroidVitaBridge;
      if (bridge && typeof bridge.saveTextFile === "function") {
        try { return Boolean(bridge.saveTextFile(safeFile, mimeType || "application/json", String(text))); }
        catch (error) { console.warn("Android dosya kaydı başarısız:", error); return false; }
      }
      try {
        const blob = new Blob([String(text)], { type: `${mimeType || "application/json"};charset=utf-8` });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = safeFile;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        return true;
      } catch (error) {
        console.warn("Dosya indirilemedi:", error);
        return false;
      }
    }
    window.vitaSaveTextFile = vitaSaveTextFile;

    function exportDataBackup() {
      if (!activeUserId) { showToast("Hata", "Oturum açmadan yedek alamazsınız.", "error"); return; }
      const backupPayload = {
        app: "VitaTakip", version: "9.4.0", exportDate: new Date().toISOString(),
        user: state.user, supplements: state.supplements, hydration: state.hydration,
        labValues: state.labValues, labReferences: state.labReferences || {}, labHistory: state.labHistory,
        selectedSymptoms: Array.from(state.selectedSymptoms),
        resolvedSymptoms: Array.from(state.resolvedSymptoms),
        supplementReviews: state.supplementReviews || {},
        lastCDSS: state.lastCDSS,
        doctorNotes: safeLocalStorageGetItem(`vitatakip_notes_${activeUserId}`) || ""
      };
      const safeName = String(state.user?.name || "Kullanici").replace(/\s+/g, "_");
      const fileName = `VitaTakip_Yedek_${safeName}_${new Date().toISOString().slice(0, 10)}.json`;
      if (!vitaSaveTextFile(fileName, "application/json", JSON.stringify(backupPayload, null, 2))) {
        showToast("Yedek Alınamadı", "Yedek dosyası kaydedilemedi. Depolama iznini ve boş alanı kontrol edin.", "error");
        return;
      }
      safeLocalStorageSetItem(`vitatakip_last_backup_${activeUserId}`, String(Date.now()));
      showToast("Yedek Alındı", window.AndroidVitaBridge ? `Yedek İndirilenler klasörüne kaydedildi: ${fileName}` : "Verileriniz JSON dosyası olarak indirildi.", "success");
    }

    /* ---------- Yedekten içe aktarma: tür ve aralık doğrulaması ---------- */
    /* JSON değerini güvenli biçime indirger: uzun metin/dizi kırpılır, sonsuz/NaN sayılar ve aşırı derinlik atılır. */
    function vitaSanitizeJsonValue(value, depth = 0) {
      if (value === null || value === undefined) return null;
      if (typeof value === "string") return value.slice(0, 2000);
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      if (typeof value === "boolean") return value;
      if (depth >= 6) return null;
      if (Array.isArray(value)) return value.slice(0, 1000).map(item => vitaSanitizeJsonValue(item, depth + 1));
      if (typeof value === "object") {
        const out = {};
        Object.keys(value).slice(0, 300).forEach(key => {
          if (key === "__proto__" || key === "constructor" || key === "prototype") return;
          const clean = vitaSanitizeJsonValue(value[key], depth + 1);
          if (clean !== null && clean !== undefined) out[String(key).slice(0, 120)] = clean;
        });
        return out;
      }
      return null;
    }

    function vitaNumberInRange(raw, min, max) {
      const n = typeof parseVitaLabDecimal === "function" ? parseVitaLabDecimal(raw) : Number(raw);
      return n !== null && Number.isFinite(n) && n >= min && n <= max ? n : null;
    }

    function sanitizeImportedUser(rawUser) {
      const src = vitaSanitizeJsonValue(rawUser) || {};
      const user = { ...defaultUserProfile, ...src };
      user.name = String(src.name || "").trim().slice(0, 120);
      user.gender = src.gender === "E" ? "E" : "K";
      const age = vitaNumberInRange(src.age, 1, 120);
      const height = vitaNumberInRange(src.height, 50, 250);
      const weight = vitaNumberInRange(src.weight, 2, 400);
      user.age = age !== null ? Math.round(age) : defaultUserProfile.age;
      user.height = height !== null ? height : defaultUserProfile.height;
      user.weight = weight !== null ? weight : defaultUserProfile.weight;
      /* Aralık dışı/eksik profil "tamamlandı" sayılmaz; kullanıcıdan profili gözden geçirmesi istenir.
         Eski yedeklerde bayrak yoktur: geçerli yaş/boy/kilo varsa tamamlanmış kabul edilir. */
      user.profileCompleted = (src.profileCompleted === undefined || src.profileCompleted === true) && age !== null && height !== null && weight !== null;
      user.chronic = Array.isArray(src.chronic) ? src.chronic.filter(item => typeof item === "string").map(item => item.slice(0, 60)).slice(0, 50) : [];
      ["medications", "prescriptionDrugRecords"].forEach(key => { if (key in src && !Array.isArray(src[key])) delete user[key]; });
      ["bmiCategory", "bmiBadgeColor"].forEach(key => { if (typeof user[key] !== "string") delete user[key]; });
      return user;
    }

    function sanitizeImportedLabValues(raw) {
      const out = {};
      const src = raw && typeof raw === "object" ? raw : {};
      ALL_VITA_LAB_KEYS.forEach(key => {
        const n = typeof parseVitaLabDecimal === "function" ? parseVitaLabDecimal(src[key]) : null;
        out[key] = n !== null && (typeof isVitaLabValuePlausible !== "function" || isVitaLabValuePlausible(key, n)) ? n : null;
      });
      return out;
    }

    function sanitizeImportedLabReferences(raw) {
      const out = {};
      if (!raw || typeof raw !== "object") return out;
      Object.keys(raw).forEach(key => {
        if (ALL_VITA_LAB_KEYS.includes(key) && typeof raw[key] === "string") out[key] = raw[key].trim().slice(0, 120);
      });
      return out;
    }

    function sanitizeImportedLabRecord(raw) {
      if (!raw || typeof raw !== "object" || !/^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || ""))) return null;
      const record = vitaSanitizeJsonValue(raw);
      Object.assign(record, sanitizeImportedLabValues(raw));
      record.references = sanitizeImportedLabReferences(raw.references);
      if (record.applicationReferences && typeof record.applicationReferences !== "object") delete record.applicationReferences;
      record.genderAtTest = raw.genderAtTest === "E" ? "E" : "K";
      record.id = typeof raw.id === "string" ? raw.id.slice(0, 80) : `lab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      record.timestamp = Number.isFinite(Number(raw.timestamp)) ? Number(raw.timestamp) : (new Date(`${record.date}T00:00:00`).getTime() || 0);
      return ALL_VITA_LAB_KEYS.some(key => record[key] !== null) ? record : null;
    }

    function sanitizeImportedSupplement(raw) {
      if (!raw || typeof raw !== "object" || typeof raw.name !== "string" || !raw.name.trim()) return null;
      const item = vitaSanitizeJsonValue(raw);
      item.name = raw.name.trim().slice(0, 120);
      item.id = typeof raw.id === "string" && raw.id ? raw.id.slice(0, 80) : `sup_import_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      ["kalanAdet", "toplamKutuAdedi", "gunlukDoz"].forEach(key => {
        if (key in item) { const n = vitaNumberInRange(item[key], 0, 100000); if (n === null) delete item[key]; else item[key] = n; }
      });
      if (Array.isArray(item.scheduleDays)) item.scheduleDays = item.scheduleDays.filter(d => Number.isInteger(d) && d >= 0 && d <= 6);
      item.taken = item.taken === true;
      return item;
    }

    function importDataBackup(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (!activeUserId) { showToast("Oturum Gerekli", "Yedeği yüklemek için önce bir hesap açın veya giriş yapın.", "warning"); event.target.value = ""; return; }
      if (file.size > 10 * 1024 * 1024) { showToast("Dosya çok büyük", "Yedek dosyası 10 MB'tan büyük olamaz.", "error"); event.target.value = ""; return; }

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed || typeof parsed !== "object" || parsed.app !== "VitaTakip") {
            showToast("Geçersiz Dosya", "Bu dosya geçerli bir VitaTakip yedeği değil.", "error");
            return;
          }

          if (confirm("Yedek yüklendiğinde mevcut verilerinizin üzerine yazılacaktır. Onaylıyor musunuz?")) {
            const keepName = state.user?.name;
            resetApplicationDOMAndState();
            if (parsed.user) {
              state.user = sanitizeImportedUser(parsed.user);
              /* Ekrandaki ad, giriş yapılan hesap adıyla aynı kalır (yedekteki farklı ad karışıklık yaratmaz). */
              if (keepName) state.user.name = keepName;
            }
            if (Array.isArray(parsed.supplements)) state.supplements = parsed.supplements.map(sanitizeImportedSupplement).filter(Boolean).slice(0, 300);
            if (parsed.hydration && typeof parsed.hydration === "object") {
              const current = vitaNumberInRange(parsed.hydration.current, 0, 20000);
              state.hydration = { ...state.hydration, current: current !== null ? current : 0 };
            }
            if (parsed.labValues) state.labValues = sanitizeImportedLabValues(parsed.labValues);
            if (parsed.labReferences) state.labReferences = sanitizeImportedLabReferences(parsed.labReferences);
            if (Array.isArray(parsed.labHistory)) {
              state.labHistory = parsed.labHistory.map(sanitizeImportedLabRecord).filter(Boolean).slice(0, 1000);
              state.labHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            }
            if (Array.isArray(parsed.selectedSymptoms)) state.selectedSymptoms = new Set(parsed.selectedSymptoms.filter(k => typeof k === "string" && typeof ANAMNESIS_DICTIONARY !== "undefined" && ANAMNESIS_DICTIONARY[k]));
            state.selectedSymptomsArray = Array.from(state.selectedSymptoms || []);
            if (typeof syncAnamnesisCardsUI === "function") syncAnamnesisCardsUI(); /* kartlar = veri (yoksa analiz belirtileri siler) */
            if (Array.isArray(parsed.resolvedSymptoms)) state.resolvedSymptoms = new Set(parsed.resolvedSymptoms.filter(k => typeof k === "string" && typeof ANAMNESIS_DICTIONARY !== "undefined" && ANAMNESIS_DICTIONARY[k]));
            const reviews = vitaSanitizeJsonValue(parsed.supplementReviews);
            state.supplementReviews = reviews && typeof reviews === "object" && !Array.isArray(reviews) ? reviews : {};
            if (typeof parsed.doctorNotes === "string") safeLocalStorageSetItem(`vitatakip_notes_${activeUserId}`, parsed.doctorNotes.slice(0, 20000));
            /* Eski analiz sonucu içe aktarılmaz; güncel kurallarla yeniden hesaplanır */
            state.lastCDSS = null;

            if (typeof recalculateUserBmi === "function") recalculateUserBmi();
            if (typeof updateDynamicTargetHydration === "function") updateDynamicTargetHydration();
            saveState();
            if (typeof invalidateClinicalAnalysisCache === "function") invalidateClinicalAnalysisCache({ clearDOM: true });
            if (typeof canRunClinicalAnalysis === "function" && canRunClinicalAnalysis() && typeof executeCDSSRules === "function") executeCDSSRules();
            renderAllAppViews();
            const skipped = (Array.isArray(parsed.labHistory) ? parsed.labHistory.length - state.labHistory.length : 0)
              + (Array.isArray(parsed.supplements) ? parsed.supplements.length - state.supplements.length : 0);
            showToast("Geri Yüklendi", skipped > 0
              ? `Verileriniz yüklendi. Geçersiz veya aralık dışı ${skipped} kayıt atlandı.`
              : "Verileriniz başarıyla yüklendi ve sıralandı.", skipped > 0 ? "warning" : "success");
            if (state.user && !state.user.profileCompleted && typeof openProfileModal === "function") openProfileModal(false);
          }
        } catch (err) {
          showToast("Okuma Hatası", "Yedek dosyası okunamadı.", "error");
        }
      };
      reader.readAsText(file);
      event.target.value = "";
    }

    function makeFhirUuid() {
      if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }

    function isValidFhirDate(value) {
      if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(`${value}T00:00:00Z`);
      return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
    }

    function isValidFhirDateTime(value) {
      if (isValidFhirDate(value)) return true;
      if (typeof value !== "string") return false;
      const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](?:0[0-9]|1[0-3]):[0-5][0-9]|[+-]14:00)$/);
      if (!match || !isValidFhirDate(match[1])) return false;
      const hour = Number(match[2]), minute = Number(match[3]), second = Number(match[4]);
      return hour <= 23 && minute <= 59 && second <= 60 && Number.isFinite(Date.parse(value));
    }

    function safeFHIRDate(value) {
      if (typeof value !== "string") return null;
      const trimmed = value.trim();
      return isValidFhirDateTime(trimmed) ? trimmed : null;
    }

    function safeFHIRDateTimeFromTimestamp(value) {
      const numeric = typeof value === "number" ? value : Number.NaN;
      if (Number.isFinite(numeric) && numeric > 0) {
        const date = new Date(numeric);
        return Number.isFinite(date.getTime()) ? date.toISOString() : null;
      }
      if (typeof value === "string" && isValidFhirDateTime(value.trim())) return value.trim();
      return null;
    }

    function validateVitaFHIRBundle(bundle) {
      const errors = [];
      const warnings = [];
      const allowedTypes = new Set(["Patient", "Observation", "MedicationStatement", "Condition"]);
      if (!bundle || bundle.resourceType !== "Bundle") errors.push("resourceType Bundle olmalı.");
      if (bundle && bundle.type !== "collection") errors.push("Bundle.type collection olmalı.");
      if (!bundle || !Array.isArray(bundle.entry) || bundle.entry.length === 0) errors.push("Bundle.entry boş olamaz.");
      if (bundle && bundle.timestamp && !isValidFhirDateTime(bundle.timestamp)) errors.push("Bundle.timestamp geçerli saat dilimli FHIR dateTime olmalı.");

      const entries = Array.isArray(bundle?.entry) ? bundle.entry : [];
      const seenFullUrls = new Set();
      const seenIds = new Set();
      const resources = entries.map(entry => entry && entry.resource).filter(Boolean);
      const patientResources = resources.filter(resource => resource.resourceType === "Patient");
      if (patientResources.length !== 1) errors.push(`Tam olarak bir Patient bekleniyordu; bulunan: ${patientResources.length}.`);
      const patientEntry = entries.find(entry => entry?.resource?.resourceType === "Patient");
      const patientRef = patientEntry?.fullUrl || (patientEntry?.resource?.id ? `Patient/${patientEntry.resource.id}` : null);

      entries.forEach((entry, index) => {
        const resource = entry?.resource;
        if (!resource || typeof resource !== "object") { errors.push(`entry[${index}] resource nesnesi eksik.`); return; }
        if (!allowedTypes.has(resource.resourceType)) errors.push(`entry[${index}] desteklenmeyen resourceType: ${resource.resourceType}.`);
        if (!resource.id || typeof resource.id !== "string") errors.push(`entry[${index}] resource.id eksik.`);
        else if (!/^[A-Za-z0-9.-]{1,64}$/.test(resource.id)) errors.push(`entry[${index}] resource.id FHIR id biçimine uymuyor.`);
        if (resource.id && seenIds.has(`${resource.resourceType}/${resource.id}`)) errors.push(`Tekrarlanan resource id: ${resource.resourceType}/${resource.id}.`);
        if (resource.id) seenIds.add(`${resource.resourceType}/${resource.id}`);
        if (!entry.fullUrl || typeof entry.fullUrl !== "string") errors.push(`entry[${index}] fullUrl eksik.`);
        if (entry.fullUrl && seenFullUrls.has(entry.fullUrl)) errors.push(`Tekrarlanan fullUrl: ${entry.fullUrl}.`);
        if (entry.fullUrl) seenFullUrls.add(entry.fullUrl);
        if (resource.id && entry.fullUrl && entry.fullUrl !== `urn:uuid:${resource.id}`) errors.push(`entry[${index}] fullUrl ile resource.id eşleşmiyor.`);

        if (resource.resourceType === "Patient") {
          if (typeof resource.active !== "boolean") errors.push(`Patient/${resource.id} active boolean olmalı.`);
          if (!Array.isArray(resource.name) || !resource.name.length) errors.push(`Patient/${resource.id} name gerekli.`);
          if (!["male", "female", "other", "unknown"].includes(resource.gender)) errors.push(`Patient/${resource.id} gender kodu geçersiz.`);
        }
        if (["Observation", "MedicationStatement", "Condition"].includes(resource.resourceType)) {
          const subject = resource.subject?.reference;
          if (!subject) errors.push(`${resource.resourceType}/${resource.id} subject.reference gerekli.`);
          else if (patientRef && subject !== patientRef && subject !== `Patient/${patientEntry?.resource?.id}`) errors.push(`${resource.resourceType}/${resource.id} subject tanımlı Patient kaynağına bağlanmıyor.`);
        }
        if (resource.resourceType === "Observation") {
          const validStatuses = new Set(["registered", "preliminary", "final", "amended", "corrected", "cancelled", "entered-in-error", "unknown"]);
          if (!validStatuses.has(resource.status)) errors.push(`Observation/${resource.id} status geçersiz.`);
          if (!resource.code || (!Array.isArray(resource.code.coding) && !resource.code.text)) errors.push(`Observation/${resource.id} code gerekli.`);
          if (resource.valueQuantity) {
            if (!Number.isFinite(Number(resource.valueQuantity.value))) errors.push(`Observation/${resource.id} valueQuantity.value sayı olmalı.`);
            if (!resource.valueQuantity.unit || !resource.valueQuantity.code) errors.push(`Observation/${resource.id} unit ve UCUM code içermeli.`);
          } else if (!resource.dataAbsentReason) errors.push(`Observation/${resource.id} valueQuantity veya dataAbsentReason içermeli.`);
          if (resource.effectiveDateTime && !isValidFhirDateTime(resource.effectiveDateTime)) errors.push(`Observation/${resource.id} effectiveDateTime geçersiz.`);
          if (resource.category?.some(category => category.coding?.some(coding => coding.code === "laboratory")) && !resource.effectiveDateTime) warnings.push(`Observation/${resource.id} için ölçüm tarihi kaynakta bulunamadı; uydurma tarih eklenmedi.`);
        }
        if (resource.resourceType === "MedicationStatement") {
          const statuses = new Set(["active", "completed", "entered-in-error", "intended", "stopped", "on-hold", "unknown", "not-taken"]);
          if (!statuses.has(resource.status)) errors.push(`MedicationStatement/${resource.id} status geçersiz.`);
          if (!resource.medicationCodeableConcept && !resource.medicationReference) errors.push(`MedicationStatement/${resource.id} medication[x] gerekli.`);
          if (resource.dateAsserted && !isValidFhirDateTime(resource.dateAsserted)) errors.push(`MedicationStatement/${resource.id} dateAsserted geçersiz.`);
          if (resource.effectivePeriod?.start && !isValidFhirDateTime(resource.effectivePeriod.start)) errors.push(`MedicationStatement/${resource.id} effectivePeriod.start geçersiz.`);
        }
        if (resource.resourceType === "Condition") {
          const clinicalStatuses = new Set(["active", "recurrence", "relapse", "inactive", "remission", "resolved"]);
          const verificationStatuses = new Set(["unconfirmed", "provisional", "differential", "confirmed", "refuted", "entered-in-error"]);
          const cs = resource.clinicalStatus?.coding?.[0]?.code;
          const vs = resource.verificationStatus?.coding?.[0]?.code;
          if (!clinicalStatuses.has(cs)) errors.push(`Condition/${resource.id} clinicalStatus kodu geçersiz.`);
          if (!verificationStatuses.has(vs)) errors.push(`Condition/${resource.id} verificationStatus kodu geçersiz.`);
          if (!resource.code || (!Array.isArray(resource.code.coding) && !resource.code.text)) errors.push(`Condition/${resource.id} code gerekli.`);
          if (resource.onsetDateTime && !isValidFhirDateTime(resource.onsetDateTime)) errors.push(`Condition/${resource.id} onsetDateTime geçersiz.`);
          if (resource.recordedDate && !isValidFhirDateTime(resource.recordedDate)) errors.push(`Condition/${resource.id} recordedDate geçersiz.`);
        }
      });

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        checkedResources: entries.length,
        profile: "FHIR R4 yapısal ön denetimi; resmî HL7 validator veya kurum profili doğrulaması değildir."
      };
    }

    function buildVitaFHIRBundle() {
      const p = state.user;
      if (!p) throw new Error("FHIR çıktısı için önce bir profil tanımlanmalıdır.");
      const patientId = makeFhirUuid();
      const exportTimestamp = new Date().toISOString();
      const patientDisplay = String(p.name || "Kullanıcı").slice(0, 120);
      const fhirEntries = [{
        fullUrl: `urn:uuid:${patientId}`,
        resource: {
          resourceType: "Patient", id: patientId, active: true,
          name: [{ use: "official", text: patientDisplay }],
          gender: p.gender === "E" ? "male" : p.gender === "K" ? "female" : "unknown"
        }
      }];
      const loincMap = {
        d3: { code: "62292-8", display: "25-hydroxyvitamin D in Serum/Plasma", unit: "ng/mL", label: "25-OH D vitamini" },
        b12: { code: "2132-9", display: "Cobalamin (Vitamin B12) in Serum/Plasma", unit: "pg/mL", label: "B12" },
        ferritin: { code: "2276-4", display: "Ferritin in Serum/Plasma", unit: "ng/mL", label: "Ferritin" },
        mg: { code: "2601-3", display: "Magnesium in Serum/Plasma", unit: "mg/dL", label: "Magnezyum" },
        ca: { code: "17861-6", display: "Calcium in Serum/Plasma", unit: "mg/dL", label: "Kalsiyum" },
        zinc: { code: "5763-8", display: "Zinc in Serum/Plasma", unit: "ug/dL", label: "Çinko" },
        creatinine: { code: "2160-0", display: "Creatinine in Serum/Plasma", unit: "mg/dL", label: "Kreatinin" },
        folate: { code: "2284-8", display: "Folate in Serum/Plasma", unit: "ng/mL", label: "Folat" },
        alt: { code: "1742-6", display: "Alanine aminotransferase in Serum/Plasma", unit: "U/L", label: "ALT" },
        hb: { code: "718-7", display: "Hemoglobin [Mass/volume] in Blood", unit: "g/dL", label: "Hemoglobin" },
        mcv: { code: "787-2", display: "MCV [Entitic volume] by Automated count", unit: "fL", label: "MCV" },
        crp: { code: "1988-5", display: "C reactive protein [Mass/volume] in Serum or Plasma", unit: "mg/L", label: "CRP" }
      };
      const patientReference = `urn:uuid:${patientId}`;
      const addObservation = ({ code, display, value, unit, categoryCode, date, referenceText, note }) => {
        if (value === null || value === undefined || value === "" || !Number.isFinite(Number(value))) return;
        const id = makeFhirUuid();
        const observation = {
          resourceType: "Observation", id, status: "final",
          category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: categoryCode, display: categoryCode === "laboratory" ? "Laboratory" : "Vital Signs" }] }],
          code: { coding: [{ system: "http://loinc.org", code, display }], text: display },
          subject: { reference: patientReference, display: patientDisplay },
          valueQuantity: { value: Number(value), unit, system: "http://unitsofmeasure.org", code: unit }
        };
        const validDate = safeFHIRDate(date);
        if (validDate) observation.effectiveDateTime = validDate;
        const notes = [];
        if (note) notes.push({ text: String(note).slice(0, 500) });
        if (!validDate && categoryCode === "laboratory") notes.push({ text: "Ölçüm tarihi kaynak kayıtta bulunmadığı için dışa aktarmada tarih uydurulmadı." });
        if (notes.length) observation.note = notes;
        if (referenceText) observation.referenceRange = [{ text: String(referenceText).slice(0, 250) }];
        fhirEntries.push({ fullUrl: `urn:uuid:${id}`, resource: observation });
      };

      // Önce tüm kayıtlı tarihsel örnekler kullanılır. Her Observation kendi örneğinin tarihini taşır.
      const history = Array.isArray(state.labHistory) ? state.labHistory : [];
      const labRecords = history.length ? history : [({ ...(state.labValues || {}), date: safeFHIRDate(document.getElementById("inputLabDate")?.value) || null, references: state.labReferences || {} })];
      labRecords.forEach((record, recordIndex) => {
        Object.keys(loincMap).forEach(key => {
          const meta = loincMap[key];
          const date = safeFHIRDate(record?.date) || null;
          const referenceText = record?.references?.[key] || (recordIndex === 0 ? state.labReferences?.[key] : "") || "";
          addObservation({
            code: meta.code, display: meta.display, value: record?.[key], unit: meta.unit,
            categoryCode: "laboratory", date, referenceText,
            note: record?.timeLabel ? `Arşiv saat etiketi: ${String(record.timeLabel).slice(0, 40)}.` : ""
          });
        });
      });

      // Boy, kilo ve VKİ Patient üzerinde özel/standart dışı extension yerine standart LOINC Observation olarak taşınır.
      addObservation({ code: "8302-2", display: "Body height", value: Number(p.height), unit: "cm", categoryCode: "vital-signs", note: "Profildeki boy bilgisi; bağımsız ölçüm tarihi kaydedilmemiştir." });
      addObservation({ code: "29463-7", display: "Body weight", value: Number(p.weight), unit: "kg", categoryCode: "vital-signs", note: "Profildeki kilo bilgisi; bağımsız ölçüm tarihi kaydedilmemiştir." });
      const bmi = Number(p.bmi);
      if (Number.isFinite(bmi) && bmi > 0) addObservation({ code: "39156-5", display: "Body mass index (BMI) [Ratio]", value: bmi, unit: "kg/m2", categoryCode: "vital-signs", note: "Profildeki VKİ; kendi başına tanı değildir." });

      (state.supplements || []).forEach(item => {
        const statementId = makeFhirUuid();
        const supplementName = String(item.name || "Takviye").slice(0, 120);
        const supplementCode = supplementName.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60) || "supplement";
        const dateAsserted = safeFHIRDateTimeFromTimestamp(item.addedDate);
        const dosageText = [item.doseText || "Doz belirtilmemiş", item.selectedForm ? `Form: ${String(item.selectedForm).replace(/_/g, " ")}` : "Form belirtilmemiş", item.timing ? `Zamanlama: ${item.timing}` : "Zamanlama belirtilmemiş"].join("; ").slice(0, 500);
        const resource = {
          resourceType: "MedicationStatement", id: statementId, status: "active",
          medicationCodeableConcept: {
            coding: [{ system: "https://vitatakip.example/CodeSystem/supplement", code: supplementCode, display: supplementName }],
            text: `${supplementName}${item.selectedForm ? ` — ${String(item.selectedForm).replace(/_/g, " ")}` : ""}`.slice(0, 180)
          },
          subject: { reference: patientReference, display: patientDisplay },
          dosage: [{ text: `${dosageText}. ${item.taken ? "Uygulama ekranında bugün alındı olarak işaretli." : "Uygulama ekranında bugün henüz alındı olarak işaretlenmemiş."}` }],
          note: [{ text: `${item.instruction || "Talimat kaydı yok."}${item.isBarcodeSimulation ? " Barkod içeriği prototip simülasyonudur; gerçek İTS doğrulaması değildir." : ""}`.slice(0, 500) }]
        };
        if (dateAsserted) resource.dateAsserted = dateAsserted;
        fhirEntries.push({ fullUrl: `urn:uuid:${statementId}`, resource });
      });

      (state.selectedSymptoms ? Array.from(state.selectedSymptoms) : []).forEach(symptomKey => {
        const meta = ANAMNESIS_DICTIONARY[symptomKey];
        if (!meta) return;
        const conditionId = makeFhirUuid();
        const markedResolved = state.resolvedSymptoms instanceof Set && state.resolvedSymptoms.has(symptomKey);
        fhirEntries.push({
          fullUrl: `urn:uuid:${conditionId}`,
          resource: {
            resourceType: "Condition", id: conditionId,
            clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: markedResolved ? "resolved" : "active", display: markedResolved ? "Resolved" : "Active" }] },
            verificationStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "unconfirmed", display: "Unconfirmed" }] },
            category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item", display: "Problem List Item" }] }],
            code: { text: `Kullanıcı tarafından bildirilen belirti: ${String(meta.question || meta.medicalName || symptomKey).slice(0, 250)}` },
            subject: { reference: patientReference, display: patientDisplay },
            note: [{ text: `Başlangıç zamanı kullanıcı tarafından kaydedilmedi. Anamnez sözlüğü eşleşmesi: ${String(meta.medicalName || symptomKey).slice(0, 100)}. ${markedResolved ? "Kullanıcı bu belirtiyi çözüldü olarak işaretlemiş." : "Bu kayıt kullanıcı bildirimi olup doğrulanmış tıbbi tanı değildir."} Önerilen değerlendirme: ${String(meta.suggestedLab || "Hekim değerlendirmesi").slice(0, 200)}.` }]
          }
        });
      });

      return { resourceType: "Bundle", id: `vitatakip-bundle-${makeFhirUuid()}`, type: "collection", timestamp: exportTimestamp, entry: fhirEntries };
    }

    function exportFHIRBundle() {
      if (!state.user) { showToast("Profil Yok", "FHIR çıktısı için önce bir profil tanımlanmalıdır.", "warning"); return; }
      let fhirBundle;
      let validation;
      try {
        fhirBundle = buildVitaFHIRBundle();
        validation = validateVitaFHIRBundle(fhirBundle);
      } catch (error) {
        console.error("FHIR oluşturma hatası:", error);
        showToast("FHIR Oluşturulamadı", "FHIR kaynakları oluşturulurken hata oluştu. Geliştirici konsolunu kontrol edin.", "error");
        return;
      }
      if (!validation.valid) {
        console.error("FHIR yapısal doğrulama hataları:", validation.errors);
        showToast("FHIR Doğrulama Hatası", validation.errors.slice(0, 2).join(" "), "error");
        return;
      }
      if (validation.warnings.length) console.warn("FHIR R4 ön denetim uyarıları (resmî validator değildir):", validation.warnings);
      if (!vitaSaveTextFile(`VitaTakip_FHIR_R4_${new Date().toISOString().slice(0, 10)}.json`, "application/fhir+json", JSON.stringify(fhirBundle, null, 2))) {
        showToast("FHIR Kaydedilemedi", "Dosya kaydedilemedi. Depolama iznini ve boş alanı kontrol edin.", "error");
        return;
      }
      if (window.SoundEffects) SoundEffects.playSuccess();
      const counts = fhirBundle.entry.reduce((result, entry) => { const type = entry.resource?.resourceType; if (type) result[type] = (result[type] || 0) + 1; return result; }, {});
      showToast("FHIR R4 Ön Denetimi Geçti", `${counts.Patient || 0} Patient, ${counts.Observation || 0} Observation, ${counts.MedicationStatement || 0} MedicationStatement ve ${counts.Condition || 0} Condition kaynağı oluşturuldu. Resmî HL7 validator doğrulaması ayrıca yapılmalıdır.`, "success");
    }

    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
    }

    function openENabizModal() {
      resetPdfDropzone();
      const modal = document.getElementById("eNabizModal");
      if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
    }

    function closeENabizModal() {
      const modal = document.getElementById("eNabizModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
      resetPdfDropzone();
    }

    function resetPdfDropzone() {
      const fileInput = document.getElementById("eNabizPdfInput");
      const dropArea = document.getElementById("pdfUploadDropzoneArea");
      const loading = document.getElementById("pdfLoadingStatus");
      const preview = document.getElementById("pdfParsedPreviewArea");

      if (fileInput) fileInput.value = "";
      if (dropArea) dropArea.classList.remove("hidden");
      if (loading) loading.classList.add("hidden");
      if (preview) preview.classList.add("hidden");
      temporarilyParsedLabResults = {};
      temporarilyParsedPdfDate = null;
      temporarilyParsedPdfEgfr = null;
    }

    function normalizeTurkishText(text) {
      if (!text) return "";
      return text.replace(/İ/g, "I").replace(/ı/g, "i").replace(/Ç/g, "C").replace(/ç/g, "c").replace(/Ş/g, "S").replace(/ş/g, "s").replace(/Ğ/g, "G").replace(/ğ/g, "g").replace(/Ü/g, "U").replace(/ü/g, "u").replace(/Ö/g, "O").replace(/ö/g, "o").toLowerCase();
    }

    const vitaOptionalScriptPromises = Object.create(null);
    function loadVitaOptionalScript(url, globalName, timeoutMs = 12000) {
      if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
      if (vitaOptionalScriptPromises[url]) return vitaOptionalScriptPromises[url];
      vitaOptionalScriptPromises[url] = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url; script.async = true; script.dataset.vitaOptionalLibrary = globalName || "library";
        let finished = false;
        const finish = (error) => {
          if (finished) return; finished = true; window.clearTimeout(timer);
          if (error) { script.remove(); reject(error); return; }
          if (globalName && !window[globalName]) { reject(new Error(globalName + " did not initialize")); return; }
          resolve(globalName ? window[globalName] : true);
        };
        const timer = window.setTimeout(() => finish(new Error("Optional library timed out: " + globalName)), timeoutMs);
        script.onload = () => finish(null);
        script.onerror = () => finish(new Error("Optional library could not be loaded: " + globalName));
        document.head.appendChild(script);
      });
      return vitaOptionalScriptPromises[url];
    }

    async function handlePdfUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      const dropArea = document.getElementById("pdfUploadDropzoneArea");
      const loadingBox = document.getElementById("pdfLoadingStatus");
      if (dropArea) dropArea.classList.add("hidden");
      if (loadingBox) loadingBox.classList.remove("hidden");

      try {
        if (!window.pdfjsLib) {
          await loadVitaOptionalScript("vendor/pdfjs/pdf.min.js", "pdfjsLib", 12000);
        }
        if (!window.pdfjsLib) throw new Error("PDF.js is unavailable");
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdfjs/pdf.worker.min.js";
        const fileReader = new FileReader();
        fileReader.onload = async function() {
          try {
            const typedArray = new Uint8Array(this.result);
            const loadingTask = pdfjsLib.getDocument({ data: typedArray });
            const pdfDoc = await loadingTask.promise;
            const reconstructedLines = [];

            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
              const page = await pdfDoc.getPage(pageNum);
              const textContent = await page.getTextContent();
              const items = textContent.items;

              const pageItems = items.map(it => ({ str: it.str || "", x: it.transform[4], y: it.transform[5], height: Math.abs(Number(it.height || it.transform?.[3] || 10)) })).filter(it => it.str.trim() !== "");
              pageItems.sort((a, b) => (b.y - a.y) || (a.x - b.x));

              const lines = [];
              let currentLine = [];
              let currentY = null;

              pageItems.forEach(item => {
                const currentHeight = currentLine.length
                  ? currentLine.reduce((sum, entry) => sum + (entry.height || 10), 0) / currentLine.length
                  : (item.height || 10);
                // Farklı HBYS PDF'lerinde yazı boyutu değişir; toleransı satır font yüksekliğine göre dinamik belirle.
                const dynamicTolerance = Math.max(2.2, Math.min(6.5, ((currentHeight + (item.height || 10)) / 2) * 0.42));
                if (currentY === null || Math.abs(item.y - currentY) <= dynamicTolerance) {
                  const oldCount = currentLine.length;
                  currentLine.push(item);
                  currentY = oldCount === 0 ? item.y : ((currentY * oldCount) + item.y) / (oldCount + 1);
                } else {
                  currentLine.sort((a, b) => a.x - b.x);
                  lines.push(currentLine.map(i => i.str).join(" "));
                  currentLine = [item];
                  currentY = item.y;
                }
              });
              if (currentLine.length > 0) {
                currentLine.sort((a, b) => a.x - b.x);
                lines.push(currentLine.map(i => i.str).join(" "));
              }
              reconstructedLines.push(...lines);
            }

            if (loadingBox) loadingBox.classList.add("hidden");
            parseReconstructedLabLines(reconstructedLines);
            void logVitaPdfScan(activeUserId, file, pdfDoc.numPages, Object.keys(temporarilyParsedLabResults || {}).length);
          } catch (err) {
            resetPdfDropzone();
            showToast("Hata", "PDF katmanı okunamadı.", "error");
          }
        };
        fileReader.readAsArrayBuffer(file);
      } catch (err) {
        resetPdfDropzone();
        showToast("Hata", "PDF yüklenemedi.", "error");
      }
    }

    function extractPdfReportDate(lines) {
      if (!Array.isArray(lines) || !lines.length) return null;
      const toIsoDate = (d, m, y) => {
        let year = Number(y);
        if (year < 100) year += 2000;
        const month = Number(m);
        const day = Number(d);
        if (year < 2000 || year > 2099 || month < 1 || month > 12 || day < 1 || day > 31) return null;
        return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      };
      // 1) Önce "Tarih", "Sonuç Tarihi", "İstem Tarihi", "Onay Tarihi", "Numune Tarihi" geçen satırlarda ara
      for (const raw of lines) {
        const norm = normalizeTurkishText(raw);
        if (/\b(?:tarih|tarihi|sonuc tarihi|istem tarihi|onay tarihi|numune|rapor tarihi|kabul tarihi)\b/.test(norm) && !/\bdogum\b/.test(norm)) {
          const dmy = raw.match(/\b(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{4}|\d{2})\b/);
          if (dmy) {
            const iso = toIsoDate(dmy[1], dmy[2], dmy[3]);
            if (iso) return iso;
          }
          const ymd = raw.match(/\b(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})\b/);
          if (ymd) {
            const iso = toIsoDate(ymd[3], ymd[2], ymd[1]);
            if (iso) return iso;
          }
        }
      }
      // 2) Yoksa ilk 25 satırda (isim/soyisim başlık bölgesinde) doğum tarihi olmayan ilk geçerli tarihi yakala
      for (const raw of lines.slice(0, 30)) {
        const norm = normalizeTurkishText(raw);
        if (/\bdogum\b/.test(norm)) continue;
        const dmy = raw.match(/\b(\d{1,2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(20\d{2})\b/);
        if (dmy) {
          const iso = toIsoDate(dmy[1], dmy[2], dmy[3]);
          if (iso) return iso;
        }
        const ymd = raw.match(/\b(20\d{2})\s*[.\/-]\s*(\d{1,2})\s*[.\/-]\s*(\d{1,2})\b/);
        if (ymd) {
          const iso = toIsoDate(ymd[3], ymd[2], ymd[1]);
          if (iso) return iso;
        }
      }
      return null;
    }

    function ensureReferenceHasUnit(key, referenceText, rawLine, defaultUnit) {
      const cleanRef = String(referenceText || "").trim();
      if (!cleanRef) return "";
      const normRef = cleanRef.toLowerCase().replace(/[μµ]/g, "u").replace(/\s+/g, "");
      const knownUnits = ["ng/ml", "ug/ml", "ug/dl", "pg/ml", "mg/dl", "mmol/l", "nmol/l", "pmol/l", "umol/l", "ug/l", "u/l", "iu/l", "g/dl", "g/l", "fl", "mg/l", "meq/l"];
      if (knownUnits.some(u => normRef.includes(u))) return cleanRef;

      // Satırda açık birim varsa (ör. g/dL, g/L, fL, mg/L, ng/mL, pg/mL) ve parametreyle uyumluysa onu ekle
      const lineNorm = String(rawLine || "").toLowerCase().replace(/[μµ]/g, "u");
      const paramUnits = {
        d3: [["nmol/l", "nmol/L"], ["ng/ml", "ng/mL"], ["ug/l", "ng/mL"]],
        b12: [["pmol/l", "pmol/L"], ["pg/ml", "pg/mL"], ["ng/l", "pg/mL"]],
        ferritin: [["ng/ml", "ng/mL"], ["ug/l", "µg/L"]],
        mg: [["mmol/l", "mmol/L"], ["mg/dl", "mg/dL"]],
        ca: [["mmol/l", "mmol/L"], ["mg/dl", "mg/dL"]],
        zinc: [["umol/l", "µmol/L"], ["ug/dl", "µg/dL"]],
        creatinine: [["mg/dl", "mg/dL"]],
        folate: [["nmol/l", "nmol/L"], ["ng/ml", "ng/mL"]],
        alt: [["iu/l", "U/L"], ["u/l", "U/L"]],
        hb: [["g/dl", "g/dL"], ["g/l", "g/L"]],
        mcv: [["fl", "fL"]],
        crp: [["mg/l", "mg/L"], ["mg/dl", "mg/dL"]]
      }[key] || [];
      for (const [token, displayUnit] of paramUnits) {
        if (lineNorm.includes(token)) {
          return `${cleanRef} ${displayUnit}`;
        }
      }
      return `${cleanRef} ${defaultUnit}`;
    }

    function parseReconstructedLabLines(lines) {
      const targetParams = [
        { key: "d3", name: "D Vitamini (25-OH D3 / Hidroksi)", unit: "ng/mL", inputId: "inputLabD3", keywords: ["25-hidroksi vitamin d3", "25-hidroksi vitamin d", "25-oh vitamin d3", "25-oh vitamin d", "25-oh d3", "25 oh d3", "25-oh", "25 oh", "hidroksi", "vitamin d3", "d3 vitamini", "vitamin d", "d vitamini", "d3"] },
        { key: "b12", name: "B12 Vitamini (Kobalamin)", unit: "pg/mL", inputId: "inputLabB12", keywords: ["vitamin b12", "b12 vitamini", "vit b12", "b-12", "b12", "kobalamin", "cobalamin"] },
        { key: "ferritin", name: "Ferritin (Demir Deposu)", unit: "ng/mL", inputId: "inputLabFerritin", keywords: ["ferritin", "demir deposu"] },
        { key: "mg", name: "Magnezyum (Mg / Serum)", unit: "mg/dL", inputId: "inputLabMg", keywords: ["magnezyum", "magnesium", "serum mg"] },
        { key: "ca", name: "Kalsiyum (Ca / Total)", unit: "mg/dL", inputId: "inputLabCalcium", keywords: ["kalsiyum", "calcium", "total ca", "serum ca"] },
        { key: "zinc", name: "Çinko (Zn)", unit: "µg/dL", inputId: "inputLabZinc", keywords: ["cinko", "zinc", "serum zn"] },
        { key: "creatinine", name: "Kreatinin (CREA / Böbrek)", unit: "mg/dL", inputId: "inputLabCreatinine", keywords: ["kreatinin", "creatinine", "serum crea", "crea"] },
        { key: "folate", name: "Folat / Folik Asit (B9)", unit: "ng/mL", inputId: "inputLabFolate", keywords: ["folat", "folate", "folik asit", "folic acid", "vitamin b9", "b9"] },
        { key: "alt", name: "ALT (Alanin Aminotransferaz)", unit: "U/L", inputId: "inputLabAlt", keywords: ["alanin aminotransferaz", "alanine aminotransferase", "sgpt", "serum alt", "alt (sgpt)", "alt"] },
        { key: "hb", name: "Hemoglobin (Hb / HGB)", unit: "g/dL", inputId: "inputLabHb", keywords: ["hemoglobin (hgb)", "hemoglobin", "hgb"], exclude: ["a1c", "hba1", "glikoz", "glycos", "glycat", "ortalama", "mean", "mch", "konsantrasyon", "concentration", "idrar"] },
        { key: "mcv", name: "MCV (Ortalama Eritrosit Hacmi)", unit: "fL", inputId: "inputLabMcv", keywords: ["mcv", "ortalama eritrosit hacmi"], exclude: ["mchc"] },
        { key: "crp", name: "CRP (C-Reaktif Protein)", unit: "mg/L", inputId: "inputLabCrp", keywords: ["c-reaktif protein", "c reaktif protein", "c-reactive protein", "crp (c-reaktif", "crp", "hs-crp"], exclude: [] }
      ];

      temporarilyParsedPdfDate = extractPdfReportDate(lines);
      temporarilyParsedPdfEgfr = null;

      const detected = {};
      lines.forEach((rawLine, idx) => {
        // Bazen e-Nabız PDF'de referans aralığı alt satıra kayabilir; alt satır yalnızca referans/birim içeriyorsa birleştir.
        let combinedRaw = rawLine;
        const nextLine = lines[idx + 1] || "";
        if (nextLine && /^\s*(?:ref(?:erans)?\.?|normal)?\s*[:：]?\s*(?:[<>≤≥]\s*\d|\d+(?:[.,]\d+)?\s*[-–—]\s*\d+)/i.test(nextLine) && !/[a-zA-ZğüşıöçĞÜŞİÖÇ]{5,}/.test(nextLine.replace(/referans|normal|araligi|aralığı|range/gi, ""))) {
          combinedRaw = `${rawLine} ${nextLine}`;
        }

        let cleanLine = combinedRaw.replace(/(\d+)\s*,\s*(\d+)/g, "$1.$2").replace(/(\d+)\s*\.\s*(\d+)/g, "$1.$2");
        const normalizedLine = normalizeTurkishText(cleanLine);

        // PDF içinde doğrudan eGFR / GFR satırı varsa yakala
        if (temporarilyParsedPdfEgfr === null && /\b(?:egfr|tahmini gfr|glomeruler filtrasyon|ckd-epi|gfr)\b/.test(normalizedLine) && !normalizedLine.includes("kreatinin")) {
          const egfrNums = cleanLine.replace(/\b20\d{2}\b/g, " ").match(/\b\d+(?:\.\d+)?\b/g);
          if (egfrNums && egfrNums.length > 0) {
            const egfrVal = parseFloat(egfrNums[0]);
            if (Number.isFinite(egfrVal) && egfrVal >= 5 && egfrVal <= 200) {
              temporarilyParsedPdfEgfr = Math.round(egfrVal);
            }
          }
        }

        targetParams.forEach(param => {
          if (detected[param.key]) return;
          if (param.exclude && param.exclude.some(ex => normalizedLine.includes(normalizeTurkishText(ex)))) return;
          const matchKw = param.keywords.find(kw => {
            const nKw = normalizeTurkishText(kw);
            if (nKw === "alt") return /\balt\b/.test(normalizedLine);
            if (nKw === "hgb" || nKw === "mcv" || nKw === "crp") return new RegExp(`\\b${nKw}\\b`).test(normalizedLine);
            return normalizedLine.includes(nKw);
          });
          if (matchKw) {
            // Satırdaki hastane referansını etiketli biçimde veya genel aralık biçiminde yakala.
            const labeledReference = cleanLine.match(/(?:ref(?:erans)?\.?|referans aral(?:ı|i)ğ(?:ı|i)|normal aral(?:ı|i)k|reference range)\s*[:：]?\s*((?:[<>≤≥]\s*\d+(?:[.,]\d+)?)|(?:\d+(?:[.,]\d+)?\s*[-–—]\s*\d+(?:[.,]\d+)?))(?:\s*(?:ng\/ml|ug\/ml|µg\/dl|ug\/dl|pg\/ml|mg\/dl|mmol\/l|nmol\/l|pmol\/l|µmol\/l|umol\/l|µg\/l|ug\/l|u\/l|iu\/l|g\/dl|g\/l|fl|mg\/l))?/i);
            const genericReference = cleanLine.match(/(?:\d+(?:[.,]\d+)?\s*[-–—]\s*\d+(?:[.,]\d+)?)|(?:[<>≤≥]\s*\d+(?:[.,]\d+)?)/);
            const rawReferenceText = labeledReference ? labeledReference[1].replace(/\s+/g, " ").trim() : (genericReference ? genericReference[0].replace(/\s+/g, " ").trim() : "");
            const referenceText = ensureReferenceHasUnit(param.key, rawReferenceText, cleanLine, param.unit);

            let valueSource = cleanLine;
            if (labeledReference) valueSource = valueSource.replace(labeledReference[0], " ");
            else if (genericReference) valueSource = valueSource.replace(genericReference[0], " ");
            const safeKeyword = matchKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const valueLine = valueSource.replace(new RegExp(safeKeyword, "gi"), " ")
              .replace(/\b25\s*[-–]?\s*(?:oh|hidroksi)\b/gi, " ")
              .replace(/\b(?:vit(?:amin)?\s*)?(?:b\s*[-–]?\s*12|b\s*[-–]?\s*9|d\s*[-–]?\s*3)\b/gi, " ")
              .replace(/\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4}\b/g, " ")
              .replace(/\b(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?\b/g, " ")
              .replace(/\b(?:ref(?:erans)?\.?|referans|normal|range|aral(?:ı|i)k|reference)\b/gi, " ");
            const nums = valueLine.match(/\b\d+(?:[.,]\d+)?\b/g);
            if (nums && nums.length > 0) {
              let val = parseFloat(nums[0].replace(",", "."));
              // Hb g/L olarak yazılmışsa (örn. 135 g/L) g/dL'ye çevir
              if (param.key === "hb" && val > 35 && val <= 250) {
                val = Math.round((val / 10) * 10) / 10;
              }
              if (!isNaN(val)) {
                detected[param.key] = {
                  ...param,
                  value: (param.key === "b12" || param.key === "alt") ? Math.round(val) : val,
                  reference: referenceText
                };
              }
            }
          }
        });
      });

      renderParsedResultsPreview(detected);
    }

    function renderParsedResultsPreview(results) {
      const keys = Object.keys(results || {});
      const previewArea = document.getElementById("pdfParsedPreviewArea");
      const dropArea = document.getElementById("pdfUploadDropzoneArea");
      const listContainer = document.getElementById("pdfParsedResultsList");
      const countBadge = document.getElementById("pdfParsedCountBadge");

      if (!keys.length) {
        resetPdfDropzone();
        showToast("Eşleşmedi", "PDF tarandı fakat tahlil değeri bulunamadı.", "warning");
        return;
      }
      temporarilyParsedLabResults = results;
      if (dropArea) dropArea.classList.add("hidden");
      if (previewArea) previewArea.classList.remove("hidden");
      if (countBadge) countBadge.textContent = `${keys.length} Değer Ayrıştırıldı`;

      // Otomatik algılanan PDF tarihini Tahlil Tarihi alanına da yansıt (elle değiştirilebilir kalır)
      const mainDateInput = document.getElementById("inputLabDate");
      if (temporarilyParsedPdfDate && mainDateInput) {
        mainDateInput.value = temporarilyParsedPdfDate;
      }
      const effectiveDate = temporarilyParsedPdfDate || (mainDateInput && mainDateInput.value) || vitaLocalToday();

      // Kreatinin veya doğrudan eGFR okunduysa CKD-EPI 2021 eGFR bilgisini hazırla
      let egfrBannerHtml = "";
      const crVal = results.creatinine ? parseFloat(results.creatinine.value) : null;
      const calcEgfr = (crVal !== null && !isNaN(crVal) && typeof calculateCKDEPI_eGFR === "function")
        ? calculateCKDEPI_eGFR(crVal, state.user?.age || 28, state.user?.gender || "K")
        : null;
      const displayEgfr = calcEgfr ? calcEgfr.egfr : temporarilyParsedPdfEgfr;
      if (displayEgfr !== null && displayEgfr !== undefined) {
        const stageText = calcEgfr ? `${calcEgfr.stage} — ${calcEgfr.label}` : "PDF'den okunan eGFR";
        egfrBannerHtml = `
          <div class="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs flex items-center justify-between gap-2">
            <div>
              <span class="font-black text-sky-950 block"><i class="fa-solid fa-kidney text-sky-600 mr-1"></i> Otomatik Böbrek Fonksiyonu (eGFR / CKD-EPI)</span>
              <span class="text-[11px] text-sky-800">${escapeHtmlText(stageText)} ${crVal ? `(Kreatinin: ${crVal} mg/dL)` : ""}</span>
            </div>
            <span class="px-2.5 py-1 rounded-lg bg-white border border-sky-300 font-mono font-black text-sm text-sky-900">${escapeHtmlText(String(displayEgfr))} mL/dk</span>
          </div>`;
      }

      const dateBannerHtml = `
        <div class="p-3 rounded-xl bg-teal-50/80 border border-teal-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label for="pdfParsedDateInput" class="font-black text-navy-900 block">
              <i class="fa-solid fa-calendar-check text-teal-600 mr-1"></i> ${temporarilyParsedPdfDate ? "PDF'den Otomatik Okunan Tahlil Tarihi" : "Tahlil Tarihi (İsterseniz Düzenleyin)"}
            </label>
            <span class="text-[10px] text-slate-600">${temporarilyParsedPdfDate ? "Belgedeki tarih otomatik çekildi; dilerseniz elle değiştirebilirsiniz." : "PDF'de tarih etiketi bulunamadı; tarihi buradan veya formdan seçebilirsiniz."}</span>
          </div>
          <input id="pdfParsedDateInput" type="date" value="${escapeHtmlText(effectiveDate)}" onchange="updateParsedPdfDate(this.value)" class="min-h-9 rounded-lg border border-teal-300 bg-white px-2.5 py-1.5 font-mono font-bold text-xs text-navy-900 focus:border-teal-500">
        </div>`;

      if (listContainer) {
        listContainer.innerHTML = dateBannerHtml + egfrBannerHtml + keys.map(k => {
          const item = results[k];
          return `
            <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_130px_minmax(0,1fr)] gap-2 items-end p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <div class="min-w-0">
                <label for="pdfValue-${escapeHtmlText(k)}" class="font-bold text-navy-900 block mb-1">${escapeHtmlText(item.name)}</label>
                <input id="pdfValue-${escapeHtmlText(k)}" type="number" step="any" value="${escapeHtmlText(item.value)}" oninput="updateParsedPdfField('${escapeHtmlText(k)}','value',this.value)" class="w-full min-h-10 rounded-lg border border-emerald-300 bg-white px-2.5 py-2 font-mono font-bold text-emerald-900 focus:border-teal-500" aria-label="${escapeHtmlText(item.name)} sonucu">
              </div>
              <div class="text-[10px] text-slate-600 pb-2">Birim: <strong>${escapeHtmlText(item.unit)}</strong></div>
              <div>
                <label for="pdfReference-${escapeHtmlText(k)}" class="font-bold text-slate-700 block mb-1">PDF’den okunan laboratuvar referansı</label>
                <input id="pdfReference-${escapeHtmlText(k)}" type="text" value="${escapeHtmlText(item.reference || "")}" placeholder="PDF satırında bulunamadı" oninput="updateParsedPdfField('${escapeHtmlText(k)}','reference',this.value)" class="w-full min-h-10 rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs focus:border-teal-500" aria-label="${escapeHtmlText(item.name)} referans aralığı">
              </div>
            </div>`;
        }).join('');
      }
    }

    function updateParsedPdfDate(dateValue) {
      const clean = String(dateValue || "").trim();
      if (!clean) return;
      temporarilyParsedPdfDate = clean;
      const mainDateInput = document.getElementById("inputLabDate");
      if (mainDateInput) mainDateInput.value = clean;
    }

    function updateParsedPdfField(key, field, value) {
      if (!temporarilyParsedLabResults || !temporarilyParsedLabResults[key]) return;
      if (field === "value") {
        const parsed = value === "" ? null : Number(value);
        temporarilyParsedLabResults[key].value = parsed === null || Number.isFinite(parsed) ? parsed : null;
      } else if (field === "reference") {
        temporarilyParsedLabResults[key].reference = String(value || "").slice(0, 80);
      }
    }