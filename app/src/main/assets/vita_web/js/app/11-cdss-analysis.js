/* ==========================================================================
   GÖREV 2: "NEYİM VAR?" BÖLÜMÜNDEKİ [ANAMNEZ TRİYAJ VE eGFR ANALİZ] MOTORU
   - Belirtileri (state.selectedSymptoms), Yaş, Cinsiyet ve Kreatinin değerlerini toplar
   - CKD-EPI (2021) eGFR formülünü hesaplar
   - Triyaj seviyesini (ACİL DEĞERLENDİRME / POLİKLİNİK BAŞVURUSU / EVDE TAKİP) belirler
   - Sonucu doğrudan #view-neyim içindeki #neyimTriageEgfrResultContainer alanına basar
   - Eksik/hatalı veri durumunda konsola düşmek yerine #neyimTriageErrorBanner ile uyarı gösterir
   ========================================================================== */
function hydrateNeyimInlineInputsFromState() {
  const p = state.user || defaultUserProfile;
  const ageEl = document.getElementById("neyimInputAge");
  const genderEl = document.getElementById("neyimInputGender");
  const creatEl = document.getElementById("neyimInputCreatinine");
  const labCtx = window.VitaLabInsights ? VitaLabInsights.cdssInputs() : null;
  const labs = labCtx ? labCtx.values : (state.labValues || {});

  if (ageEl && (!ageEl.value || ageEl.dataset.userEdited !== "true")) {
    ageEl.value = p.age ? String(p.age) : "28";
  }
  if (genderEl && genderEl.dataset.userEdited !== "true") {
    genderEl.value = p.gender === "E" ? "E" : "K";
  }
  if (creatEl && (!creatEl.value || creatEl.dataset.userEdited !== "true")) {
    const cr = labs.creatinine ?? state.labValues?.creatinine;
    if (cr !== null && cr !== undefined && cr !== "" && Number.isFinite(Number(cr))) {
      creatEl.value = String(cr);
    }
  }
  syncNeyimInlineInputsPreview(false);
}

function syncNeyimInlineInputsPreview(markUserEdited = true) {
  const ageEl = document.getElementById("neyimInputAge");
  const genderEl = document.getElementById("neyimInputGender");
  const creatEl = document.getElementById("neyimInputCreatinine");
  const badgeEl = document.getElementById("neyimLiveEgfrPreviewBadge");
  if (markUserEdited && document.activeElement) {
    if (document.activeElement === ageEl && ageEl) ageEl.dataset.userEdited = "true";
    if (document.activeElement === genderEl && genderEl) genderEl.dataset.userEdited = "true";
    if (document.activeElement === creatEl && creatEl) creatEl.dataset.userEdited = "true";
  }
  const age = Number(ageEl?.value || state.user?.age || 28);
  const gender = String(genderEl?.value || state.user?.gender || "K");
  const rawCr = creatEl?.value !== undefined && creatEl?.value !== "" ? Number(String(creatEl.value).replace(",", ".")) : null;

  if (badgeEl) {
    if (rawCr !== null && Number.isFinite(rawCr) && rawCr > 0 && age >= 18) {
      const egfrObj = calculateCKDEPI_eGFR(rawCr, age, gender);
      if (egfrObj) {
        badgeEl.textContent = `Canlı eGFR: ${egfrObj.egfr} mL/dk (${egfrObj.stageCode})`;
        badgeEl.className = `text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${egfrObj.badgeClass}`;
        return;
      }
    }
    badgeEl.textContent = age < 18 ? "18 Yaş Altı (Pediatrik)" : "CKD-EPI 2021 Hazır";
    badgeEl.className = "text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-white text-teal-800 border border-teal-200";
  }
}

