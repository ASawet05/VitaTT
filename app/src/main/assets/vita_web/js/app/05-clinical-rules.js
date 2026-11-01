const KDSSRuleEngine = {
      createBadge(statusText, color) {
        const colorStyles = {
          red: 'bg-rose-100 text-rose-800 border-rose-300',
          yellow: 'bg-amber-100 text-amber-800 border-amber-300',
          green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          blue: 'bg-sky-100 text-sky-800 border-sky-300'
        };
        const icons = {
          red: 'fa-triangle-exclamation text-rose-600',
          yellow: 'fa-circle-exclamation text-amber-600',
          green: 'fa-circle-check text-emerald-600',
          blue: 'fa-circle-info text-sky-600'
        };

        const style = colorStyles[color] || 'bg-slate-100 text-slate-800 border-slate-300';
        const icon = icons[color] || 'fa-circle-info';

        return `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${style}">
          <i class="fa-solid ${icon}"></i>
          <span>${statusText}</span>
        </span>`;
      },

      evaluate(key, value, gender = 'K', referenceText = '') {
        if (value === null || value === undefined || isNaN(value)) {
          return {
            statusText: 'Ölçülmedi',
            tier: 'none',
            color: 'gray',
            badgeHtml: '<span class="text-[11px] text-slate-400 font-semibold italic">Girilmedi</span>',
            isLow: false,
            isHigh: false,
            isToxic: false
          };
        }

        const val = parseFloat(value);
        let statusText = '';
        let color = 'green';
        let tier = 'optimal';
        let isLow = false;
        let isHigh = false;
        let isToxic = false;

        switch (key) {
          case 'b12':
            if (val < 200) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val <= 399) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 800) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else if (val <= 1200) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;

          case 'd3':
            if (val < 20) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val < 30) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 60) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else if (val <= 100) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;

          case 'ferritin':
            if (gender === 'E') {
              if (val < 30) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
              else if (val < 50) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
              else if (val <= 150) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
              else if (val <= 350) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
              else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            } else {
              if (val < 15) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
              else if (val < 50) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
              else if (val <= 120) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
              else if (val <= 250) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
              else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            }
            break;

          case 'mg':
            if (val < 1.6) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val <= 1.9) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 2.4) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else if (val <= 2.7) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;

          case 'ca':
            if (val < 8.2) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val <= 8.5) { statusText = 'Sınırda Düşük'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 10.2) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else if (val <= 10.8) { statusText = 'Sınırda Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;

          case 'zinc':
            if (val < 55) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val < 70) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 110) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else if (val <= 130) { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;

          case 'creatinine': {
            const crUpperNormal = gender === 'E' ? 1.25 : 1.10;
            const crBorderline = gender === 'E' ? 1.40 : 1.25;
            if (val < 0.5) { statusText = 'Düşük (Kas Kütlesi / Beslenme)'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= crUpperNormal) { statusText = 'Optimal / Normal'; color = 'green'; tier = 'optimal'; }
            else if (val <= crBorderline) { statusText = 'Sınırda Yüksek'; color = 'yellow'; tier = 'borderline_high'; isHigh = true; }
            else { statusText = 'Kritik Yüksek (Renal Risk)'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;
          }

          case 'folate':
            if (val < 4.0) { statusText = 'Kritik Düşük'; color = 'red'; tier = 'critical_low'; isLow = true; }
            else if (val < 7.0) { statusText = 'Sınırda / Yetersiz'; color = 'yellow'; tier = 'borderline_low'; isLow = true; }
            else if (val <= 20.0) { statusText = 'Optimal / İyi'; color = 'green'; tier = 'optimal'; }
            else { statusText = 'Yüksek'; color = 'blue'; tier = 'high'; isHigh = true; }
            break;

          case 'alt':
            if (val <= 35) { statusText = 'Optimal / Normal'; color = 'green'; tier = 'optimal'; }
            else if (val <= 50) { statusText = 'Sınırda Yüksek'; color = 'yellow'; tier = 'borderline_high'; isHigh = true; }
            else { statusText = '⚠️ Hepatik Güvenlik Uyarısı (Hekim Kontrolü Gerekli)'; color = 'red'; tier = 'critical_high'; isHigh = true; isToxic = true; }
            break;
        }

        // Bu bitirme projesi prototipi, önceden tanımlı eşiklere göre sınıflandırmayı
        // kullanıcıya görünür kılar. Laboratuvarın kendi referans aralığı ve klinik
        // bağlamı farklılık gösterebileceğinden sonuç hekimle birlikte değerlendirilmelidir.
        const parsedReference = isVitaLabReferenceCompatible(key, referenceText) ? parseVitaLabReferenceRange(referenceText) : null;
        // Girilen referans aralığı ayrıca görünür; mevcut sınıflandırma etiketleri korunur.
        // Referans aralığı yoksa sabit sınıflandırma prototip amaçlıdır, kesin tanı değildir.
        return { statusText, tier, color, badgeHtml: this.createBadge(statusText, color), isLow, isHigh, isToxic };
      }
    };

    /* PHARMACEUTICAL FORM CONFIGURATION OBJECT (HEKİM GÖZETİMİ KALKANI İLE GÜÇLENDİRİLMİŞ) */
    const FORM_DOSAGE_CONFIG = {
      "D3_K2": {
        name: "D3 + K2 Vitamini",
        defaultForm: "Damla",
        reviewDays: 60,
        forms: {
          "Damla": (weight) => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Doz bu prototip tarafından hesaplanmaz", timing: "Sabah", instruction: "Yağda çözünür; kahvaltıda veya sağlıklı yağ içeren ana öğünle birlikte alınız. ⚠️ Kesin günlük damla dozunuz hekiminiz tarafından kan tahlili sonucunuza göre reçete edilmelidir." }),
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Doz bu prototip tarafından hesaplanmaz", timing: "Sabah", instruction: "Tok karnına kahvaltı ile birlikte yutunuz. Hekiminizin onayladığı dozajda kullanınız." }),
          "Sprey": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Sublingual / ağız içi sprey formu", timing: "Sabah", instruction: "Ağız içine veya dil altına püskürterek alınız. Hekim kontrolünde kullanılmalıdır." })
        }
      },
      "Omega3": {
        name: "Omega-3 Balık Yağı (EPA / DHA)",
        defaultForm: "Yumusak_Kapsul",
        reviewDays: 30,
        forms: {
          "Yumusak_Kapsul": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Trigliserid form; içerik etiketten doğrulanmalı", timing: "Öğle", instruction: "Günün en zengin ana öğünüyle birlikte alınız; aç karnına bazı kişilerde reflü veya balık tadı yapabilir. Ürünün etiketindeki porsiyon ve kullanım talimatını izleyiniz." }),
          "Sıvı_Yağ": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Sıvı yağ formu; ölçü etiketten doğrulanmalı", timing: "Öğle", instruction: "Yemek esnasında veya hemen sonrasında tüketiniz. Ölçüyü ve porsiyonu ürün etiketine göre belirleyiniz." })
        },
        safetyLock: "⚠️ Kanama Riski Uyarısı: Kan sulandırıcı (Coumadin, Aspirin vb.) ilaç kullanan bireylerde yüksek doz Omega-3 kanama süresini uzatabilir; hekim onayı olmadan kesinlikle kullanılmamalıdır."
      },
      "Demir": {
        name: "Demir (Fe)",
        defaultForm: "Saşe",
        reviewDays: 45,
        forms: {
          "Saşe": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Saşe formu; elemental demir miktarını etiketten doğrulayın", timing: "Öğle", instruction: "Bir bardak suyla karıştırınız. C vitaminiyle birlikte kullanım ve kullanım sıklığını ürün etiketindeki veya hekiminizin verdiği plandaki talimata göre doğrulayınız." }),
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Kapsül formu; içerik etiketten doğrulanmalı", timing: "Öğle", instruction: "Öğle yemeğinden yaklaşık 2 saat sonra bol suyla alınız; ürün etiketi veya kişisel hekiminiz/eczacınız farklı talimat verdiyse onu izleyiniz." }),
          "Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Tablet formu; içerik etiketten doğrulanmalı", timing: "Öğle", instruction: "Yemek arası veya aç karnına bol suyla kullanım bazı ürünlerde önerilebilir. Ürünün etiketini ve size verilen kişisel kullanım talimatını esas alınız." })
        },
        safetyLock: "⚠️ Toksisite Uyarısı: Yetişkinlerde demir vücuttan aktif olarak atılamaz ve organlarda birikir. Kesinlikle kilonun katlarına göre doz hesaplanmaz; kanda Ferritin ve Hemoglobin düzeyine göre yalnızca uzman hekimce planlanır."
      },
      "B12": {
        name: "B12 Vitamini (Metilkobalamin)",
        defaultForm: "Dilaltı_Tablet",
        reviewDays: 35,
        forms: {
          "Dilaltı_Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Sublingual aktif form (mide asidini baypas eder)", timing: "Sabah", instruction: "Sabah aç karnına dil altında tamamen eriyene kadar bekletiniz. Hekim önerisine göre kullanınız." }),
          "Dilaltı_Sprey": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Yüksek biyoyararlanımlı sprey formu", timing: "Sabah", instruction: "Sabahları dil altına sıkarak 30 saniye yutkunmadan bekleyiniz. Hekim gözetiminde alınız." }),
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Klasik oral form (bağırsaktan pasif difüzyon)", timing: "Sabah", instruction: "Sabah kahvaltısı ile birlikte bol suyla yutunuz. Hekim tavsiyesine uyunuz." })
        }
      },
      "Folat": {
        name: "Folat (Metilfolat / B9)",
        defaultForm: "Kapsül",
        reviewDays: 28,
        forms: {
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Aktif 5-MTHF (Metiltetrahidrofolat) formu", timing: "Sabah", instruction: "Sabah kahvaltısı ile birlikte alınız; B12 ile sinerjik metilasyon döngüsünü destekler. Hekim kontrolünde tüketiniz." }),
          "Dilaltı_Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Hızlı emilimli sublingual metilfolat", timing: "Sabah", instruction: "Sabah aç karnına dil altında eritiniz. Hekim gözetiminde alınız." }),
          "Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Standart aktif folat tableti", timing: "Sabah", instruction: "Bol su ile yutunuz. Hekim onayıyla kullanınız." })
        }
      },
      "Magnezyum": {
        name: "Magnezyum Kompleks",
        defaultForm: "Tablet",
        reviewDays: 21,
        forms: {
          "Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Magnezyum Malat (kas/enerji) veya Sitrat", timing: "Akşam", instruction: "Akşam yemeğinden 1–2 saat sonra bol suyla alınız. Böbrek hastalığı veya düzenli ilaç kullanımı varsa etkileşim olasılığını eczacı/hekimle doğrulayınız." }),
          "Saşe": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Magnezyum Bisglisinat (uyku/stres/sinir sistemi)", timing: "Akşam", instruction: "Yatmadan yaklaşık 1 saat önce bir bardak ılık suyla karıştırıp içiniz. Ürün etiketindeki porsiyonu aşmayınız." }),
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Şelatlı magnezyum formu", timing: "Akşam", instruction: "Yatmadan önce bol suyla alınız. Ürünün etiketindeki kullanım talimatını izleyiniz." })
        }
      },
      "Çinko": {
        name: "Çinko (Pikolinat / Bisglisinat)",
        defaultForm: "Kapsül",
        reviewDays: 30,
        forms: {
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Çinko Pikolinat veya Bisglisinat formu", timing: "Öğle", instruction: "Aç karnına bulantı yapabileceğinden öğle yemeğinden 1–2 saat sonra alınız. Demir ve kalsiyum ile aynı anda almayınız. ⚠️ Uzun süreli yüksek doz (>40 mg/gün) çinko kullanımı bakır (Cu) eksikliğine ve sideroblastik anemiye yol açabileceğinden yalnızca hekim kontrolünde kullanılmalıdır." }),
          "Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Standart çinko tableti", timing: "Öğle", instruction: "Tok karnına bol su ile alınız. Hekiminizin önerdiği süreyi ve dozu aşmayınız." })
        },
        safetyLock: "⚠️ Bakır Antagonizması Uyarısı: Uzun süreli yüksek doz çinko alımı bağırsakta metallotiyonein sentezini artırarak Bakır (Cu) emilimini bloke eder."
      },
      "Kolajen": {
        name: "Kolajen Peptitleri (Tip 1-2-3)",
        defaultForm: "Saşe",
        reviewDays: 60,
        forms: {
          "Saşe": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Hidrolize kolajen peptit tozu + C vitamini", timing: "Akşam", instruction: "Gece yatmadan önce bir bardak ılık suyla karıştırarak tüketiniz. Etikette belirtilen porsiyonu aşmayınız." }),
          "Sıvı_Shot": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Kullanıma hazır sıvı kolajen peptiti", timing: "Akşam", instruction: "Gece kullanmayı tercih ediyorsanız ürün etiketindeki porsiyonu doğrudan tüketiniz; saklama ve kullanım talimatını izleyiniz." }),
          "Tablet": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Standart hidrolize kolajen tableti", timing: "Akşam", instruction: "Akşam öğünü sonrasında kullanmayı planlıyorsanız, C vitaminiyle birlikte kullanımın uygunluğunu ürün etiketi ve kişisel planınıza göre doğrulayınız." })
        }
      },
      "Kreatin": {
        name: "Kreatin Monohidrat",
        defaultForm: "Toz",
        reviewDays: 28,
        forms: {
          "Toz": (weight) => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Mikronize kreatin monohidrat tozu (Sporcu Desteği)", timing: "Öğle", instruction: "Böbrek süzme hızınız (eGFR) ve kreatinin değeriniz normal ise kullanılabilir. Mutlaka hekiminize danışınız ve günde bol su içiniz." }),
          "Kapsül": () => ({ doseText: "Etiket / hekim planındaki miktarı girin", subText: "Pratik taşıma formu", timing: "Öğle", instruction: "Bol su eşliğinde yutunuz. Hekim gözetiminde alınız." })
        }
      }
    };

    /* RESMİ CKD-EPI (2021) eGFR FORMÜLÜ VE BÖBREK EVRELEMESİ */
    function classifyGFRStage(egfr) {
      const value = Number(egfr);
      if (!Number.isFinite(value) || value < 0) return null;
      if (value >= 90) return { stage: "G1", desc: "Normal / yüksek eGFR; diğer bulgularla birlikte yorumlanır", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300", riskLevel: "normal" };
      if (value >= 60) return { stage: "G2", desc: "Hafif azalma; tek başına kronik böbrek hastalığı tanısı koydurmaz", badgeClass: "bg-teal-100 text-teal-800 border-teal-300", riskLevel: "mild" };
      if (value >= 45) return { stage: "G3a", desc: "Hafif-orta düzey eGFR azalması", badgeClass: "bg-amber-100 text-amber-800 border-amber-300", riskLevel: "moderate" };
      if (value >= 30) return { stage: "G3b", desc: "Orta-ileri düzey eGFR azalması", badgeClass: "bg-orange-100 text-orange-800 border-orange-300", riskLevel: "high" };
      if (value >= 15) return { stage: "G4", desc: "Ciddi eGFR azalması; hekim değerlendirmesi gerekir", badgeClass: "bg-rose-100 text-rose-800 border-rose-300", riskLevel: "severe" };
      return { stage: "G5", desc: "Çok ciddi eGFR azalması; gecikmeden sağlık profesyoneli değerlendirmesi gerekir", badgeClass: "bg-rose-100 text-rose-800 border-rose-300", riskLevel: "very-severe" };
    }

    function calculateCKDEPI_eGFR(creatinine, age, gender) {
      const scr = Number(creatinine);
      const ageYears = Number(age);
      if (!Number.isFinite(scr) || scr <= 0 || !Number.isFinite(ageYears) || ageYears < 1 || ageYears > 120) return null;


      const isFemale = (gender === 'K' || gender === 'female');
      const kappa = isFemale ? 0.7 : 0.9;
      const alpha = isFemale ? -0.241 : -0.302;
      const genderMultiplier = isFemale ? 1.012 : 1.0;

      const scrRatio = scr / kappa;
      const expTerm = (scrRatio <= 1) ? Math.pow(scrRatio, alpha) : Math.pow(scrRatio, -1.200);
      const ageTerm = Math.pow(0.9938, ageYears);

      const egfr = Math.round(142 * expTerm * ageTerm * genderMultiplier);

      const stageInfo = classifyGFRStage(egfr);
      const { stage, desc, badgeClass, riskLevel } = stageInfo;
      const interpretationNote = egfr < 60
        ? "eGFR 60 mL/dk/1.73m² altında: klinik değerlendirme ve önceki ölçümlerle karşılaştırma gerekir. Kronik böbrek hastalığı tanısı için bulgunun en az 3 ay sürmesi ve/veya diğer böbrek hasarı göstergeleri değerlendirilmelidir."
        : "eGFR tek başına böbrek hastalığını doğrulamaz veya dışlamaz; yaş, klinik durum, idrar bulguları ve laboratuvar referanslarıyla birlikte değerlendirilmelidir.";

      return {
        egfr,
        stage,
        stageCode: stage,
        desc,
        stageName: desc,
        badgeClass,
        riskLevel,
        interpretationNote,
        clinicalNote: interpretationNote,
        badgeHtml: `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${badgeClass}" title="${interpretationNote}">
          <i class="fa-solid fa-droplet-slash text-[9px]"></i>
          <span>eGFR: ${egfr} mL/dk/1.73m² (Evre ${stage})</span>
        </span>`
      };
    }

    /* AKILLI KONTROL TAHLİLİ ZAMANLAMASI HESAPLAYICI */
    function calculateRecallDate(labDateStr) {
      let baseDate = new Date();
      if (labDateStr) {
        const parsed = new Date(labDateStr + "T00:00:00");
        if (!isNaN(parsed.getTime())) baseDate = parsed;
      }

      const labs = state.labValues || {};
      // This is a user reminder only; repeat-test timing is not inferred from generic thresholds.
      const daysToAdd = 180;
      const reason = "Bu tarih yalnızca uygulama içi hatırlatma amaçlıdır; tekrar tahlil zamanı bu hesapla belirlenmez. Doktorunuzun önerdiği kontrol tarihini esas alın.";
      const badgeText = "!";
      const badgeClass = "bg-sky-100 text-sky-800 border-sky-300";
      const icon = "fa-calendar-check text-sky-600";

      const targetDate = new Date(baseDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      return {
        dateFormatted: targetDate.toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' }),
        reason, badgeText, badgeClass, icon
      };
    }

    function togglePasswordVisibility(inputId, btn) {
      const input = document.getElementById(inputId);
      if (!input) return;
      const icon = btn.querySelector('i');
      if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
      } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
      }
    }

    /* GLOBAL STATE TANIMLAMALARI */
    

    /* Vitamin/mineral/hemogram parametrelerinin sınıflandırması VitaLabEvidence'a (16-lab-evidence.js) devredilir:
       laboratuvar referansı, kaynaklı klinik eşik, belirsizlik ve takviye gereksinimi ayrı değerlendirilir.
       Önceki sabit eşikler (ör. B12 400–800 "optimal", >1200 "toksik") yalnızca KDSSRuleEngine.evaluateLegacy içinde
       arşiv olarak durur; kreatinin ve ALT güvenlik süzgeci eskisi gibi çalışır. Kaynak/gerekçe: docs/LAB_THRESHOLDS.md */
    KDSSRuleEngine.evaluateLegacy = KDSSRuleEngine.evaluate;
    KDSSRuleEngine.evaluate = function (key, value, gender = 'K', referenceText = '') {
      const missing = value === null || value === undefined || value === '' || (typeof value !== 'number' && isNaN(Number(value)));
      if (missing || !window.VitaLabEvidence || !VitaLabEvidence.handles(key)) {
        return KDSSRuleEngine.evaluateLegacy(key, missing ? null : value, gender, referenceText);
      }
      let ctx = {};
      try { ctx = window.VitaLabInsights ? VitaLabInsights.contextValues() : {}; } catch (_) { ctx = {}; }
      return VitaLabEvidence.evaluateForEngine(key, value, gender, referenceText, ctx);
    };

