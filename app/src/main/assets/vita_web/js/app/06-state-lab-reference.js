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
        "doctorTestsSection",
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
            id === "cdssRecallContainer" ||
            id === "doctorTestsSection"
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
      creatinine: { name: "Kreatinin", value: "0,5–1,1 mg/dL", maleValue: "0,7–1,3 mg/dL", unit: "mg/dL" },
      folate: { name: "Folat", value: "4,0–20,0 ng/mL", unit: "ng/mL" },
      alt: { name: "ALT", value: "7–35 U/L", maleValue: "7–45 U/L", unit: "U/L" },
      hb: { name: "Hemoglobin", value: "12,0–16,0 g/dL", maleValue: "13,0–17,5 g/dL", unit: "g/dL" },
      mcv: { name: "MCV", value: "80–100 fL", unit: "fL" },
      crp: { name: "CRP", value: "0–5 mg/L", unit: "mg/L" }
    };

    function getVitaAppLabReference(key, gender = state.user?.gender || "K") {
      const meta = VITA_LAB_APP_REFERENCE_META[key];
      if (!meta) return "Aralık tanımlı değil";
      // Gebelik referansları (WHO 2011 / CDC / ACOG): hemoglobin ve kreatinin gebelikte farklıdır.
      const pregStage = typeof getPregnancyStage === "function" ? getPregnancyStage() : "";
      if (pregStage === "t1" || pregStage === "t2" || pregStage === "t3") {
        if (key === "hb") return pregStage === "t2" ? "10,5–14,0 g/dL (gebelik)" : "11,0–14,0 g/dL (gebelik)";
        if (key === "creatinine") return "0,4–0,8 mg/dL (gebelik)";
      }
      const value = gender === "E" && meta.maleValue ? meta.maleValue : meta.value;
      return value;
    }

    /* Kreatinin üst sınırı: TEK KAYNAK (ekrandaki aralık). Tüm güvenlik süzgeçleri ve sınıflandırma bunu kullanır.
       Gebelikte (GFR artışı) normal üst sınır 0,8 mg/dL'dir. */
    function getCreatinineUpperLimit(gender = state.user?.gender || "K") {
      try { if (typeof isPregnantNow === "function" && isPregnantNow()) return 0.8; } catch (_) {}
      const meta = VITA_LAB_APP_REFERENCE_META.creatinine;
      const nums = String(gender === "E" ? meta.maleValue : meta.value).replace(/,/g, ".").match(/\d+(?:\.\d+)?/g);
      return nums && nums.length >= 2 ? Number(nums[1]) : (gender === "E" ? 1.3 : 1.1);
    }
    window.getCreatinineUpperLimit = getCreatinineUpperLimit;

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
      showToast("Soru taslağı hazır", "Soru sohbet alanına aktarıldı, otomatik gönderilmedi. Yanıtlar cihazdaki yerel motorla üretilir.", "info");
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
        dateInput.max = dateInput.value; /* gelecek tarih seçilemez */
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
    /* Yerel (cihaz saat dilimi) bugünün tarihi YYYY-AA-GG. toISOString() UTC verir; Türkiye'de 00:00–03:00 arası "dün" olur. */
    function vitaLocalToday() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
    window.vitaLocalToday = vitaLocalToday;

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
      // Sağlık verisi içerdiği için varsayılan KAPALI (ortak cihazda oturum kalıcı saklanmaz); kullanıcı isterse açar.
      return saved === null ? false : saved === "true";
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
    }

    function closeAuthModal() {
      const modal = document.getElementById("authModal");
      if (modal) { modal.classList.add("hidden"); modal.style.display = "none"; }
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
        if (submitBtn) submitBtn.innerHTML = `<span>Giriş Yap</span> <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>`;
        if (subtitle) subtitle.textContent = "Hesabınıza giriş yapın";
        if (switchPrompt) switchPrompt.innerHTML = `Yerel hesabınız yok mu? <a href="javascript:void(0)" onclick="if(window.SoundEffects) SoundEffects.playClick(); switchAuthMode('register')" class="text-teal-600 font-bold hover:underline">Yerel (Cihaz) Hesabı Oluşturun</a>`;
      } else {
        if (regBtn) regBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg bg-white text-navy-900 shadow-sm transition cursor-pointer";
        if (loginBtn) loginBtn.className = "flex-1 py-2 text-xs font-bold rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer";
        if (confirmContainer) confirmContainer.classList.remove("hidden");
        if (submitBtn) submitBtn.innerHTML = `<span>Hesap Oluştur</span> <i class="fa-solid fa-user-plus" aria-hidden="true"></i>`;
        if (subtitle) subtitle.textContent = "Birkaç saniyede yeni hesap oluşturun";
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
          const found = users.find(u => String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName && (u.password === passHash || u.password === legacyHash));
          if (!found) {
            const nameExists = users.some(u => String(u.fullName || "").trim().toLocaleLowerCase("tr-TR") === normalizedName);
            if (!nameExists) {
              setAuthFeedback(`"${fullName}" adına bu cihazda kayıtlı yerel bir hesap bulunamadı. Yeni bir yerel hesap açmak için "Hesap Oluştur" sekmesini kullanın.`, true);
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

    /* Bu kullanıcıya ait TÜM yerel anahtarları bulur: adında kullanıcı kimliği geçen her anahtar (ör. vitatakip_*_<id>). */
    function listVitaUserStorageKeys(userId) {
      const keys = new Set();
      const id = String(userId || "");
      if (!id) return [];
      try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.includes(id)) keys.add(k); } } catch (_) {}
      try { vitaMemoryLocalStore.forEach((_, k) => { if (String(k).includes(id)) keys.add(String(k)); }); } catch (_) {}
      return Array.from(keys);
    }

    async function deleteMyAccountData() {
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
        listVitaUserStorageKeys(userId).forEach(key => safeLocalStorageRemoveItem(key));
        ["vitatakip_feedback_demo", "vitatakip_selected_symptoms_array"].forEach(key => safeLocalStorageRemoveItem(key));
        if (safeLocalStorageGetItem("vitatakip_remembered_user_id") === userId) {
          safeLocalStorageRemoveItem("vitatakip_remembered_user_id");
          safeLocalStorageRemoveItem("vitatakip_remembered_fullname");
        }
        safeLocalStorageRemoveItem("vitatakip_active_session_id");
        safeSessionStorageRemoveItem("vitatakip_active_session_id");
        /* IndexedDB'deki tam anlık görüntü ve PDF günlükleri de silinir; aksi hâlde "silindi" beyanı doğru olmaz. */
        let indexedPurged = true;
        if (typeof purgeVitaUserIndexedData === "function") {
          try { await purgeVitaUserIndexedData(userId); }
          catch (purgeError) { indexedPurged = false; console.error("IndexedDB kayıtları silinemedi:", purgeError); }
        }
        if (!indexedPurged) {
          showToast("Silme Tamamlanamadı", "Bazı yerel kayıtlar silinemedi. Tarayıcı ayarlarından bu sitenin verilerini temizleyin.", "error");
        }
        activeUserId = null;
        resetApplicationDOMAndState();
        closeProfileModal();
        closeAuthModal();
        openAuthModal();
        switchAuthMode(users.length === 0 ? "register" : "login");
        const notice = document.getElementById("authNoticeMsg");
        if (indexedPurged) {
          if (notice) { notice.textContent = "Hesap ve sağlık verileri bu tarayıcıdan silindi. Yeni bir hesap oluşturabilir veya başka bir hesaba giriş yapabilirsiniz."; notice.classList.remove("hidden"); }
          showToast("Hesap ve Veriler Silindi", "Bu hesaba ait yerel kayıtlar bu tarayıcıdan kaldırıldı.", "success");
        }
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
    