function showNeyimTriageValidationError(title, detail) {
  const errBanner = document.getElementById("neyimTriageErrorBanner");
  if (errBanner) {
    errBanner.classList.remove("hidden");
    errBanner.innerHTML = `
      <div class="flex items-start gap-2.5">
        <i class="fa-solid fa-triangle-exclamation text-rose-600 text-base mt-0.5"></i>
        <div class="space-y-1">
          <div class="font-black text-rose-900">${escapeHtmlText(title)}</div>
          <p class="text-[11px] leading-relaxed text-rose-800">${escapeHtmlText(detail)}</p>
        </div>
      </div>`;
    errBanner.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  if (typeof showToast === "function") {
    showToast(title, detail, "warning");
  }
}

function evaluateAnamnesisTriageAndEgfr({ symptomsList, age, gender, creatinine, labs }) {
  const urgentSymptoms = [
    { key: "balance_difficulty", label: "Denge ve yürüme güçlüğü (Ataksi / Nörolojik bulgu)" },
    { key: "unexplained_swelling", label: "Bacak veya ayak bileğinde açıklanamayan şişlik (Ödem)" },
    { key: "dark_nail_change", label: "Tırnakta yeni/genişleyen koyu çizgi (Pigmente lezyon)" },
    { key: "orthostatic_dizziness", label: "Ayağa kalkınca göz kararması ve baş dönmesi" },
    { key: "lip_twitching", label: "Dudak çevresinde veya parmak uçlarında kasılma/tetani eğilimi" },
    { key: "night_blindness", label: "Alacakaranlıkta / gece görme güçlüğü" }
  ];
  const outpatientSymptoms = [
    { key: "numbness", label: "El ve ayaklarda uyuşma, karıncalanma (Periferik nöropati)" },
    { key: "burning_tongue", label: "Dilde yanma ve kızarıklık (Glossit)" },
    { key: "pica_craving", label: "Buz, toprak veya kahve telvesi yeme isteği (Pika)" },
    { key: "spoon_nails", label: "Kaşık tırnak deformitesi (Koilonişi)" },
    { key: "bone_pain", label: "Derin kemik ve bel/kalça sızlaması" },
    { key: "muscle_weakness", label: "Merdiven çıkarken kas güçsüzlüğü" },
    { key: "frequent_infection", label: "Sık tekrarlayan enfeksiyonlar" },
    { key: "bleeding_gums", label: "Diş eti kanaması" },
    { key: "easy_bruising", label: "Kolay morarma / ekimoz" },
    { key: "angular_cheilitis", label: "Ağız kenarında çatlak ve yarıklar (Açısal keilit)" }
  ];

  const egfrResult = (age >= 18 && creatinine !== null && Number.isFinite(creatinine) && creatinine > 0)
    ? calculateCKDEPI_eGFR(creatinine, age, gender)
    : null;

  const matchedUrgent = urgentSymptoms.filter(item => symptomsList.includes(item.key));
  const matchedOutpatient = outpatientSymptoms.filter(item => symptomsList.includes(item.key));
  const hasHeadacheAndTremor = symptomsList.includes("headache") && symptomsList.includes("hand_tremor");

  let triageLevel = "EVDE TAKİP & KORUYUCU İZLEM";
  let triageCode = "home_follow";
  let triageBadgeClass = "bg-emerald-100 text-emerald-900 border-emerald-300";
  let triageCardBorder = "border-emerald-400 bg-emerald-50/40";
  let triageIcon = "fa-house-medical-circle-check text-emerald-600";
  let triageSummary = "Seçilen belirtilerde akut kırmızı bayrak saptanmadı. Beslenme, uyku, hidrasyon ve mevcut tahlillerinizle koruyucu takip önerilir; şikayetleriniz sürerse aile hekiminize danışınız.";
  const triageReasons = [];

  if (egfrResult && egfrResult.egfr < 30) {
    triageLevel = "ACİL / ÖNCELİKLİ NEFROLOJİ & HEKİM DEĞERLENDİRMESİ";
    triageCode = "urgent";
    triageBadgeClass = "bg-rose-100 text-rose-900 border-rose-300";
    triageCardBorder = "border-rose-400 bg-rose-50/50";
    triageIcon = "fa-truck-medical text-rose-600";
    triageReasons.push(`Hesaplanan CKD-EPI eGFR değeri ${egfrResult.egfr} mL/dk/1.73m² (${egfrResult.stageCode} - ${egfrResult.stageName}) düzeyindedir; nefrotoksik ilaç ve kontrolsüz takviyelerden kaçınılmalı, derhal hekime başvurulmalıdır.`);
  }

  if (hasHeadacheAndTremor) {
    triageReasons.push("Baş ağrısı ve el titremesi birlikte bildirilmiştir; nörolojik muayene ve tansiyon kontrolü gerektirir.");
  }

  if (matchedUrgent.length > 0 || (egfrResult && egfrResult.egfr < 30) || (hasHeadacheAndTremor && matchedUrgent.length > 0)) {
    if (matchedUrgent.length >= 2 || (egfrResult && egfrResult.egfr < 30) || symptomsList.includes("balance_difficulty") || symptomsList.includes("unexplained_swelling")) {
      triageLevel = "ACİL / ÖNCELİKLİ HEKİM DEĞERLENDİRMESİ";
      triageCode = "urgent";
      triageBadgeClass = "bg-rose-100 text-rose-900 border-rose-300";
      triageCardBorder = "border-rose-400 bg-rose-50/50";
      triageIcon = "fa-triangle-exclamation text-rose-600";
      matchedUrgent.forEach(u => triageReasons.push(`Kırmızı bayraklı belirti: ${u.label}`));
      triageSummary = "Seçtiğiniz belirtiler ve/veya böbrek fonksiyon (eGFR) parametreniz tek başına vitamin eksikliğiyle açıklanamayacak öncelikli değerlendirme bulguları içeriyor. Kendi kendinize takviye başlamadan önce hekim muayenesi önerilir.";
    } else {
      triageLevel = "POLİKLİNİK BAŞVURUSU (DAHİLİYE / AİLE HEKİMLİĞİ)";
      triageCode = "outpatient";
      triageBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";
      triageCardBorder = "border-amber-400 bg-amber-50/50";
      triageIcon = "fa-user-doctor text-amber-600";
      matchedUrgent.forEach(u => triageReasons.push(`Hekim değerlendirmesi gerektiren belirti: ${u.label}`));
      triageSummary = "Bildirdiğiniz belirtiler hedefli kan tahlili ve poliklinik değerlendirmesi gerektiriyor.";
    }
  } else if (
    matchedOutpatient.length > 0 ||
    hasHeadacheAndTremor ||
    symptomsList.length >= 2 ||
    (egfrResult && egfrResult.egfr < 60)
  ) {
    triageLevel = "POLİKLİNİK BAŞVURUSU (DAHİLİYE / AİLE HEKİMLİĞİ)";
    triageCode = "outpatient";
    triageBadgeClass = "bg-amber-100 text-amber-900 border-amber-300";
    triageCardBorder = "border-amber-400 bg-amber-50/50";
    triageIcon = "fa-user-doctor text-amber-600";
    if (egfrResult && egfrResult.egfr < 60) {
      triageReasons.push(`Hesaplanan CKD-EPI eGFR değeri ${egfrResult.egfr} mL/dk/1.73m² (${egfrResult.stageCode}) ile <60 sınırının altındadır; hekim kontrolü önerilir.`);
    }
    matchedOutpatient.slice(0, 4).forEach(o => triageReasons.push(`Klinik ilişkili belirti: ${o.label}`));
    triageSummary = "Seçilen belirtiler ve/veya eGFR sonucunuz mikrobesin eksikliği veya metabolik etkilenme açısından poliklinik kontrolü ve laboratuvar doğrulamasıyla uyumludur.";
  } else if (symptomsList.length === 1) {
    const key = symptomsList[0];
    const meta = (typeof ANAMNESIS_DICTIONARY !== "undefined" && ANAMNESIS_DICTIONARY[key]) ? ANAMNESIS_DICTIONARY[key] : null;
    triageReasons.push(`Seçilen tekil belirti: ${meta ? meta.symptomName : key}`);
    triageSummary = "Tekil ve hafif düzeyli belirti kaydı mevcut. Şikayetiniz 2 haftadan uzun sürerse veya şiddetlenirse poliklinik başvurusu önerilir.";
  } else {
    triageReasons.push("Aktif belirti seçimi yapılmadı; profil ve laboratuvar parametreleri üzerinden bazal değerlendirme yapıldı.");
  }

  return {
    triageLevel,
    triageCode,
    triageBadgeClass,
    triageCardBorder,
    triageIcon,
    triageSummary,
    triageReasons,
    egfrResult,
    symptomCount: symptomsList.length
  };
}

function getRecentHistoricalLabsSummary(maxRecords = 3) {
  const rawHistory = Array.isArray(state.labHistory) ? state.labHistory.filter(Boolean) : [];
  const sorted = [...rawHistory].sort((a, b) => {
    const tB = Number(b.timestamp || new Date(b.date || 0).getTime() || 0);
    const tA = Number(a.timestamp || new Date(a.date || 0).getTime() || 0);
    return tB - tA;
  });
  const recentRecords = sorted.slice(0, Math.max(2, Math.min(3, maxRecords)));
  const metricDefs = [
    { key: "d3", label: "25(OH)D3", unit: "ng/mL" },
    { key: "b12", label: "B12", unit: "pg/mL" },
    { key: "ferritin", label: "Ferritin", unit: "ng/mL" },
    { key: "creatinine", label: "Kreatinin", unit: "mg/dL" },
    { key: "mg", label: "Magnezyum", unit: "mg/dL" },
    { key: "ca", label: "Kalsiyum", unit: "mg/dL" },
    { key: "hb", label: "Hemoglobin", unit: "g/dL" },
    { key: "mcv", label: "MCV", unit: "fL" },
    { key: "folate", label: "Folat", unit: "ng/mL" },
    { key: "zinc", label: "Çinko", unit: "µg/dL" },
    { key: "alt", label: "ALT", unit: "U/L" },
    { key: "crp", label: "CRP", unit: "mg/L" }
  ];
  const archivedLatestValues = {};
  const archivedValueDates = {};
  const archivedReferences = {};
  metricDefs.forEach(m => {
    for (let i = 0; i < recentRecords.length; i++) {
      const rec = recentRecords[i];
      if (!rec) continue;
      const raw = rec[m.key];
      if (raw !== null && raw !== undefined && raw !== "") {
        const num = Number(String(raw).replace(",", "."));
        if (Number.isFinite(num)) {
          archivedLatestValues[m.key] = num;
          archivedValueDates[m.key] = rec.date || `${i + 1}. Arşiv Kaydı`;
          if (rec.references && rec.references[m.key]) {
            archivedReferences[m.key] = String(rec.references[m.key]);
          }
          break;
        }
      }
    }
  });
  const comparisons = [];
  if (recentRecords.length >= 2) {
    const latest = recentRecords[0];
    const prev = recentRecords[1];
    const oldest = recentRecords[2] || null;
    metricDefs.forEach(m => {
      const currVal = latest && latest[m.key] !== null && latest[m.key] !== undefined && latest[m.key] !== "" ? Number(String(latest[m.key]).replace(",", ".")) : null;
      const prevVal = prev && prev[m.key] !== null && prev[m.key] !== undefined && prev[m.key] !== "" ? Number(String(prev[m.key]).replace(",", ".")) : null;
      const oldVal = oldest && oldest[m.key] !== null && oldest[m.key] !== undefined && oldest[m.key] !== "" ? Number(String(oldest[m.key]).replace(",", ".")) : null;
      if (Number.isFinite(currVal) && Number.isFinite(prevVal)) {
        const delta = Number((currVal - prevVal).toFixed(2));
        const sign = delta > 0 ? "+" : "";
        const pctDelta = prevVal > 0 ? Number(((delta / prevVal) * 100).toFixed(1)) : null;
        const pctText = pctDelta !== null ? `, %${pctDelta > 0 ? "+" : ""}${pctDelta}` : "";
        const chainText = Number.isFinite(oldVal)
          ? `${oldVal} (${oldest.date || "3. Kayıt"}) → ${prevVal} (${prev.date || "2. Kayıt"}) → ${currVal} ${m.unit} (${latest.date || "Son"}) [Δ ${sign}${delta}${pctText}]`
          : `${prevVal} (${prev.date || "Önceki"}) → ${currVal} ${m.unit} (${latest.date || "Son"}) [Δ ${sign}${delta}${pctText}]`;
        comparisons.push({
          key: m.key,
          label: m.label,
          unit: m.unit,
          latestVal: currVal,
          prevVal,
          oldestVal: Number.isFinite(oldVal) ? oldVal : null,
          delta,
          pctDelta,
          chainText
        });
      }
    });
  }
  return {
    recentRecords,
    recordCount: recentRecords.length,
    dates: recentRecords.map(r => r.date).filter(Boolean),
    archivedLatestValues,
    archivedValueDates,
    archivedReferences,
    comparisons
  };
}

function renderNeyimInlineTriageResult(resultData, { age, gender, creatinine, symptomsList, recentHistorySummary }) {
  const container = document.getElementById("neyimTriageEgfrResultContainer");
  // Kritik Kural: NeyimVar sayfasında hiçbir triyaj veya eGFR sonucu gösterilmez; yalnızca Klinik Analiz sayfasında gösterilir.
  if (container) {
    container.classList.add("hidden");
    container.innerHTML = "";
  }
  const clinicalResultsBanner = document.getElementById("clinicalResultsTriageEgfrBanner");

  const symptomBadgesHtml = symptomsList.length > 0
    ? symptomsList.map(key => {
        const meta = (typeof ANAMNESIS_DICTIONARY !== "undefined" && ANAMNESIS_DICTIONARY[key]) ? ANAMNESIS_DICTIONARY[key] : null;
        const name = meta ? (meta.symptomName || meta.medicalName) : key;
        return `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-navy-900 border border-slate-200 text-[11px] font-bold"><i class="fa-solid fa-check text-teal-600 text-[10px]"></i>${escapeHtmlText(name)}</span>`;
      }).join("")
    : `<span class="text-xs text-slate-500 italic">Aktif belirti seçimi yok (Profil, İlaç ve Tahlil verileriyle değerlendirildi)</span>`;

  const hasValidEgfr = Boolean(
    resultData.egfrResult &&
    Number.isFinite(Number(resultData.egfrResult.egfr)) &&
    creatinine !== null &&
    creatinine !== undefined &&
    creatinine !== "" &&
    Number.isFinite(Number(creatinine))
  );

  const egfrCardHtml = hasValidEgfr
    ? `<div class="p-3.5 rounded-xl border ${resultData.egfrResult.badgeClass} space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-black flex items-center gap-1.5"><i class="fa-solid fa-kidneys"></i> CKD-EPI (2021) eGFR Sonucu (Tahlil &amp; Profil Verilerinden)</span>
          <span class="text-xs font-black px-2.5 py-0.5 rounded-full bg-white/80 border">${resultData.egfrResult.egfr} mL/dk/1.73m² • Evre ${escapeHtmlText(resultData.egfrResult.stageCode)}</span>
        </div>
        <p class="text-[11px] font-bold">${escapeHtmlText(resultData.egfrResult.stageName)} (Kreatinin: ${Number(creatinine)} mg/dL · Yaş: ${Number.isFinite(Number(age)) ? Number(age) : 28} · Cinsiyet: ${gender === "E" ? "Erkek" : "Kadın"})</p>
        <p class="text-[11px] leading-relaxed">${escapeHtmlText(resultData.egfrResult.clinicalNote)}</p>
      </div>`
    : `<div class="p-3.5 rounded-xl border border-slate-300 bg-slate-50 text-xs text-slate-800 space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="font-black text-navy-900 flex items-center gap-1.5"><i class="fa-solid fa-kidneys text-teal-600"></i> Böbrek Güvenliği (eGFR) Kalkanı</span>
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-800 border border-slate-300">
            <i class="fa-solid fa-flask-vial text-slate-600"></i> Laboratuvar Tahlili Bekleniyor
          </span>
        </div>
        <p class="text-[11px] font-semibold leading-relaxed">${age < 18
          ? "18 yaş altı kullanıcılarda yetişkin CKD-EPI 2021 formülü uygulanmaz; pediatrik Schwartz formülü için uzman hekim değerlendirmesi gerekir."
          : "Laboratuvar Tahlili Bekleniyor — Tahlil girilmediği için böbrek filtrasyonu hesaplanamadı. Güncel kreatinin tahlili bulunmadığından takviye planlamasından önce rutin testlerin yapılması önerilir."}</p>
      </div>`;

  const histInfo = recentHistorySummary || getRecentHistoricalLabsSummary(3);
  const historyTrendHtml = histInfo && histInfo.recordCount >= 2 && histInfo.comparisons.length > 0
    ? `<div class="p-3.5 rounded-xl border border-teal-200 bg-teal-50/60 space-y-1.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <span class="text-xs font-black text-teal-950 flex items-center gap-1.5"><i class="fa-solid fa-chart-line text-teal-700"></i> Geçmiş Tahlil Karşılaştırması (Son ${histInfo.recordCount} Kayıt: ${escapeHtmlText(histInfo.dates.join(" → "))})</span>
        </div>
        <ul class="space-y-1 text-[11px] text-teal-900 font-medium">
          ${histInfo.comparisons.slice(0, 6).map(c => `<li>• <strong>${escapeHtmlText(c.label)}:</strong> ${escapeHtmlText(c.chainText)}</li>`).join("")}
        </ul>
      </div>`
    : "";

  const reasonsHtml = resultData.triageReasons.map(r => `<li class="flex items-start gap-2 text-xs text-slate-700"><i class="fa-solid fa-circle-dot text-teal-600 text-[10px] mt-1 shrink-0"></i><span>${escapeHtmlText(r)}</span></li>`).join("");

  const cardInnerHtml = `
    <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
      <div class="flex items-center gap-2.5">
        <span class="w-9 h-9 rounded-xl bg-navy-900 text-teal-300 flex items-center justify-center text-base shadow-xs">
          <i class="fa-solid ${resultData.triageIcon}"></i>
        </span>
        <div>
          <span class="text-[10px] font-black uppercase tracking-wider text-slate-500 block">Anamnez Triyaj &amp; Böbrek Fonksiyon Raporu</span>
          <h3 class="text-sm sm:text-base font-black text-navy-900">${escapeHtmlText(resultData.triageLevel)}</h3>
        </div>
      </div>
      <span class="text-xs font-black px-3 py-1 rounded-full border ${resultData.triageBadgeClass}">
        ${resultData.symptomCount} Belirti Analiz Edildi
      </span>
    </div>

    <div class="p-3.5 rounded-xl border ${resultData.triageCardBorder} space-y-2">
      <p class="text-xs font-bold text-navy-900 leading-relaxed">${escapeHtmlText(resultData.triageSummary)}</p>
      <ul class="space-y-1 pt-1">${reasonsHtml}</ul>
    </div>

    ${egfrCardHtml}

    ${historyTrendHtml}

    <div class="space-y-1.5">
      <span class="text-[11px] font-black text-slate-600 uppercase tracking-wider block">Değerlendirilen Belirtiler (${resultData.symptomCount})</span>
      <div class="flex flex-wrap gap-1.5">${symptomBadgesHtml}</div>
    </div>

    <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <span class="text-[11px] text-slate-500">
        <i class="fa-solid fa-circle-info text-teal-600 mr-1"></i>${histInfo.recordCount > 0
          ? `Klinik karar destek motoru profil, tahlil arşivi (son ${histInfo.recordCount} kayıt) ve seçilen belirtilerinizi otomatik birleştirerek analiz etti.`
          : "Tahlil kaydı bulunmadığından klinik karar destek motoru profiliniz (yaş, cinsiyet, kronik durum/ilaçlar) ve seçtiğiniz belirtiler üzerinden analiz etti."}
      </span>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" onclick="if(window.SoundEffects) SoundEffects.playClick(); transferToDoctorReport()" class="px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 text-xs font-bold transition cursor-pointer flex items-center gap-1.5">
          <i class="fa-solid fa-file-medical"></i>
          <span>Hekim Raporuna Aktar</span>
        </button>
      </div>
    </div>
  `;

  if (clinicalResultsBanner) {
    clinicalResultsBanner.classList.remove("hidden");
    clinicalResultsBanner.style.display = "block";
    clinicalResultsBanner.innerHTML = cardInnerHtml;
  }
}

/* ==========================================================================
   5 SENARYOLU KLİNİK ANALİZ DOĞRULAMA VE TETİKLEME MİMARİSİ
   - Zorunlu Taban: Kullanıcı Profili (Yaş, Biyolojik Cinsiyet, Boy/Kilo/VKİ, Kronik Hastalıklar, Düzenli İlaçlar)
   - 3 Klinik Veri Kaynağı:
     1) Güncel Tahlil Verisi (hasCurrentLab)
     2) Eski Tahlil Arşivi (hasArchivedLab)
     3) Seçilen Belirtiler (selectedSymptoms.length > 0)
   - En az BİR klinik kaynak doluysa analiz motoru kesintisiz çalışır.
   ========================================================================== */
function getUserProfile() {
  if (typeof state !== "undefined" && state.user && typeof state.user === "object") {
    return state.user;
  }
  try {
    const uid = typeof activeUserId !== "undefined" && activeUserId ? activeUserId : "default";
    const raw = (typeof safeLocalStorageGetItem === "function"
      ? safeLocalStorageGetItem(`vitatakip_user_${uid}`) || safeLocalStorageGetItem("userProfile")
      : localStorage.getItem(`vitatakip_user_${uid}`) || localStorage.getItem("userProfile"));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof state !== "undefined") state.user = parsed;
        return parsed;
      }
    }
  } catch (_) {}
  const fallback = typeof defaultUserProfile !== "undefined" && defaultUserProfile
    ? { ...defaultUserProfile }
    : { name: "Kullanıcı", age: 28, gender: "K", height: 170, weight: 68, bmi: 23.5, bmiCategory: "Normal", chronic: [], medications: [] };
  if (typeof state !== "undefined" && !state.user) {
    state.user = fallback;
  }
  return fallback;
}

function checkCurrentLabExists() {
  if (typeof persistCurrentLabInputsToState === "function") {
    try { persistCurrentLabInputsToState({ silentUI: true }); } catch (_) {}
  }
  const isValidNum = val => {
    if (val === null || val === undefined || val === "") return false;
    const n = Number(String(val).trim().replace(",", "."));
    return Number.isFinite(n) && n > 0;
  };
  if (typeof state !== "undefined" && state.labValues && typeof state.labValues === "object") {
    if (Object.values(state.labValues).some(isValidNum)) return true;
  }
  if (window.VitaLabInsights && typeof VitaLabInsights.cdssInputs === "function") {
    try {
      const ctx = VitaLabInsights.cdssInputs();
      if (ctx && ctx.values && Object.values(ctx.values).some(isValidNum)) return true;
    } catch (_) {}
  }
  try {
    const uid = typeof activeUserId !== "undefined" && activeUserId ? activeUserId : "default";
    const rawCurrent = (typeof safeLocalStorageGetItem === "function"
      ? safeLocalStorageGetItem(`vitatakip_labs_${uid}`) || safeLocalStorageGetItem("currentLabResults")
      : localStorage.getItem(`vitatakip_labs_${uid}`) || localStorage.getItem("currentLabResults"));
    if (rawCurrent) {
      const parsed = JSON.parse(rawCurrent);
      if (parsed && typeof parsed === "object" && Object.values(parsed).some(isValidNum)) return true;
    }
  } catch (_) {}
  return false;
}

function checkArchivedLabExists() {
  const isValidNum = val => {
    if (val === null || val === undefined || val === "") return false;
    const n = Number(String(val).trim().replace(",", "."));
    return Number.isFinite(n) && n > 0;
  };
  const metricKeys = ["d3", "b12", "ferritin", "mg", "ca", "zinc", "creatinine", "folate", "alt", "hb", "mcv", "crp"];
  const recordHasAnyMetric = rec => rec && typeof rec === "object" && metricKeys.some(k => isValidNum(rec[k]));

  if (typeof state !== "undefined" && Array.isArray(state.labHistory) && state.labHistory.some(recordHasAnyMetric)) {
    return true;
  }
  try {
    const uid = typeof activeUserId !== "undefined" && activeUserId ? activeUserId : "default";
    const rawArchive = (typeof safeLocalStorageGetItem === "function"
      ? safeLocalStorageGetItem(`vitatakip_labhistory_${uid}`) || safeLocalStorageGetItem("labArchiveHistory")
      : localStorage.getItem(`vitatakip_labhistory_${uid}`) || localStorage.getItem("labArchiveHistory"));
    if (rawArchive) {
      const parsed = JSON.parse(rawArchive);
      if (Array.isArray(parsed) && parsed.some(recordHasAnyMetric)) return true;
    }
  } catch (_) {}
  return false;
}

