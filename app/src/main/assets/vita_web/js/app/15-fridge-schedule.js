function renderFridgeScheduleSheet() {
      const patient = document.getElementById("fridgePrintPatientName");
      if (patient) patient.textContent = `Kullanıcı: ${state.user?.name || "Kullanıcı"} • Tarih: ${new Date().toLocaleDateString("tr-TR")}`;
      const groups = [{ timing: "Sabah", target: "fridgeMorningList" }, { timing: "Öğle", target: "fridgeNoonList" }, { timing: "Akşam", target: "fridgeEveningList" }];
      groups.forEach(group => {
        const container = document.getElementById(group.target);
        if (!container) return;
        const items = (state.supplements || []).filter(item => item.timing === group.timing && isSupplementScheduledToday(item));
        if (!items.length) { container.innerHTML = '<p class="fridge-print-empty">Bu zaman diliminde kayıtlı takviye yok.</p>'; return; }
        container.innerHTML = items.map(item => {
          const name = escapeHtmlText(item.name || "Takviye");
          const dose = escapeHtmlText(item.doseText || item.dosageText || "Kayıtlı doz bilgisi yok");
          const form = escapeHtmlText(item.selectedForm || item.form || "");
          const instruction = escapeHtmlText(item.instruction || item.subText || "Hekiminizin belirttiği şekilde kullanın.");
          const schedule = `${escapeHtmlText(getSupplementTimeLabel(item))} · ${escapeHtmlText(getSupplementScheduleDaysLabel(item))}`;
          const taken = item.taken ? '<span style="color:#047857;font-weight:800">✓ Takipte alındı işaretli</span>' : '<span style="color:#64748b">☐ Alındı</span>';
          return `<div class="fridge-print-item"><div style="font-weight:900;font-size:11px">${name}</div><div style="font-weight:800;margin-top:2px">${dose}${form ? ` · ${form}` : ""}</div><div style="margin-top:3px;color:#0369a1;font-weight:800">Saat/gün: ${schedule}</div><div style="margin-top:3px;color:#475569">${instruction}</div><div style="margin-top:4px">${taken}</div></div>`;
        }).join("");
      });
    }

    function printFridgeSchedule() {
      if (window.SoundEffects) SoundEffects.playClick();
      if (!state.user) { showToast("Önce giriş yapın", "Kişiye özel çizelge için hesabınıza giriş yapın.", "warning"); return; }
      renderFridgeScheduleSheet();
      document.body.classList.add("vita-fridge-print-mode");
      const cleanUp = () => document.body.classList.remove("vita-fridge-print-mode");
      window.addEventListener("afterprint", cleanUp, { once: true });
      window.setTimeout(() => {
        try {
          if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.printPageWithTitle === "function") {
            window.AndroidVitaBridge.printPageWithTitle("VitaTakip_Buzdolabi_Cizelgesi");
          } else {
            window.print();
          }
        }
        catch (error) { cleanUp(); showToast("Yazdırma açılamadı", "Tarayıcının Yazdır menüsünü kullanarak yeniden deneyin.", "error"); }
        window.setTimeout(cleanUp, 1500);
      }, 120);
    }

    const VITA_PDF_BIOMARKER_SPECS = [
      { key: "d3", label: "Vitamin D (25-OH D3)", unit: "ng/mL" },
      { key: "b12", label: "Vitamin B12", unit: "pg/mL" },
      { key: "ferritin", label: "Ferritin", unit: "ng/mL" },
      { key: "hb", label: "Hemoglobin (Hb)", unit: "g/dL" },
      { key: "mcv", label: "MCV (Eritrosit Hacmi)", unit: "fL" },
      { key: "crp", label: "CRP (Enflamasyon)", unit: "mg/L" },
      { key: "folate", label: "Folat (B9)", unit: "ng/mL" },
      { key: "mg", label: "Magnezyum", unit: "mg/dL" },
      { key: "ca", label: "Kalsiyum", unit: "mg/dL" },
      { key: "zinc", label: "Çinko", unit: "µg/dL" },
      { key: "creatinine", label: "Kreatinin", unit: "mg/dL" },
      { key: "alt", label: "ALT (Karaciğer)", unit: "U/L" }
    ];

    function collectSortableLabHistoryForPDF() {
      const records = Array.isArray(state.labHistory) ? state.labHistory.slice() : [];
      if (!records.length && state.labValues) {
        const hasAnyCurrent = VITA_PDF_BIOMARKER_SPECS.some(spec => parseVitaLabDecimal(state.labValues[spec.key]) !== null);
        if (hasAnyCurrent) {
          const fallbackDate = document.getElementById("inputLabDate")?.value || new Date().toISOString().slice(0, 10);
          records.push({
            date: fallbackDate,
            timestamp: Date.now(),
            references: { ...(state.labReferences || {}) },
            ...state.labValues
          });
        }
      }
      return records.sort((a, b) => {
        const da = String(a?.date || "");
        const db = String(b?.date || "");
        if (da !== db) return db.localeCompare(da);
        return (Number(b?.timestamp) || 0) - (Number(a?.timestamp) || 0);
      });
    }

    function renderLabHistoryPrintSheet() {
      const sheet = document.getElementById("vitaLabHistoryPrintSheet");
      if (!sheet) return false;
      const recordsDesc = collectSortableLabHistoryForPDF();
      if (!recordsDesc.length) return false;

      const user = state.user || defaultUserProfile;
      const genderLabel = user.gender === "E" ? "Erkek" : "Kadın";
      const nowStr = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

      // En güncel kreatinin üzerinden CKD-EPI 2021 eGFR hesapla
      const latestRecord = recordsDesc[0];
      const latestCr = parseVitaLabDecimal(latestRecord?.creatinine ?? state.labValues?.creatinine);
      const egfrVal = (latestCr !== null && latestCr > 0 && typeof calculateCKDEPI2021 === "function")
        ? calculateCKDEPI2021(latestCr, user.age || 28, user.gender || "K")
        : null;
      const egfrStage = (egfrVal !== null && typeof classifyGFRStage === "function") ? classifyGFRStage(egfrVal) : null;

      // Boylamsal değişim tablosu (en az 2 kayıt varsa: en eski vs en yeni)
      let trendSectionHtml = "";
      if (recordsDesc.length >= 2) {
        const oldest = recordsDesc[recordsDesc.length - 1];
        const newest = recordsDesc[0];
        const trendRows = [];
        VITA_PDF_BIOMARKER_SPECS.forEach(spec => {
          const firstVal = parseVitaLabDecimal(oldest[spec.key]);
          const lastVal = parseVitaLabDecimal(newest[spec.key]);
          if (firstVal === null || lastVal === null) return;
          const diff = lastVal - firstVal;
          const pct = firstVal !== 0 ? ((diff / firstVal) * 100) : 0;
          const sign = diff > 0 ? "+" : "";
          const trendBadge = Math.abs(diff) < 0.001
            ? '<span style="color:#475569;font-weight:700">→ Değişim Yok</span>'
            : diff > 0
              ? `<span style="color:#0369a1;font-weight:800">↑ ${sign}${diff.toFixed(1).replace(".", ",")} (${sign}${pct.toFixed(0)}%)</span>`
              : `<span style="color:#b45309;font-weight:800">↓ ${diff.toFixed(1).replace(".", ",")} (${pct.toFixed(0)}%)</span>`;
          trendRows.push(`
            <tr style="border-bottom:1px solid #e2e8f0">
              <td style="padding:6px 8px;font-weight:800;color:#0f172a">${escapeHtmlText(spec.label)}</td>
              <td style="padding:6px 8px;font-family:monospace">${escapeHtmlText(String(firstVal).replace(".", ","))} ${escapeHtmlText(spec.unit)}</td>
              <td style="padding:6px 8px;font-family:monospace;font-weight:800">${escapeHtmlText(String(lastVal).replace(".", ","))} ${escapeHtmlText(spec.unit)}</td>
              <td style="padding:6px 8px">${trendBadge}</td>
            </tr>
          `);
        });
        if (trendRows.length) {
          trendSectionHtml = `
            <div style="margin-top:14px;border:1.5px solid #cbd5e1;border-radius:12px;overflow:hidden;page-break-inside:avoid">
              <div style="background:#f0fdfa;padding:8px 12px;border-bottom:1px solid #cbd5e1;display:flex;justify-content:space-between;align-items:center">
                <strong style="font-size:12px;color:#0f766e">Boylamsal İlerleme ve Değişim Özeti (İlk vs. Son Tahlil)</strong>
                <span style="font-size:10px;color:#475569;font-weight:700">${escapeHtmlText(oldest.date || "İlk")} ➔ ${escapeHtmlText(newest.date || "Son")}</span>
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left">
                <thead>
                  <tr style="background:#f8fafc;border-bottom:1px solid #cbd5e1;color:#334155">
                    <th style="padding:6px 8px">Biyobelirteç</th>
                    <th style="padding:6px 8px">İlk Kayıt (${escapeHtmlText(oldest.date || "-")})</th>
                    <th style="padding:6px 8px">Son Kayıt (${escapeHtmlText(newest.date || "-")})</th>
                    <th style="padding:6px 8px">Net Değişim (Δ)</th>
                  </tr>
                </thead>
                <tbody>${trendRows.join("")}</tbody>
              </table>
            </div>
          `;
        }
      }

      // Kronolojik tahlil kartları
      const recordCardsHtml = recordsDesc.map((rec, idx) => {
        const recDate = escapeHtmlText(rec.date || "Tarih belirtilmedi");
        const refs = (rec.references && typeof rec.references === "object") ? rec.references : {};
        const rows = [];
        VITA_PDF_BIOMARKER_SPECS.forEach(spec => {
          const val = parseVitaLabDecimal(rec[spec.key]);
          if (val === null) return;
          const rawRef = String(refs[spec.key] || state.labReferences?.[spec.key] || "").trim();
          const defaultRef = typeof getVitaLabDefaultReferenceText === "function" ? getVitaLabDefaultReferenceText(spec.key) : "";
          const refText = rawRef || defaultRef || "Belirtilmedi";
          const evalStatus = typeof evaluateLabValueAgainstReference === "function"
            ? evaluateLabValueAgainstReference(spec.key, val, rawRef)
            : { status: "unknown" };
          let statusHtml = '<span style="color:#475569;font-weight:700">Değerlendirildi</span>';
          if (evalStatus.status === "normal") {
            statusHtml = '<span style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;padding:2px 6px;border-radius:999px;font-weight:800;font-size:10px">Normal Aralığında</span>';
          } else if (evalStatus.status === "low") {
            statusHtml = '<span style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:2px 6px;border-radius:999px;font-weight:800;font-size:10px">Düşük / Sınır Altı</span>';
          } else if (evalStatus.status === "high") {
            statusHtml = '<span style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;padding:2px 6px;border-radius:999px;font-weight:800;font-size:10px">Yüksek / Sınır Üstü</span>';
          }
          rows.push(`
            <tr style="border-bottom:1px solid #f1f5f9">
              <td style="padding:5px 8px;font-weight:800;color:#0f172a">${escapeHtmlText(spec.label)}</td>
              <td style="padding:5px 8px;font-family:monospace;font-weight:800;color:#0f172a">${escapeHtmlText(String(val).replace(".", ","))} ${escapeHtmlText(spec.unit)}</td>
              <td style="padding:5px 8px;color:#475569;font-size:10px">${escapeHtmlText(refText)}</td>
              <td style="padding:5px 8px">${statusHtml}</td>
            </tr>
          `);
        });
        if (!rows.length) return "";
        return `
          <div class="lab-print-record-card" style="margin-top:12px;border:1.5px solid #cbd5e1;border-radius:12px;overflow:hidden;page-break-inside:avoid">
            <div style="background:#0f172a;color:#fff;padding:7px 12px;display:flex;justify-content:space-between;align-items:center">
              <strong style="font-size:12px">Tahlil Tarihi: ${recDate}</strong>
              <span style="font-size:10px;color:#5eead4;font-weight:700">${idx === 0 ? "En Güncel Kayıt" : `Arşiv Kaydı #${recordsDesc.length - idx}`}</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left">
              <thead>
                <tr style="background:#f8fafc;border-bottom:1px solid #cbd5e1;color:#334155">
                  <th style="padding:5px 8px">Parametre</th>
                  <th style="padding:5px 8px">Sonuç</th>
                  <th style="padding:5px 8px">Referans Aralığı</th>
                  <th style="padding:5px 8px">Durum</th>
                </tr>
              </thead>
              <tbody>${rows.join("")}</tbody>
            </table>
          </div>
        `;
      }).filter(Boolean).join("");

      sheet.innerHTML = `
        <div style="border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div>
            <div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#0f766e">VitaTakip Pro • Klinik Laboratuvar Arşivi</div>
            <h1 style="font-size:20px;font-weight:900;color:#0f172a;margin:4px 0 2px">Kan Tahlili Geçmişi ve Boylamsal Takip Raporu</h1>
            <p style="font-size:11px;color:#475569;margin:0">Hekim muayenesi ve laboratuvar izlemi için kronolojik hasta tahlil özeti</p>
          </div>
          <div style="text-align:right;font-size:10px;color:#334155">
            <div><strong>Rapor Tarihi:</strong> ${escapeHtmlText(nowStr)}</div>
            <div style="margin-top:2px"><strong>Toplam Tahlil Sayısı:</strong> ${recordsDesc.length} Kayıt</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;background:#f8fafc;border:1px solid #cbd5e1;border-radius:10px;padding:10px;font-size:11px">
          <div><span style="color:#64748b;display:block;font-size:9px;font-weight:700;text-transform:uppercase">Ad Soyad / Profil</span><strong style="color:#0f172a">${escapeHtmlText(user.name || "Kullanıcı")}</strong></div>
          <div><span style="color:#64748b;display:block;font-size:9px;font-weight:700;text-transform:uppercase">Yaş & Cinsiyet</span><strong style="color:#0f172a">${escapeHtmlText(String(user.age || "-"))} Yaş · ${escapeHtmlText(genderLabel)}</strong></div>
          <div><span style="color:#64748b;display:block;font-size:9px;font-weight:700;text-transform:uppercase">Boy / Kilo / VKİ</span><strong style="color:#0f172a">${escapeHtmlText(String(user.height || "-"))} cm / ${escapeHtmlText(String(user.weight || "-"))} kg (VKİ: ${escapeHtmlText(String(user.bmi || "-"))})</strong></div>
          <div><span style="color:#64748b;display:block;font-size:9px;font-weight:700;text-transform:uppercase">Tahmini eGFR (CKD-EPI)</span><strong style="color:#0f766e">${egfrVal !== null ? `${egfrVal} mL/dk/1.73m² (${escapeHtmlText(egfrStage?.stage || "-")})` : "Kreatinin girilmedi"}</strong></div>
        </div>
        ${trendSectionHtml}
        ${recordCardsHtml}
        <div style="margin-top:14px;padding-top:8px;border-top:1px solid #cbd5e1;display:flex;justify-content:space-between;font-size:9px;color:#64748b">
          <span>VitaTakip Pro • Kişiselleştirilmiş Sağlık ve Laboratuvar Arşivi</span>
          <span>Bilgilendirme amaçlıdır; tanı ve tedavi kararı yalnızca hekime aittir.</span>
        </div>
      `;
      return true;
    }

    function exportLabHistoryPDF() {
      if (window.SoundEffects) SoundEffects.playClick();
      const ok = renderLabHistoryPrintSheet();
      if (!ok) {
        showToast("Tahlil Kaydı Bulunamadı", "PDF raporu oluşturmak için önce en az bir kan tahlili sonucu kaydedin veya e-Nabız PDF yükleyin.", "warning");
        return;
      }
      document.body.classList.add("vita-lab-history-print-mode");
      const cleanUp = () => document.body.classList.remove("vita-lab-history-print-mode");
      window.addEventListener("afterprint", cleanUp, { once: true });
      showToast("PDF Raporu Hazırlandı", "Kan tahlili geçmişiniz doktor paylaşımı için PDF yazdırma/kaydetme ekranına aktarılıyor.", "info");
      window.setTimeout(() => {
        try {
          if (window.AndroidVitaBridge && typeof window.AndroidVitaBridge.printPageWithTitle === "function") {
            window.AndroidVitaBridge.printPageWithTitle("VitaTakip_Kan_Tahlili_Gecmisi");
          } else {
            window.print();
          }
        } catch (error) {
          cleanUp();
          showToast("PDF oluşturulamadı", "Yazdırma/PDF servisi başlatılamadı.", "error");
        }
        window.setTimeout(cleanUp, 1800);
      }, 150);
    }
    window.exportLabHistoryPDF = exportLabHistoryPDF;
    window.renderLabHistoryPrintSheet = renderLabHistoryPrintSheet;

    /* Manuel regression testleri: F12 > Console > VitaTakipDiagnostics.run(); sentetik verilerle çalışır, kullanıcı verisini kalıcı olarak değiştirmez. */
    window.VitaTakipDiagnostics = {
      getGeminiModels() { return VitaAIChat.getModelConfig(); },
      run() {
        const results = [];
        const check = (name, ok, detail = "") => results.push({ name, passed: Boolean(ok), detail });
        check("Gemini ana modeli gemini-3.5-flash-lite", VitaAIChat.getModelConfig().primary === "gemini-3.5-flash-lite", `Ana model: ${VitaAIChat.getModelConfig().primary}`);
        check("Gemini isteğinde keyfî sabit zaman aşımı yok; kullanıcı iptali destekleniyor", !/35000|TimeoutError|setTimeout/.test(VitaAIChat.callGeminiAPI.toString()) && /externalSignal/.test(VitaAIChat.callGeminiAPI.toString()));
        check("Bilimsel belirti rehberi veri kümesi ve kaynakları mevcut", Boolean(window.VitaEvidenceGuideDiagnostics) && window.VitaEvidenceGuideDiagnostics.getSymptoms().length >= 10 && window.VitaEvidenceGuideDiagnostics.getSourceCount() >= 8);
        const anamnesisRoot = document.getElementById("view-neyim");
        const integratedSymptomKeys = ["night_blindness", "dry_eyes", "burning_tongue", "bleeding_gums", "bone_pain", "angular_cheilitis", "white_nail_spots", "balance_difficulty", "unexplained_swelling", "sun_sensitive_rash", "hair_loss", "dark_nail_change"];
        check("Bilimsel belirti soruları NeyimVar kategorilerine entegre; ayrı rehber düğmesi yok", Boolean(anamnesisRoot) && !document.getElementById("vitaEgLaunchNeyim") && !document.querySelector('#view-home [onclick*="openVitaSymptomGuide"]') && integratedSymptomKeys.every(key => anamnesisRoot.querySelector(`.anamnesis-card[onclick*="'${key}'"]`)));
        const anamnesisSteps = ["cat-A", "cat-B", "cat-C", "cat-D", "cat-E", "cat-F", "cat-G"];
        const stepCards = anamnesisSteps.map(id => anamnesisRoot?.querySelectorAll(`#anamnesis-panel-${id} > .grid > .anamnesis-card`).length || 0);
        check("NeyimVar yedi mobil adımda bölünmüş ve analiz son adıma kilitli", anamnesisSteps.every(id => Boolean(document.getElementById(`anamnesis-panel-${id}`))) && stepCards.every(count => count > 0 && count <= 6) && document.getElementById("anamnesisCategoryProgress")?.getAttribute("aria-valuemax") === "7" && typeof window.vitaAnamnesisStep === "function");
        check("Virgüllü laboratuvar sayısı doğru ayrıştırılıyor", parseVitaLabDecimal("75,5") === 75.5 && parseVitaLabDecimal("75.5") === 75.5);
        check("Geçersiz laboratuvar girdisi sayı olarak kabul edilmiyor", parseVitaLabDecimal("12ab") === null && parseVitaLabDecimal("") === null);
        check("Gemini onayı için daraltılmış görünüm mevcut", Boolean(document.getElementById("aiHealthDataConsentApproved")) && typeof VitaAIChat.initializeConsent === "function");
        check("Yanıt beklerken yerel motora geçiş mevcut", Boolean(document.getElementById("ai-use-local-fallback")) && typeof VitaAIChat.useLocalFallback === "function");
        check("Geri bildirim modalı tekil", document.querySelectorAll("#feedbackModal").length === 1);
        check("Geri bildirim formu mevcut", Boolean(document.getElementById("vitaFeedbackForm")));
        check("İlk kullanım spotlight turunun 6 adımı tanımlı", Array.isArray(VITA_SPOTLIGHT_STEPS) && VITA_SPOTLIGHT_STEPS.length === 6);
        check("Spotlight turu manuel başlatma ve tamamlama işlevleri mevcut", typeof startVitaSpotlightTour === "function" && typeof moveVitaSpotlightTour === "function" && typeof finishVitaSpotlightTour === "function");
        check("Tur hedefleri DOM'da mevcut", ["#headerProfileButton", "#guideLabsTarget", "#guideNeyimTarget", "#mobile-nav-view-clinical-results", "#guideDailyProtocolTarget", "#btnPrintFridgeReport"].every(selector => Boolean(document.querySelector(selector))));
        check("A4 buzdolabı çizelgesi ve yazdırma işlevi mevcut", typeof renderFridgeScheduleSheet === "function" && typeof printFridgeSchedule === "function" && Boolean(document.getElementById("fridgeMorningList")) && Boolean(document.getElementById("fridgeNoonList")) && Boolean(document.getElementById("fridgeEveningList")));
        check("Sekiz su bardağı işaret kutusu mevcut", document.querySelectorAll(".fridge-water-cup").length === 8);
        check("IndexedDB yerel veritabanı ve PDF tarama logu mevcut", typeof openVitaIndexedDB === "function" && typeof persistVitaExtendedData === "function" && typeof logVitaPdfScan === "function" && typeof getVitaPdfScanLogs === "function");
        check("IndexedDB desteklenmiyorsa fallback dalı mevcut", /window\.indexedDB/.test(openVitaIndexedDB.toString()) && /safeLocalStorageSetItem/.test(logVitaPdfScan.toString()));
        check("Canlı tahlil geri bildirimi bağlandı", typeof installVitaLabLiveFeedback === "function" && typeof updateVitaLabLiveFeedback === "function" && VITA_LAB_INPUTS.length === 12);
        check("PDF ayrıştırma referans aralığı desenini içeriyor", /genericReference/.test(parseReconstructedLabLines.toString()) && /labeledReference/.test(parseReconstructedLabLines.toString()));
        (window.VitaLabEvidence ? VitaLabEvidence.selfTests() : []).forEach(r => check(r.name, r.passed, r.detail));
        check("Uygulama yükleme bölümü ve eGFR hesaplayıcı mevcut", Boolean(document.getElementById("vitaInstallSection")) && typeof openEgfrCalculator === "function");
        check("Geri bildirim yerel kayıt işlevleri mevcut", typeof getVitaFeedbackEntries === "function" && typeof submitVitaFeedback === "function");
        check("Tahlil geçmişi arama alanı mevcut", Boolean(document.getElementById("labHistorySearchInput")));
        check("ALT 55 güvenlik filtresine girer", labRecordExceedsHepaticSafety({ alt: 55 }));
        check("ALT 50 güvenlik filtresine girmez", !labRecordExceedsHepaticSafety({ alt: 50 }));
        check("ALT filtresi birimli ve virgüllü sayısal kayıtları tanır", labRecordExceedsHepaticSafety({ alt: "55,5 U/L" }));
        check("Referans dışı filtresi birimli/virgüllü değerleri tanır", labRecordHasPortalOutOfRange({ d3: "75,5 ng/mL" }));
        check("Tahlil geçmişinde tüm, normal ve referans dışı sonuç filtreleri var", document.getElementById("labHistoryFilterAll")?.textContent.trim() === "Tüm kayıtlar" && document.getElementById("labHistoryFilterNormal")?.textContent.trim() === "Normal" && document.getElementById("labHistoryFilterOut")?.textContent.trim() === "Referans dışı" && !document.getElementById("labHistoryFilterAlt"));
        check("Tahlil geçmişi tarih seçici mevcut", Boolean(document.getElementById("labHistoryDateFilter")));
        check("Tahlil geçmişi satır değil tarih kartı görünümünde", /renderMetric/.test(renderLabHistoryUI.toString()) && /Tahlil sonuçları/.test(renderLabHistoryUI.toString()));
        check("Tahlil trend grafiği erişilebilir bir akordeonda yer alır", Boolean(document.getElementById("labTrendAccordionToggle")) && Boolean(document.getElementById("acc-labtrend")) && Boolean(document.getElementById("labsRechartsMultiLineMount")));
        check("Tahlil geçmişi ilk iki kayıttan sonra tümünü gösterme kontrolüne sahip", typeof toggleLabHistoryShowAll === "function" && Boolean(document.getElementById("labHistoryShowAllButton")));
        check("Tahlil aralık filtresi mevcut", typeof setLabHistoryFilter === "function" && typeof labRecordHasPortalOutOfRange === "function");
        check("FHIR MedicationStatement ve Condition kaynakları mevcut", /resourceType: "MedicationStatement"/.test(buildVitaFHIRBundle.toString()) && /resourceType: "Condition"/.test(buildVitaFHIRBundle.toString()));
        check("FHIR yapısal doğrulayıcı mevcut", typeof validateVitaFHIRBundle === "function" && typeof buildVitaFHIRBundle === "function");
        const fhirSyntheticId = "11111111-1111-4111-8111-111111111111";
        const fhirSyntheticObsId = "22222222-2222-4222-8222-222222222222";
        const fhirSynthetic = { resourceType: "Bundle", type: "collection", timestamp: new Date().toISOString(), entry: [
          { fullUrl: `urn:uuid:${fhirSyntheticId}`, resource: { resourceType: "Patient", id: fhirSyntheticId, active: true, name: [{ text: "Test" }], gender: "unknown" } },
          { fullUrl: `urn:uuid:${fhirSyntheticObsId}`, resource: { resourceType: "Observation", id: fhirSyntheticObsId, status: "final", category: [{ coding: [{ code: "laboratory" }] }], code: { coding: [{ system: "http://loinc.org", code: "62292-8" }] }, subject: { reference: `urn:uuid:${fhirSyntheticId}` }, effectiveDateTime: "2024-05-12", valueQuantity: { value: 32.4, unit: "ng/mL", code: "ng/mL", system: "http://unitsofmeasure.org" } } }
        ] };
        check("FHIR R4 sentetik Bundle yapısal ön denetimi", validateVitaFHIRBundle(fhirSynthetic).valid, JSON.stringify(validateVitaFHIRBundle(fhirSynthetic).errors));
        const fhirInvalid = JSON.parse(JSON.stringify(fhirSynthetic)); fhirInvalid.entry[1].resource.effectiveDateTime = "2024-02-31";
        check("FHIR geçersiz tarih denetimi", !validateVitaFHIRBundle(fhirInvalid).valid);
        check("FHIR tarih koruma yardımcıları mevcut", typeof isValidFhirDate === "function" && isValidFhirDate("2024-02-29") && !isValidFhirDate("2023-02-29"));
        check("FHIR dateTime saat ve saat dilimi doğrulaması", isValidFhirDateTime("2024-02-29T12:30:00Z") && !isValidFhirDateTime("2024-02-31T12:30:00Z") && !isValidFhirDateTime("2024-02-29T12:30:00"));
        check("PDF önizlemesinde değer/referans düzenleme var", typeof updateParsedPdfField === "function" && /pdfReference-/.test(renderParsedResultsPreview.toString()));
        check("Aynı tarihli tahlil doğrulaması var", typeof resolveLabDateConflict === "function" && Boolean(document.getElementById("labDateConflictModal")));
        check("Demo ürün ekleme akışı kaldırıldı; gerçek barkod okuyucu korundu", typeof addBarcodeSimulationProduct === "undefined" && typeof startBarcodeCameraScan === "function" && Boolean(document.getElementById("barcodeScannerModal")) && !document.getElementById("barcodeSampleSelect"));
        check("Demo/test hesap temizleme kuralı mevcut", typeof purgeLegacyDemoAccounts === "function");
        check("Sesli yazma butonu ve Web Speech API bağlantısı mevcut", Boolean(document.getElementById("ai-voice-btn")) && typeof VitaAIChat.toggleVoiceInput === "function");
        check("Sesli yazma güvenli bağlam ve manuel giriş yedeği mevcut", /window.isSecureContext === false/.test(VitaAIChat.toggleVoiceInput.toString()) && /input.focus\(\)/.test(VitaAIChat.toggleVoiceInput.toString()) && /konuşma tanımayı desteklemiyor/i.test(VitaAIChat.toggleVoiceInput.toString()));
        check("Gerçek kamera barkod okuma işlevi mevcut", typeof startBarcodeCameraScan === "function" && typeof stopBarcodeCameraScan === "function" && typeof handleBarcodeDetected === "function");
        check("Fotoğraftan barkod okuma işlevi mevcut", typeof decodeBarcodeFromPhoto === "function" && Boolean(document.getElementById("barcodePhotoFile")));
        check("Gemini görüntü analizi için ayrı fotoğraf onayı mevcut", typeof VitaAIChat.analyzeMedicationImage === "function" && Boolean(document.getElementById("barcodePhotoConsent")));
        check("Yerel depolama sarmalayıcıları var", typeof safeLocalStorageSetItem === "function" && typeof safeLocalStorageGetItem === "function" && typeof safeLocalStorageRemoveItem === "function");
        const sessionStorageTestKey = "vitatakip_session_storage_diagnostic";
        const sessionStorageWorks = safeSessionStorageSetItem(sessionStorageTestKey, "ok") && safeSessionStorageGetItem(sessionStorageTestKey) === "ok";
        safeSessionStorageRemoveItem(sessionStorageTestKey);
        check("Oturum bilgisi yalnızca sekme süresince saklanır", sessionStorageWorks && safeLocalStorageGetItem("vitatakip_active_session_id") === null);
        check("FHIR Condition etkin/çözümlenmiş durumunu ve başlangıç bilgisi notunu koruyor", /clinicalStatus:/.test(buildVitaFHIRBundle.toString()) && /Başlangıç zamanı kullanıcı tarafından kaydedilmedi/.test(buildVitaFHIRBundle.toString()));
        check("Batch check-in işlevi mevcut", typeof markTimingTaken === "function" && /markTimingTaken/.test(renderDailyTab.toString()));
        check("KVKK açıklaması haricî AI veri aktarımını açıklar", /Google Gemini/.test(document.getElementById("kvkkInfoModal")?.innerText || ""));
        check("Özgüllük ağırlıkları tanımlı", Object.values(ANAMNESIS_DICTIONARY).every(item => [1,2,3].includes(item.specificityWeight)));
        [
          [90, "G1"], [60, "G2"], [59, "G3a"], [45, "G3a"],
          [44, "G3b"], [30, "G3b"], [29, "G4"], [15, "G4"], [14, "G5"]
        ].forEach(([value, expected]) => {
          const actual = classifyGFRStage(value)?.stage;
          check(`eGFR ${value} -> ${expected}`, actual === expected, `Gerçek: ${actual}`);
        });
        check("HTML kaçış testi", escapeHtmlText("<scr" + "ipt>alert(1)<" + "/scr" + "ipt>").includes("&lt;script&gt;") && !escapeHtmlText("<scr" + "ipt>alert(1)<" + "/scr" + "ipt>").includes("<script>"));
        const scenarios = [
          ["Kan tahlillerimi yorumla", "Laboratuvar özeti"],
          ["D vitamini ve magnezyum hakkında bilgi", "D vitamini / K2"],
          ["B12 ve folat sonuçlarım", "B12"],
          ["Ferritin ve demir eksikliği", "Demir ve ferritin"],
          ["Omega-3 ne zaman alınır", "Omega-3 (EPA/DHA)"],
          ["Çinko eksikliği nedir", "Çinko"],
          ["Kreatin ve kolajen hakkında bilgi", "Kreatin"],
          ["Başım ağrıyor", "Baş ağrısı"],
          ["Sürekli yorgunluk ve saç dökülmesi", "Yorgunluk / halsizlik"],
          ["Başım dönüyor ve uyuyamıyorum", "Baş dönmesi"],
          ["Elimde karıncalanma var", "Uyuşma / karıncalanma"],
          ["Kan tahlilimde ALT ve kreatinin nasıl", "Laboratuvar özeti"],
          ["Magnezyum ve levotiroksin etkileşimi var mı", "İlaç-takviye etkileşimi"],
          ["Çinko ve antibiyotik etkileşimi", "İlaç-takviye etkileşimi"],
          ["Warfarin ile K2 etkileşimi", "İlaç-takviye etkileşimi"],
          ["Barkod okuttuğum takviyeyi hangi saatte alırım", "Form ve zamanlama"],
          ["Profilim ve günlük su hedefim", "Profil ve günlük takip"],
          ["Göğsüm ağrıyor", "112"],
          ["Nefes alamıyorum", "112"]
        ];
        scenarios.forEach(([query, expected], index) => {
          const output = VitaAIChat.previewLocalReply(query);
          const matches = output.toLocaleLowerCase("tr-TR").includes(expected.toLocaleLowerCase("tr-TR"));
          check(`Yerel yanıt senaryosu ${index + 1}: ${query}`, matches, matches ? `Beklenen konu bulundu: ${expected}` : `Beklenen konu bulunamadı: ${expected}`);
        });
        const multiTopicCases = [
          { query: "Magnezyum ve D vitamini tahlillerimi birlikte yorumla", labels: ["Magnezyum", "D vitamini / K2", "Laboratuvar özeti"] },
          { query: "Baş ağrısı, yorgunluk ve B12 hakkında bilgi", labels: ["Baş ağrısı", "Yorgunluk / halsizlik", "B12"] },
          { query: "Kreatin kullanımı, eGFR ve magnezyum", labels: ["Kreatin", "Böbrek / eGFR", "Magnezyum"] },
          { query: "Ferritin, B12 ve folat sonuçlarıma bak", labels: ["Demir ve ferritin", "B12", "Folat / B9", "Laboratuvar özeti"] }
        ];
        multiTopicCases.forEach((scenario, index) => {
          const output = VitaAIChat.previewLocalReply(scenario.query);
          const missing = scenario.labels.filter(label => !output.toLocaleLowerCase("tr-TR").includes(label.toLocaleLowerCase("tr-TR")));
          check(`Çok konulu birleştirme ${index + 1}: ${scenario.query}`, missing.length === 0, missing.length ? `Eksik başlıklar: ${missing.join(", ")}` : `Tüm başlıklar üretildi: ${scenario.labels.join(", ")}`);
        });
        // Depolama geri yükleme ve PDF günlüklerinin birleştirilmesi için saf regresyon testleri.
        check("IndexedDB snapshot, eşit veya daha eski localStorage damgasında geri yüklenir", shouldRestoreVitaExtendedSnapshot({ updatedAt: 200 }, 200) && shouldRestoreVitaExtendedSnapshot({ updatedAt: 200 }, 199));
        check("Daha yeni localStorage durumu, eski IndexedDB snapshot'ını ezmez", !shouldRestoreVitaExtendedSnapshot({ updatedAt: 199 }, 200));
        const priorActiveUserForTest = activeUserId;
        let asyncUserIsolationPass = false;
        try {
          activeUserId = "vita-test-account-b";
          asyncUserIsolationPass = !isVitaActiveUser("vita-test-account-a") && isVitaActiveUser("vita-test-account-b");
        } finally { activeUserId = priorActiveUserForTest; }
        check("Asenkron IndexedDB işlemi hesap değiştiğinde kullanıcı izolasyonunu koruyor", asyncUserIsolationPass);
        const pdfMerge = mergeVitaPdfScanLogs(
          [{ id: "same", userId: "u1", scannedAt: "2024-02-02T00:00:00Z", source: "idb" }, { id: "other", userId: "u1", scannedAt: "2024-02-01T00:00:00Z" }, { id: "private", userId: "u2", scannedAt: "2024-03-01T00:00:00Z" }],
          [{ id: "same", userId: "u1", scannedAt: "2024-02-01T00:00:00Z", source: "local" }, { id: "older", userId: "u1", scannedAt: "2024-01-01T00:00:00Z" }],
          "u1"
        );
        check("PDF günlükleri localStorage + IndexedDB birleştirilir, tekilleştirilir ve kullanıcıya göre yalıtılır", pdfMerge.length === 3 && pdfMerge[0].source === "idb" && !pdfMerge.some(row => row.userId === "u2"));
        check("IndexedDB tam snapshot içinde profil/takviye/not alanları mevcut", /snapshotVersion: 2/.test(buildVitaExtendedSnapshot.toString()) && /supplements:/.test(buildVitaExtendedSnapshot.toString()) && /doctorNotes:/.test(buildVitaExtendedSnapshot.toString()));
        check("saveState başarısız yerel yazımda damgayı her durumda ilerletmiyor", /if \(allSaved\)/.test(saveState.toString()) && /vitatakip_extended_updated_/.test(saveState.toString()));

        // Uygulamanın kendi oluşturduğu FHIR Bundle'ı gerçekçi sentetik verilerle denetle.
        const savedFhirState = {
          user: state.user, supplements: state.supplements, hydration: state.hydration,
          labValues: state.labValues, labReferences: state.labReferences, labHistory: state.labHistory,
          selectedSymptoms: state.selectedSymptoms, resolvedSymptoms: state.resolvedSymptoms,
          supplementReviews: state.supplementReviews, lastCDSS: state.lastCDSS
        };
        try {
          state.user = { ...defaultUserProfile, name: "Test Kullanıcı", age: 30, gender: "K", height: 165, weight: 60, bmi: 22 };
          state.supplements = [{ id: "test-sup", name: "Test Takviyesi", selectedForm: "tablet", doseText: "Etiket talimatı", timing: "Sabah", addedDate: Date.UTC(2024, 4, 10), taken: false, instruction: "Sentetik test kaydı" }];
          state.hydration = { current: 0, target: 2000 };
          state.labValues = { d3: 24.5, b12: 350, ferritin: null, mg: null, ca: null, zinc: null, creatinine: 0.9, folate: null, alt: null, hb: null, mcv: null, crp: null };
          state.labReferences = { d3: "30-60 ng/mL", b12: "200-900 pg/mL" };
          state.labHistory = [
            { id: "test-lab-1", date: "2024-05-11", timestamp: Date.UTC(2024, 4, 11), d3: 24.5, b12: 350, creatinine: 0.9, references: { d3: "30-60 ng/mL" } },
            { id: "test-lab-2", date: "2024-03-10", timestamp: Date.UTC(2024, 2, 10), d3: 19.2, references: { d3: "30-60 ng/mL" } }
          ];
          const anySymptomKey = Object.keys(ANAMNESIS_DICTIONARY)[0];
          state.selectedSymptoms = new Set(anySymptomKey ? [anySymptomKey] : []);
          state.resolvedSymptoms = new Set();
          state.supplementReviews = {};
          state.lastCDSS = null;
          const generated = buildVitaFHIRBundle();
          const generatedValidation = validateVitaFHIRBundle(generated);
          const generatedObs = generated.entry.filter(entry => entry.resource?.resourceType === "Observation" && entry.resource.category?.some(category => category.coding?.some(coding => coding.code === "laboratory")));
          check("VitaTakip tarafından üretilen FHIR Bundle sentetik klinik verilerle yapısal kontrolden geçiyor", generatedValidation.valid, generatedValidation.errors.join(" | "));
          check("FHIR tarihsel tahlillerin ölçüm tarihlerini koruyor", generatedObs.some(entry => entry.resource.effectiveDateTime === "2024-05-11") && generatedObs.some(entry => entry.resource.effectiveDateTime === "2024-03-10"));
          check("FHIR üretilen Bundle Observation/MedicationStatement/Condition tiplerini uygun şekilde dahil ediyor", generated.entry.some(entry => entry.resource?.resourceType === "Observation") && generated.entry.some(entry => entry.resource?.resourceType === "MedicationStatement") && (state.selectedSymptoms.size === 0 || generated.entry.some(entry => entry.resource?.resourceType === "Condition")));
        } catch (fhirTestError) {
          check("VitaTakip tarafından üretilen FHIR Bundle sentetik klinik verilerle yapısal kontrolden geçiyor", false, String(fhirTestError && fhirTestError.message || fhirTestError));
        } finally {
          state.user = savedFhirState.user; state.supplements = savedFhirState.supplements; state.hydration = savedFhirState.hydration;
          state.labValues = savedFhirState.labValues; state.labReferences = savedFhirState.labReferences; state.labHistory = savedFhirState.labHistory;
          state.selectedSymptoms = savedFhirState.selectedSymptoms; state.resolvedSymptoms = savedFhirState.resolvedSymptoms;
          state.supplementReviews = savedFhirState.supplementReviews; state.lastCDSS = savedFhirState.lastCDSS;
        }

        const expandedMultiTopicCases = [
          { query: "Baş ağrısı, magnezyum, D vitamini ve tahlil sonuçları", labels: ["Baş ağrısı", "Magnezyum", "D vitamini / K2", "Laboratuvar özeti"] },
          { query: "Ferritinim, saç dökülmem ve demir ilac bilgisi", labels: ["Demir ve ferritin", "Saç / tırnak", "İlaç bilgisi"] },
          { query: "Çinko ve omega-3 alıyorum, ilaç etkileşimi var mı?", labels: ["Çinko", "Omega-3 (EPA/DHA)", "İlaç-takviye etkileşimi"] },
          { query: "ALT yüksekliği, kreatinin, eGFR ve magnezyum", labels: ["Karaciğer / ALT", "Böbrek / eGFR", "Magnezyum"] },
          { query: "Uyuyamıyorum, yorgunum ve B12 sonucumu merak ediyorum", labels: ["Uyku", "Yorgunluk / halsizlik", "B12"] },
          { query: "D vitamini, kalsiyum, K2 ve böbrek değerlerim", labels: ["D vitamini / K2", "Kalsiyum", "Böbrek / eGFR"] },
          { query: "Kolajen, kreatin ve günlük su hedefim", labels: ["Kolajen", "Kreatin", "Profil ve günlük takip"] },
          { query: "Magnezyum kullanıyorum, tiroid ilacım da var, tahlillerime bak", labels: ["Magnezyum", "İlaç-takviye etkileşimi", "Laboratuvar özeti"] }
        ];
        expandedMultiTopicCases.forEach((scenario, index) => {
          const output = VitaAIChat.previewLocalReply(scenario.query).toLocaleLowerCase("tr-TR");
          const missing = scenario.labels.filter(label => !output.includes(label.toLocaleLowerCase("tr-TR")));
          check(`Geniş çok konulu test ${index + 1}: ${scenario.query}`, missing.length === 0, missing.length ? `Eksik başlıklar: ${missing.join(", ")}` : "Beklenen tüm konular üretildi.");
        });

        const failed = results.filter(item => !item.passed);
        return { passed: results.length - failed.length, failed: failed.length, results };
      }
    };

    /* UYGULAMA BAŞLANGIÇ ÇALIŞTIRICI: açılış ekranı yaklaşık 2 saniyede kapanır. */
    