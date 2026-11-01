let currentAuthMode = "login";
    let activeUserId = null;
    let labTrendChartInstance = null;
    let pendingDeprescribingItems = [];
    let temporarilyParsedLabResults = {};
    let temporarilyParsedPdfDate = null;
    let temporarilyParsedPdfEgfr = null;
    let activeReviewSupplementId = null;

    const state = {
      user: null,
      supplements: [],
      hydration: { current: 0, target: 2450 },
      labValues: { d3: null, b12: null, ferritin: null, mg: null, ca: null, zinc: null, creatinine: null, folate: null, alt: null, hb: null, mcv: null, crp: null },
      labReferences: {},
      labHistory: [],
      selectedSymptoms: new Set(),
      resolvedSymptoms: new Set(),
      supplementReviews: {},
      lastCDSS: null,
      activeTab: "view-home"
    };

    const defaultUserProfile = {
      name: "",
      age: 28,
      gender: "K",
      height: 168,
      weight: 68,
      bmi: 24.1,
      bmiCategory: "İdeal Kilo",
      bmiBadgeColor: "bg-emerald-50 text-emerald-800 border-emerald-300",
      isAdipose: false,
      chronic: [],
      activity: "sedentary"
    };

    const ALL_VITA_LAB_KEYS = [
      "d3", "b12", "ferritin", "iron", "tsat", "crp", "mg", "hba1c",
      "alt", "creatinine", "ca", "rbc", "hgb", "hb", "hct", "mcv",
      "folate", "zinc", "tsh", "ft4"
    ];

    function safeStructuredClone(value) {
      if (value === null || value === undefined || typeof value !== "object") {
        return value;
      }
      if (value instanceof Set) {
        return new Set(Array.from(value, item => safeStructuredClone(item)));
      }
      if (typeof window.structuredClone === "function") {
        try {
          return window.structuredClone(value);
        } catch (_) {}
      }
      if (Array.isArray(value)) {
        return value.map(item => safeStructuredClone(item));
      }
      const cloned = {};
      Object.keys(value).forEach(k => {
        const prop = value[k];
        if (typeof prop !== "function") {
          cloned[k] = safeStructuredClone(prop);
        }
      });
      return cloned;
    }

    function createEmptyLabValuesState() {
      const empty = {};
      ALL_VITA_LAB_KEYS.forEach(k => {
        empty[k] = null;
      });
      return empty;
    }

    function createEmptyLabReferencesState() {
      return {};
    }

    function buildLabValuesFromRecord(record) {
      const fresh = createEmptyLabValuesState();
      if (!record || typeof record !== "object") return fresh;
      ALL_VITA_LAB_KEYS.forEach(k => {
        const raw = record[k];
        if (raw !== null && raw !== undefined && raw !== "") {
          const num = Number(String(raw).replace(",", "."));
          fresh[k] = Number.isFinite(num) ? num : null;
        }
      });
      if (fresh.hb !== null && fresh.hgb === null) fresh.hgb = fresh.hb;
      if (fresh.hgb !== null && fresh.hb === null) fresh.hb = fresh.hgb;
      return safeStructuredClone(fresh);
    }

    function clearClinicalAnalysisDOMContainers() {
      const containerIds = [
        "clinicalResultsTriageEgfrBanner",
        "findingsList",
        "protocolTableBody",
        "triageLabRecommendationsContainer",
        "contraindicationAlertContainer",
        "cdssKidneySafetyWarningContainer",
        "foodAlternativesSection",
        "cdssRecallContainer",
        "aiSummaryTextContainer"
      ];
      containerIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.innerHTML = "";
          if (
            id === "clinicalResultsTriageEgfrBanner" ||
            id === "triageLabRecommendationsContainer" ||
            id === "contraindicationAlertContainer" ||
            id === "cdssKidneySafetyWarningContainer" ||
            id === "foodAlternativesSection" ||
            id === "cdssRecallContainer"
          ) {
            el.classList.add("hidden");
          }
        }
      });
      const aiCard = document.getElementById("aiClinicalSummaryCard");
      if (aiCard) {
        aiCard.classList.add("hidden");
        aiCard.style.display = "none";
      }
    }

    function invalidateClinicalAnalysisCache(options = {}) {
      state.lastCDSS = null;
      state.anamnesisTriageState = null;
      state.lastKidneySafetyAnalysis = null;
      try {
        if (activeUserId) {
          safeLocalStorageRemoveItem(`vitatakip_cdss_${activeUserId}`);
        }
        safeLocalStorageRemoveItem("lastAnalysisResult");
        safeLocalStorageRemoveItem("clinicalAnalysisCache");
      } catch (_) {}
      if (options.clearDOM !== false) {
        clearClinicalAnalysisDOMContainers();
      }
    }

    window.safeStructuredClone = safeStructuredClone;
    window.ALL_VITA_LAB_KEYS = ALL_VITA_LAB_KEYS;
    window.createEmptyLabValuesState = createEmptyLabValuesState;
    window.createEmptyLabReferencesState = createEmptyLabReferencesState;
    window.buildLabValuesFromRecord = buildLabValuesFromRecord;
    window.clearClinicalAnalysisDOMContainers = clearClinicalAnalysisDOMContainers;
    window.invalidateClinicalAnalysisCache = invalidateClinicalAnalysisCache;


    // Genel uygulama karşılaştırma aralıklarıdır; hastanenin raporundaki aralık varsa o aralık korunur.
    // Referanslar kişiye/laboratuvara göre değişebileceğinden bu aralıklar tanı veya doz kararı değildir.
    const VITA_LAB_APP_REFERENCE_META = {
      // "Genel aralık": laboratuvar referansı girilmediğinde kullanılan, tanı sınırı OLMAYAN karşılaştırma aralığıdır.
      // Kaynak ve doğrulama durumu: js/app/16-lab-evidence.js ve docs/LAB_THRESHOLDS.md
      d3: { name: "25-OH D Vitamini", value: "20–50 ng/mL", unit: "ng/mL" },
      b12: { name: "Vitamin B12", value: "200–900 pg/mL", unit: "pg/mL" },
      ferritin: { name: "Ferritin", value: "15–150 ng/mL", maleValue: "15–200 ng/mL", unit: "ng/mL" },
      mg: { name: "Magnezyum", value: "1,8–2,3 mg/dL", unit: "mg/dL" },
      ca: { name: "Kalsiyum", value: "8,6–10,2 mg/dL", unit: "mg/dL" },
      zinc: { name: "Çinko", value: "70–120 µg/dL", unit: "µg/dL" },
      creatinine: { name: "Kreatinin", value: "0,6–1,2 mg/dL", unit: "mg/dL" },
      folate: { name: "Folat", value: "4,0–20,0 ng/mL", unit: "ng/mL" },
      alt: { name: "ALT", value: "7–35 U/L", unit: "U/L" },
      hb: { name: "Hemoglobin", value: "12,0–16,0 g/dL", maleValue: "13,0–17,5 g/dL", unit: "g/dL" },
      mcv: { name: "MCV", value: "80–100 fL", unit: "fL" },
      crp: { name: "CRP", value: "0–5 mg/L", unit: "mg/L" }
    };

    function getVitaAppLabReference(key, gender = state.user?.gender || "K") {
      const meta = VITA_LAB_APP_REFERENCE_META[key];
      if (!meta) return "Aralık tanımlı değil";
      const value = (key === "ferritin" || key === "hb") && gender === "E" ? meta.maleValue : meta.value;
      return value;
    }

    function getVitaAppLabReferenceMap(gender = state.user?.gender || "K") {
      return Object.fromEntries(Object.keys(VITA_LAB_APP_REFERENCE_META).map(key => [key, getVitaAppLabReference(key, gender)]));
    }

    function updateLabApplicationReferenceHints() {
      Object.keys(VITA_LAB_APP_REFERENCE_META).forEach(key => {
        const target = document.getElementById(`vitaLabAppRef-${key}`);
        if (!target) return;
        const meta = VITA_LAB_APP_REFERENCE_META[key];
        target.textContent = `${meta.name} için VitaTakip genel karşılaştırma aralığı (yaklaşık): ${getVitaAppLabReference(key)}. Klinik referans yerine geçmez; raporunuzdaki laboratuvar aralığı önceliklidir.`;
      });
    }

    function getLabReferenceCellHtml(record, key) {
      const facility = String(record?.references?.[key] || "").trim();
      const appRange = String(record?.applicationReferences?.[key] || getVitaAppLabReference(key, record?.genderAtTest || state.user?.gender || "K"));
      if (facility) {
        return `<span class="mt-0.5 block text-[9px] font-sans text-sky-700" title="Hastane raporundan veya elle girilen referans">Lab/PDF: ${escapeHtmlText(facility)}</span><span class="mt-0.5 block text-[9px] font-sans text-slate-400" title="VitaTakip genel uygulama aralığı">Uygulama: ${escapeHtmlText(appRange)}</span>`;
      }
      return `<span class="mt-0.5 block text-[9px] font-sans text-teal-700" title="Genel uygulama karşılaştırma aralığı; hastane referansı değildir">Uygulama aralığı: ${escapeHtmlText(appRange)}</span>`;
    }

    function getSupplementTimeLabel(item) {
      if (item?.scheduleTime && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(item.scheduleTime))) return String(item.scheduleTime);
      const timing = String(item?.timing || "");
      return timing === "Sabah" || timing === "morning" ? "08:00" : timing === "Öğle" || timing === "noon" ? "13:00" : "21:30";
    }

    function getSupplementTimingGroup(timeValue) {
      const [hour, minute] = String(timeValue || "08:00").split(":").map(Number);
      const totalMinutes = (hour || 0) * 60 + (minute || 0);
      return totalMinutes < 660 ? "Sabah" : totalMinutes < 1020 ? "Öğle" : "Akşam";
    }

    function isSupplementScheduledToday(item, date = new Date()) {
      if (!item) return false;
      const todayIso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const todayTr = date.toLocaleDateString("tr-TR");
      if (item.scheduledDate && (item.scheduledDate === todayIso || item.scheduledDate === todayTr)) {
        return true;
      }
      const days = item?.scheduleDays;
      if (!Array.isArray(days) || days.length === 0) {
        return item?.explicitlyUnscheduled ? false : true;
      }
      return days.map(Number).includes(date.getDay());
    }

    function getSupplementScheduleDaysLabel(item) {
      const days = Array.isArray(item?.scheduleDays) ? item.scheduleDays.map(Number) : [1, 2, 3, 4, 5, 6, 0];
      const allDays = [1, 2, 3, 4, 5, 6, 0];
      if (allDays.every(day => days.includes(day))) return "Her gün";
      const labels = { 1: "Pzt", 2: "Sal", 3: "Çar", 4: "Per", 5: "Cum", 6: "Cmt", 0: "Paz" };
      return days.sort((a, b) => ([1,2,3,4,5,6,0].indexOf(a) - [1,2,3,4,5,6,0].indexOf(b))).map(day => labels[day]).filter(Boolean).join(", ") || "Gün seçilmedi";
    }

    function handleLabReferenceChange(key, value) {
      if (!state.labReferences) state.labReferences = {};
      const clean = String(value || "").trim();
      if (clean) state.labReferences[key] = clean;
      else delete state.labReferences[key];
      const inputMap = { d3: "inputLabD3", b12: "inputLabB12", ferritin: "inputLabFerritin", mg: "inputLabMg", ca: "inputLabCalcium", zinc: "inputLabZinc", creatinine: "inputLabCreatinine", folate: "inputLabFolate", alt: "inputLabAlt", hb: "inputLabHb", mcv: "inputLabMcv", crp: "inputLabCrp" };
      if (inputMap[key]) updateVitaLabLiveFeedback(inputMap[key], key);
      if (typeof saveLabDraft === "function") saveLabDraft();
    }

    function suggestBarcodeScheduleFromName() {
      const nameInput = document.getElementById("barcodeSupplementName");
      const timeInput = document.getElementById("barcodeScheduleTime");
      const note = document.getElementById("barcodeScheduleSuggestionNote");
      if (!nameInput || !timeInput || timeInput.dataset.userEdited === "true") return;
      const name = String(nameInput.value || "").toLocaleLowerCase("tr-TR");
      const suggestions = [
        { re: /omega[\s-]*3|balık yağı|balik yagi|epa|dha/, time: "13:00", label: "Omega-3" },
        { re: /vitamin[\s-]*d|d vitamini|d3|kolekalsiferol/, time: "08:00", label: "D vitamini" },
        { re: /\bb12\b|kobalamin|cobalamin|metilkobalamin/, time: "08:00", label: "B12" },
        { re: /folat|folik asit|folic acid|\bb9\b/, time: "08:00", label: "folat" },
        { re: /magnezyum|magnesium/, time: "21:30", label: "magnezyum" }
      ];
      const match = suggestions.find(item => item.re.test(name));
      if (!name) {
        timeInput.value = "";
        if (note) note.textContent = "Ürün adını yazın. Tanınan bazı ürün türleri için yalnızca hatırlatma saati taslağı önerilir.";
        return;
      }
      if (match) {
        timeInput.value = match.time;
        if (note) note.textContent = `${match.label} için ${match.time} hatırlatma saati taslak olarak önerildi; bu bir kullanım/doz talimatı değildir. Kutu etiketi, hekim veya eczacı talimatına göre değiştirebilirsiniz.`;
      } else {
        timeInput.value = "";
        if (note) note.textContent = "Bu ad için otomatik saat önerisi yok. Etiket/hekim/eczacı talimatına göre hatırlatma saatini kendiniz seçin.";
      }
    }

    function askVitaAIAboutBarcodeSupplement() {
      const name = String(document.getElementById("barcodeSupplementName")?.value || "").trim();
      if (!name) {
        showToast("Önce ürün adını girin", "VitaAI için ürün adını kutu üzerindeki yazıyla doğrulayıp girin.", "warning");
        document.getElementById("barcodeSupplementName")?.focus();
        return;
      }
      const input = document.getElementById("ai-user-input");
      if (!window.VitaAIChat || !input) {
        showToast("VitaAI sohbet alanı bulunamadı", "Uygulamadaki VitaAI sohbet bölümünü açıp ürün adını orada sorabilirsiniz.", "warning");
        return;
      }
      input.value = `Şu takviyeyi yalnızca ürün adı üzerinden değerlendir: "${name}". Ürünün tam içerik/dozu ve etiketi doğrulanmadı. Tanı veya doz reçetesi verme. Olası ilaç/takviye etkileşimlerini, hangi durumlarda hekim/eczacıya danışılması gerektiğini ve etiket talimatında nelere dikkat edilmesi gerektiğini genel bilgi olarak açıkla. Bilgi kesin değilse bunu belirt; ilaç veya takviye dozunu/saatini benim yerime değiştirme.`;
      window.VitaAIChat.toggle(true);
      input.focus();
      showToast("Soru taslağı hazır", "Soru sohbet alanına aktarıldı, otomatik gönderilmedi. Göndermeden önce metni ve Gemini veri paylaşım onayını kontrol edin.", "info");
    }

    function getBarcodeSupplementSafetyNote(productName) {
      const name = String(productName || "").toLocaleLowerCase("tr-TR");
      if (/omega[\s-]*3|balık yağı|balik yagi|epa|dha/.test(name)) {
        return "Genel etkileşim notu: Omega-3, özellikle yüksek dozlarda veya varfarin gibi pıhtılaşmayı etkileyen ilaçlarla birlikte kullanıldığında hekim/eczacı değerlendirmesi gerektirebilir. Kendi kendinize ilaç bırakmayın veya doz değiştirmeyin.";
      }
      if (/demir|iron|ferrous|ferric/.test(name)) {
        return "Genel etkileşim notu: Kalsiyum takviyeleri demir emilimini azaltabilir; demir, levotiroksin ve levodopa gibi ilaçlarla da etkileşebilir. Aynı anda/alım aralığını eczacı veya hekimle doğrulayın.";
      }
      if (/magnezyum|magnesium/.test(name)) {
        return "Genel etkileşim notu: Magnezyum takviyeleri bazı antibiyotiklerin ve ağızdan alınan bisfosfonatların emilimini azaltabilir. İlaç kullanıyorsanız uygun zaman aralığını eczacı/hekimle doğrulayın.";
      }
      if (/vitamin[\s-]*d|d vitamini|d3|kolekalsiferol/.test(name)) {
        return "Genel etkileşim notu: D vitamini bazı ilaçlarla (ör. tiyazid türü idrar söktürücüler, steroidler ve orlistat) etkileşebilir. Böbrek hastalığı, yüksek kalsiyum öyküsü veya düzenli ilaç kullanımı varsa hekime/eczacıya danışın.";
      }
      if (/folat|folik asit|folic acid|\bb9\b/.test(name)) {
        return "Genel uyarı: Yüksek doz folat, B12 eksikliği olasılığında klinik değerlendirmeyi geciktirmemelidir. Doz ve B12 durumunu hekimle doğrulayın; ilaç etkileşimlerini eczacıya sorun.";
      }
      if (/\bb12\b|kobalamin|cobalamin|metilkobalamin/.test(name)) {
        return "Genel not: B12 ürünlerinin içeriği ve kullanım sıklığı değişir. Metformin veya mide asidini azaltan ilaçlar gibi düzenli ilaçlarınızı hekim/eczacıyla birlikte değerlendirin.";
      }
      return "Genel güvenlik notu: Barkod ürün içeriğini, dozu veya etkileşimleri doğrulamaz. Ürünün etiket/prospektüs talimatını ve tüm ilaçlarınızla olası etkileşimleri eczacı/hekimle doğrulayın.";
    }

    function addBarcodeSupplementToSchedule() {
      if (!state.user || !activeUserId) {
        showToast("Önce giriş yapın", "Barkodla eklenen takviyenin kişisel çizelgeye kaydedilmesi için hesabınıza giriş yapın.", "warning");
        return;
      }
      const nameEl = document.getElementById("barcodeSupplementName");
      const formEl = document.getElementById("barcodeSupplementForm");
      const doseEl = document.getElementById("barcodeSupplementDose");
      const boxCountEl = document.getElementById("barcodeSupplementBoxCount");
      const dailyDoseEl = document.getElementById("barcodeSupplementDailyDose");
      const codeEl = document.getElementById("barcodeManualValue");
      const timeEl = document.getElementById("barcodeScheduleTime");
      const name = String(nameEl?.value || "").trim();
      const formValue = String(formEl?.value || "").trim();
      const barcode = String(codeEl?.value || "").trim();
      const scheduleTime = String(timeEl?.value || "").trim();
      const doseNote = String(doseEl?.value || "").trim();
      const toplamKutuAdedi = Math.max(1, parseInt(boxCountEl?.value, 10) || 30);
      const gunlukDoz = Math.max(1, parseInt(dailyDoseEl?.value, 10) || 1);
      const kalanAdet = toplamKutuAdedi;
      const scheduleDays = Array.from(document.querySelectorAll('input[name="barcodeScheduleDay"]:checked')).map(input => Number(input.value)).filter(Number.isInteger);
      if (!name) { showToast("Ürün adı gerekli", "Kutu üzerindeki ürün adını doğrulayıp girin; barkod numarası tek başına ürün adını belirlemez.", "warning"); nameEl?.focus(); return; }
      if (typeof classifyScannedProductCategory === "function" && classifyScannedProductCategory(name) === "medication") {
        showToast("Takviye Filtresi Kısıtlaması", "Bu alanda yalnızca vitaminler ve gıda takviyeleri eklenebilir. Reçeteli ilaçları 'İlaç Seç ve Denetle' modülünden denetleyebilirsiniz.", "warning");
        if (typeof switchBarcodeScannerMode === "function") switchBarcodeScannerMode("medication");
        return;
      }
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) { showToast("Saat geçersiz", "Lütfen geçerli bir saat seçin.", "warning"); timeEl?.focus(); return; }
      if (!scheduleDays.length) { showToast("Gün seçilmedi", "Takviyenin çizelgede görünmesi için en az bir gün seçin.", "warning"); return; }
      if (barcode && state.supplements.some(item => String(item.barcode || "") === barcode)) {
        showToast("Barkod zaten kayıtlı", "Bu barkod daha önce çizelgeye eklendi. Yinelenen kayıt oluşturulmadı.", "info");
        return;
      }
      const item = {
        id: `sup_barcode_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        formKey: null,
        selectedForm: formValue || "Barkodla eklenen ürün",
        timing: getSupplementTimingGroup(scheduleTime),
        scheduleTime,
        scheduleDays,
        barcode: barcode || null,
        toplamKutuAdedi,
        kalanAdet,
        gunlukDoz,
        doseText: doseNote || "Doz bilgisi eklenmedi — kutu/hekim talimatını doğrulayın",
        subText: `${formValue ? `${formValue} · ` : ""}Barkod/AI ile kaydedildi${barcode ? ` · Kod: ${barcode}` : ""}`,
        instruction: `${getBarcodeSupplementSafetyNote(name)} Barkod numarası ürün kimliğini, içeriğini veya güvenliğini doğrulamaz. Ürün etiketi/prospektüsü ve hekim/eczacı talimatı önceliklidir; burada doz önerisi yapılmaz.`, 
        addedDate: Date.now(),
        taken: false,
        scheduleSource: "barcode_user_confirmed"
      };
      state.supplements.push(item);
      const saved = saveState();
      closeBarcodeScannerModal();
      closeAddSupplementModal();
      renderDailyTab();
      checkPendingSymptomReviews();
      detectSupplementConflicts();
      if (typeof navigateToView === "function") navigateToView("view-home");
      showToast(saved === false ? "Çizelge güncellendi" : "Takviye çizelgeye eklendi", saved === false ? `${name} bu oturumda görünüyor; tarayıcıya kalıcı kaydetme başarısız olmuş olabilir.` : `${name} (${toplamKutuAdedi} adet, günlük doz: ${gunlukDoz}) çizelgeye kaydedildi.`, saved === false ? "warning" : "success");
    }

    function resetApplicationDOMAndState() {
      if (window.VitaAIChat && typeof window.VitaAIChat.resetSession === "function") window.VitaAIChat.resetSession();
      state.user = null;
      state.supplements = [];
      state.hydration = { current: 0, target: 2450 };
      state.labValues = createEmptyLabValuesState();
      state.labReferences = createEmptyLabReferencesState();
      state.labHistory = [];
      pendingLabRecordConflict = null;
      const conflictModal = document.getElementById("labDateConflictModal");
      if (conflictModal) { conflictModal.classList.add("hidden"); conflictModal.style.display = "none"; }
      state.selectedSymptoms = new Set();
      state.selectedSymptomsArray = [];
      state.resolvedSymptoms = new Set();
      state.supplementReviews = {};
      invalidateClinicalAnalysisCache({ clearDOM: true });

      const labInputs = ["inputLabD3", "inputLabB12", "inputLabFerritin", "inputLabMg", "inputLabCalcium", "inputLabZinc", "inputLabCreatinine", "inputLabFolate", "inputLabAlt", "inputLabHb", "inputLabMcv", "inputLabCrp", "inputLabRef-d3", "inputLabRef-b12", "inputLabRef-ferritin", "inputLabRef-mg", "inputLabRef-ca", "inputLabRef-zinc", "inputLabRef-creatinine", "inputLabRef-folate", "inputLabRef-alt", "inputLabRef-hb", "inputLabRef-mcv", "inputLabRef-crp"];
      labInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });

      const dateInput = document.getElementById("inputLabDate");
      if (dateInput) {
        const now = new Date();
        dateInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      }

      document.querySelectorAll('input[name="modal_chronic"]').forEach(cb => { cb.checked = false; });
      const modalNone = document.getElementById("modalChronicNone");
      if (modalNone) modalNone.checked = true;

      document.querySelectorAll(".anamnesis-card").forEach(card => {
        card.classList.remove("border-indigo-500", "bg-indigo-50/70", "ring-1", "ring-indigo-400");
        card.classList.add("border-slate-200", "bg-white");
        const dot = card.querySelector(".check-dot");
        if (dot) { dot.className = "w-4 h-4 rounded-full border border-slate-300 check-dot"; dot.innerHTML = ""; }
      });

      switchAnamnesisCategoryTab("cat-A");

      const accSummary = document.getElementById("acc-integrated-summary");
      if (accSummary) accSummary.classList.add("hidden");
      const accSummaryLbl = document.getElementById("label-acc-integrated-summary");
      if (accSummaryLbl) accSummaryLbl.textContent = "Göster";
      const accSummaryIco = document.getElementById("icon-acc-integrated-summary");
      if (accSummaryIco) { accSummaryIco.className = "fa-solid fa-chevron-down text-[10px] transition-transform duration-200"; }

      const autoProfSum = document.getElementById("neyimAutoProfileSummary");
      if (autoProfSum) autoProfSum.innerHTML = "<p>Profil verileriniz yükleniyor...</p>";
      const autoLabSum = document.getElementById("neyimAutoLabSummary");
      if (autoLabSum) autoLabSum.innerHTML = '<p class="italic text-slate-400">Henüz tahlil girilmedi - Semptom bazlı ön triyaj yapılacak</p>';
      const autoLabDate = document.getElementById("neyimAutoLabDateBadge");
      if (autoLabDate) autoLabDate.textContent = "Tahlil Yok";
      const autoActBadge = document.getElementById("neyimAutoActivityBadge");
      if (autoActBadge) autoActBadge.textContent = "Masa Başı";

      const cdssRes = document.getElementById("cdssResultContainer");
      if (cdssRes) { cdssRes.classList.add("hidden"); cdssRes.style.display = "none"; }
      const findingsList = document.getElementById("findingsList");
      if (findingsList) findingsList.innerHTML = "";
      const protoTbody = document.getElementById("protocolTableBody");
      if (protoTbody) protoTbody.innerHTML = "";

      const triageBox = document.getElementById("triageLabRecommendationsContainer");
      if (triageBox) { triageBox.classList.add("hidden"); triageBox.style.display = "none"; triageBox.innerHTML = ""; }
      const conflictBanner = document.getElementById("conflictShieldAlertBanner");
      if (conflictBanner) { conflictBanner.classList.add("hidden"); conflictBanner.style.display = "none"; conflictBanner.innerHTML = ""; }
      const contraAlert = document.getElementById("contraindicationAlertContainer");
      if (contraAlert) { contraAlert.classList.add("hidden"); contraAlert.innerHTML = ""; }
      const recallBox = document.getElementById("cdssRecallContainer");
      if (recallBox) { recallBox.classList.add("hidden"); recallBox.innerHTML = ""; }

      const aiCard = document.getElementById("aiClinicalSummaryCard");
      if (aiCard) { aiCard.classList.add("hidden"); aiCard.style.display = "none"; }
      const aiText = document.getElementById("aiSummaryTextContainer");
      if (aiText) aiText.innerHTML = "";
      const repAiCard = document.getElementById("repHekimAiSummaryCard");
      if (repAiCard) { repAiCard.classList.add("hidden"); repAiCard.style.display = "none"; }
      const repAiText = document.getElementById("repHekimAiSummaryText");
      if (repAiText) repAiText.innerHTML = "";

      const repLabBody = document.getElementById("repLabTableBody");
      const reportSectionIds = ["repAnamnesisWrapper", "repLabSectionWrapper", "repTrendSectionWrapper", "repFindingsSectionWrapper", "repSupplementsSectionWrapper"];
      reportSectionIds.forEach(id => document.getElementById(id)?.classList.add("hidden"));
      if (repLabBody) repLabBody.innerHTML = "";
      const repTrendBody = document.getElementById("repTrendTableBody");
      const repTrendSection = document.getElementById("repTrendSectionWrapper");
      if (repTrendSection) repTrendSection.classList.add("hidden");
      if (repTrendBody) repTrendBody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400 italic">Karşılaştırma için en az iki tahlil kaydı gerekir.</td></tr>`;
      const repAnamnesisBody = document.getElementById("repAnamnesisTableBody");
      if (repAnamnesisBody) repAnamnesisBody.innerHTML = `<tr><td colspan="2" class="p-3 text-center text-slate-400 italic">Kayıtlı belirti yok.</td></tr>`;
      const repFindings = document.getElementById("repFindingsContainer");
      if (repFindings) repFindings.innerHTML = `<div class="italic text-slate-400">Henüz 'NeyimVar?' sekmesinde analiz çalıştırılmadı.</div>`;
      const repProducts = document.getElementById("repCurrentSupplements");
      if (repProducts) repProducts.innerHTML = "";
      const reportLatestLabDate = document.getElementById("reportLatestLabDate");
      if (reportLatestLabDate) reportLatestLabDate.textContent = "";

      const docNotes = document.getElementById("doctorNotesInput");
      if (docNotes) docNotes.value = "";
      const doctorQuestionsDraft = document.getElementById("doctorQuestionsDraft");
      if (doctorQuestionsDraft) doctorQuestionsDraft.value = "";
      const doctorQuestionsContext = document.getElementById("doctorQuestionsContext");
      if (doctorQuestionsContext) doctorQuestionsContext.textContent = "";
      const healthDataConsent = document.getElementById("aiHealthDataConsent");
      if (healthDataConsent) healthDataConsent.checked = false;
      const revBanner = document.getElementById("pendingReviewAlertBanner");
      if (revBanner) { revBanner.classList.add("hidden"); revBanner.style.display = "none"; revBanner.innerHTML = ""; }

      const chartCard = document.getElementById("biomarkerChartCard");
      if (chartCard) chartCard.classList.remove("hidden");
      const chartContent = document.getElementById("acc-labtrend");
      if (chartContent) chartContent.classList.remove("hidden");
      const chartToggle = document.getElementById("labTrendAccordionToggle");
      if (chartToggle) chartToggle.setAttribute("aria-expanded", "true");
      const chartLabel = document.getElementById("label-acc-labtrend");
      if (chartLabel) chartLabel.textContent = "Grafiği gizle";
      const chartIcon = document.getElementById("icon-acc-labtrend");
      if (chartIcon) { chartIcon.classList.remove("fa-chevron-down"); chartIcon.classList.add("fa-chevron-up"); }
      labHistoryShowAll = false;
      if (labTrendChartInstance) { labTrendChartInstance.destroy(); labTrendChartInstance = null; }
      if (window.VitaRechartsDashboard && typeof window.VitaRechartsDashboard.renderAll === "function") {
        window.VitaRechartsDashboard.renderAll();
      }
    }

    // Kullanıcı girdilerini HTML şablonlarına koymadan önce kaçırır; bu tek dosyalı prototipte XSS riskini azaltır.
    function escapeHtmlText(value) {
      return String(value === null || value === undefined ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    const vitaMemoryLocalStore = new Map();
    const vitaMemorySessionStore = new Map();
    let vitaStorageWarningShown = false;
    function notifyLocalStorageProblem(error) {
      if (vitaStorageWarningShown) return;
      vitaStorageWarningShown = true;
      console.warn("VitaTakip yerel depolama uyarısı (bellek yedeği aktif):", error);
    }
    function safeLocalStorageSetItem(key, value) {
      const k = String(key);
      const v = String(value);
      vitaMemoryLocalStore.set(k, v);
      try { window.localStorage.setItem(k, v); return true; }
      catch (error) { notifyLocalStorageProblem(error); return true; }
    }
    function safeLocalStorageGetItem(key) {
      const k = String(key);
      try {
        const val = window.localStorage.getItem(k);
        if (val !== null && val !== undefined) {
          vitaMemoryLocalStore.set(k, val);
          return val;
        }
      } catch (error) {
        notifyLocalStorageProblem(error);
      }
      return vitaMemoryLocalStore.has(k) ? vitaMemoryLocalStore.get(k) : null;
    }
    function safeLocalStorageRemoveItem(key) {
      const k = String(key);
      vitaMemoryLocalStore.delete(k);
      try { window.localStorage.removeItem(k); return true; }
      catch (error) { notifyLocalStorageProblem(error); return true; }
    }
    function safeSessionStorageGetItem(key) {
      const k = String(key);
      try {
        const val = window.sessionStorage.getItem(k);
        if (val !== null && val !== undefined) {
          vitaMemorySessionStore.set(k, val);
          return val;
        }
      } catch (error) {
        console.warn("VitaTakip geçici oturum bilgisi okunamadı.", error);
      }
      return vitaMemorySessionStore.has(k) ? vitaMemorySessionStore.get(k) : safeLocalStorageGetItem(k);
    }
    function safeSessionStorageSetItem(key, value) {
      const k = String(key);
      const v = String(value);
      vitaMemorySessionStore.set(k, v);
      safeLocalStorageSetItem(k, v);
      try { window.sessionStorage.setItem(k, v); return true; }
      catch (error) { console.warn("VitaTakip geçici oturum bilgisi saklanamadı.", error); return true; }
    }
    function safeSessionStorageRemoveItem(key) {
      const k = String(key);
      vitaMemorySessionStore.delete(k);
      safeLocalStorageRemoveItem(k);
      try { window.sessionStorage.removeItem(k); return true; }
      catch (error) { console.warn("VitaTakip geçici oturum bilgisi temizlenemedi.", error); return true; }
    }

    function safeJsStringAttribute(value) {
      const literal = JSON.stringify(String(value === null || value === undefined ? "" : value))
        .replace(/</g, "\\u003c")
        .replace(/>/g, "\\u003e")
        .replace(/&/g, "\\u0026");
      return escapeHtmlText(literal);
    }

    function readStoredJSON(key, fallbackValue) {
      const raw = safeLocalStorageGetItem(key);
      if (!raw) return fallbackValue;
      try { return JSON.parse(raw); }
      catch (e) {
        console.warn(`VitaTakip kayıtlı verisi okunamadı (${key}); güvenli varsayılan kullanılıyor.`, e);
        return fallbackValue;
      }
    }

    function getUsersDb() {
      let raw;
      try { raw = safeLocalStorageGetItem("vitatakip_users_db"); }
      catch (e) { throw e; }
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn("VitaTakip hesap listesi okunamadı; boş liste kullanılıyor.", e);
        return [];
      }
    }

    function saveUsersDb(users) {
      if (!Array.isArray(users)) throw new TypeError("Hesap listesi geçersiz.");
      if (!safeLocalStorageSetItem("vitatakip_users_db", JSON.stringify(users))) {
        throw new Error("Tarayıcı hesap kaydını saklayamadı. Depolama iznini/kotasını kontrol edin.");
      }
    }

    function purgeLegacyDemoAccounts() {
      // Clean old presentation/test/guest accounts left in this browser by prior builds.
      // Normal user accounts without an explicit demo/test/guest marker are not touched.
      let users = [];
      try { users = getUsersDb(); } catch (_) { return 0; }
      if (!Array.isArray(users) || !users.length) return 0;
      const marker = /(^|[\s_-])(demo|deneme|sample|örnek|test|misafir|guest)(?=$|[\s_-])/i;
      const removed = users.filter(u =>
        String(u?.id || "") === "usr_guest_local" ||
        marker.test(String(u?.fullName || u?.name || "").trim())
      );
      if (!removed.length) return 0;
      const removedIds = new Set(removed.map(u => String(u?.id || "")).filter(Boolean));
      const kept = users.filter(u => !removedIds.has(String(u?.id || "")));
      try { saveUsersDb(kept); } catch (error) { console.warn("Legacy demo accounts could not be removed from the local account index.", error); return 0; }
      const prefixes = [
        "vitatakip_user_", "vitatakip_supplements_", "vitatakip_hydration_", "vitatakip_labs_",
        "vitatakip_labreferences_", "vitatakip_labhistory_", "vitatakip_symptoms_", "vitatakip_resolved_symptoms_",
        "vitatakip_reviews_", "vitatakip_cdss_", "vitatakip_notes_", "vitatakip_lastActiveDate_",
        "vitatakip_labdraft_", "vitatakip_profiledraft_", "vitatakip_anamnesis_category_",
        "vitatakip_extended_updated_", "vitatakip_extended_snapshot_", "vitatakip_pdfscan_", "vitatakip_pdf_scanlog_"
      ];
      for (const id of removedIds) {
        for (const prefix of prefixes) safeLocalStorageRemoveItem(prefix + id);
        if (safeLocalStorageGetItem("vitatakip_active_session_id") === id) safeLocalStorageRemoveItem("vitatakip_active_session_id");
        if (safeSessionStorageGetItem("vitatakip_active_session_id") === id) safeSessionStorageRemoveItem("vitatakip_active_session_id");
      }
      return removed.length;
    }

    function removeLegacyDemoSupplements() {
      if (!Array.isArray(state.supplements)) return false;
      const before = state.supplements.length;
      state.supplements = state.supplements.filter(item => {
        const id = String(item?.id || "");
        const name = String(item?.name || "");
        const instruction = String(item?.instruction || "");
        return !(item?.isBarcodeSimulation || id.startsWith("sup_barcode_demo_") || id.startsWith("sup_essential_") || /\(örnek kayıt\)/i.test(name) || /demo verisidir|örnek ürün verisidir/i.test(instruction));
      });
      return state.supplements.length !== before;
    }

    function isRememberMeEnabled() {
      const saved = safeLocalStorageGetItem("vitatakip_remember_me");
      return saved === null ? true : saved === "true";
    }

    function syncRememberMeButtonUI(checked) {
      const isChecked = Boolean(checked);
      const cb = document.getElementById("authRememberMeCheckbox");
      const btn = document.getElementById("authRememberMeBtn");
      const iconBox = document.getElementById("authRememberMeCheckIcon");
      const badge = document.getElementById("authRememberMeStateBadge");
      const subtext = document.getElementById("authRememberMeSubtext");
      if (cb && cb.checked !== isChecked) {
        cb.checked = isChecked;
      }
      if (btn) {
        btn.setAttribute("aria-pressed", isChecked ? "true" : "false");
        btn.className = isChecked
          ? "w-full px-3 py-2.5 rounded-xl border-2 border-teal-500 bg-teal-50/80 hover:bg-teal-100/70 text-navy-900 transition flex items-center justify-between gap-2.5 cursor-pointer text-left"
          : "w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition flex items-center justify-between gap-2.5 cursor-pointer text-left";
      }
      if (iconBox) {
        iconBox.className = isChecked
          ? "w-5 h-5 rounded-md bg-teal-600 text-white flex items-center justify-center text-[11px] font-black shrink-0 transition"
          : "w-5 h-5 rounded-md bg-slate-100 border border-slate-300 text-transparent flex items-center justify-center text-[11px] font-black shrink-0 transition";
      }
      if (badge) {
        badge.className = isChecked
          ? "text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-600 text-white shrink-0"
          : "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 shrink-0";
        badge.textContent = isChecked ? "Aktif" : "Kapalı";
      }
      if (subtext) {
        subtext.textContent = isChecked
          ? "Bu cihazda oturumumu ve giriş bilgilerimi açık tut"
          : "Yalnızca bu oturumda açık kalsın (uygulama kapanınca sor)";
      }
    }

    function toggleRememberMeOption() {
      const cb = document.getElementById("authRememberMeCheckbox");
      const nextState = cb ? !cb.checked : !isRememberMeEnabled();
      if (cb) cb.checked = nextState;
      safeLocalStorageSetItem("vitatakip_remember_me", nextState ? "true" : "false");
      if (!nextState) {
        safeLocalStorageRemoveItem("vitatakip_remembered_user_id");
        safeLocalStorageRemoveItem("vitatakip_remembered_fullname");
        document.getElementById("authRememberedQuickLoginBox")?.classList.add("hidden");
      }
      syncRememberMeButtonUI(nextState);
    }

    function hydrateRememberMeOnAuthModal() {
      const enabled = isRememberMeEnabled();
      syncRememberMeButtonUI(enabled);
      const rememberedName = safeLocalStorageGetItem("vitatakip_remembered_fullname") || "";
      const rememberedUserId = safeLocalStorageGetItem("vitatakip_remembered_user_id") || "";
      const nameInput = document.getElementById("authInputFullName");
      const quickBox = document.getElementById("authRememberedQuickLoginBox");
      const quickNameEl = document.getElementById("authRememberedAccountName");

      let matchedUser = null;
      try {
        const users = getUsersDb();
        if (enabled && rememberedUserId) {
          matchedUser = users.find(u => u && u.id === rememberedUserId) || null;
        }
        if (enabled && !matchedUser && rememberedName) {
          const norm = rememberedName.trim().toLocaleLowerCase("tr-TR");
          matchedUser = users.find(u => String(u?.fullName || "").trim().toLocaleLowerCase("tr-TR") === norm) || null;
        }
      } catch (_) {}

      if (enabled && (matchedUser?.fullName || rememberedName) && nameInput && !nameInput.value.trim()) {
        nameInput.value = matchedUser?.fullName || rememberedName;
      }

      if (quickBox && quickNameEl) {
        if (enabled && matchedUser) {
          quickNameEl.textContent = matchedUser.fullName;
          quickBox.classList.remove("hidden");
        } else {
          quickBox.classList.add("hidden");
        }
      }
    }

    function loginWithRememberedAccount() {
      const enabled = isRememberMeEnabled();
      if (!enabled) return;
      const rememberedUserId = safeLocalStorageGetItem("vitatakip_remembered_user_id") || "";
      const rememberedName = safeLocalStorageGetItem("vitatakip_remembered_fullname") || "";
      const users = getUsersDb();
      let found = users.find(u => u && u.id === rememberedUserId) || null;
      if (!found && rememberedName) {
        const norm = rememberedName.trim().toLocaleLowerCase("tr-TR");
        found = users.find(u => String(u?.fullName || "").trim().toLocaleLowerCase("tr-TR") === norm) || null;
      }
      if (!found) {
        setAuthFeedback("Hatırlanan hesap bulunamadı. Lütfen şifrenizle giriş yapın.", true);
        return;
      }
      activeUserId = found.id;
      safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
      safeLocalStorageSetItem("vitatakip_active_session_id", activeUserId);
      safeLocalStorageSetItem("vitatakip_remembered_user_id", activeUserId);
      safeLocalStorageSetItem("vitatakip_remembered_fullname", found.fullName);
      loadUserSessionData(activeUserId);
      closeAuthModal();
      try {
        renderAllAppViews();
        showToast("Oturum Açıldı", `Tekrar hoş geldiniz, ${found.fullName}!`, "success");
      } catch (err) {
        console.error("Hızlı giriş görünüm yenileme hatası:", err);
      }
    }

    window.isRememberMeEnabled = isRememberMeEnabled;
    window.syncRememberMeButtonUI = syncRememberMeButtonUI;
    window.toggleRememberMeOption = toggleRememberMeOption;
    window.hydrateRememberMeOnAuthModal = hydrateRememberMeOnAuthModal;
    window.loginWithRememberedAccount = loginWithRememberedAccount;

    function openAuthModal() {
      const modal = document.getElementById("authModal");
      if (modal) { modal.classList.remove("hidden"); modal.style.display = "flex"; }
      hydrateRememberMeOnAuthModal();
      if (typeof refreshCloudSyncUI === "function") refreshCloudSyncUI();
    }

    function closeAuthModal() {
      const modal = document.getElementById("authModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
    }

    /* GOOGLE HESABI BAĞLAMA VE BULUT EŞİTLEME MERKEZİ (İSTEĞE BAĞLI) */
    const VITA_GOOGLE_CLOUD_ACCOUNT_KEY = "vitatakip_google_cloud_account";
    const VITA_GOOGLE_CLOUD_AUTOSYNC_KEY = "vitatakip_google_cloud_autosync";
    let cloudSyncModalOrigin = "app";

    function isCloudAutoSyncEnabled() {
      const val = safeLocalStorageGetItem(VITA_GOOGLE_CLOUD_AUTOSYNC_KEY);
      return val === null ? true : val === "true";
    }

    function toggleCloudAutoSyncPreference(enabled) {
      safeLocalStorageSetItem(VITA_GOOGLE_CLOUD_AUTOSYNC_KEY, enabled ? "true" : "false");
      if (enabled) {
        const acc = getLinkedGoogleCloudAccount();
        if (acc && acc.connected && activeUserId) {
          syncDataToCloudNow(false);
        }
      }
      setCloudSyncModalFeedback(
        enabled
          ? "Otomatik bulut eşitleme açıldı. Kayıtlarınız değiştikçe bağlı Google hesabınızla eşitlenir."
          : "Otomatik bulut eşitleme kapatıldı. Dilediğiniz zaman 'Şimdi Buluta Yedekle' düğmesini kullanabilirsiniz.",
        "info"
      );
      refreshCloudSyncUI();
    }

    function getLinkedGoogleCloudAccount() {
      let localInfo = readStoredJSON(VITA_GOOGLE_CLOUD_ACCOUNT_KEY, null);
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.getGoogleCloudAccountInfo === "function") {
        try {
          const rawNative = window.AndroidVitaBridge.getGoogleCloudAccountInfo();
          if (rawNative) {
            const parsedNative = JSON.parse(rawNative);
            if (parsedNative && parsedNative.connected && parsedNative.email) {
              const merged = {
                connected: true,
                uid: parsedNative.uid || (localInfo && localInfo.uid) || `google_${parsedNative.email.toLowerCase()}`,
                email: parsedNative.email,
                displayName: parsedNative.displayName || (localInfo && localInfo.displayName) || parsedNative.email.split("@")[0],
                lastSync: (localInfo && localInfo.lastSync) || parsedNative.lastSync || "",
                source: parsedNative.source || "android_google"
              };
              safeLocalStorageSetItem(VITA_GOOGLE_CLOUD_ACCOUNT_KEY, JSON.stringify(merged));
              return merged;
            }
          }
        } catch (err) {
          console.warn("Android Google bulut hesap bilgisi okunamadı:", err);
        }
      }
      if (localInfo && localInfo.connected && localInfo.email) {
        return localInfo;
      }
      return { connected: false, uid: "", email: "", displayName: "", lastSync: "", source: "none" };
    }

    function saveLinkedGoogleCloudAccount(info) {
      if (!info || !info.connected || !info.email) {
        safeLocalStorageRemoveItem(VITA_GOOGLE_CLOUD_ACCOUNT_KEY);
        if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.saveGoogleCloudAccountLink === "function") {
          try { window.AndroidVitaBridge.saveGoogleCloudAccountLink("", ""); } catch (_) {}
        }
        return;
      }
      const normalized = {
        connected: true,
        uid: info.uid || `google_${String(info.email).trim().toLowerCase()}`,
        email: String(info.email).trim().toLowerCase(),
        displayName: String(info.displayName || "").trim() || String(info.email).split("@")[0],
        lastSync: info.lastSync || new Date().toLocaleString("tr-TR"),
        source: info.source || "google_portal"
      };
      safeLocalStorageSetItem(VITA_GOOGLE_CLOUD_ACCOUNT_KEY, JSON.stringify(normalized));
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.saveGoogleCloudAccountLink === "function") {
        try {
          window.AndroidVitaBridge.saveGoogleCloudAccountLink(normalized.email, normalized.displayName);
        } catch (err) {
          console.warn("Android köprüsüne Google hesabı kaydedilemedi:", err);
        }
      }
      return normalized;
    }

    function setCloudSyncModalFeedback(message, tone = "info") {
      const box = document.getElementById("cloudSyncModalFeedback");
      if (!box) return;
      if (!message) {
        box.classList.add("hidden");
        box.textContent = "";
        return;
      }
      const toneClasses = {
        success: "rounded-xl px-3.5 py-2.5 text-xs font-medium border bg-emerald-50 text-emerald-900 border-emerald-200",
        warning: "rounded-xl px-3.5 py-2.5 text-xs font-medium border bg-amber-50 text-amber-900 border-amber-200",
        error: "rounded-xl px-3.5 py-2.5 text-xs font-medium border bg-rose-50 text-rose-900 border-rose-200",
        info: "rounded-xl px-3.5 py-2.5 text-xs font-medium border bg-sky-50 text-sky-900 border-sky-200"
      };
      box.className = toneClasses[tone] || toneClasses.info;
      box.textContent = message;
      box.classList.remove("hidden");
    }

    let headerCloudSyncAnimTimer1 = null;
    let headerCloudSyncAnimTimer2 = null;
    let headerCloudSyncInFlight = false;

    function setHeaderCloudSyncVisualState(phase, customLabel, customSublabel) {
      const headerBtn = document.getElementById("headerCloudSyncBtn");
      const headerPing = document.getElementById("headerCloudSyncPing");
      const headerDot = document.getElementById("headerCloudSyncDot");
      const headerIcon = document.getElementById("headerCloudSyncIcon");
      const headerLabel = document.getElementById("headerCloudSyncLabel");
      const headerSublabel = document.getElementById("headerCloudSyncSublabel");
      const profileCard = document.getElementById("profileMenuCloudStatusCard");
      const profileIconBox = document.getElementById("profileMenuCloudIconBox");
      const profileIcon = document.getElementById("profileMenuCloudIcon");
      const profilePill = document.getElementById("profileMenuCloudPill");
      const profilePing = document.getElementById("profileMenuCloudPing");
      const profileDot = document.getElementById("profileMenuCloudSyncDot");
      const profileBarFill = document.getElementById("profileMenuCloudBarFill");
      const profileMetaText = document.getElementById("profileMenuCloudMetaText");
      const profilePercentBadge = document.getElementById("profileMenuCloudPercentBadge");
      if (!headerBtn && !profileCard) return;

      const acc = getLinkedGoogleCloudAccount();
      const connected = Boolean(acc && acc.connected && acc.email);

      if (headerBtn) {
        headerBtn.classList.remove(
          "vita-cloud-btn-syncing",
          "vita-cloud-btn-synced",
          "vita-cloud-btn-connected",
          "vita-cloud-btn-local"
        );
      }
      if (profileCard) {
        profileCard.classList.remove(
          "vita-profile-cloud-syncing",
          "vita-profile-cloud-synced",
          "vita-profile-cloud-connected",
          "vita-profile-cloud-local"
        );
      }

      if (phase === "syncing") {
        if (headerBtn) {
          headerBtn.dataset.syncState = "syncing";
          headerBtn.classList.add("vita-cloud-btn-syncing");
        }
        if (profileCard) {
          profileCard.dataset.syncState = "syncing";
          profileCard.classList.add("vita-profile-cloud-syncing");
        }
        if (headerPing) {
          headerPing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-85";
        }
        if (headerDot) {
          headerDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.95)]";
        }
        if (headerIcon) {
          headerIcon.className = "fa-solid fa-arrows-rotate vita-cloud-spin text-sky-300 text-sm";
        }
        if (profileIconBox) {
          profileIconBox.className = "w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/50 text-sky-300 flex items-center justify-center shrink-0 transition-all duration-300";
        }
        if (profileIcon) {
          profileIcon.className = "fa-solid fa-arrows-rotate vita-cloud-spin text-xs text-sky-300";
        }
        if (profilePill) {
          profilePill.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/25 text-sky-200 border border-sky-400/55 shrink-0 transition-all duration-300";
        }
        if (profilePing) {
          profilePing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-sky-300 opacity-85";
        }
        if (profileDot) {
          profileDot.className = "relative inline-flex rounded-full h-2 w-2 bg-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.95)]";
        }
        if (headerLabel) {
          headerLabel.textContent = customLabel || "Eşitleniyor...";
        }
        if (headerSublabel) {
          headerSublabel.textContent = customSublabel || "Aktif Senkronizasyon";
        }
        if (profileBarFill) {
          profileBarFill.className = "vita-cloud-status-bar-fill h-full rounded-full bg-gradient-to-r from-sky-400 via-indigo-400 to-teal-300 shadow-[0_0_10px_rgba(56,189,248,0.85)]";
          profileBarFill.style.width = "76%";
        }
        if (profileMetaText) {
          profileMetaText.textContent = acc && acc.email ? `${acc.email} ile eşitleniyor...` : "Bulut sunucusuyla eşitleniyor...";
        }
        if (profilePercentBadge) {
          profilePercentBadge.className = "font-extrabold text-sky-300 shrink-0";
          profilePercentBadge.textContent = "Aktarılıyor...";
        }
      } else if (phase === "synced") {
        if (headerBtn) {
          headerBtn.dataset.syncState = "synced";
          headerBtn.classList.add("vita-cloud-btn-synced");
        }
        if (profileCard) {
          profileCard.dataset.syncState = "synced";
          profileCard.classList.add("vita-profile-cloud-synced");
        }
        if (headerPing) {
          headerPing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-80";
        }
        if (headerDot) {
          headerDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.95)]";
        }
        if (headerIcon) {
          headerIcon.className = "fa-solid fa-cloud text-emerald-300 text-sm scale-110 transition-transform duration-300";
        }
        if (profileIconBox) {
          profileIconBox.className = "w-8 h-8 rounded-xl bg-emerald-500/25 border border-emerald-400/60 text-emerald-200 flex items-center justify-center shrink-0 transition-all duration-300";
        }
        if (profileIcon) {
          profileIcon.className = "fa-solid fa-cloud-arrow-up text-xs text-emerald-200 scale-110 transition-transform duration-300";
        }
        if (profilePill) {
          profilePill.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/25 text-emerald-100 border border-emerald-300/60 shrink-0 transition-all duration-300";
        }
        if (profilePing) {
          profilePing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-85";
        }
        if (profileDot) {
          profileDot.className = "relative inline-flex rounded-full h-2 w-2 bg-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.95)]";
        }
        if (headerLabel) {
          headerLabel.textContent = customLabel || "Bulut Eşitlendi ✓";
        }
        if (headerSublabel) {
          headerSublabel.textContent = customSublabel || "Az önce güncellendi";
        }
        if (profileBarFill) {
          profileBarFill.className = "vita-cloud-status-bar-fill h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.9)]";
          profileBarFill.style.width = "100%";
        }
        if (profileMetaText) {
          profileMetaText.textContent = acc && acc.email ? `${acc.email} • Şimdi eşitlendi` : "Bulut yedeği başarıyla güncellendi";
        }
        if (profilePercentBadge) {
          profilePercentBadge.className = "font-extrabold text-emerald-300 shrink-0";
          profilePercentBadge.textContent = "%100 Eşitlendi";
        }
      } else if (connected || phase === "connected") {
        if (headerBtn) {
          headerBtn.dataset.syncState = "connected";
          headerBtn.classList.add("vita-cloud-btn-connected");
          headerBtn.title = acc.email
            ? `Bulut Eşitleme Aktif (${acc.email}) • Son: ${acc.lastSync || "Az önce"}`
            : "Google Bulut Eşitleme Aktif";
        }
        if (profileCard) {
          profileCard.dataset.syncState = "connected";
          profileCard.classList.add("vita-profile-cloud-connected");
        }
        if (headerPing) {
          headerPing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
        }
        if (headerDot) {
          headerDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]";
        }
        if (headerIcon) {
          headerIcon.className = "fa-solid fa-cloud text-emerald-300 text-sm transition-transform duration-300";
        }
        if (profileIconBox) {
          profileIconBox.className = "w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 flex items-center justify-center shrink-0 transition-all duration-300";
        }
        if (profileIcon) {
          profileIcon.className = "fa-solid fa-cloud text-xs text-emerald-300 transition-transform duration-300";
        }
        if (profilePill) {
          profilePill.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-200 border border-emerald-400/50 shrink-0 transition-all duration-300";
        }
        if (profilePing) {
          profilePing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75";
        }
        if (profileDot) {
          profileDot.className = "relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)]";
        }
        if (headerLabel) {
          headerLabel.textContent = customLabel || "Canlı Bağlı";
        }
        if (headerSublabel) {
          headerSublabel.textContent = customSublabel || (acc.email ? "Senkronize • Canlı" : "Senkronize");
        }
        if (profileBarFill) {
          profileBarFill.className = "vita-cloud-status-bar-fill h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.75)]";
          profileBarFill.style.width = "100%";
        }
        if (profileMetaText) {
          profileMetaText.textContent = acc.email
            ? `${acc.email} • Son: ${acc.lastSync || "Az önce"}`
            : "Google Bulut yedeklemesi aktif";
        }
        if (profilePercentBadge) {
          profilePercentBadge.className = "font-extrabold text-emerald-300 shrink-0";
          profilePercentBadge.textContent = "%100 Aktif";
        }
      } else {
        if (headerBtn) {
          headerBtn.dataset.syncState = "local";
          headerBtn.classList.add("vita-cloud-btn-local");
          headerBtn.title = "Yerel Mod • Google / Firebase Bulut Eşitlemeyi Başlatmak İçin Tıklayın";
        }
        if (profileCard) {
          profileCard.dataset.syncState = "local";
          profileCard.classList.add("vita-profile-cloud-local");
        }
        if (headerPing) {
          headerPing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75 hidden";
        }
        if (headerDot) {
          headerDot.className = "relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)]";
        }
        if (headerIcon) {
          headerIcon.className = "fa-solid fa-cloud text-sky-300 text-sm transition-transform duration-300";
        }
        if (profileIconBox) {
          profileIconBox.className = "w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-400/35 text-amber-300 flex items-center justify-center shrink-0 transition-all duration-300";
        }
        if (profileIcon) {
          profileIcon.className = "fa-solid fa-cloud text-xs text-amber-300 transition-transform duration-300";
        }
        if (profilePill) {
          profilePill.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/40 shrink-0 transition-all duration-300";
        }
        if (profilePing) {
          profilePing.className = "vita-cloud-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 hidden";
        }
        if (profileDot) {
          profileDot.className = "relative inline-flex rounded-full h-2 w-2 bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.95)]";
        }
        if (headerLabel) {
          headerLabel.textContent = customLabel || "Yerel Mod";
        }
        if (headerSublabel) {
          headerSublabel.textContent = customSublabel || "Cihazda Yerel Depolama";
        }
        if (profileBarFill) {
          profileBarFill.className = "vita-cloud-status-bar-fill h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-sky-400 shadow-[0_0_8px_rgba(251,191,36,0.65)]";
          profileBarFill.style.width = "38%";
        }
        if (profileMetaText) {
          profileMetaText.textContent = "Google / Firebase bağlamak için dokunun";
        }
        if (profilePercentBadge) {
          profilePercentBadge.className = "font-extrabold text-amber-300 shrink-0";
          profilePercentBadge.textContent = "Yerel • Cihaz İçi";
        }
      }
    }

    function triggerHeaderCloudSyncAnimation(syncingLabel = "Eşitleniyor...", syncedLabel = "Bulut Eşitlendi ✓") {
      if (headerCloudSyncAnimTimer1) clearTimeout(headerCloudSyncAnimTimer1);
      if (headerCloudSyncAnimTimer2) clearTimeout(headerCloudSyncAnimTimer2);
      headerCloudSyncInFlight = true;
      setHeaderCloudSyncVisualState("syncing", syncingLabel, "Aktif Senkronizasyon");

      headerCloudSyncAnimTimer1 = setTimeout(() => {
        setHeaderCloudSyncVisualState("synced", syncedLabel, "Az önce güncellendi");
        headerCloudSyncAnimTimer2 = setTimeout(() => {
          headerCloudSyncInFlight = false;
          setHeaderCloudSyncVisualState("idle");
        }, 1700);
      }, 850);
    }

    function refreshCloudSyncUI() {
      const acc = getLinkedGoogleCloudAccount();
      const connected = Boolean(acc && acc.connected && acc.email);

      // 1. Auth Modal badge & labels
      const authBadge = document.getElementById("authCloudSyncStatusBadge");
      const authLabel = document.getElementById("authGoogleCloudSyncBtnLabel");
      const authFirebaseBtnLabel = document.getElementById("authFirebaseLoginBtnLabel");
      if (authBadge) {
        authBadge.textContent = connected ? "Bağlı" : "Cloud Firestore";
        authBadge.className = connected
          ? "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0"
          : "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white text-indigo-800 border border-indigo-200 shrink-0";
      }
      if (authFirebaseBtnLabel) {
        authFirebaseBtnLabel.textContent = connected
          ? `Bulut (Firebase) ile Giriş Yap (${acc.email})`
          : "Bulut (Firebase) ile Giriş Yap";
      }
      if (authLabel) {
        authLabel.textContent = connected
          ? `Bulut Eşitleme Merkezi (${acc.email})`
          : "Bulut Eşitleme & Yedekten Geri Yükleme Merkezi";
      }

      // 2. Top Header Cloud Sync button
      if (!headerCloudSyncInFlight) {
        setHeaderCloudSyncVisualState(connected ? "connected" : "local");
      }

      // 3. Settings Section 5 badge & subtext
      const settingsBadge = document.getElementById("settingsCloudSyncStatusBadge");
      const settingsSub = document.getElementById("settingsCloudSyncSubtext");
      if (settingsBadge) {
        settingsBadge.textContent = connected ? "Bağlı" : "Bağlı Değil";
        settingsBadge.className = connected
          ? "px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"
          : "px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700";
      }
      if (settingsSub) {
        settingsSub.textContent = connected
          ? `${acc.displayName} (${acc.email}) • Son eşitleme: ${acc.lastSync || "Az önce"}`
          : "Cihazlar arası yedekleme için Google hesabınızı bağlayın veya buluttan geri yükleyin";
      }

      // 4. Cloud Sync Modal internals
      const modalDot = document.getElementById("cloudModalStatusDot");
      const modalTitle = document.getElementById("cloudModalStatusTitle");
      const modalSourceTag = document.getElementById("cloudModalSourceTag");
      const modalDetail = document.getElementById("cloudModalAccountDetail");
      const modalLastSync = document.getElementById("cloudModalLastSyncText");
      const unlinkBtn = document.getElementById("btnUnlinkGoogleAccount");
      const continueBtn = document.getElementById("btnContinueWithLinkedGoogle");
      const autoSyncCb = document.getElementById("cloudAutoSyncCheckbox");
      const nameInput = document.getElementById("cloudSyncNameInput");
      const emailInput = document.getElementById("cloudSyncEmailInput");

      if (autoSyncCb) autoSyncCb.checked = isCloudAutoSyncEnabled();

      if (connected) {
        if (modalDot) modalDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
        if (modalTitle) modalTitle.textContent = "Google Bulut Eşitleme Aktif";
        if (modalSourceTag) {
          modalSourceTag.textContent = acc.source === "firebase_google" ? "Android Google OAuth" : "Bağlı Google Hesabı";
          modalSourceTag.className = "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300";
        }
        if (modalDetail) {
          modalDetail.innerHTML = `<span class="font-bold text-navy-900">${escapeHtmlText(acc.displayName)}</span> (${escapeHtmlText(acc.email)}) hesabı VitaTakip bulut yedekleme köprüsüne bağlı.`;
        }
        if (modalLastSync) {
          modalLastSync.textContent = `Son bulut eşitleme: ${acc.lastSync || "Henüz eşitlenmedi"}`;
        }
        if (unlinkBtn) unlinkBtn.classList.remove("hidden");
        if (continueBtn) continueBtn.classList.remove("hidden");
        if (nameInput && !nameInput.value) nameInput.value = acc.displayName || "";
        if (emailInput && !emailInput.value) emailInput.value = acc.email || "";
      } else {
        if (modalDot) modalDot.className = "w-2.5 h-2.5 rounded-full bg-slate-400";
        if (modalTitle) modalTitle.textContent = "Henüz Google Hesabı Bağlanmadı";
        if (modalSourceTag) {
          modalSourceTag.textContent = "Yerel Mod";
          modalSourceTag.className = "text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700";
        }
        if (modalDetail) {
          modalDetail.textContent = "Verileriniz şu an yalnızca bu cihazda saklanıyor. Bulut yedekleme için aşağıdan Google hesabınızı bağlayın.";
        }
        if (modalLastSync) {
          modalLastSync.textContent = "Son bulut eşitleme: Henüz yapılmadı";
        }
        if (unlinkBtn) unlinkBtn.classList.add("hidden");
        if (continueBtn) continueBtn.classList.add("hidden");
      }
    }

    function openCloudSyncModal(origin = "app") {
      if (window.SoundEffects) SoundEffects.playClick();
      cloudSyncModalOrigin = origin;
      if (typeof closeHeaderProfileMenu === "function") closeHeaderProfileMenu();
      if (typeof closeAppDrawer === "function") closeAppDrawer();
      const modal = document.getElementById("cloudSyncModal");
      if (!modal) return;
      setCloudSyncModalFeedback("");
      const acc = getLinkedGoogleCloudAccount();
      const nameInput = document.getElementById("cloudSyncNameInput");
      const emailInput = document.getElementById("cloudSyncEmailInput");
      if (nameInput) {
        nameInput.value = (acc && acc.connected && acc.displayName)
          ? acc.displayName
          : (state.user && state.user.name ? state.user.name : (document.getElementById("authInputFullName")?.value || ""));
      }
      if (emailInput) {
        emailInput.value = (acc && acc.connected && acc.email) ? acc.email : "";
      }
      refreshCloudSyncUI();
      document.body.classList.add("vita-cloud-modal-open");
      modal.classList.remove("hidden");
      modal.classList.add("active");
      modal.setAttribute("aria-hidden", "false");
      modal.style.display = "flex";
    }

    function closeCloudSyncModal() {
      document.body.classList.remove("vita-cloud-modal-open");
      const modal = document.getElementById("cloudSyncModal");
      if (modal) {
        modal.classList.add("hidden");
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
        modal.style.display = "none";
      }
    }

    function startFirebaseGoogleLoginFromPortal() {
      if (window.SoundEffects) SoundEffects.playClick();
      const acc = getLinkedGoogleCloudAccount();
      if (acc && acc.connected && acc.email) {
        continueToPortalWithLinkedGoogle();
        return;
      }
      const noticeBox = document.getElementById("authNoticeMsg");
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.startFirebaseGoogleSignIn === "function") {
        try {
          if (noticeBox) {
            noticeBox.textContent = "Google / Firebase kimlik doğrulama penceresi açılıyor... Cihazda Google hesabınız yoksa 'Bulut Eşitleme Merkezi'nden de bağlayabilirsiniz.";
            noticeBox.classList.remove("hidden");
          }
          window.AndroidVitaBridge.startFirebaseGoogleSignIn();
          return;
        } catch (err) {
          console.warn("Firebase Google Sign-In başlatılamadı:", err);
        }
      }
      openCloudSyncModal("auth");
    }

    function triggerNativeGoogleCloudSignIn() {
      if (window.SoundEffects) SoundEffects.playClick();
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.startFirebaseGoogleSignIn === "function") {
        try {
          setCloudSyncModalFeedback(
            "Firebase Google Kimlik Doğrulama açılıyor... Cihazınızda Google hesabı oturumu açıksa seçerek bağlayabilir veya hemen alt kısımdan Google e-posta adresinizi doğrudan tanımlayabilirsiniz.",
            "info"
          );
          window.AndroidVitaBridge.startFirebaseGoogleSignIn();
          return;
        } catch (err) {
          console.warn("Firebase Google Sign-In köprüsü çağrılamadı:", err);
        }
      }
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.openGoogleCloudSync === "function") {
        try {
          setCloudSyncModalFeedback(
            "Android Google Hesap Seçici açılıyor... Cihazınızda Google hesabı oturumu açıksa seçerek bağlayabilir veya hemen alt kısımdan Google e-posta adresinizi doğrudan tanımlayabilirsiniz.",
            "info"
          );
          window.AndroidVitaBridge.openGoogleCloudSync();
          return;
        } catch (err) {
          console.warn("Android Google Sign-In köprüsü çağrılamadı:", err);
        }
      }
      setCloudSyncModalFeedback(
        "Google hesabınızı bağlamak için hemen aşağıdaki 'Ad Soyad' ve 'Google E-posta' alanlarını doldurup 'Hesabı Bağla & Portalı Aç' düğmesine basın.",
        "info"
      );
      document.getElementById("cloudSyncEmailInput")?.focus();
    }

    function ensurePortalUserForGoogleAccount(displayName, email) {
      const cleanName = String(displayName || "").trim() || String(email || "Kullanıcı").split("@")[0];
      const cleanEmail = String(email || "").trim().toLowerCase();
      const users = getUsersDb();
      const normalizedName = cleanName.toLocaleLowerCase("tr-TR");
      let user = users.find(u =>
        (u.googleEmail && String(u.googleEmail).toLowerCase() === cleanEmail) ||
        String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName
      );
      if (!user) {
        user = {
          id: `usr_google_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          fullName: cleanName,
          googleEmail: cleanEmail,
          password: sha256(`${cleanEmail}_vitatakip_google_2026`),
          createdDate: new Date().toISOString()
        };
        users.push(user);
        saveUsersDb(users);
      } else if (!user.googleEmail) {
        user.googleEmail = cleanEmail;
        saveUsersDb(users);
      }
      return user;
    }

    function linkGoogleAccountFromModal() {
      if (window.SoundEffects) SoundEffects.playClick();
      const nameInput = document.getElementById("cloudSyncNameInput");
      const emailInput = document.getElementById("cloudSyncEmailInput");
      const rawName = String(nameInput?.value || "").trim();
      const rawEmail = String(emailInput?.value || "").trim().toLowerCase();

      if (!rawEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
        setCloudSyncModalFeedback("Lütfen geçerli bir Google e-posta adresi (ör. ad.soyad@gmail.com) girin.", "warning");
        emailInput?.focus();
        return;
      }
      const displayName = rawName || (state.user && state.user.name) || rawEmail.split("@")[0];
      const nowStr = new Date().toLocaleString("tr-TR");

      saveLinkedGoogleCloudAccount({
        connected: true,
        uid: `google_${rawEmail}`,
        email: rawEmail,
        displayName,
        lastSync: nowStr,
        source: "google_portal"
      });

      // Eğer kullanıcı henüz giriş yapmamışsa veya giriş ekranındaysa otomatik olarak hesabını hazırla / bağla
      const existingCloudBackup = readCloudBackupPayloadForEmail(rawEmail);
      if (!activeUserId) {
        const portalUser = ensurePortalUserForGoogleAccount(displayName, rawEmail);
        activeUserId = portalUser.id;
        safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
        loadUserSessionData(activeUserId);
        if (state.user) state.user.name = displayName;
      } else if (state.user && (!state.user.name || state.user.name === "Kullanıcı")) {
        state.user.name = displayName;
      }

      if (existingCloudBackup && existingCloudBackup.app === "VitaTakip") {
        // Eğer mevcut profilde henüz tahlil/takviye yoksa buluttaki yedeği otomatik yükle
        const localEmpty = (!state.supplements || state.supplements.length === 0) && (!state.labHistory || state.labHistory.length === 0);
        if (localEmpty) {
          applyCloudBackupPayloadToState(existingCloudBackup);
          saveState();
          renderAllAppViews();
          refreshCloudSyncUI();
          setCloudSyncModalFeedback(`Google hesabı (${rawEmail}) bağlandı ve önceki bulut yedeğiniz bu cihaza geri yüklendi!`, "success");
          showToast("Google Bulut Eşitlendi", `${rawEmail} hesabındaki bulut yedeğiniz yüklendi.`, "success");
          return;
        }
      }

      syncDataToCloudNow(false);
      renderAllAppViews();
      refreshCloudSyncUI();
      setCloudSyncModalFeedback(
        `Google hesabı (${rawEmail}) başarıyla bağlandı ve mevcut verileriniz bulut yedeğine eşitlendi.`,
        "success"
      );
      showToast("Google Hesabı Bağlandı", `${rawEmail} ile bulut eşitleme aktif edildi.`, "success");
    }

    function unlinkGoogleCloudAccount() {
      if (window.SoundEffects) SoundEffects.playClick();
      const acc = getLinkedGoogleCloudAccount();
      if (!acc || !acc.connected) return;
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.signOutFirebaseGoogle === "function") {
        try { window.AndroidVitaBridge.signOutFirebaseGoogle(); } catch (_) {}
      }
      saveLinkedGoogleCloudAccount(null);
      refreshCloudSyncUI();
      setCloudSyncModalFeedback(
        "Google / Firebase hesabı bağlantısı kaldırıldı. Cihazdaki yerel kayıtlarınız silinmedi, güvenle korunuyor.",
        "info"
      );
      showToast("Bulut Bağlantısı Kaldırıldı", "Kayıtlarınız cihazda yerel olarak saklanmaya devam ediyor.", "info");
    }

    function buildCloudBackupPayload(email, displayName) {
      return {
        app: "VitaTakip",
        version: "9.4.0",
        cloudSyncDate: new Date().toISOString(),
        cloudSyncDateTr: new Date().toLocaleString("tr-TR"),
        googleAccount: { email, displayName },
        user: state.user || { ...defaultUserProfile, name: displayName || "Kullanıcı" },
        supplements: Array.isArray(state.supplements) ? state.supplements : [],
        hydration: state.hydration || { current: 0, target: 2450 },
        labValues: state.labValues || {},
        labReferences: state.labReferences || {},
        labHistory: Array.isArray(state.labHistory) ? state.labHistory : [],
        selectedSymptoms: Array.from(state.selectedSymptoms || []),
        resolvedSymptoms: Array.from(state.resolvedSymptoms || []),
        supplementReviews: state.supplementReviews || {},
        lastCDSS: state.lastCDSS || null,
        doctorNotes: activeUserId ? (safeLocalStorageGetItem(`vitatakip_notes_${activeUserId}`) || "") : ""
      };
    }

    function readCloudBackupPayloadForEmail(email) {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail) return null;
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.loadCloudBackupJson === "function") {
        try {
          const nativeRaw = window.AndroidVitaBridge.loadCloudBackupJson(cleanEmail);
          if (nativeRaw) {
            const parsed = JSON.parse(nativeRaw);
            if (parsed && parsed.app === "VitaTakip") return parsed;
          }
        } catch (err) {
          console.warn("Android bulut yedeği okunamadı:", err);
        }
      }
      return readStoredJSON(`vitatakip_cloud_backup_${cleanEmail}`, null);
    }

    function applyCloudBackupPayloadToState(parsed) {
      if (!parsed || parsed.app !== "VitaTakip") return false;
      resetApplicationDOMAndState();
      if (parsed.user) state.user = { ...defaultUserProfile, ...parsed.user };
      if (Array.isArray(parsed.supplements)) state.supplements = parsed.supplements;
      if (parsed.hydration) state.hydration = parsed.hydration;
      if (parsed.labValues) {
        state.labValues = {
          d3: null, b12: null, ferritin: null, mg: null, ca: null, zinc: null,
          creatinine: null, folate: null, alt: null, hb: null, mcv: null, crp: null,
          ...parsed.labValues
        };
      }
      if (parsed.labReferences && typeof parsed.labReferences === "object") {
        state.labReferences = { ...parsed.labReferences };
      }
      if (Array.isArray(parsed.labHistory)) {
        state.labHistory = parsed.labHistory.slice();
      }
      if (Array.isArray(parsed.selectedSymptoms)) {
        state.selectedSymptoms = new Set(parsed.selectedSymptoms);
      }
      if (Array.isArray(parsed.resolvedSymptoms)) {
        state.resolvedSymptoms = new Set(parsed.resolvedSymptoms);
      }
      state.supplementReviews = parsed.supplementReviews || {};
      if (parsed.lastCDSS) state.lastCDSS = parsed.lastCDSS;
      if (activeUserId && typeof parsed.doctorNotes === "string") {
        safeLocalStorageSetItem(`vitatakip_notes_${activeUserId}`, parsed.doctorNotes);
        const docNotesEl = document.getElementById("doctorNotesInput");
        if (docNotesEl) docNotesEl.value = parsed.doctorNotes;
      }
      return true;
    }

    function syncDataToCloudNow(showUserFeedback = true) {
      const acc = getLinkedGoogleCloudAccount();
      if (!acc || !acc.connected || !acc.email) {
        if (showUserFeedback) {
          setCloudSyncModalFeedback("Önce yukarıdan Google hesabınızı bağlayın, ardından buluta yedekleyin.", "warning");
          showToast("Google Hesabı Gerekli", "Buluta yedeklemek için önce Google hesabınızı bağlayın.", "warning");
        }
        return false;
      }
      if (!activeUserId) {
        const portalUser = ensurePortalUserForGoogleAccount(acc.displayName, acc.email);
        activeUserId = portalUser.id;
        safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
        loadUserSessionData(activeUserId);
      }
      const payload = buildCloudBackupPayload(acc.email, acc.displayName);
      const serialized = JSON.stringify(payload);
      const cleanEmail = acc.email.toLowerCase();
      safeLocalStorageSetItem(`vitatakip_cloud_backup_${cleanEmail}`, serialized);
      if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.saveCloudBackupJson === "function") {
        try {
          window.AndroidVitaBridge.saveCloudBackupJson(cleanEmail, serialized);
        } catch (err) {
          console.warn("Android bulut yedekleme köprüsü hatası:", err);
        }
      }
      const nowStr = new Date().toLocaleString("tr-TR");
      saveLinkedGoogleCloudAccount({ ...acc, lastSync: nowStr });
      triggerHeaderCloudSyncAnimation("Eşitleniyor...", "Bulut Eşitlendi ✓");
      refreshCloudSyncUI();
      if (showUserFeedback) {
        const supCount = Array.isArray(state.supplements) ? state.supplements.length : 0;
        const labCount = Array.isArray(state.labHistory) ? state.labHistory.length : 0;
        setCloudSyncModalFeedback(
          `Bulut yedekleme tamamlandı (${nowStr}). ${supCount} takviye ve ${labCount} tahlil kaydı ${acc.email} hesabınızla eşitlendi.`,
          "success"
        );
        showToast("Buluta Yedeklendi", `${acc.email} hesabınıza güncel sağlık verileriniz eşitlendi.`, "success");
      }
      return true;
    }

    function restoreDataFromCloudNow() {
      if (window.SoundEffects) SoundEffects.playClick();
      const acc = getLinkedGoogleCloudAccount();
      const emailInputVal = String(document.getElementById("cloudSyncEmailInput")?.value || "").trim().toLowerCase();
      const targetEmail = (acc && acc.connected && acc.email) ? acc.email : emailInputVal;
      if (!targetEmail) {
        setCloudSyncModalFeedback("Geri yüklemek istediğiniz Google e-posta adresini girin veya önce Google hesabınızı bağlayın.", "warning");
        document.getElementById("cloudSyncEmailInput")?.focus();
        return false;
      }
      const backup = readCloudBackupPayloadForEmail(targetEmail);
      if (!backup || backup.app !== "VitaTakip") {
        setCloudSyncModalFeedback(`${targetEmail} hesabı için kayıtlı bir bulut yedeği bulunamadı. Önce 'Şimdi Buluta Yedekle' ile yedek oluşturabilirsiniz.`, "warning");
        showToast("Bulut Yedeği Bulunamadı", `${targetEmail} için henüz kaydedilmiş yedek yok.`, "warning");
        return false;
      }
      const displayName = (backup.googleAccount && backup.googleAccount.displayName) || (backup.user && backup.user.name) || targetEmail.split("@")[0];
      const portalUser = ensurePortalUserForGoogleAccount(displayName, targetEmail);
      activeUserId = portalUser.id;
      safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);

      applyCloudBackupPayloadToState(backup);
      saveState();
      saveLinkedGoogleCloudAccount({
        connected: true,
        uid: `google_${targetEmail}`,
        email: targetEmail,
        displayName,
        lastSync: backup.cloudSyncDateTr || new Date().toLocaleString("tr-TR"),
        source: (acc && acc.source) || "google_portal"
      });
      closeAuthModal();
      renderAllAppViews();
      triggerHeaderCloudSyncAnimation("Geri Yükleniyor...", "Yedek Yüklendi ✓");
      refreshCloudSyncUI();
      setCloudSyncModalFeedback(
        `${targetEmail} hesabındaki bulut yedeği (${backup.cloudSyncDateTr || "kayıtlı yedek"}) başarıyla geri yüklendi!`,
        "success"
      );
      showToast("Buluttan Geri Yüklendi", `${displayName} profili ve sağlık kayıtları buluttan yüklendi.`, "success");
      return true;
    }

    function continueToPortalWithLinkedGoogle() {
      if (window.SoundEffects) SoundEffects.playClick();
      const acc = getLinkedGoogleCloudAccount();
      if (!acc || !acc.connected || !acc.email) {
        linkGoogleAccountFromModal();
        return;
      }
      const portalUser = ensurePortalUserForGoogleAccount(acc.displayName, acc.email);
      activeUserId = portalUser.id;
      safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
      loadUserSessionData(activeUserId);

      const backup = readCloudBackupPayloadForEmail(acc.email);
      const localEmpty = (!state.supplements || state.supplements.length === 0) && (!state.labHistory || state.labHistory.length === 0);
      if (backup && localEmpty) {
        applyCloudBackupPayloadToState(backup);
      }
      if (state.user && (!state.user.name || state.user.name === "Kullanıcı")) {
        state.user.name = acc.displayName;
      }
      saveState();
      closeCloudSyncModal();
      closeAuthModal();
      renderAllAppViews();
      refreshCloudSyncUI();
      showToast("Bulut Hesabıyla Giriş Yapıldı", `Hoş geldiniz, ${acc.displayName}! Bulut eşitleme aktif.`, "success");
    }

    window.onNativeGoogleAccountLinked = function(uid, email, displayName, shouldAutoLoginAndSync) {
      const cleanEmail = String(email || "").trim().toLowerCase();
      if (!cleanEmail) return;
      const cleanName = String(displayName || "").trim() || cleanEmail.split("@")[0];
      saveLinkedGoogleCloudAccount({
        connected: true,
        uid: uid || `google_${cleanEmail}`,
        email: cleanEmail,
        displayName: cleanName,
        lastSync: new Date().toLocaleString("tr-TR"),
        source: "firebase_google"
      });
      if (shouldAutoLoginAndSync) {
        const portalUser = ensurePortalUserForGoogleAccount(cleanName, cleanEmail);
        if (!activeUserId) {
          activeUserId = portalUser.id;
          safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
          loadUserSessionData(activeUserId);
        }
        if (state.user) state.user.name = cleanName;
        const existingBackup = readCloudBackupPayloadForEmail(cleanEmail);
        const localEmpty = (!state.supplements || state.supplements.length === 0) && (!state.labHistory || state.labHistory.length === 0);
        if (existingBackup && localEmpty) {
          applyCloudBackupPayloadToState(existingBackup);
        }
        saveState();
        syncDataToCloudNow(false);
        closeAuthModal();
        closeCloudSyncModal();
        renderAllAppViews();
        showToast("Bulut (Firebase) Eşitleme Aktif", `${cleanName} (${cleanEmail}) hesabınız bağlandı.`, "success");
      }
      refreshCloudSyncUI();
    };

    window.onNativeGoogleAccountDisconnected = function() {
      saveLinkedGoogleCloudAccount(null);
      refreshCloudSyncUI();
      showToast("Bulut Hesabı Ayrıldı", "Bulut eşitleme kapatıldı; yerel verileriniz korunuyor.", "info");
    };

    function selectAuthPrimaryMethod(method) {
      const cloudTab = document.getElementById("authMethodTabCloud");
      const localTab = document.getElementById("authMethodTabLocal");
      const cloudCard = document.getElementById("authCloudMethodCard");
      const localCard = document.getElementById("authLocalMethodCard");
      if (method === "cloud") {
        if (cloudTab) cloudTab.className = "py-2 px-2.5 rounded-xl bg-indigo-600 text-white font-black text-[11px] shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5";
        if (localTab) localTab.className = "py-2 px-2.5 rounded-xl bg-white text-navy-900 font-black text-[11px] border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5";
        if (cloudCard) {
          cloudCard.classList.add("ring-2", "ring-indigo-500/40");
          try { cloudCard.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) {}
        }
        if (localCard) localCard.classList.remove("ring-2", "ring-teal-500/40");
        document.getElementById("btnFirebaseGoogleLogin")?.focus();
      } else {
        if (localTab) localTab.className = "py-2 px-2.5 rounded-xl bg-teal-600 text-white font-black text-[11px] shadow-xs transition cursor-pointer flex items-center justify-center gap-1.5";
        if (cloudTab) cloudTab.className = "py-2 px-2.5 rounded-xl bg-white text-navy-900 font-black text-[11px] border border-slate-200/80 hover:bg-slate-50 transition cursor-pointer flex items-center justify-center gap-1.5";
        if (localCard) {
          localCard.classList.add("ring-2", "ring-teal-500/40");
          try { localCard.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (_) {}
        }
        if (cloudCard) cloudCard.classList.remove("ring-2", "ring-indigo-500/40");
        document.getElementById("authInputFullName")?.focus();
      }
    }

    function switchAuthMode(mode) {
      currentAuthMode = mode;
      const loginBtn = document.getElementById("authTabLoginBtn");
      const regBtn = document.getElementById("authTabRegisterBtn");
      const confirmContainer = document.getElementById("authConfirmPasswordContainer");
      const submitBtn = document.getElementById("authSubmitBtn");
      const subtitle = document.getElementById("authSubtitle");
      const switchPrompt = document.getElementById("authSwitchPrompt");
      const errBox = document.getElementById("authErrorMsg");
      const noticeBox = document.getElementById("authNoticeMsg");
      const passwordInput = document.getElementById("authInputPassword");
      const confirmInput = document.getElementById("authInputPasswordConfirm");
      if (errBox) { errBox.classList.add("hidden"); errBox.textContent = ""; }
      if (noticeBox) { noticeBox.classList.add("hidden"); noticeBox.textContent = ""; }
      if (confirmInput) confirmInput.required = mode === "register";
      if (passwordInput) passwordInput.autocomplete = mode === "register" ? "new-password" : "current-password";

      if (mode === "login") {
        if (loginBtn) loginBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-navy-900 shadow-sm transition cursor-pointer";
        if (regBtn) regBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer";
        if (confirmContainer) confirmContainer.classList.add("hidden");
        if (submitBtn) submitBtn.innerHTML = `<span>Yerel (Cihaz) Depolama ile Giriş Yap</span> <i class="fa-solid fa-arrow-right text-xs"></i>`;
        if (subtitle) subtitle.textContent = "Devam etmek için iki ana giriş yönteminden birini seçin";
        if (switchPrompt) switchPrompt.innerHTML = `Yerel hesabınız yok mu? <a href="javascript:void(0)" onclick="if(window.SoundEffects) SoundEffects.playClick(); switchAuthMode('register')" class="text-teal-600 font-bold hover:underline">Yerel (Cihaz) Hesabı Oluşturun</a>`;
      } else {
        if (regBtn) regBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-navy-900 shadow-sm transition cursor-pointer";
        if (loginBtn) loginBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer";
        if (confirmContainer) confirmContainer.classList.remove("hidden");
        if (submitBtn) submitBtn.innerHTML = `<span>Yerel (Cihaz) Depolama Hesabı Oluştur</span> <i class="fa-solid fa-user-plus text-xs"></i>`;
        if (subtitle) subtitle.textContent = "Bu cihazda yerel olarak saklanacak yeni bir hesap ve şifre oluşturun";
        if (switchPrompt) switchPrompt.innerHTML = `Zaten yerel hesabınız var mı? <a href="javascript:void(0)" onclick="if(window.SoundEffects) SoundEffects.playClick(); switchAuthMode('login')" class="text-teal-600 font-bold hover:underline">Yerel Giriş Yapın</a>`;
      }
    }

    function setAuthFeedback(message, focus = false) {
      const box = document.getElementById("authErrorMsg");
      if (!box) return;
      box.textContent = String(message || "");
      box.classList.toggle("hidden", !message);
      if (message && focus) {
        try { box.focus({ preventScroll: false }); } catch (e) { box.focus(); }
      }
    }

    function submitAuthForm(event) {
      if (event && typeof event.preventDefault === "function") event.preventDefault();
      if (window.SoundEffects) SoundEffects.playClick();
      handleAuthSubmit();
      return false;
    }

    function handleAuthSubmit() {
      const nameInput = document.getElementById("authInputFullName");
      const passwordInput = document.getElementById("authInputPassword");
      const confirmInput = document.getElementById("authInputPasswordConfirm");
      const errBox = document.getElementById("authErrorMsg");
      const submitBtn = document.getElementById("authSubmitBtn");
      const fullName = nameInput ? nameInput.value.trim().replace(/\s+/g, " ") : "";
      const password = passwordInput ? passwordInput.value : "";
      const confirmPass = confirmInput ? confirmInput.value : "";
      const originalButtonHtml = submitBtn ? submitBtn.innerHTML : "";

      setAuthFeedback("");
      const noticeBox = document.getElementById("authNoticeMsg");
      if (noticeBox) { noticeBox.classList.add("hidden"); noticeBox.textContent = ""; }
      if (!fullName) {
        setAuthFeedback("Lütfen Ad ve Soyadınızı giriniz.", true);
        if (nameInput) nameInput.focus();
        return;
      }
      if (fullName.length < 2) {
        setAuthFeedback("Lütfen adınızı en az 2 karakterle giriniz.", true);
        if (nameInput) nameInput.focus();
        return;
      }
      if (!password || (currentAuthMode === "register" && password.length < 8)) {
        setAuthFeedback(currentAuthMode === "register" ? "Yeni şifreniz en az 8 karakter olmalıdır." : "Lütfen şifrenizi giriniz.", true);
        if (passwordInput) passwordInput.focus();
        return;
      }
      if (currentAuthMode === "register" && password !== confirmPass) {
        setAuthFeedback("Girdiğiniz şifreler birbiriyle eşleşmiyor.", true);
        if (confirmInput) confirmInput.focus();
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.setAttribute("aria-busy", "true");
        submitBtn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i><span>${currentAuthMode === "register" ? "Hesap oluşturuluyor..." : "Giriş yapılıyor..."}</span>`;
      }

      try {
        const passHash = sha256(password + "_vitatakip_salt_2026");
        const legacyHash = sha256(password);
        const users = getUsersDb();
        const normalizedName = fullName.toLocaleLowerCase("tr-TR");

        if (currentAuthMode === "register") {
          const existing = users.find(u => String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName);
          if (existing) {
            setAuthFeedback("Bu isimle kayıtlı bir hesap zaten mevcut. Lütfen Giriş Yap sekmesini kullanın.", true);
            if (nameInput) nameInput.focus();
            return;
          }

          const newUser = { id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, fullName, password: passHash, createdDate: new Date().toISOString() };
          users.push(newUser);
          saveUsersDb(users);

          // Hesap kaydı başarılı olduktan sonra yeni kullanıcının boş uygulama durumunu kur.
          const rememberMe = Boolean(document.getElementById("authRememberMeCheckbox")?.checked);
          safeLocalStorageSetItem("vitatakip_remember_me", rememberMe ? "true" : "false");
          resetApplicationDOMAndState();
          activeUserId = newUser.id;
          safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
          if (rememberMe) {
            safeLocalStorageSetItem("vitatakip_active_session_id", activeUserId);
            safeLocalStorageSetItem("vitatakip_remembered_user_id", activeUserId);
            safeLocalStorageSetItem("vitatakip_remembered_fullname", fullName);
          } else {
            safeLocalStorageRemoveItem("vitatakip_active_session_id");
            safeLocalStorageRemoveItem("vitatakip_remembered_user_id");
            safeLocalStorageRemoveItem("vitatakip_remembered_fullname");
          }
          const todayStr = new Date().toLocaleDateString("tr-TR");
          safeLocalStorageSetItem(`vitatakip_lastActiveDate_${activeUserId}`, todayStr);
          state.user = { ...defaultUserProfile, name: fullName };
          try { saveState(); }
          catch (initialSaveError) { console.warn("İlk profil durumu kaydedilemedi; hesap oluşturma sürdürülecek.", initialSaveError); }
          closeAuthModal();
          openProfileModal(false);
          try {
            renderAllAppViews();
          } catch (renderError) {
            console.error("Hesap oluşturuldu ancak görünüm yenilemesi sırasında hata oluştu:", renderError);
          }
          showToast("Hesap Oluşturuldu", "Hesabınız hazır. Şimdi profil bilgilerinizi tamamlayın.", "success");
          if (typeof window.triggerVitaInstallToastOnce === "function") window.triggerVitaInstallToastOnce(activeUserId);
        } else {
          const found = users.find(u => String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName && (u.password === passHash || u.password === legacyHash || u.password === password));
          if (!found) {
            const nameExists = users.some(u => String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName);
            if (!nameExists) {
              setAuthFeedback(`"${fullName}" adına bu cihazda kayıtlı yerel bir hesap bulunamadı. Yeni bir yerel hesap açmak için "Hesap Oluştur" sekmesini veya bulut yedekli giriş için üstteki "Google / Firebase ile Giriş Yap" seçeneğini kullanın.`, true);
            } else {
              setAuthFeedback("Girdiğiniz şifre hatalı. Şifrenizi kontrol edip tekrar deneyin.", true);
            }
            if (passwordInput) passwordInput.focus();
            return;
          }

          // Eski kayıt biçimlerinden başarılı girişte mevcut yerel hash biçimine taşı.
          if (found.password !== passHash) {
            found.password = passHash;
            saveUsersDb(users);
          }

          const rememberMe = Boolean(document.getElementById("authRememberMeCheckbox")?.checked);
          safeLocalStorageSetItem("vitatakip_remember_me", rememberMe ? "true" : "false");
          activeUserId = found.id;
          safeSessionStorageSetItem("vitatakip_active_session_id", activeUserId);
          if (rememberMe) {
            safeLocalStorageSetItem("vitatakip_active_session_id", activeUserId);
            safeLocalStorageSetItem("vitatakip_remembered_user_id", activeUserId);
            safeLocalStorageSetItem("vitatakip_remembered_fullname", found.fullName);
          } else {
            safeLocalStorageRemoveItem("vitatakip_active_session_id");
            safeLocalStorageRemoveItem("vitatakip_remembered_user_id");
            safeLocalStorageRemoveItem("vitatakip_remembered_fullname");
          }
          loadUserSessionData(activeUserId);
          closeAuthModal();
          try {
            renderAllAppViews();
            showToast("Giriş Yapıldı", `Tekrar hoş geldiniz, ${found.fullName}!`, "success");
          } catch (renderError) {
            console.error("Oturum açıldı ancak görünüm yenilemesi sırasında hata oluştu:", renderError);
            showToast("Giriş Yapıldı", "Oturum açıldı. Bir bölüm yenilenemedi; gerekirse sayfayı yenileyin.", "warning");
          }
          // İlk oturum açılışında, profil modalı kapalıysa rehber turunu başlat.
          startVitaSpotlightIfFirstVisit();
          if (typeof window.triggerVitaInstallToastOnce === "function") window.triggerVitaInstallToastOnce(activeUserId);
        }
      } catch (error) {
        console.error("VitaTakip kimlik doğrulama hatası:", error);
        const storageError = error && (error.name === "SecurityError" || error.name === "QuotaExceededError");
        setAuthFeedback(storageError
          ? "Tarayıcı bu dosyanın yerel verilerine erişemiyor. Gizli pencere yerine normal bir tarayıcı penceresinde açın ve bu site için depolamanın engellenmediğini kontrol edin."
          : "İşlem tamamlanamadı. Sayfayı yenileyip tekrar deneyin.", true);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.removeAttribute("aria-busy");
          submitBtn.innerHTML = originalButtonHtml;
        }
      }
    }

    function handleLogout() {
      if (confirm("Oturumunuz kapatılacaktır. Onaylıyor musunuz?")) {
        TTSVoice.stop();
        safeLocalStorageRemoveItem("vitatakip_active_session_id");
        safeSessionStorageRemoveItem("vitatakip_active_session_id");
        activeUserId = null;
        resetApplicationDOMAndState();
        openAuthModal();
        const users = getUsersDb();
        switchAuthMode(users.length === 0 ? "register" : "login");
        showToast("Çıkış Yapıldı", "Oturumunuz kapatıldı.", "info");
      }
    }

    function deleteMyAccountData() {
      if (!activeUserId) {
        showToast("Oturum Gerekli", "Önce hesabınıza giriş yapın.", "warning");
        return;
      }
      const userId = activeUserId;
      const displayName = (state.user && state.user.name) || "bu kullanıcı";
      const firstConfirm = confirm(`${displayName} hesabına ait VitaTakip verileri bu tarayıcıdan kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?`);
      if (!firstConfirm) return;
      const typedConfirm = prompt('Onaylamak için SİL yazın.');
      if (typedConfirm !== "SİL") {
        const notice = document.getElementById("authNoticeMsg");
        if (notice) { notice.textContent = "Silme işlemi iptal edildi. Verileriniz korundu."; notice.classList.remove("hidden"); }
        return;
      }
      try {
        const users = getUsersDb().filter(user => user.id !== userId);
        saveUsersDb(users);
        const explicitKeys = [
          `vitatakip_user_${userId}`, `vitatakip_supplements_${userId}`, `vitatakip_hydration_${userId}`,
          `vitatakip_labs_${userId}`, `vitatakip_labhistory_${userId}`, `vitatakip_symptoms_${userId}`,
          `vitatakip_resolved_symptoms_${userId}`, `vitatakip_reviews_${userId}`, `vitatakip_cdss_${userId}`,
          `vitatakip_notes_${userId}`, `vitatakip_lastActiveDate_${userId}`, `vitatakip_labdraft_${userId}`,
          `vitatakip_profiledraft_${userId}`, `vitatakip_anamnesis_category_${userId}`
        ];
        explicitKeys.forEach(key => safeLocalStorageRemoveItem(key));
        safeLocalStorageRemoveItem("vitatakip_active_session_id");
        safeSessionStorageRemoveItem("vitatakip_active_session_id");
        activeUserId = null;
        resetApplicationDOMAndState();
        closeProfileModal();
        closeAuthModal();
        openAuthModal();
        switchAuthMode(users.length === 0 ? "register" : "login");
        const notice = document.getElementById("authNoticeMsg");
        if (notice) { notice.textContent = "Hesap ve sağlık verileri bu tarayıcıdan silindi. Yeni bir hesap oluşturabilir veya başka bir hesaba giriş yapabilirsiniz."; notice.classList.remove("hidden"); }
        showToast("Hesap ve Veriler Silindi", "Bu hesaba ait yerel kayıtlar bu tarayıcıdan kaldırıldı.", "success");
      } catch (error) {
        console.error("Hesap silme hatası:", error);
        showToast("Silme Tamamlanamadı", "Tarayıcı depolaması erişilemedi; veri silme işleminin tamamlandığı doğrulanamadı.", "error");
      }
    }

    function saveDoctorNotes(val) {
      if (!activeUserId) return;
      const userId = String(activeUserId);
      const noteSaved = safeLocalStorageSetItem(`vitatakip_notes_${userId}`, val);
      // Her tuşta IndexedDB transaction açmamak için notları kısa debounce ile yedekle.
      if (vitaDoctorNotesPersistTimer) clearTimeout(vitaDoctorNotesPersistTimer);
      vitaDoctorNotesPersistTimer = setTimeout(() => {
        if (String(activeUserId || "") !== userId) return;
        const stamp = nextVitaExtendedStamp(userId);
        if (noteSaved) {
          const stampOk = safeLocalStorageSetItem(`vitatakip_extended_updated_${userId}`, String(stamp));
          if (stampOk) safeLocalStorageSetItem(`vitatakip_local_save_complete_${userId}`, "true");
          else safeLocalStorageSetItem(`vitatakip_local_save_complete_${userId}`, "false");
        } else {
          // localStorage yazımı başarısızsa yerel damgayı ilerletme; IndexedDB'de daha yeni
          // anlık görüntü oluşsun ve bir sonraki açılışta geri yükleme bunu seçebilsin.
          safeLocalStorageSetItem(`vitatakip_local_save_complete_${userId}`, "false");
        }
        persistVitaExtendedData(userId, stamp);
      }, 500);
    }

    /* GECE YARISI SIFIRLAMA (MIDNIGHT RESET) KONTROLÜ */
    