function syncSelectedSymptomsFromDOM() {
  if (!(state.selectedSymptoms instanceof Set)) {
    state.selectedSymptoms = new Set(Array.isArray(state.selectedSymptoms) ? state.selectedSymptoms : []);
  }
  const neyimRoot = document.getElementById("view-neyim") || document;
  const anamnesisCards = neyimRoot.querySelectorAll(".anamnesis-card");
  if (anamnesisCards.length > 0) {
    const domSet = new Set();
    anamnesisCards.forEach(card => {
      const match = (card.getAttribute("onclick") || "").match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/);
      const key = (match && match[1]) ? match[1] : (card.dataset?.symptom || null);
      if (!key) return;
      const dot = card.querySelector(".check-dot");
      const hasCheckIcon = Boolean(dot && dot.querySelector(".fa-check"));
      const isCardSelected =
        card.classList.contains("border-indigo-500") ||
        card.classList.contains("is-selected") ||
        card.classList.contains("selected") ||
        card.getAttribute("aria-pressed") === "true" ||
        hasCheckIcon;
      if (isCardSelected) {
        domSet.add(key);
      }
    });
    state.selectedSymptoms = domSet;
    state.selectedSymptomsArray = Array.from(domSet);
    try {
      if (typeof safeLocalStorageSetItem === "function") {
        safeLocalStorageSetItem("vitatakip_selected_symptoms_array", JSON.stringify(state.selectedSymptomsArray));
        if (typeof activeUserId !== "undefined" && activeUserId) {
          safeLocalStorageSetItem(`vitatakip_symptoms_${activeUserId}`, JSON.stringify(state.selectedSymptomsArray));
        }
      }
    } catch (_) {}
    return [...state.selectedSymptomsArray];
  }

  const list = Array.from(state.selectedSymptoms);
  state.selectedSymptomsArray = [...list];
  return list;
}

function getSelectedSymptoms() {
  return syncSelectedSymptomsFromDOM();
}

function canRunClinicalAnalysis() {
  const profile = getUserProfile(); // Zorunlu taban
  const hasCurrentLab = checkCurrentLabExists();
  const hasArchivedLab = checkArchivedLabExists();
  const selectedSymptoms = getSelectedSymptoms();
  const hasSymptoms = Array.isArray(selectedSymptoms) && selectedSymptoms.length > 0;
  return Boolean(profile && (hasCurrentLab || hasArchivedLab || hasSymptoms));
}

function hasAnySymptomOrLabForClinicalAnalysis() {
  return canRunClinicalAnalysis();
}

function generateClinicalAnalysis({ profile, hasCurrentLab, hasArchivedLab, selectedSymptoms } = {}) {
  const activeProfile = profile || getUserProfile();
  const symptomsList = Array.isArray(selectedSymptoms) ? selectedSymptoms : getSelectedSymptoms();
  const currLabFlag = typeof hasCurrentLab === "boolean" ? hasCurrentLab : checkCurrentLabExists();
  const archLabFlag = typeof hasArchivedLab === "boolean" ? hasArchivedLab : checkArchivedLabExists();

  if (!state.user) {
    state.user = { ...activeProfile };
  }

  // Tam CDSS kural motorunu çalıştır (5 senaryonun tamamını kapsar)
  executeCDSSRules();

  const labCtx = window.VitaLabInsights ? VitaLabInsights.cdssInputs() : null;
  const recentHistorySummary = getRecentHistoricalLabsSummary(3);
  const archVals = recentHistorySummary.archivedLatestValues || {};
  const labs = {
    ...(archVals || {}),
    ...(state.labValues || {}),
    ...(labCtx && labCtx.values ? Object.fromEntries(Object.entries(labCtx.values).filter(([, v]) => v !== null && v !== undefined && v !== "")) : {})
  };

  const parsedAge = Number.isFinite(Number(activeProfile.age)) && Number(activeProfile.age) >= 1 && Number(activeProfile.age) <= 110
    ? Number(activeProfile.age)
    : 28;
  const parsedGender = activeProfile.gender === "E" ? "E" : "K";

  let parsedCreatinine = null;
  const rawCr = labs.creatinine ?? state.labValues?.creatinine ?? archVals.creatinine ?? null;
  if (rawCr !== null && rawCr !== undefined && rawCr !== "") {
    const crNum = Number(String(rawCr).replace(",", "."));
    if (Number.isFinite(crNum) && crNum > 0 && crNum <= 25) {
      parsedCreatinine = crNum;
    }
  }

  const triageData = evaluateAnamnesisTriageAndEgfr({
    symptomsList,
    age: parsedAge,
    gender: parsedGender,
    creatinine: parsedCreatinine,
    labs
  });

  const selectedSymptomDetails = symptomsList.map(key => {
    const meta = (typeof ANAMNESIS_DICTIONARY !== "undefined" && ANAMNESIS_DICTIONARY[key]) ? ANAMNESIS_DICTIONARY[key] : null;
    return {
      key,
      symptomName: meta ? meta.symptomName : key,
      medicalName: meta ? meta.medicalName : key,
      question: meta ? meta.question : key,
      catId: meta ? meta.catId : null,
      nutrients: meta && Array.isArray(meta.nutrients) ? [...meta.nutrients] : [],
      suggestedLab: meta ? (meta.suggestedLab || "") : ""
    };
  });

  let activeScenario = 1;
  if (!currLabFlag && !archLabFlag && symptomsList.length > 0) activeScenario = 1;
  else if ((currLabFlag || archLabFlag) && symptomsList.length === 0) activeScenario = 2;
  else if (currLabFlag && recentHistorySummary.recordCount < 2 && symptomsList.length > 0) activeScenario = 3;
  else if (currLabFlag && archLabFlag && recentHistorySummary.recordCount >= 2 && symptomsList.length > 0) activeScenario = 4;
  else if (!currLabFlag && archLabFlag && symptomsList.length > 0) activeScenario = 5;

  const anamnesisAndEgfrState = {
    activeScenario,
    hasCurrentLab: currLabFlag,
    hasArchivedLab: archLabFlag,
    selectedSymptoms: [...symptomsList],
    selectedSymptomDetails,
    symptomCount: symptomsList.length,
    profileSnapshot: {
      age: parsedAge,
      gender: parsedGender,
      height: activeProfile.height || 170,
      weight: activeProfile.weight || 68,
      bmi: activeProfile.bmi || null,
      chronic: Array.isArray(activeProfile.chronic) ? [...activeProfile.chronic] : [],
      medications: Array.isArray(activeProfile.medications) ? [...activeProfile.medications] : []
    },
    currentLabs: { ...labs },
    recentLabHistory: recentHistorySummary.recentRecords,
    historicalComparisons: recentHistorySummary.comparisons,
    egfrData: {
      age: parsedAge,
      gender: parsedGender,
      creatinine: parsedCreatinine,
      egfr: triageData.egfrResult ? triageData.egfrResult.egfr : null,
      stage: triageData.egfrResult ? (triageData.egfrResult.stage || triageData.egfrResult.stageCode) : null,
      stageCode: triageData.egfrResult ? (triageData.egfrResult.stageCode || triageData.egfrResult.stage) : null,
      stageName: triageData.egfrResult ? (triageData.egfrResult.stageName || triageData.egfrResult.desc) : null,
      riskLevel: triageData.egfrResult ? triageData.egfrResult.riskLevel : null,
      clinicalNote: triageData.egfrResult ? (triageData.egfrResult.clinicalNote || triageData.egfrResult.interpretationNote) : null
    },
    triage: {
      triageLevel: triageData.triageLevel,
      triageCode: triageData.triageCode,
      triageSummary: triageData.triageSummary,
      triageReasons: [...(triageData.triageReasons || [])]
    },
    analyzedAt: new Date().toISOString()
  };

  state.anamnesisTriageState = anamnesisAndEgfrState;
  window.vitaAnamnesisTriageState = anamnesisAndEgfrState;
  if (state.lastCDSS && typeof state.lastCDSS === "object") {
    state.lastCDSS.activeScenario = activeScenario;
    state.lastCDSS.anamnesisTriageState = anamnesisAndEgfrState;
    state.lastCDSS.selectedSymptoms = [...symptomsList];
    state.lastCDSS.egfrData = anamnesisAndEgfrState.egfrData;
    state.lastCDSS.recentLabHistory = recentHistorySummary.recentRecords;
    state.lastCDSS.historicalComparisons = recentHistorySummary.comparisons;
  }
  if (typeof saveState === "function") {
    saveState();
  }

  renderNeyimInlineTriageResult(triageData, {
    age: parsedAge,
    gender: parsedGender,
    creatinine: parsedCreatinine,
    symptomsList,
    recentHistorySummary
  });

  return anamnesisAndEgfrState;
}

function evaluateClinicalAnalysisState() {
  if (typeof invalidateClinicalAnalysisCache === "function") {
    invalidateClinicalAnalysisCache({ clearDOM: true });
  } else if (typeof clearClinicalAnalysisDOMContainers === "function") {
    clearClinicalAnalysisDOMContainers();
  }

  const profile = getUserProfile();
  const hasCurrentLab = checkCurrentLabExists();
  const hasArchivedLab = checkArchivedLabExists();
  const selectedSymptoms = getSelectedSymptoms();
  const isCompletelyEmpty = !hasCurrentLab && !hasArchivedLab && (!selectedSymptoms || selectedSymptoms.length === 0);

  const emptyStateEl = document.getElementById("cdssResultsEmptyState") || document.getElementById("clinical-empty-state");
  const overviewEl = document.getElementById("cdssResultsOverview");
  const resultsContainerEl = document.getElementById("cdssResultContainer") || document.getElementById("clinical-results-content");
  const triageBannerEl = document.getElementById("clinicalResultsTriageEgfrBanner");

  if (isCompletelyEmpty) {
    if (typeof saveState === "function") {
      saveState();
    }
    if (resultsContainerEl) {
      resultsContainerEl.classList.add("hidden");
      resultsContainerEl.classList.remove("show");
      resultsContainerEl.style.display = "none";
    }
    if (overviewEl) {
      overviewEl.classList.add("hidden");
      overviewEl.classList.remove("show");
      overviewEl.style.display = "none";
    }
    if (triageBannerEl) {
      triageBannerEl.classList.add("hidden");
      triageBannerEl.classList.remove("show");
      triageBannerEl.style.display = "none";
      triageBannerEl.innerHTML = "";
    }
    if (emptyStateEl) {
      emptyStateEl.classList.remove("hidden");
      emptyStateEl.classList.add("show");
      emptyStateEl.style.display = "block";
      const gotoBtn = document.getElementById("btn-goto-symptoms-error");
      if (gotoBtn) {
        gotoBtn.onclick = () => {
          if (typeof navigateToModule === "function") navigateToModule("module-neyim-var");
          else if (typeof navigateToView === "function") navigateToView("view-neyim");
        };
      }
    }
    return false;
  }

  // En az bir klinik veri kaynağı var: Boş durum ekranını kesin olarak gizle ve sonuç konteynerini aç
  if (emptyStateEl) {
    emptyStateEl.classList.add("hidden");
    emptyStateEl.classList.remove("show");
    emptyStateEl.style.setProperty("display", "none", "important");
  }
  if (overviewEl) {
    overviewEl.classList.remove("hidden");
    overviewEl.classList.add("show");
    overviewEl.style.display = "block";
  }
  if (resultsContainerEl) {
    resultsContainerEl.classList.remove("hidden");
    resultsContainerEl.classList.add("show");
    resultsContainerEl.style.display = "block";
  }

  generateClinicalAnalysis({ profile, hasCurrentLab, hasArchivedLab, selectedSymptoms });

  if (triageBannerEl && triageBannerEl.innerHTML.trim() !== "") {
    triageBannerEl.classList.remove("hidden");
    triageBannerEl.classList.add("show");
    triageBannerEl.style.display = "block";
  }

  ["lifeStageCard", "triageLabRecommendationsContainer", "cdssFindingsSection", "protocolRecommendationSection", "foodAlternativesSection"].forEach(secId => {
    const el = document.getElementById(secId);
    if (el && (secId !== "triageLabRecommendationsContainer" || el.innerHTML.trim() !== "")) {
      el.classList.remove("hidden");
      el.style.display = "block";
      el.removeAttribute("aria-hidden");
    }
  });

  return true;
}

window.getUserProfile = getUserProfile;
window.checkCurrentLabExists = checkCurrentLabExists;
window.checkArchivedLabExists = checkArchivedLabExists;
window.getSelectedSymptoms = getSelectedSymptoms;
window.canRunClinicalAnalysis = canRunClinicalAnalysis;
window.hasAnySymptomOrLabForClinicalAnalysis = hasAnySymptomOrLabForClinicalAnalysis;
window.generateClinicalAnalysis = generateClinicalAnalysis;
window.evaluateClinicalAnalysisState = evaluateClinicalAnalysisState;

function showClinicalResultsPage() {
  if (typeof navigateToView === "function") {
    navigateToView("view-clinical-results");
  }
  const allViews = ["view-home", "view-labs", "view-neyim", "view-clinical-results", "view-report", "view-settings"];
  allViews.forEach(viewId => {
    const viewEl = document.getElementById(viewId);
    if (!viewEl) return;
    if (viewId === "view-clinical-results") {
      viewEl.classList.remove("hidden");
      viewEl.classList.add("show", "active", "active-module");
      viewEl.style.display = "block";
      viewEl.removeAttribute("hidden");
      viewEl.setAttribute("aria-hidden", "false");
      viewEl.dataset.viewState = "show";
    } else {
      viewEl.classList.add("hidden");
      viewEl.classList.remove("show", "active", "active-module");
      viewEl.style.display = "none";
      viewEl.setAttribute("aria-hidden", "true");
      viewEl.dataset.viewState = "hidden";
    }
  });

  evaluateClinicalAnalysisState();
  window.scrollTo(0, 0);
}

function runCDSSAnalysis(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault();
  }
  const errBanner = document.getElementById("neyimTriageErrorBanner");
  if (errBanner) {
    errBanner.classList.add("hidden");
    errBanner.innerHTML = "";
  }
  const inlineNeyimRes = document.getElementById("neyimTriageEgfrResultContainer");
  if (inlineNeyimRes) {
    inlineNeyimRes.classList.add("hidden");
    inlineNeyimRes.innerHTML = "";
  }

  try {
    if (!state.user) {
      state.user = { ...defaultUserProfile };
    }

    // 0. Tahliller sayfasında girilmiş ancak henüz kaydedilmemiş güncel inputlar varsa state/localStorage'a kaydet
    if (typeof persistCurrentLabInputsToState === "function") {
      persistCurrentLabInputsToState({ silentUI: true });
    }

    // 1. Kullanıcının seçtiği tüm semptomları DOM ve state üzerinden senkronize et ve Array olarak state/localStorage'a kaydet
    const symptomsList = syncSelectedSymptomsFromDOM();
    state.selectedSymptomsArray = [...symptomsList];
    try {
      if (typeof safeLocalStorageSetItem === "function") {
        safeLocalStorageSetItem("vitatakip_selected_symptoms_array", JSON.stringify(symptomsList));
      }
    } catch (_) {}

    const btn = document.getElementById("btnRunCDSS");
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Anamnez Triyajı &amp; Klinik Karar Analizi Hazırlanıyor...</span>`;
    }

    // 2. Klinik analiz durumunu değerlendir ve 5 senaryodan uygun olanını çalıştırıp Klinik Analiz sayfasını aç
    showClinicalResultsPage();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-microchip"></i> <span>Anamnez Triyaj ve eGFR Analiz</span>`;
    }
    if (window.SoundEffects) SoundEffects.playSuccess();

    const triageInfo = state.anamnesisTriageState?.triage;
    const egfrInfo = state.anamnesisTriageState?.egfrData;
    if (triageInfo) {
      showToast(
        "Klinik Karar Analizi Hazır",
        `${triageInfo.triageLevel}${egfrInfo && egfrInfo.egfr ? ` · eGFR: ${egfrInfo.egfr} mL/dk (${egfrInfo.stageCode || egfrInfo.stage})` : ""}`,
        "success"
      );
    }
    return state.anamnesisTriageState || null;
  } catch (err) {
    console.error("Anamnez Triyaj ve eGFR Analiz hatası:", err);
    const btn = document.getElementById("btnRunCDSS");
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-microchip"></i> <span>Anamnez Triyaj ve eGFR Analiz</span>`;
    }
    showClinicalResultsPage();
    return null;
  }
}

window.runCDSSAnalysis = runCDSSAnalysis;
window.handleAnamnesisTriageAndEgfrAnalysis = runCDSSAnalysis;
window.showClinicalResultsPage = showClinicalResultsPage;

// DOM hazır olduğunda #btnRunCDSS ve #btn-goto-symptoms-error onclick tetikleyicilerini koru ve bağla
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("btnRunCDSS");
  if (btn) {
    btn.setAttribute("onclick", "if(window.SoundEffects) SoundEffects.playClick(); runCDSSAnalysis(event)");
  }
  const gotoBtn = document.getElementById("btn-goto-symptoms-error");
  if (gotoBtn) {
    gotoBtn.addEventListener("click", () => {
      if (typeof navigateToModule === "function") navigateToModule("module-neyim-var");
      else if (typeof navigateToView === "function") navigateToView("view-neyim");
    });
  }
  hydrateNeyimInlineInputsFromState();
});


    function executeCDSSRules() {
      state.lastCDSS = null;
      if (typeof clearClinicalAnalysisDOMContainers === "function") {
        clearClinicalAnalysisDOMContainers();
      }
      if (typeof recalculateUserBmi === "function") {
        recalculateUserBmi();
      }
      const p = typeof safeStructuredClone === "function"
        ? safeStructuredClone(state.user || defaultUserProfile)
        : { ...(state.user || defaultUserProfile) };
      const weight = Number.isFinite(Number(p.weight)) && Number(p.weight) > 0 ? Number(p.weight) : 68;
      const age = Number.isFinite(Number(p.age)) && Number(p.age) > 0 ? Number(p.age) : 28;
      const gender = p.gender === 'E' ? 'E' : 'K';
      const lifeStage = getLifeStageProfile(age);

      if (!state.labValues || typeof state.labValues !== "object") {
        state.labValues = typeof createEmptyLabValuesState === "function"
          ? createEmptyLabValuesState()
          : { d3: null, b12: null, ferritin: null, mg: null, ca: null, zinc: null, creatinine: null, folate: null, alt: null, hb: null, mcv: null, crp: null };
      }
      if (!(state.selectedSymptoms instanceof Set)) {
        state.selectedSymptoms = new Set(Array.isArray(state.selectedSymptoms) ? state.selectedSymptoms : (Array.isArray(state.selectedSymptomsArray) ? state.selectedSymptomsArray : []));
      }

      const chronicSelected = Array.isArray(p.chronic) ? [...p.chronic] : [];
      const customMedsList = Array.isArray(p.medications) ? [...p.medications] : [];
      const hasKidneyChronic = chronicSelected.includes("kidney");
      const hasBloodThinner = chronicSelected.includes("blood_thinner");
      const hasPPI = chronicSelected.includes("ppi");
      const hasMetformin = chronicSelected.includes("metformin");
      const hasDiuretic = chronicSelected.includes("diuretic");
      const activity = p.activity || "sedentary";

      // Farklı tarihlerde girilen göstergeler birleştirilir (her gösterge için en güncel ölçüm + kendi referansı).
      const labCtx = window.VitaLabInsights ? VitaLabInsights.cdssInputs() : null;
      const rawLabs = labCtx && labCtx.values ? labCtx.values : (state.labValues || {});
      const recentLabSummary = getRecentHistoricalLabsSummary(3);
      const archVals = recentLabSummary.archivedLatestValues || {};
      const archRefs = recentLabSummary.archivedReferences || {};
      const effRefs = {
        ...archRefs,
        ...(state.labReferences || {}),
        ...(labCtx && labCtx.references ? labCtx.references : {})
      };

      const safeNum = val => {
        if (val === null || val === undefined || val === "") return null;
        const n = Number(String(val).replace(",", "."));
        return Number.isFinite(n) && n > 0 ? n : null;
      };

      const currentFormLabs = {
        d3: safeNum(rawLabs.d3 ?? state.labValues?.d3),
        b12: safeNum(rawLabs.b12 ?? state.labValues?.b12),
        ferritin: safeNum(rawLabs.ferritin ?? state.labValues?.ferritin),
        mg: safeNum(rawLabs.mg ?? state.labValues?.mg),
        ca: safeNum(rawLabs.ca ?? state.labValues?.ca),
        zinc: safeNum(rawLabs.zinc ?? state.labValues?.zinc),
        creatinine: safeNum(rawLabs.creatinine ?? state.labValues?.creatinine),
        folate: safeNum(rawLabs.folate ?? state.labValues?.folate),
        alt: safeNum(rawLabs.alt ?? state.labValues?.alt),
        hb: safeNum(rawLabs.hb ?? state.labValues?.hb),
        mcv: safeNum(rawLabs.mcv ?? state.labValues?.mcv),
        crp: safeNum(rawLabs.crp ?? state.labValues?.crp)
      };

      const enteredCurrentKeys = Object.keys(currentFormLabs).filter(key => currentFormLabs[key] !== null);
      const hasCurrentLabs = enteredCurrentKeys.length > 0;
      const hasArchiveLabs = recentLabSummary.recordCount > 0 && Object.keys(archVals).length > 0;
      const hasNoCurrentLabs = !hasCurrentLabs && !hasArchiveLabs;

      // Senaryo 5 ve Senaryo 2 desteği: Güncel formda girilmemiş parametre varsa arşivdeki en son ölçümü referans al
      const labs = {
        d3: currentFormLabs.d3 ?? safeNum(archVals.d3),
        b12: currentFormLabs.b12 ?? safeNum(archVals.b12),
        ferritin: currentFormLabs.ferritin ?? safeNum(archVals.ferritin),
        mg: currentFormLabs.mg ?? safeNum(archVals.mg),
        ca: currentFormLabs.ca ?? safeNum(archVals.ca),
        zinc: currentFormLabs.zinc ?? safeNum(archVals.zinc),
        creatinine: currentFormLabs.creatinine ?? safeNum(archVals.creatinine),
        folate: currentFormLabs.folate ?? safeNum(archVals.folate),
        alt: currentFormLabs.alt ?? safeNum(archVals.alt),
        hb: currentFormLabs.hb ?? safeNum(archVals.hb),
        mcv: currentFormLabs.mcv ?? safeNum(archVals.mcv),
        crp: currentFormLabs.crp ?? safeNum(archVals.crp)
      };

      const enteredLabKeys = Object.keys(labs).filter(key => labs[key] !== null && Number.isFinite(labs[key]));
      const d3 = labs.d3, b12 = labs.b12, ferritin = labs.ferritin, mg = labs.mg, ca = labs.ca, zinc = labs.zinc, creatinine = labs.creatinine, folate = labs.folate, alt = labs.alt, hb = labs.hb, mcv = labs.mcv, crp = labs.crp;

      const findings = [];
      const lifestyleKnown = [p.dietPattern, p.fishPerWeek, p.redMeatPerWeek, p.sunExposureDaily].some(v => v && v !== "unspecified");
      if (lifestyleKnown) {
        const dietLabel = ({ omnivore: "karışık beslenme", vegetarian: "vejetaryen", vegan: "vegan" })[p.dietPattern] || "belirtilmemiş beslenme biçimi";
        const fishLabel = ({ "0": "balık tüketimi yok", "1": "haftada 1 kez balık", "2-3": "haftada 2–3 kez balık", "4+": "haftada 4+ kez balık" })[p.fishPerWeek] || "balık sıklığı belirtilmemiş";
        const meatLabel = ({ "0": "kırmızı et tüketimi yok", "1": "haftada 1 kez kırmızı et", "2-3": "haftada 2–3 kez kırmızı et", "4+": "haftada 4+ kez kırmızı et" })[p.redMeatPerWeek] || "kırmızı et sıklığı belirtilmemiş";
        const sunLabel = ({ lt10: "günde 10 dakikadan az", "10-20": "günde 10–20 dakika", "20-30": "günde 20–30 dakika", gt30: "günde 30 dakikadan fazla" })[p.sunExposureDaily] || "güneşlenme süresi belirtilmemiş";
        findings.push({ title: "Yaşam tarzı ve beslenme", detail: `${dietLabel}; ${fishLabel}; ${meatLabel}; ${sunLabel}.` });
      }
      const contraindications = [];
      const protocol = [];
      const triageLabRequests = [];

      const evalKey = (key, value) => KDSSRuleEngine.evaluate(key, value, gender, effRefs[key] || '');
      const d3EvalResult = evalKey('d3', d3);
      const b12EvalResult = evalKey('b12', b12);
      const ferEvalResult = evalKey('ferritin', ferritin);
      const mgEvalResult = evalKey('mg', mg);
      const caEvalResult = evalKey('ca', ca);
      const znEvalResult = evalKey('zinc', zinc);
      const folEvalResult = evalKey('folate', folate);
      const hbEvalResult = evalKey('hb', hb);
      const mcvEvalResult = evalKey('mcv', mcv);
      const crpEvalResult = evalKey('crp', crp);

      const egfrResult = (age >= 18 && creatinine !== null && Number.isFinite(creatinine) && creatinine > 0)
        ? calculateCKDEPI_eGFR(creatinine, age, gender)
        : null;
      const hasEgfrRisk = egfrResult && (egfrResult.riskLevel === 'high' || egfrResult.riskLevel === 'severe');
      const isPediatric = age < 18;
      const missingLabReferences = enteredLabKeys.filter(key => {
        const ref = effRefs[key] || "";
        if (window.VitaLabEvidence && VitaLabEvidence.handles(key)) { const parsed = VitaLabEvidence.parseReference(key, ref); return !(parsed && parsed.compatible); }
        return !isVitaLabReferenceCompatible(key, ref) || !parseVitaLabReferenceRange(ref);
      });
      if (missingLabReferences.length) {
        const labLabels = { d3: "D3", b12: "B12", ferritin: "Ferritin", mg: "Magnezyum", ca: "Kalsiyum", zinc: "Çinko", creatinine: "Kreatinin", folate: "Folat", alt: "ALT", hb: "Hemoglobin", mcv: "MCV", crp: "CRP" };
        findings.push({ title: "Referans aralığı kaydı yok", detail: `Laboratuvar aralığı girilmeyen veya birimi doğrulanamayan ölçümler (${missingLabReferences.length}): ${missingLabReferences.map(key => labLabels[key] || key).join(", ")}. Bunlar için genel aralık kullanıldı; takviye adayı yalnızca laboratuvar referansının altında olan veya kaynaklı klinik eşiği karşılayan değerlerde oluşur.` });
      }
      const inRefParameters = [];
      [["D vitamini", "d3", d3, d3EvalResult, "ng/mL"], ["B12", "b12", b12, b12EvalResult, "pg/mL"], ["Ferritin", "ferritin", ferritin, ferEvalResult, "ng/mL"], ["Magnezyum", "mg", mg, mgEvalResult, "mg/dL"],
        ["Kalsiyum", "ca", ca, caEvalResult, "mg/dL"], ["Çinko", "zinc", zinc, znEvalResult, "µg/dL"], ["Folat", "folate", folate, folEvalResult, "ng/mL"],
        ["Hemoglobin", "hb", hb, hbEvalResult, "g/dL"], ["MCV", "mcv", mcv, mcvEvalResult, "fL"], ["CRP", "crp", crp, crpEvalResult, "mg/L"]].forEach(([label, key, value, ev, unit]) => {
        if (value === null || value === undefined || !ev || !ev.status) return;
        const note = ev.notes && ev.notes.length ? ` ${ev.notes.join(" ")}` : "";
        if (ev.status === "urgent") contraindications.push({ title: `⚠️ ${label}: acil klinik değerlendirme gerekli`, detail: `${label} ${value}: ${ev.message}` });
        else if (ev.status === "not_assessable") findings.push({ title: `${label}: değerlendirilemedi`, detail: ev.message + note });
        else if (ev.status !== "in_ref") findings.push({ title: `${label}: ${ev.statusText}`, detail: `${label} ${value}: ${ev.message}${note}` });
        else inRefParameters.push(`${label}: ${value} ${unit} (${ev.statusText || "Referans aralığında"})`);
      });

      // Senaryo 2 (Sadece Tahlil Var + Belirti Seçilmemiş): Referans aralığındaki parametreleri de açıkça listele
      if (inRefParameters.length > 0 && state.selectedSymptoms.size === 0) {
        findings.push({
          title: `Referans Aralığında Saptanan Laboratuvar Parametreleri (${inRefParameters.length} Parametre)`,
          detail: `Belirti seçilmeden gerçekleştirilen tahlil odaklı analizde fizyolojik referans sınırları içerisinde bulunan değerleriniz: ${inRefParameters.join(" · ")}.`
        });
      }

      (labCtx?.stale || []).forEach(item => {
        findings.push({ title: `${item.label}: ölçüm güncel değil`, detail: `${item.label} ${item.value} ${item.unit} değeri ${item.ageDays} gün önce (${item.date}) ölçülmüş. 90 günden eski ölçümler arşiv referansı olarak gösterilir; güncel değerlendirme için tekrar ölçüm gerekebilir.` });
      });
      if (labCtx?.multiDate) {
        findings.push({ title: "Farklı tarihli tahliller birlikte değerlendirildi", detail: `Analiz, her gösterge için en güncel ölçümü kullanır: ${labCtx.used.map(u => `${u.label}${u.date ? ` (${u.date})` : ""}`).join(", ")}. Farklı günlerde ölçülen değerler yan yana yorumlanırken zaman farkı göz önünde bulundurulmalıdır.` });
      }
      if (recentLabSummary.recordCount >= 2 && recentLabSummary.comparisons.length > 0) {
        findings.push({
          title: `Geçmiş Tahlil Trend Analizi (Son ${recentLabSummary.recordCount} Kayıt: ${recentLabSummary.dates.join(" → ")})`,
          detail: `Tarih sırasına göre en güncel son ${recentLabSummary.recordCount} tahlil kaydınız otomatik karşılaştırıldı: ${recentLabSummary.comparisons.map(c => `${c.label}: ${c.chainText}`).join(" | ")}.`
        });
      }

      // 5 SENARYO DURUM YÖNETİMİ VE ARŞİV / ÇAPRAZ KORELASYON KONTROLÜ
      if (!hasCurrentLabs && hasArchiveLabs) {
        // SENARYO 5: Yeni Tahlil Yok + Sadece Eski Tahlil Arşivi + Yeni Belirti Var (veya Arşiv Tahlil Analizi)
        const archDates = recentLabSummary.archivedValueDates || {};
        const archivedMatches = [];
        const archiveNutrientKeyMap = {
          Demir: [{ key: "ferritin", label: "Ferritin", unit: "ng/mL" }, { key: "hb", label: "Hemoglobin", unit: "g/dL" }],
          B12: [{ key: "b12", label: "B12", unit: "pg/mL" }],
          Folat: [{ key: "folate", label: "Folat", unit: "ng/mL" }],
          D3_K2: [{ key: "d3", label: "25(OH)D3", unit: "ng/mL" }, { key: "ca", label: "Kalsiyum", unit: "mg/dL" }],
          Kalsiyum: [{ key: "ca", label: "Kalsiyum", unit: "mg/dL" }],
          Magnezyum: [{ key: "mg", label: "Magnezyum", unit: "mg/dL" }],
          Çinko: [{ key: "zinc", label: "Çinko", unit: "µg/dL" }]
        };
        state.selectedSymptoms.forEach(symKey => {
          const meta = ANAMNESIS_DICTIONARY[symKey];
          if (!meta) return;
          const matchedParts = [];
          (meta.nutrients || []).forEach(nut => {
            const defs = archiveNutrientKeyMap[nut] || [];
            defs.forEach(def => {
              const aVal = archVals[def.key];
              if (aVal !== undefined && aVal !== null && Number.isFinite(aVal)) {
                const aEval = KDSSRuleEngine.evaluate(def.key, aVal, gender, archRefs[def.key] || "");
                const statusNote = aEval && (aEval.isLow || aEval.isBorderline || aEval.status === "below_ref")
                  ? `düşük/sınırda (${aEval.statusText || "Referans altı"})`
                  : (aEval?.statusText || "Referans aralığında");
                matchedParts.push(`${def.label}: ${aVal} ${def.unit} (${archDates[def.key] || "Arşiv"} · ${statusNote})`);
              }
            });
          });
          if (matchedParts.length > 0) {
            archivedMatches.push(`${meta.symptomName || meta.medicalName}: ${matchedParts.join(", ")}`);
          }
        });
        findings.push({
          title: `Arşiv Tahlil–Semptom Korelasyonu (Son ${recentLabSummary.recordCount} Geçmiş Tahlil Kaydı Referans Alındı)`,
          detail: archivedMatches.length > 0
            ? `Yeni tahlil girilmediği için arşivdeki en son tahlil kayıtlarınız (${recentLabSummary.dates.join(", ")}) yeni seçtiğiniz belirtilerle çapraz eşleştirildi: ${archivedMatches.join(" | ")}. Güncel biyokimyasal doğrulama için kontrol testlerinin hekimle değerlendirilmesi önerilir.`
            : `Yeni tahlil girilmedi; arşivdeki son ${recentLabSummary.recordCount} tahlil kaydı (${recentLabSummary.dates.join(", ")}) baz alındı. Seçilen semptomların güncel biyokimyasal karşılığı için önerilen testlerin hekimle görüşülmesi önerilir.`
        });
      } else if (hasNoCurrentLabs) {
        // SENARYO 1: Tahlil Yok + Sadece Belirti Var
        const chronicSummary = chronicSelected.length > 0 || customMedsList.length > 0
          ? `Kayıtlı kronik durum/ilaçlar: ${[...chronicSelected, ...customMedsList].join(", ")}.`
          : "Kayıtlı kronik hastalık veya düzenli ilaç bildirimi yok.";
        findings.push({
          title: "Profil ve Semptom Bazlı Klinik Analiz (Laboratuvar Tahlili Bekleniyor)",
          detail: `Güncel veya arşivde kayıtlı kan tahlili bulunmadığından analiz motoru tamamen profil verileriniz (Yaş: ${age}, Biyolojik Cinsiyet: ${gender === "E" ? "Erkek" : "Kadın"}, ${chronicSummary}) ve seçtiğiniz ${state.selectedSymptoms.size} belirti üzerinden çalıştırıldı. Seçilen belirtilere göre hekimden talep edilmesi önerilen spesifik testler yukarıdaki 'Doktorla Görüşmede Değerlendirilecek Test ve İncelemeler' bölümünde listelenmiştir.`
        });
      } else if (hasCurrentLabs && state.selectedSymptoms.size === 0) {
        // SENARYO 2: Sadece Tahlil Var + Belirti Seçilmemiş
        findings.push({
          title: "Laboratuvar ve Böbrek Fonksiyon Odaklı Değerlendirme (Aktif Belirti Seçilmedi)",
          detail: `Belirti seçimi yapılmadan girilen ${enteredCurrentKeys.length} laboratuvar parametresi profil çarpanlarınız (Yaş: ${age}, Cinsiyet: ${gender === "E" ? "Erkek" : "Kadın"}) ile analiz edildi. Referans dışı veya sınırda saptanan biyobelirteçler için doğal besin destekleri ve hekimle görüşülecek takip seçenekleri aşağıda listelenmiştir.`
        });
      }

      const hasHeadacheAndTremor = state.selectedSymptoms.has("headache") && state.selectedSymptoms.has("hand_tremor");
      const hasNeurologicSymptom = state.selectedSymptoms.has("hand_tremor") || state.selectedSymptoms.has("headache") || state.selectedSymptoms.has("numbness");
      if (isPediatric) {
        findings.push({ title: "Yaş grubu nedeniyle uzman değerlendirmesi", detail: "18 yaş altı kullanıcılar için yetişkin eGFR denklemi ve yetişkin takviye protokolleri kullanılmadı. Yaşa özgü klinik değerlendirme ve doz kararı çocuk/ergen sağlığı uzmanı tarafından yapılmalıdır." });
      }
      if (hasHeadacheAndTremor) {
        contraindications.push({ title: "Baş ağrısı + el titremesi birlikte bildirildi", detail: "Bu belirti birlikteliği tek başına vitamin eksikliğini göstermez. Başlangıç zamanı, şiddet, ilaçlar ve eşlik eden belirtiler doktor tarafından değerlendirilmelidir. Ani/çok şiddetli baş ağrısı, güçsüzlük, konuşma bozukluğu, bilinç değişikliği veya nöbet varsa acil tıbbi yardım alın." });
      } else if (hasNeurologicSymptom) {
        findings.push({ title: "Nörolojik belirti kaydı", detail: "Belirti tek başına vitamin eksikliği tanısı değildir. Başlangıç, süre, şiddet, ilaçlar ve eşlik eden belirtiler doktor görüşmesinde değerlendirilmelidir. Ani yeni güçsüzlük, konuşma bozukluğu, bilinç değişikliği veya çok şiddetli baş ağrısı varsa acil yardım alın." });
      }

      if (state.selectedSymptoms.has("dark_nail_change")) {
        contraindications.push({
          title: "⚠️ Tırnakta Yeni Koyu Çizgi / Pigmente Lezyon (Dermatoloji Ayırıcı Tanı Uyarısı)",
          detail: "Tırnakta yeni beliren, genişleyen veya tırnak etine yayılan (Hutchinson belirtisi) koyu/kahverengi-siyah çizgi vitamin eksikliği ile açıklanamaz; subungual melanom veya melanositik lezyonların dışlanması için dermatoskopik dermatoloji muayenesi gerektirir."
        });
      }
      if (state.selectedSymptoms.has("balance_difficulty")) {
        contraindications.push({
          title: "⚠️ Denge ve Yürüme Güçlüğü (Ataksi / Nörolojik Değerlendirme Uyarısı)",
          detail: "Yürüme dengesizliği; ağır B12 eksikliğine bağlı omurilik arka kordon etkilenmesi (Subakut Kombine Dejenerasyon), serebellar veya vestibüler nedenlerle ilişkili olabilir. Tek başına vitamin takviyesiyle izlenmemeli; dahiliye/nöroloji muayenesi yapılmalıdır."
        });
      }
      if (state.selectedSymptoms.has("unexplained_swelling")) {
        contraindications.push({
          title: "⚠️ Bacak / Ayak Bileğinde Açıklanamayan Şişlik (Pretibial Ödem Uyarısı)",
          detail: "Alt ekstremite ödemi vitamin eksikliği bulgusu değildir; böbrek fonksiyonu (Kreatinin, eGFR, idrarda protein), karaciğer sentez işlevi (Albümin, ALT), kalp yetmezliği, tiroid veya venöz yetmezlik açısından dahiliye hekimi tarafından değerlendirilmelidir."
        });
      }
      if (state.selectedSymptoms.has("easy_bruising")) {
        contraindications.push({
          title: "⚠️ Kolay Morarma / Ekimoz (Koagülasyon & Trombosit Uyarısı)",
          detail: `Sebepsiz veya hafif travmayla oluşan geniş morluklar${hasBloodThinner ? " (özellikle kan sulandırıcı/antikoagülan kullanımı varlığında)" : ""} C vitamini eksikliğinden önce Tam Kan Sayımı (Trombosit) ve pıhtılaşma testleri (PT/INR, aPTT) ile dahiliye hekimince değerlendirilmelidir.`
        });
      }

      const hasHypercalcemiaRisk = ca !== null && ca !== undefined && (ca > 10.2 || caEvalResult.isHigh);
      if (hasHypercalcemiaRisk) {
        contraindications.push({
          title: `⛔ HİPERKALSEMİ GÜVENLİK KİLİDİ AKTİF (Serum Kalsiyum: ${ca} mg/dL)`,
          detail: "Serum kalsiyum düzeyiniz referans üst sınırının (>10,2 mg/dL) üzerindedir. Hiperkalsemi varlığında D vitamini (25-OH D3 düşük olsa bile) ve Kalsiyum takviyesi kesin kontrendikedir; primer hiperparatiroidizm veya diğer hiperkalsemi nedenleri açısından PTH, fosfor ve albümin ile dahiliye/endokrinoloji değerlendirmesi gerekir."
        });
      }
      const hasKidneyRisk = hasKidneyChronic || (creatinine !== null && creatinine > (gender === 'E' ? 1.25 : 1.10)) || hasEgfrRisk;
      const hasHepaticRisk = (alt !== null && alt !== undefined && alt > 50);

      if (creatinine !== null && egfrResult) {
        findings.push({
          title: `Renal Fonksiyon & CKD-EPI (2021) eGFR: ${egfrResult.egfr} mL/dk/1.73m² (Evre ${egfrResult.stage})`,
          detail: `Serum kreatinin düzeyiniz (${creatinine} mg/dL) ve profil verilerinize göre glomerüler filtrasyon hızınız ${egfrResult.egfr} mL/dk/1.73m² (${egfrResult.desc}) olarak hesaplanmıştır.`
        });
      } else if (!isPediatric) {
        findings.push({
          title: "Laboratuvar Tahlili Bekleniyor — Tahlil girilmediği için böbrek filtrasyonu hesaplanamadı.",
          detail: "Böbrek Değerlendirmesi: Laboratuvar Tahlili Bekleniyor — Tahlil girilmediği için böbrek filtrasyonu hesaplanamadı. Güncel kreatinin tahlili bulunmadığı için böbrek süzme analizi yapılamadı; takviye planlamasından önce rutin testlerin yapılması önerilir."
        });
      }

      if (hasHepaticRisk) {
        contraindications.push({
          title: "⚠️ Hepatik Güvenlik Uyarısı (Hekim Kontrolü Gerekli) - ALT > 50 U/L",
          detail: `Serum ALT (Alanin Aminotransferaz) düzeyiniz ${alt} U/L olarak saptanmıştır. Karaciğer metabolik yükünü korumak adına yağda çözünen vitamin (A, D, E, K) yüklemeleri ve yüksek doz takviyeler yalnızca uzman hekim kontrolünde değerlendirilmelidir.`
        });
        findings.push({
          title: `⚠️ Hepatik Güvenlik Uyarısı (Hekim Kontrolü Gerekli): ALT (${alt} U/L)`,
          detail: `ALT enziminiz 50 U/L referans eşiğinin üzerindedir; karaciğerde metabolize olan ve depolanan yağda çözünen vitaminlerin yüksek doz yüklemesinden kaçınılmalı ve gastroenteroloji/dahiliye hekimine danışılmalıdır.`
        });
      }

      if (hasKidneyRisk) {
        contraindications.push({
          title: "⛔ BÖBREK EMNİYET KİLİDİ AKTİF (RENAL RİSK & eGFR FİLTRESİ)",
          detail: "Böbrek hastalığı veya böbrek işleviyle ilgili risk bildirildi. Bu nedenle sistem kreatin/magnezyum/mineral dozu önermez; ürün ve testler doktor tarafından birlikte değerlendirilmelidir."
        });
      }

      if (typeof parseKidneyFunctionAndCompareMedications === "function") {
        const kidneyMedSafety = parseKidneyFunctionAndCompareMedications(
          { creatinine: creatinine, egfr: egfrResult ? egfrResult.egfr : null },
          { triggerSource: "cdss_execute", renderUI: false }
        );
        if (kidneyMedSafety && Array.isArray(kidneyMedSafety.warnings)) {
          kidneyMedSafety.warnings.forEach(w => {
            if (w.severity === "critical" || w.severity === "warning") {
              contraindications.push({
                title: w.title,
                detail: `${w.mechanism} ${w.recommendation}`
              });
            } else {
              findings.push({
                title: w.title,
                detail: `${w.mechanism} ${w.recommendation}`
              });
            }
          });
        }
      }

      if (hasBloodThinner) {
        contraindications.push({
          title: "⚠️ KAN SULANDIRICI (ANTİKOAGÜLAN) GÜVENLİK FİLTRESİ AKTİF",
          detail: "Kan sulandırıcı/antikoagülan kullanımı bildirildi. İlaçlar aynı etkileşime sahip olmadığından ürün adı ve etken madde doktor/eczacı tarafından kontrol edilmelidir; sistem D3/K2 formu veya doz seçmez."
        });
      }

      const isFerritinLow = ferEvalResult.isLow || ferEvalResult.isBorderline || ferEvalResult.status === "below_ref";
      const isB12Low = b12EvalResult.isLow || b12EvalResult.isBorderline || b12EvalResult.status === "below_ref";
      const isFolateLow = folEvalResult.isLow || folEvalResult.isBorderline || folEvalResult.status === "below_ref";
      const isD3Low = d3EvalResult.isLow || d3EvalResult.isBorderline || d3EvalResult.status === "below_ref";
      const isMgLow = mgEvalResult.isLow || mgEvalResult.isBorderline || mgEvalResult.status === "below_ref";
      const isZnLow = znEvalResult.isLow || znEvalResult.isBorderline || znEvalResult.status === "below_ref";

      const ironLowish = ferritin !== null && isFerritinLow;
      const anemia = hb !== null && hbEvalResult.clinical?.level === "low_likely";
      if (anemia) {
        const mcvBelow = mcv !== null && mcvEvalResult.refStatus === "below";
        const mcvAbove = mcv !== null && mcvEvalResult.refStatus === "above";
        if (mcvBelow) findings.push({ title: "Düşük hemoglobin + düşük MCV (mikrositer örüntü)", detail: `${ironLowish ? "Ferritin de düşük/sınırda olduğundan demir eksikliği anemisi olasılığı güçlenir; " : "Ferritin düşük görünmüyor; "}talasemi taşıyıcılığı, kronik hastalık ve kan kaybı da olabilir. Hekim değerlendirmesi gerekir.` });
        else if (mcvAbove) findings.push({ title: "Düşük hemoglobin + yüksek MCV (makrositer örüntü)", detail: "B12 veya folat eksikliği, alkol, karaciğer, tiroid ve bazı ilaçlar akla gelir. Folat takviyesi B12 eksikliğini maskeleyebileceğinden B12 durumu önce hekimle değerlendirilmelidir." });
        else if (mcv !== null) findings.push({ title: "Düşük hemoglobin + normal MCV (normositer örüntü)", detail: `Kronik hastalık, kanama, böbrek hastalığı veya erken/karma eksiklikler akla gelir.${ironLowish ? " Ferritin düşük/sınırda: erken veya karma demir eksikliği olabilir." : ""} Hekim değerlendirmesi gerekir.` });
        else findings.push({ title: "Düşük hemoglobin, MCV girilmemiş", detail: "Kansızlığın türünü ayırt etmek için tam kan sayımındaki MCV değerini de ekleyin; hekim değerlendirmesi gerekir." });
      } else if (ironLowish && hb !== null) {
        findings.push({ title: "Ferritin düşük/sınırda, hemoglobin düşük değil", detail: "Anemi olmadan da demir depoları azalmış olabilir. Belirtiler, adet kanaması, beslenme ve emilimi etkileyen durumlar hekimle gözden geçirilmeli; takviye kararı hekime bırakılmalıdır." });
      } else if (ironLowish && hb === null) {
        findings.push({ title: "Ferritin düşük/sınırda, hemogram girilmemiş", detail: "Ferritin yorumu için hemoglobin ve MCV (tam kan sayımı) gerekir; bu değerler girilmeden demir takviyesi konusunda karar verilmemelidir." });
      }
      if (crp !== null && crpEvalResult.refStatus === "above" && ferritin !== null) {
        findings.push({ title: "CRP yüksek: ferritin yorumu", detail: "CRP yüksekken ferritin enflamasyonla yükselir; WHO bu durumda 70 ng/mL altını demir eksikliği açısından anlamlı sayar. Normal görünen ferritin demir eksikliğini dışlamayabilir." });
      }
      if (isFerritinLow && (isB12Low || isFolateLow)) {
        findings.push({ title: "Demir ile B12/folat birlikte düşük", detail: "Karma eksiklik olasılığı vardır; MCV tek başına yanıltıcı olabilir (normal görünebilir). Hemogram ve gerekirse periferik yayma hekimle konuşulmalıdır." });
      }
      if (b12EvalResult.isBorderline || isB12Low) {
        if (folate !== null && !isFolateLow) findings.push({ title: "B12 düşük/sınırda, folat düşük değil", detail: "Folat yüksek veya normal olduğunda B12 eksikliğinin kansızlık bulgusu maskelenebilir. Folat takviyesine başlamadan önce B12 durumu hekimle değerlendirilmelidir." });
      }
      if (isD3Low && isMgLow) {
        findings.push({
          title: "D vitamini ve Magnezyum birlikte düşük (Kofaktör İlişkisi)",
          detail: "D vitamininin karaciğerde 25(OH)D ve böbrekte aktif 1,25(OH)₂D formuna dönüşmesini sağlayan hidroksilaz enzimleri magnezyum bağımlıdır. Magnezyum eksikliği düzeltilmeden verilen D vitamini tedavisinde biyolojik yanıt yetersiz (D vitamini direnci) kalabilir."
        });
      }

      const symptomCandidateFormKeys = new Set();

      state.selectedSymptoms.forEach(symKey => {
        const meta = ANAMNESIS_DICTIONARY[symKey];
        if (!meta) return;
        let confirmed = false;
        const inRefMatchedNutrients = [];

        if (meta.nutrients.includes("Demir")) {
          if (isFerritinLow) {
            findings.push({ title: `Belirti–Tahlil Çapraz Doğrulaması: ${meta.medicalName} & Ferritin (${ferritin} ng/mL)`, detail: `"${meta.question}" bildirimi ile düşük/sınırda ferritin (${ferritin} ng/mL) sonucu biyokimyasal olarak örtüşmektedir; hekim değerlendirmesi önerilir.` });
            confirmed = true;
          } else if (ferritin !== null) {
            inRefMatchedNutrients.push(`Ferritin (${ferritin} ng/mL - Referans aralığında)`);
          }
        }
        if (meta.nutrients.includes("B12")) {
          if (isB12Low) {
            findings.push({ title: `Belirti–Tahlil Çapraz Doğrulaması: ${meta.medicalName} & B12 (${b12} pg/mL)`, detail: `"${meta.question}" bildirimi ile düşük/sınırda B12 (${b12} pg/mL) sonucu biyokimyasal olarak örtüşmektedir; hekim değerlendirmesi önerilir.` });
            confirmed = true;
          } else if (b12 !== null) {
            inRefMatchedNutrients.push(`B12 (${b12} pg/mL - Referans aralığında)`);
          }
        }
        if (meta.nutrients.includes("Magnezyum")) {
          if (isMgLow) {
            findings.push({ title: `Belirti–Tahlil Çapraz Doğrulaması: ${meta.medicalName} & Magnezyum (${mg} mg/dL)`, detail: `"${meta.question}" bildirimi ile düşük/sınırda magnezyum (${mg} mg/dL) sonucu birlikte kayıtlıdır.` });
            confirmed = true;
          } else if (mg !== null) {
            inRefMatchedNutrients.push(`Magnezyum (${mg} mg/dL - Referans aralığında)`);
          }
        }
        if (meta.nutrients.includes("D3_K2")) {
          if (isD3Low) {
            findings.push({ title: `Belirti–Tahlil Çapraz Doğrulaması: ${meta.medicalName} & 25(OH)D3 (${d3} ng/mL)`, detail: `"${meta.question}" bildirimi ile düşük/sınırda D vitamini (${d3} ng/mL) sonucu biyokimyasal olarak örtüşmektedir.` });
            confirmed = true;
          } else if (d3 !== null) {
            inRefMatchedNutrients.push(`25(OH)D3 (${d3} ng/mL - Referans aralığında)`);
          }
        }
        if (meta.nutrients.includes("Çinko")) {
          if (isZnLow) {
            findings.push({ title: `Belirti–Tahlil Çapraz Doğrulaması: ${meta.medicalName} & Çinko (${zinc} µg/dL)`, detail: `"${meta.question}" bildirimi ile düşük/sınırda çinko (${zinc} µg/dL) sonucu birlikte kayıtlıdır.` });
            confirmed = true;
          } else if (zinc !== null) {
            inRefMatchedNutrients.push(`Çinko (${zinc} µg/dL - Referans aralığında)`);
          }
        }

        if (!confirmed) {
          const nutrientNames = Array.isArray(meta.nutrients) && meta.nutrients.length > 0
            ? meta.nutrients.map(n => n.replace(/_/g, " ")).join(", ")
            : "Genel Klinik Değerlendirme";
          const normalLabNote = inRefMatchedNutrients.length > 0
            ? ` Kayıtlı tahlilde ilişkili parametre (${inRefMatchedNutrients.join(", ")}) normal sınırlarda olduğundan diğer klinik nedenler ve ölçülmeyen parametreler araştırılmalıdır.`
            : "";
          findings.push({
            title: `Belirti Değerlendirme Notu: ${meta.symptomName || meta.medicalName}`,
            detail: `"${meta.question}" belirtisi seçildi. İlişkili olabilecek mikrobesin/parametre alanları: ${nutrientNames}.${normalLabNote} ${meta.suggestedLab ? `Hekim görüşmesinde değerlendirilmesi önerilen testler: ${meta.suggestedLab}.` : "Kesin nedenin belirlenmesi için hekim muayenesi ve laboratuvar doğrulaması önerilir."}`
          });
        }

        if (meta.formKey && FORM_DOSAGE_CONFIG[meta.formKey]) {
          symptomCandidateFormKeys.add(meta.formKey);
        }
        if (Array.isArray(meta.nutrients)) {
          meta.nutrients.forEach(nutKey => {
            if (FORM_DOSAGE_CONFIG[nutKey]) symptomCandidateFormKeys.add(nutKey);
          });
        }

        if ((hasNoCurrentLabs || !confirmed) && meta.suggestedLab) {
          triageLabRequests.push({
            symKey,
            lab: meta.suggestedLab,
            medicalName: meta.medicalName,
            symptomName: meta.symptomName || meta.medicalName,
            question: meta.question || ""
          });
        }
      });

      if (hasNoCurrentLabs && triageLabRequests.length === 0) {
        triageLabRequests.push({
          symKey: "baseline_panel",
          lab: "Hemogram/Tam Kan Sayımı, Serum Kreatinin & eGFR, Ferritin, Serum Demiri, Vitamin B12, Folat, 25-OH Vitamin D, Magnezyum, ALT",
          medicalName: "Bazal Biyokimya & Organ Güvenlik Tarama Paneli",
          symptomName: "Genel Klinik Ön Değerlendirme",
          question: "Güncel tahlil kaydı bulunmadığından takviye planlaması öncesi bazal laboratuvar kontrolü"
        });
      }

      if (d3 !== null && isD3Low && !hasHypercalcemiaRisk) {
        const d3Config = FORM_DOSAGE_CONFIG["D3_K2"];
        const defaultForm = d3Config.defaultForm;
        const formEval = d3Config.forms[defaultForm](weight);

        let d3SafetyBadge = hasBloodThinner ? "⚠️ K2 Çıkarıldı" : "Hekim Onaylı Damla";
        if (hasHepaticRisk) {
          d3SafetyBadge = "⚠️ Hepatik Güvenlik Uyarısı (Hekim Kontrolü Gerekli)";
        }

        protocol.push({
          formKey: "D3_K2",
          name: hasBloodThinner ? "Saf D3 Vitamini (K2'siz Form)" : d3Config.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: d3SafetyBadge
        });
      }

      if (isFerritinLow) {
        const ironConfig = FORM_DOSAGE_CONFIG["Demir"];
        const defaultForm = hasPPI ? "Saşe" : ironConfig.defaultForm;
        const formEval = ironConfig.forms[defaultForm](weight);
        protocol.push({
          formKey: "Demir",
          name: ironConfig.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: (crp !== null && crp > 10) ? "⚠️ Aktif Enflamasyon / Enfeksiyon Kontrolü Şart" : "Lipozomal Form (Reçeteli)"
        });
      }

      if (isB12Low) {
        const b12Config = FORM_DOSAGE_CONFIG["B12"];
        const defaultForm = (hasPPI || hasMetformin || age >= 50) ? "Dilaltı_Tablet" : b12Config.defaultForm;
        const formEval = b12Config.forms[defaultForm](weight);
        protocol.push({
          formKey: "B12",
          name: b12Config.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: "Dilaltı Aktif Form"
        });
      }

      if (isFolateLow) {
        const folConfig = FORM_DOSAGE_CONFIG["Folat"];
        const defaultForm = folConfig.defaultForm;
        const formEval = folConfig.forms[defaultForm](weight);
        protocol.push({
          formKey: "Folat",
          name: folConfig.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: "Aktif 5-MTHF"
        });
      }

      if (isMgLow) {
        const mgConfig = FORM_DOSAGE_CONFIG["Magnezyum"];
        const defaultForm = mgConfig.defaultForm;
        const formEval = mgConfig.forms[defaultForm](weight);
        protocol.push({
          formKey: "Magnezyum",
          name: mgConfig.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: hasKidneyRisk ? "⛔ Hekim İzni Şart" : "Organik Şelat"
        });
      }

      if (isZnLow && FORM_DOSAGE_CONFIG["Çinko"]) {
        const znConfig = FORM_DOSAGE_CONFIG["Çinko"];
        const defaultForm = znConfig.defaultForm;
        const formEval = znConfig.forms[defaultForm](weight);
        protocol.push({
          formKey: "Çinko",
          name: znConfig.name,
          selectedForm: defaultForm,
          doseText: formEval.doseText,
          timing: formEval.timing,
          instruction: formEval.instruction,
          safety: "⚠️ Bakır (Cu) Dengesi Gözetilmeli"
        });
      }

      // Semptom-Öncelikli Mod (Tahlilsiz veya düşük tahlil saptanmamış ancak semptom seçilmiş durum):
      if (protocol.length === 0 && symptomCandidateFormKeys.size > 0 && !isPediatric) {
        symptomCandidateFormKeys.forEach(fKey => {
          if (fKey === "D3_K2" && hasHypercalcemiaRisk) return;
          const cfg = FORM_DOSAGE_CONFIG[fKey];
          if (!cfg) return;
          const defaultForm = cfg.defaultForm;
          const formFn = cfg.forms && cfg.forms[defaultForm];
          const formEval = typeof formFn === "function" ? formFn(weight) : { doseText: "Hekimle belirlenir", timing: "Hekim değerlendirmesi", instruction: "" };
          protocol.push({
            formKey: fKey,
            name: (fKey === "D3_K2" && hasBloodThinner) ? "Saf D3 Vitamini (K2'siz Form)" : cfg.name,
            selectedForm: defaultForm,
            doseText: formEval.doseText,
            timing: formEval.timing,
            instruction: formEval.instruction,
            safety: hasNoCurrentLabs ? "⚠️ Tahlil Doğrulaması Sonrası Hekimle Değerlendirilecek Aday" : "Doktorla değerlendirilecek aday"
          });
        });
      }

      if (isPediatric) protocol.length = 0;
      protocol.forEach(item => {
        item.selectedForm = "Hekimle belirlenir";
        item.doseText = "Otomatik doz belirlenmez";
        item.timing = "Hekim değerlendirmesi";
        const candidateCautions = {
          Demir: "Ferritin tek başına yeterli değildir: hemogram (Hb, MCV), CRP/transferrin satürasyonu ve nedenin (adet kanaması, beslenme, sindirim kaybı) değerlendirilmesi gerekir. Aktif enfeksiyon (yüksek CRP) sırasında demir başlanması ertelenebilir; gereksiz demir mide-bağırsak yan etkilerine ve organ birikimine yol açabilir.",
          B12: "B12 eksikliğinin doğrulanması (ör. MMA, Homosistein) ve nedenin (beslenme, atrofik gastrit/pernisiyöz anemi, PPI veya Metformin kullanımı) belirlenmesi hekim tarafından yapılmalıdır.",
          Magnezyum: "Serum magnezyum vücut depolarını tam yansıtmaz; tek sonuca dayanarak takviye başlanmamalıdır. İlaçlar (mide koruyucu, idrar söktürücü), ishal, alkol ve böbrek işlevi birlikte değerlendirilmelidir; böbrek hastalığında hipermagnezemi riski artar.",
          D3_K2: "Karar 25(OH)D düzeyi, kalsiyum/PTH durumu, magnezyum düzeyi ve ilaçlara göre hekimle verilmelidir; hiperkalsemi varlığında kontrendikedir.",
          Folat: "Folat takviyesinden önce B12 durumu mutlaka değerlendirilmelidir; tek başına folat verilmesi B12 eksikliğinin megaloblastik anemi bulgusunu maskelerken geri dönüşsüz nörolojik hasarı (subakut kombine dejenerasyon) ilerletebilir.",
          Çinko: "Uzun süreli veya yüksek doz (>40 mg/gün) çinko kullanımı bağırsakta metallotiyonein sentezini artırarak bakır (Cu) emilimini bloke eder ve bakır eksikliğine bağlı anemi/nötropeniye yol açabilir."
        };
        item.instruction = "Bu bulgu tek başına takviye ihtiyacını kanıtlamaz; sonucun klinik değerlendirmeyle doğrulanması gerekir. Yaş, tüm ilaçlar/takviyeler, klinik öykü ve laboratuvar raporu birlikte değerlendirilerek karar hekim tarafından verilmelidir." + (candidateCautions[item.formKey] ? " " + candidateCautions[item.formKey] : "");
        if (!item.safety || item.safety === "Doktorla değerlendirilecek aday") {
          item.safety = hasNoCurrentLabs ? "Tahlil Doğrulaması Sonrası Hekimle Değerlendirilecek Aday" : "Doktorla değerlendirilecek aday";
        }
      });
      if (findings.length === 0) {
        findings.push({
          title: "Girilen verilerde belirgin bir örüntü gösterilemedi",
          detail: "Bu sonuç eksiklik veya hastalık olmadığını kanıtlamaz. Eksik veri, laboratuvar referansı ve belirtiler doktor tarafından birlikte değerlendirilmelidir."
        });
      }

      const latestDate = (state.labHistory && state.labHistory.length > 0) ? state.labHistory[0].date : new Date().toISOString().split('T')[0];
      const recallInfo = calculateRecallDate(latestDate);

      // Besinle destek bölümü için: referansın altındaki tahliller, belirtiyle ilişkili bileşenler ve güvenlik bağlamı
      const lowLabNutrients = [];
      const borderlineLabNutrients = [];
      [["D3_K2", d3EvalResult], ["B12", b12EvalResult], ["Demir", ferEvalResult], ["Folat", folEvalResult], ["Magnezyum", mgEvalResult], ["Kalsiyum", caEvalResult], ["Çinko", znEvalResult]]
        .forEach(([nutrient, ev]) => { if ((ev.isBorderline || ev.status === "below_ref") && !ev.isLow) borderlineLabNutrients.push(nutrient); });
      if (d3EvalResult.isLow) lowLabNutrients.push("D3_K2");
      if (b12EvalResult.isLow) lowLabNutrients.push("B12");
      if (ferEvalResult.isLow) lowLabNutrients.push("Demir");
      if (folEvalResult.isLow) lowLabNutrients.push("Folat");
      if (mgEvalResult.isLow) lowLabNutrients.push("Magnezyum");
      if (caEvalResult.isLow) lowLabNutrients.push("Kalsiyum");
      if (znEvalResult.isLow) lowLabNutrients.push("Çinko");
      const symptomNutrientMap = {};
      state.selectedSymptoms.forEach(symKey => {
        const meta = ANAMNESIS_DICTIONARY[symKey];
        if (!meta || !Array.isArray(meta.nutrients)) return;
        meta.nutrients.forEach(n => { (symptomNutrientMap[n] = symptomNutrientMap[n] || []).push(meta.symptomName || meta.medicalName); });
      });
      // Senaryo 2'de tüm tahliller normal çıksa dahi incelenen tahlil parametrelerinin doğal besin kaynaklarını göster
      if (lowLabNutrients.length === 0 && borderlineLabNutrients.length === 0 && Object.keys(symptomNutrientMap).length === 0 && enteredLabKeys.length > 0) {
        const labToFoodKey = { d3: "D3_K2", b12: "B12", ferritin: "Demir", hb: "Demir", folate: "Folat", mg: "Magnezyum", ca: "Kalsiyum", zinc: "Çinko" };
        enteredLabKeys.forEach(k => {
          const fk = labToFoodKey[k];
          if (fk) symptomNutrientMap[fk] = ["Tahlil parametresi koruyucu besin desteği"];
        });
        if (Object.keys(symptomNutrientMap).length === 0) {
          symptomNutrientMap["D3_K2"] = ["Koruyucu besin desteği"];
          symptomNutrientMap["B12"] = ["Koruyucu besin desteği"];
          symptomNutrientMap["Magnezyum"] = ["Koruyucu besin desteği"];
        }
      }
      const foodContext = {
        dietPattern: p.dietPattern || "unspecified",
        hasKidneyRisk: !!hasKidneyRisk, hasBloodThinner, hasHepaticRisk: !!hasHepaticRisk, hasPPI, hasMetformin, isPediatric
      };

      state.lastCDSS = {
        lifeStage, weight, bmi: p.bmi, bmiCategory: p.bmiCategory,
        findings, contraindications, protocol, recallInfo, egfrResult, triageLabRequests,
        lowLabNutrients, borderlineLabNutrients, symptomNutrientMap, foodContext,
        hasNoCurrentLabs,
        hasCurrentLabs,
        hasArchiveLabs,
        isPediatric,
        staleLabs: labCtx ? labCtx.stale : [], labSources: labCtx ? labCtx.used : [],
        recentLabHistory: recentLabSummary.recentRecords,
        historicalComparisons: recentLabSummary.comparisons,
        selectedSymptoms: Array.from(state.selectedSymptoms || []),
        date: new Date().toLocaleDateString("tr-TR")
      };

      saveState();
      renderCDSSResultsUI(false);
      renderTriageLabRecommendations();
      renderReportTab();
    }

    function renderTriageLabRecommendations() {
      const container = document.getElementById("triageLabRecommendationsContainer");
      if (!container) return;
      const triageList = state.lastCDSS?.triageLabRequests || [];
      if (triageList.length === 0) {
        container.classList.add("hidden");
        container.innerHTML = "";
        return;
      }
      const isNoLabMode = Boolean(state.lastCDSS?.hasNoCurrentLabs);
      container.classList.remove("hidden");
      container.style.display = "block";
      container.innerHTML = `
        <div class="p-4 sm:p-5 rounded-2xl ${isNoLabMode ? 'bg-amber-50/95 border-2 border-amber-400 shadow-md' : 'bg-amber-50 border border-amber-300 shadow-sm'} text-amber-950 text-xs space-y-2.5">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <strong class="font-black text-xs sm:text-sm flex items-center gap-2 text-navy-900">
              <i class="fa-solid fa-clipboard-list text-amber-600 text-sm"></i>
              <span>Doktorla Görüşmede Değerlendirilecek Test ve İncelemeler</span>
            </strong>
            ${isNoLabMode ? `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-950 border border-amber-400">Öncelikli Klinik Adım • Tahlil Doğrulaması Önerilir</span>` : ""}
          </div>
          <p class="text-[11px] text-amber-900 leading-relaxed">
            ${isNoLabMode
              ? "Güncel kan tahlili girilmediği için seçtiğiniz belirtilere göre hekiminizden talep edilmesi önerilen spesifik laboratuvar testleri ve klinik değerlendirmeler aşağıda listelenmiştir:"
              : "Seçilen belirtilerin biyokimyasal ayırıcı tanısı için hekiminizle görüşebileceğiniz spesifik laboratuvar testleri ve klinik incelemeler:"}
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
            ${triageList.map(t => `
              <div class="p-3 bg-white rounded-xl border border-amber-200/90 shadow-xs space-y-1">
                <div class="text-[11px] font-black text-navy-900 flex items-center gap-1.5">
                  <i class="fa-solid fa-vial-circle-check text-teal-600 text-[10px]"></i>
                  <span>${escapeHtmlText(t.symptomName || t.medicalName)}</span>
                </div>
                <div class="text-xs font-bold text-amber-950 leading-relaxed">${escapeHtmlText(t.lab)}</div>
                ${t.question ? `<div class="text-[10px] text-slate-500 italic">"${escapeHtmlText(t.question)}"</div>` : ""}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderCDSSResultsUI(isSilent = false) {
      ensureCDSSResultsView();
      const container = document.getElementById("cdssResultContainer");
      if (!container || !state.lastCDSS) return;

      // DOM Sıfırlama Garantisi: Render başında tüm alt sonuç kapsayıcılarının içini temizle
      ["findingsList", "protocolTableBody", "triageLabRecommendationsContainer", "contraindicationAlertContainer", "cdssKidneySafetyWarningContainer", "foodAlternativesSection", "cdssRecallContainer"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
      });

      container.classList.remove("hidden");
      container.classList.add("show");
      container.style.display = "block";

      const emptyState = document.getElementById("cdssResultsEmptyState");
      const hasDataOrSymptoms = hasAnySymptomOrLabForClinicalAnalysis() || Boolean(state.lastCDSS);
      if (emptyState && hasDataOrSymptoms) {
        emptyState.classList.add("hidden");
        emptyState.classList.remove("show");
        emptyState.style.display = "none";
      }
      const overview = document.getElementById("cdssResultsOverview");
      if (overview && hasDataOrSymptoms) {
        overview.classList.remove("hidden");
        overview.classList.add("show");
        overview.style.display = "block";
      }

      const lifeCard = document.getElementById("lifeStageCard");
      if (lifeCard) {
        lifeCard.classList.remove("hidden");
        lifeCard.style.display = "block";
        lifeCard.removeAttribute("aria-hidden");
        const egfr = state.lastCDSS.egfrResult && Number.isFinite(Number(state.lastCDSS.egfrResult.egfr))
          ? state.lastCDSS.egfrResult
          : null;
        const egfrBadgeMarkup = egfr && egfr.badgeHtml
          ? egfr.badgeHtml
          : (state.lastCDSS.isPediatric
              ? '<span class="text-xs text-amber-800 font-bold">18 yaş altı: yetişkin eGFR uygulanmadı</span>'
              : '<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-black"><i class="fa-solid fa-flask-vial text-teal-600"></i> Laboratuvar Tahlili Bekleniyor — Tahlil girilmediği için böbrek filtrasyonu hesaplanamadı.</span>');
        lifeCard.innerHTML = `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span class="text-[10px] font-black uppercase text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">${escapeHtmlText(state.lastCDSS.lifeStage?.stage || 'G1')}</span>
              <h3 class="text-sm sm:text-base font-black text-navy-900 mt-1">Klinik Evre, VKİ (${escapeHtmlText(state.lastCDSS.bmi || '-')}) &amp; Renal eGFR Analizi</h3>
              <p class="text-xs text-slate-500 mt-0.5">${escapeHtmlText(state.lastCDSS.lifeStage?.desc || '')}</p>
            </div>
            ${egfrBadgeMarkup}
          </div>
          ${!egfr && !state.lastCDSS.isPediatric ? `
            <p class="mt-2.5 pt-2.5 border-t border-slate-100 text-[11px] font-semibold text-slate-700 leading-relaxed">
              Laboratuvar Tahlili Bekleniyor — Tahlil girilmediği için böbrek filtrasyonu hesaplanamadı. Güncel kreatinin tahlili bulunmadığından takviye planlamasından önce rutin testlerin yapılması önerilir.
            </p>
          ` : ""}
        `;
      }

      const contraContainer = document.getElementById("contraindicationAlertContainer");
      if (contraContainer) {
        const contras = state.lastCDSS.contraindications || [];
        if (contras.length > 0) {
          contraContainer.classList.remove("hidden");
          contraContainer.style.display = "block";
          contraContainer.innerHTML = `
            <div class="p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 text-rose-950 text-xs space-y-2 shadow-sm">
              ${contras.map(c => `
                <div>
                  <strong class="font-black text-rose-900 block">${escapeHtmlText(c.title)}</strong>
                  <p class="text-[11px] text-rose-800 mt-0.5 leading-relaxed">${escapeHtmlText(c.detail)}</p>
                </div>
              `).join('')}
            </div>
          `;
        } else {
          contraContainer.classList.add("hidden");
          contraContainer.innerHTML = "";
        }
      }

      if (typeof renderClinicalKidneySafetyWarningUI === "function") {
        renderClinicalKidneySafetyWarningUI(state.lastKidneySafetyAnalysis || null);
      }

      renderTriageLabRecommendations();

      const recallContainer = document.getElementById("cdssRecallContainer");
      if (recallContainer && state.lastCDSS.recallInfo) {
        const r = state.lastCDSS.recallInfo;
        recallContainer.classList.remove("hidden");
        recallContainer.style.display = "block";
        recallContainer.innerHTML = `
          <details class="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <summary class="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700">
              <span class="flex items-center gap-2"><i class="fa-solid ${r.icon} text-teal-700"></i>Hatırlatma tarihi: <strong class="text-teal-800">${escapeHtmlText(r.dateFormatted)}</strong></span>
              <span class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-50 text-xs font-black text-amber-800" aria-label="Hatırlatma tarihi uyarısını aç" title="Hatırlatma tarihi açıklaması">!</span>
            </summary>
            <p class="px-4 pb-3 text-[11px] leading-relaxed text-slate-500">Bu tarih yalnızca uygulama içi hatırlatma amaçlıdır; tekrar tahlil zamanı bu hesapla belirlenmez. Doktorunuzun önerdiği kontrol tarihini esas alın.</p>
          </details>
        `;
      }

      const findingsSection = document.getElementById("cdssFindingsSection");
      if (findingsSection) {
        findingsSection.classList.remove("hidden");
        findingsSection.style.display = "block";
      }
      const findingsAcc = document.getElementById("acc-findings");
      if (findingsAcc && state.lastCDSS.findings && state.lastCDSS.findings.length > 0) {
        findingsAcc.classList.remove("hidden");
        findingsAcc.style.display = "block";
        const iconFindings = document.getElementById("icon-findings");
        if (iconFindings) iconFindings.classList.add("rotate-180");
      }

      const findingsList = document.getElementById("findingsList");
      const findingsBadge = document.getElementById("findingsCountBadge");
      if (findingsList && state.lastCDSS.findings) {
        findingsList.innerHTML = state.lastCDSS.findings.map((f, index) => `
          <div class="p-3 bg-white rounded-xl border border-slate-200 text-xs">
            <div class="flex items-start gap-2">
              <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 text-[10px] font-black">${index + 1}</span>
              <div class="min-w-0 flex-1">
                <strong class="font-bold text-navy-900 block leading-relaxed">${escapeHtmlText(f.title)}</strong>
                <details class="mt-1.5" ${state.lastCDSS.hasNoCurrentLabs ? "open" : ""}>
                  <summary class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100">Açıklamayı göster <i class="fa-solid fa-chevron-down text-[9px]"></i></summary>
                  <p class="text-slate-600 mt-2 leading-relaxed">${escapeHtmlText(f.detail)}</p>
                </details>
              </div>
            </div>
          </div>
        `).join('');
      }
      if (findingsBadge && state.lastCDSS.findings) {
        findingsBadge.textContent = `${state.lastCDSS.findings.length} bulgu`;
      }

      const protocolSection = document.getElementById("protocolRecommendationSection");
      if (protocolSection) {
        protocolSection.classList.remove("hidden");
        protocolSection.style.display = "block";
      }
      const protocolAccordion = document.getElementById("protocolDetailsAccordion");
      if (protocolAccordion && Array.isArray(state.lastCDSS.protocol) && state.lastCDSS.protocol.length > 0) {
        protocolAccordion.setAttribute("open", "");
      }

      const tbody = document.getElementById("protocolTableBody");
      if (tbody && state.lastCDSS.protocol) {
        if (state.lastCDSS.protocol.length === 0) {
          tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">Bu analiz otomatik takviye gereksinimi belirlemez; bulgular doktorla değerlendirilmelidir.</td></tr>`;
        } else {
          tbody.innerHTML = state.lastCDSS.protocol.map(p => {
            const isWarn = (p.safety || "").includes("⚠️") || (p.safety || "").includes("⛔") || (p.safety || "").includes("Tahlil Doğrulaması");
            const protocolIndex = state.lastCDSS.protocol.indexOf(p);
            const formConfig = FORM_DOSAGE_CONFIG[p.formKey];
            const availableForms = formConfig ? Object.keys(formConfig.forms) : [];
            const formOptionsHtml = availableForms.length
              ? `<div class="relative mt-1.5">
                  <select class="form-selector min-h-10 w-full appearance-none rounded-xl border border-teal-200 bg-gradient-to-br from-white to-teal-50 px-3 py-2 pr-9 text-xs font-black text-teal-950 shadow-sm transition hover:border-teal-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                    aria-label="${escapeHtmlText(p.name)} için farmasötik form"
                    onchange="if(window.SoundEffects) SoundEffects.playClick(); changeCDSSProtocolForm(${protocolIndex}, this.value)">
                    ${availableForms.map(form => `<option value="${escapeHtmlText(form)}" ${p.selectedForm === form ? "selected" : ""}>${escapeHtmlText(form.replace(/_/g, " "))}</option>`).join("")}
                  </select>
                  <i aria-hidden="true" class="fa-solid fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-teal-700"></i>
                </div>
                <span class="mt-1 block text-[9px] text-slate-500">Hekim/eczacı ve ürün etiketiyle doğrulayın.</span>`
              : `<span class="text-[10px] text-slate-500">Hekimle belirlenir</span>`;
            return `
              <tr class="hover:bg-slate-50">
                <td class="py-2.5 px-3 font-bold text-navy-900">${escapeHtmlText(p.name)}</td>
                <td class="py-2.5 px-3">${formOptionsHtml}</td>
                <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-[10px] font-bold border ${isWarn ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-teal-50 text-teal-800 border-teal-200'}">${escapeHtmlText(p.safety)}</span></td>
                <td class="py-2.5 px-3"><label class="inline-flex items-center gap-1.5 cursor-pointer"><input type="checkbox" class="cdssProtocolSelect h-4 w-4 rounded border-slate-300 text-teal-600" data-index="${protocolIndex}" aria-label="${escapeHtmlText(p.name)} seç"><span class="text-[10px] font-bold">Seç</span></label></td>
              </tr>
            `;
          }).join('');
        }
      }

      if (typeof renderFoodAlternatives === "function") renderFoodAlternatives();

      if (!isSilent) container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function changeCDSSProtocolForm(index, form) {
      const candidate = state.lastCDSS?.protocol?.[Number(index)];
      const config = candidate && FORM_DOSAGE_CONFIG[candidate.formKey];
      if (!candidate || !config || !Object.prototype.hasOwnProperty.call(config.forms, form)) {
        showToast("Form seçilemedi", "Bu bileşen için geçerli bir farmasötik form bulunamadı.", "warning");
        return;
      }
      candidate.selectedForm = form;
      saveState();
      renderCDSSResultsUI(true);
      renderReportTab();
      showToast("Form tercihi güncellendi", "Bu tercih yalnızca hekimle görüşmek içindir; doz veya kullanım talimatı oluşturulmadı.", "info");
    }

    function copyAiSummaryToClipboard() {
      const text = document.getElementById("aiSummaryTextContainer")?.innerText;
      if (text) {
        navigator.clipboard.writeText(text);
        showToast("Kopyalandı", "Sentez panoya kopyalandı.", "info");
      }
    }

    function setCDSSScheduleDays(selectAll) {
      document.querySelectorAll('input[name="cdssScheduleDay"]').forEach(el => { el.checked = Boolean(selectAll); });
    }

    function getCDSSReminderPlan(name) {
      const n = String(name || "").toLocaleLowerCase("tr-TR");
      // Bu saatler yalnızca çizelge hatırlatıcısı için taslak yerleşimdir; tedavi, emilim veya doğru kullanım zamanı önerisi değildir.
      // Kullanıcı, ürün etiketi ve hekim/eczacı talimatına göre kaydetmeden önce saati doğrulamalıdır.
      if (/magnezyum|magnesium/.test(n)) return { time: "21:30", timing: "Akşam" };
      if (/demir|iron|ferritin/.test(n)) return { time: "13:00", timing: "Öğle" };
      if (/d3|d vitamini|vitamin d|b12|kobalamin|folat|folik asit/.test(n)) return { time: "08:00", timing: "Sabah" };
      return { time: "08:00", timing: "Sabah" };
    }

    function commitCDSSProtocolToDailyTracker() {
      if (!state.user || !activeUserId) { showToast("Giriş gerekli", "Önce kendi hesabınızda oturum açın.", "warning"); return; }
      if (!document.getElementById("cdssDoctorApprovalCheckbox")?.checked) { showToast("Hekim onayı gerekli", "Toplu aktarım için hekim onayı kutusunu işaretleyin.", "warning"); return; }
      const dayValues = Array.from(document.querySelectorAll('input[name="cdssScheduleDay"]:checked')).map(el => Number(el.value));
      if (!dayValues.length) { showToast("Gün seçilmedi", "Talimatınıza göre bir veya daha fazla hatırlatma günü seçin.", "warning"); return; }
      const protocol = Array.isArray(state.lastCDSS?.protocol) ? state.lastCDSS.protocol : [];
      const selectedIndexes = Array.from(document.querySelectorAll('.cdssProtocolSelect:checked')).map(el => Number(el.dataset.index)).filter(i => Number.isInteger(i) && i >= 0 && i < protocol.length);
      if (!selectedIndexes.length) { showToast("Ürün seçilmedi", "Önce tabloda çizelgeye eklemek istediğiniz adayları işaretleyin.", "warning"); return; }
      let added = 0, duplicates = 0;
      selectedIndexes.forEach(index => {
        const candidate = protocol[index];
        if (!candidate || !String(candidate.name || "").trim()) return;
        const name = String(candidate.name).trim();
        if (state.supplements.some(item => String(item.name || "").trim().toLocaleLowerCase("tr-TR") === name.toLocaleLowerCase("tr-TR"))) { duplicates++; return; }
        const plan = getCDSSReminderPlan(name);
        state.supplements.push({
          id: `sup_cdss_approved_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name,
          formKey: null,
          selectedForm: candidate.selectedForm || "Hekimle belirlenecek",
          timing: plan.timing,
          scheduleTime: plan.time,
          scheduleDays: dayValues.slice(),
          doseText: "Doz otomatik belirlenmedi — hekim/etiket talimatına göre girilmeli",
          subText: "KDS adayından hekim onayıyla takip kaydı",
          instruction: `Hatırlatma: ${plan.time}. Bu saat yalnızca çizelge başlangıcıdır; klinik kullanım zamanı/dozu değildir. Aday bulgu: ${String(candidate.instruction || "").slice(0, 500)} Doz, ürün formu, etkileşim ve saat hekim/eczacı ve ürün talimatıyla doğrulanmalıdır.`,
          addedDate: Date.now(), taken: false,
          scheduleSource: "cdss_doctor_approved",
          doctorApprovalAttested: true
        });
        added++;
      });
      if (!added) { showToast("Yeni kayıt eklenmedi", duplicates ? `${duplicates} öğe zaten çizelgede bulunuyor.` : "Seçilen adaylarda aktarılabilir kayıt yok.", "info"); return; }
      const saved = saveState();
      if (typeof renderAllAppViews === "function") renderAllAppViews(); else renderDailyTab();
      if (typeof detectSupplementConflicts === "function") detectSupplementConflicts();
      showToast("Çizelge güncellendi", `${added} öğe yalnızca hatırlatma kaydı olarak eklendi${duplicates ? `; ${duplicates} tekrar atlandı` : ""}. Doz ve klinik kullanım önerilmedi.${saved === false ? " Bu oturumda kaydedildi ancak kalıcı depolama doğrulanamadı." : ""}`, saved === false ? "warning" : "success");
    }

    function editSymptomsFromClinicalResults() {
      if (!(state.selectedSymptoms instanceof Set)) {
        const restored = Array.isArray(state.selectedSymptomsArray)
          ? state.selectedSymptomsArray
          : (Array.isArray(state.anamnesisTriageState?.selectedSymptoms) ? state.anamnesisTriageState.selectedSymptoms : []);
        state.selectedSymptoms = new Set(restored);
      } else if (state.selectedSymptoms.size === 0 && Array.isArray(state.selectedSymptomsArray) && state.selectedSymptomsArray.length > 0) {
        state.selectedSymptomsArray.forEach(k => state.selectedSymptoms.add(k));
      }
      navigateToView("view-neyim");
      if (typeof syncAnamnesisCardsUI === "function") {
        syncAnamnesisCardsUI();
      }
      window.scrollTo(0, 0);
    }

    function transferToDoctorReport() {
      if (typeof persistCurrentLabInputsToState === "function") {
        persistCurrentLabInputsToState({ silentUI: true });
      }
      if (!state.lastCDSS && typeof executeCDSSRules === "function") {
        executeCDSSRules();
      }
      if (typeof saveState === "function") {
        saveState();
      }
      navigateToView("view-report");
      if (typeof renderReportTab === "function") {
        renderReportTab();
      }
      window.scrollTo(0, 0);
      showToast("Rapor Hazırlandı", "Klinik analiz verileriniz hekim konsültasyon raporuna aktarıldı.", "info");
    }

    window.editSymptomsFromClinicalResults = editSymptomsFromClinicalResults;
    window.transferToDoctorReport = transferToDoctorReport;

    /* HEKİM KONSÜLTASYON RAPORU RENDER MOTORU */