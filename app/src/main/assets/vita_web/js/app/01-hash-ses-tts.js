
    /* 0. SIFIR BAĞIMLILIKLI (OFFLINE) SAF JS SHA-256 HASH MOTORU */
    function sha256(ascii) {
      function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
      }
      const mathPow = Math.pow;
      const maxWord = mathPow(2, 32);
      let result = '';
      const words = [];
      const asciiBitLength = ascii.length * 8;
      const hash = [];
      const k = [];
      let primeCounter = 0;
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (let i = candidate * 2; i < 313; i += candidate) {
            isComposite[i] = true;
          }
          if (primeCounter < 8) {
            hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
          }
          k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
          primeCounter++;
        }
      }
      ascii += '\x80';
      while (ascii.length % 64 - 56) ascii += '\x00';
      for (let i = 0; i < ascii.length; i++) {
        const j = ascii.charCodeAt(i);
        words[i >> 2] |= j << ((3 - i) % 4) * 8;
      }
      words[words.length] = (asciiBitLength / maxWord) | 0;
      words[words.length] = asciiBitLength | 0;
      for (let j = 0; j < words.length;) {
        const w = words.slice(j, j += 16);
        const oldHash = hash.slice(0);
        for (let i = 0; i < 64; i++) {
          const w15 = w[i - 15], w2 = w[i - 2];
          const a = hash[0], e = hash[4];
          const temp1 = hash[7]
            + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
            + ((e & hash[5]) ^ ((~e) & hash[6]))
            + k[i]
            + (w[i] = (i < 16) ? w[i] : (
                w[i - 16]
                + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                + w[i - 7]
                + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
              ) | 0
            );
          const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
            + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
          hash[7] = hash[6];
          hash[6] = hash[5];
          hash[5] = hash[4];
          hash[4] = (hash[3] + temp1) | 0;
          hash[3] = hash[2];
          hash[2] = hash[1];
          hash[1] = hash[0];
          hash[0] = (temp1 + temp2) | 0;
        }
        for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
      }
      for (let i = 0; i < 8; i++) {
        for (let j = 3; j >= 0; j--) {
          const b = (hash[i] >> (j * 8)) & 255;
          result += ((b < 16) ? '0' : '') + b.toString(16);
        }
      }
      return result;
    }

    /* 1. MODÜL: WEB AUDIO API ETKİLEŞİM SES MOTORU */
    const SoundEffects = (() => {
      let ctx = null;
      function getContext() {
        if (!ctx) {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          if (AudioContextClass) ctx = new AudioContextClass();
        }
        if (ctx && ctx.state === 'suspended') ctx.resume();
        return ctx;
      }
      return {
        playClick() {
          try {
            const audioCtx = getContext();
            if (!audioCtx) return;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const now = audioCtx.currentTime;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.045);
          } catch (e) {}
        },
        playNavigate() {
          try {
            const audioCtx = getContext();
            if (!audioCtx) return;
            const now = audioCtx.currentTime;
            const osc1 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(440, now);
            gain1.gain.setValueAtTime(0.12, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc1.start(now);
            osc1.stop(now + 0.08);

            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(660, now + 0.05);
            gain2.gain.setValueAtTime(0.14, now + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.start(now + 0.05);
            osc2.stop(now + 0.16);
          } catch (e) {}
        },
        playSuccess() {
          try {
            const audioCtx = getContext();
            if (!audioCtx) return;
            const notes = [523.25, 659.25, 783.99];
            const now = audioCtx.currentTime;
            notes.forEach((freq, idx) => {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              const startTime = now + (idx * 0.07);
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(0.18, startTime);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.28);
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.start(startTime);
              osc.stop(startTime + 0.3);
            });
          } catch (e) {}
        }
      };
    })();
    window.SoundEffects = SoundEffects;

    /* 2. MODÜL: TÜRKÇE SESLİ OKUMA MOTORU (TTS) */
    const TTSVoice = (() => {
      let turkishVoice = null;
      let isReading = false;
      let activeReadButton = null;
      let utteranceToken = 0;
      function loadVoices() {
        if ('speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices();
          turkishVoice = voices.find(v => v.lang === 'tr-TR' || v.lang.startsWith('tr')) || null;
        }
      }
      function syncButtonState(button, active) {
        const targetButton = button || activeReadButton || document.getElementById('btnTtsReadAnalysis');
        const icon = document.getElementById('ttsReadButtonIcon');
        const label = document.getElementById('ttsReadButtonLabel');
        const visualizer = document.getElementById('ttsAudioVisualizer');
        if (targetButton) targetButton.setAttribute('aria-pressed', active ? 'true' : 'false');
        if (icon) {
          icon.classList.toggle('fa-volume-high', !active);
          icon.classList.toggle('fa-circle-stop', active);
          icon.classList.toggle('text-teal-600', !active);
          icon.classList.toggle('text-rose-600', active);
        }
        if (label) label.textContent = active ? 'Dinlemeyi Durdur' : 'Sesli Dinle';
        if (visualizer) {
          visualizer.classList.toggle('hidden', !active);
          visualizer.classList.toggle('is-active', active);
        }
        if (targetButton) {
          targetButton.classList.toggle('bg-rose-50', active);
          targetButton.classList.toggle('hover:bg-rose-100', active);
          targetButton.classList.toggle('text-rose-800', active);
          targetButton.classList.toggle('border-rose-300', active);
          targetButton.classList.toggle('bg-teal-50', !active);
          targetButton.classList.toggle('hover:bg-teal-100', !active);
          targetButton.classList.toggle('text-teal-800', !active);
          targetButton.classList.toggle('border-teal-300', !active);
        }
        if (!active) activeReadButton = null;
      }
      if ('speechSynthesis' in window) {
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
      return {
        speak(text, button = null) {
          if (!('speechSynthesis' in window)) {
            syncButtonState(button, false);
            showToast("Desteklenmiyor", "Tarayıcınız ses sentezini desteklemiyor.", "warning");
            return;
          }
          window.speechSynthesis.cancel();
          utteranceToken += 1;
          const thisUtteranceToken = utteranceToken;
          isReading = false;
          syncButtonState(activeReadButton, false);
          if (!text || text.trim() === '') return;
          activeReadButton = button || document.getElementById('btnTtsReadAnalysis');
          isReading = true;
          syncButtonState(activeReadButton, true);
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'tr-TR';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          utterance.onstart = () => {
            if (thisUtteranceToken !== utteranceToken) return;
            isReading = true;
            syncButtonState(activeReadButton, true);
          };
          utterance.onend = () => {
            if (thisUtteranceToken !== utteranceToken) return;
            isReading = false;
            syncButtonState(activeReadButton, false);
          };
          utterance.onerror = () => {
            if (thisUtteranceToken !== utteranceToken) return;
            isReading = false;
            syncButtonState(activeReadButton, false);
          };
          if (!turkishVoice) loadVoices();
          if (turkishVoice) utterance.voice = turkishVoice;
          window.speechSynthesis.speak(utterance);
        },
        toggleCurrentAnalysis(button) {
          if (isReading || ('speechSynthesis' in window && window.speechSynthesis.speaking)) {
            this.stop();
            return;
          }
          this.readCurrentAnalysis(button);
        },
        readCurrentAnalysis(button = null) {
          const p = state.user;
          const labs = state.labValues || {};
          const gender = p ? p.gender : 'K';

          const d3E = KDSSRuleEngine.evaluate('d3', labs.d3, gender, state.labReferences?.d3 || '');
          const b12E = KDSSRuleEngine.evaluate('b12', labs.b12, gender, state.labReferences?.b12 || '');
          const ferE = KDSSRuleEngine.evaluate('ferritin', labs.ferritin, gender, state.labReferences?.ferritin || '');
          const mgE = KDSSRuleEngine.evaluate('mg', labs.mg, gender, state.labReferences?.mg || '');
          const caE = KDSSRuleEngine.evaluate('ca', labs.ca, gender, state.labReferences?.ca || '');
          const znE = KDSSRuleEngine.evaluate('zinc', labs.zinc, gender, state.labReferences?.zinc || '');
          const creaE = KDSSRuleEngine.evaluate('creatinine', labs.creatinine, gender, state.labReferences?.creatinine || '');
          const folE = KDSSRuleEngine.evaluate('folate', labs.folate, gender, state.labReferences?.folate || '');
          const altE = KDSSRuleEngine.evaluate('alt', labs.alt, gender, state.labReferences?.alt || '');
          const hbE = KDSSRuleEngine.evaluate('hb', labs.hb, gender, state.labReferences?.hb || '');
          const mcvE = KDSSRuleEngine.evaluate('mcv', labs.mcv, gender, state.labReferences?.mcv || '');
          const crpE = KDSSRuleEngine.evaluate('crp', labs.crp, gender, state.labReferences?.crp || '');
          const egfrRes = (labs.creatinine !== null && labs.creatinine !== undefined && typeof calculateCKDEPI_eGFR === 'function')
            ? calculateCKDEPI_eGFR(labs.creatinine, p?.age || 28, gender)
            : null;

          let speechParts = [];
          speechParts.push(`Sayın ${p?.name || 'Kullanıcı'}, klinik ve anamnez analiz özetiniz:`);

          if (labs.d3 !== null && labs.d3 !== undefined) speechParts.push(`D vitamini ${labs.d3} nanogram, ${d3E.statusText} seviyede.`);
          if (labs.b12 !== null && labs.b12 !== undefined) speechParts.push(`B12 vitamini ${labs.b12} pikogram, ${b12E.statusText} seviyede.`);
          if (labs.ferritin !== null && labs.ferritin !== undefined) speechParts.push(`Ferritin demir deposu ${labs.ferritin} nanogram, ${ferE.statusText} seviyede.`);
          if (labs.hb !== null && labs.hb !== undefined) speechParts.push(`Hemoglobin ${labs.hb} gram bölü desilitre, ${hbE.statusText} seviyede.`);
          if (labs.mcv !== null && labs.mcv !== undefined) speechParts.push(`MCV ortalama eritrosit hacmi ${labs.mcv} femtolitre, ${mcvE.statusText} seviyede.`);
          if (labs.crp !== null && labs.crp !== undefined) speechParts.push(`C-reaktif protein ${labs.crp} miligram bölü litre, ${crpE.statusText} seviyede.`);
          if (labs.mg !== null && labs.mg !== undefined) speechParts.push(`Magnezyum ${labs.mg} miligram, ${mgE.statusText} seviyede.`);
          if (labs.ca !== null && labs.ca !== undefined) speechParts.push(`Kalsiyum ${labs.ca} miligram, ${caE.statusText} seviyede.`);
          if (labs.zinc !== null && labs.zinc !== undefined) speechParts.push(`Çinko ${labs.zinc} mikrogram, ${znE.statusText} seviyede.`);
          if (labs.creatinine !== null && labs.creatinine !== undefined) {
            speechParts.push(`Kreatinin böbrek fonksiyonu ${labs.creatinine} miligram, ${creaE.statusText} seviyede${egfrRes ? `, tahmini GFR ${egfrRes.egfr} mililitre bölü dakika` : ''}.`);
          }
          if (labs.folate !== null && labs.folate !== undefined) speechParts.push(`Folat B9 vitamini ${labs.folate} nanogram, ${folE.statusText} seviyede.`);
          if (labs.alt !== null && labs.alt !== undefined) speechParts.push(`Karaciğer ALT enzimi ${labs.alt} ünite, ${altE.statusText} seviyede.`);

          if (state.selectedSymptoms && state.selectedSymptoms.size > 0) {
            speechParts.push(`Bildirdiğiniz ${state.selectedSymptoms.size} adet fiziksel semptom anamnezi değerlendirmeye dahil edilmiştir.`);
          }

          if (speechParts.length === 1) {
            speechParts.push("Henüz kayıtlı bir laboratuvar kan tahlili veya semptom anamnezi bulunmamaktadır.");
          } else {
            if (state.lastCDSS && state.lastCDSS.protocol && state.lastCDSS.protocol.length > 0) {
              speechParts.push(`Klinik karar motoru tablonuza uygun ${state.lastCDSS.protocol.length} adet takviye formu planlamıştır.`);
            } else {
              speechParts.push("Tüm temel değerleriniz dengelidir, aktif takviye endikasyonu bulunmamaktadır.");
            }
          }

          speechParts.push("Önemli Klinik Hatırlatma: Sunulan öneriler ön bilgilendirme simülasyonudur. Herhangi bir takviyeyi kullanmaya başlamadan önce mutlaka uzman hekiminize danışmalı, hekiminizin onayladığı şekilde kullanmaya başlamalısınız.");

          this.speak(speechParts.join(" "), button);
        },
        stop() {
          utteranceToken += 1;
          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
          isReading = false;
          syncButtonState(activeReadButton, false);
        }
      };
    })();
    window.TTSVoice = TTSVoice;
/* HALK DİLİ SEMPTOM ANAMNEZİ SÖZLÜĞÜ & KLİNİK METAVERİLERİ */
    const ANAMNESIS_DICTIONARY = {
      "numbness": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "El veya ayak parmaklarımda iğne batması, karıncalanma veya uyuşma oluyor", medicalName: "Periferik Nöropati / Parestezi", symptomName: "El-Ayak Uyuşması ve Karıncalanma", nutrients: ["B12", "Folat", "Magnezyum"], formKey: "B12", suggestedLab: "Vitamin B12, Folat (B9), Hemogram/Tam Kan Sayımı, Açlık Kan Şekeri / HbA1c, Nörolojik Duyu Muayenesi", latencyWeeks: 5 },
      "burning_tongue": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "Dilimde yanma var, pürüzsüzleşip parlak kırmızı bir hal aldı (Glossit)", medicalName: "Hunter Glossiti / Dil Papilla Atrofisi", symptomName: "Dilde Yanma ve Kızarıklık (Glossit)", nutrients: ["B12", "Demir", "Folat"], formKey: "B12", suggestedLab: "Serum Ferritin, Serum Demiri, Vitamin B12, Folat, Hemogram/Tam Kan Sayımı (MCV)", latencyWeeks: 4 },
      "brain_fog": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "Cümle kurarken kelime bulmakta zorlanıyor, unutkanlık ve zihinsel sis yaşıyorum", medicalName: "Zihinsel Sis / Unutkanlık", symptomName: "Zihinsel Sis ve Unutkanlık", nutrients: ["B12", "Demir", "D3_K2", "Omega3", "Magnezyum"], formKey: "B12", suggestedLab: "Vitamin B12, Folat, Ferritin, 25-OH Vitamin D, TSH & Serbest T4, Hemogram/Tam Kan Sayımı", latencyWeeks: 4 },
      "hand_tremor": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "Ellerimde titreme oluyor", medicalName: "El Titremesi (Tremor)", symptomName: "El Titremesi (Tremor)", nutrients: ["Magnezyum", "B12", "Kalsiyum"], formKey: "Magnezyum", suggestedLab: "TSH & Serbest T4 (Tiroid Paneli), Açlık Kan Şekeri, Serum Magnezyum, Kalsiyum, Vitamin B12, Nörolojik Tremor Değerlendirmesi", latencyWeeks: 0 },
      "headache": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "Baş ağrısı yaşıyorum", medicalName: "Baş Ağrısı", symptomName: "Baş Ağrısı", nutrients: ["Magnezyum", "D3_K2", "B2", "Demir"], formKey: "Magnezyum", suggestedLab: "Hemogram/Tam Kan Sayımı, Ferritin, Serum Magnezyum, 25-OH Vitamin D, Kan Basıncı (Tansiyon) Takibi ve Nörolojik Muayene", latencyWeeks: 0 },
      "orthostatic_dizziness": { catId: "cat-B", category: "Oksijen & Anemi", question: "Otururken aniden ayağa kalktığımda gözlerim kararıyor ve başım dönüyor", medicalName: "Ayağa Kalkınca Baş Dönmesi / Göz Kararması", symptomName: "Ayağa Kalkınca Baş Dönmesi ve Göz Kararması", nutrients: ["Demir", "B12", "Folat"], formKey: "Demir", suggestedLab: "Hemogram/Tam Kan Sayımı, Ferritin, Serum Demiri, Vitamin B12, Ortostatik Tansiyon Takibi", latencyWeeks: 6 },
      "pica_craving": { catId: "cat-B", category: "Oksijen & Anemi", question: "Buz çiğneme, toprak, kahve telvesi veya tebeşir yeme/koklama isteğim oluyor (Pika)", medicalName: "Pika Benzeri İstek (Nedeni Değerlendirilmeli)", symptomName: "Buz veya Toprak Yeme İsteği (Pika)", nutrients: ["Demir", "Çinko"], formKey: "Demir", suggestedLab: "Hemogram/Tam Kan Sayımı, Serum Ferritin, Serum Demiri, Total Demir Bağlama Kapasitesi (TDBK), Serum Çinko", latencyWeeks: 6 },
      "spoon_nails": { catId: "cat-B", category: "Oksijen & Anemi", question: "Tırnaklarımın ortası içeri çökerek kenarları kaşık gibi kıvrılıyor (Koilonişi)", medicalName: "Kaşık Tırnak Görünümü", symptomName: "Kaşık Tırnak Görünümü (Koilonişi)", nutrients: ["Demir", "Çinko"], formKey: "Demir", suggestedLab: "Serum Ferritin, Hemogram/Tam Kan Sayımı (CBC), Serum Demiri, Transferrin Satürasyonu", latencyWeeks: 8 },
      "cold_extremities": { catId: "cat-B", category: "Oksijen & Anemi", question: "Ortam ılık olsa bile el ve ayak uçlarım sürekli buz gibi üşüyor", medicalName: "Periferik Termoregülasyon Bozukluğu", symptomName: "El ve Ayaklarda Sürekli Üşüme", nutrients: ["Demir", "B12"], formKey: "Demir", suggestedLab: "Serum Ferritin, Hemogram/Tam Kan Sayımı, TSH & Serbest T4 (Tiroid Paneli), Vitamin B12", latencyWeeks: 6 },
      "bone_pain": { catId: "cat-C", category: "Kemik & İskelet", question: "Kaval kemiğimde, kalçamda veya belimde derinden sızlayan bir kemik ağrısı var", medicalName: "Kemik sağlığıyla ilişkili belirti kaydı", symptomName: "Derin Kemik ve İskelet Ağrısı", nutrients: ["D3_K2", "Kalsiyum", "Magnezyum"], formKey: "D3_K2", suggestedLab: "25-OH Vitamin D, Serum Kalsiyum, Fosfor, Alkalen Fosfataz (ALP), Parathormon (PTH)", latencyWeeks: 8 },
      "muscle_weakness": { catId: "cat-C", category: "Kemik & İskelet", question: "Merdiven çıkarken veya sandalyeden kalkarken bacaklarım titriyor, güçsüzleşiyor", medicalName: "Kas güçsüzlüğü kaydı (Tip 2 Kas Lifi Zayıflığı)", symptomName: "Kas Güçsüzlüğü ve Merdiven Çıkarken Zorlanma", nutrients: ["D3_K2", "Magnezyum", "Kalsiyum"], formKey: "D3_K2", suggestedLab: "25-OH Vitamin D Düzeyi, Serum Kalsiyum, Magnezyum, Potasyum, Kreatin Kinaz (CK)", latencyWeeks: 8 },
      "frequent_infection": { catId: "cat-C", category: "Kemik & İskelet", question: "Yılda 3-4 kereden fazla gribe yakalanıyorum, enfeksiyonlarım zor iyileşiyor", medicalName: "Bağışıklıkla ilişkili belirti kaydı / Enfeksiyon Sıklığı", symptomName: "Sık Enfeksiyon ve Geç İyileşme", nutrients: ["D3_K2", "Çinko", "C_Vitamini"], formKey: "D3_K2", suggestedLab: "25-OH Vitamin D, Serum Çinko, Hemogram/Tam Kan Sayımı (Lökosit Formülü), Ferritin, CRP", latencyWeeks: 8 },
      "lip_twitching": { catId: "cat-C", category: "Kemik & İskelet", question: "Dudak çevremde veya parmak uçlarımda seğirme, çekilme ve kasılma oluyor", medicalName: "Kas spazmı / karıncalanma kaydı / Perioral Parestezi", symptomName: "Dudak Çevresi ve Parmaklarda Seğirme/Kasılma", nutrients: ["Kalsiyum", "D3_K2", "Magnezyum"], formKey: "D3_K2", suggestedLab: "Total ve İyonize Kalsiyum (Ca), Serum Magnezyum (Mg), Albümin, 25-OH Vitamin D, Parathormon (PTH)", latencyWeeks: 4 },
      "eyelid_twitching": { catId: "cat-D", category: "Sinir & Magnezyum", question: "Göz kapağım gün içinde durduk yere ritmik olarak seğiriyor", medicalName: "Göz Kapağı Seğirmesi", symptomName: "Göz Kapağı Seğirmesi", nutrients: ["Magnezyum", "Kalsiyum"], formKey: "Magnezyum", suggestedLab: "Serum Magnezyum (Mg) Düzeyi, İyonize Kalsiyum, Potasyum, Elektrolit Paneli", latencyWeeks: 3 },
      "night_cramps": { catId: "cat-D", category: "Sinir & Magnezyum", question: "Gece uykudan şiddetli baldır veya ayak kramplarıyla uyanıyorum", medicalName: "Noktürnal Gastroknemius Kas Spazmı", symptomName: "Gece Baldır ve Ayak Krampları", nutrients: ["Magnezyum", "Kalsiyum", "D3_K2"], formKey: "Magnezyum", suggestedLab: "Serum Magnezyum (Mg), Serum Kalsiyum (Ca), Potasyum, 25-OH Vitamin D, Ferritin", latencyWeeks: 3 },
      "restlessness": { catId: "cat-D", category: "Sinir & Magnezyum", question: "Nedensiz bir iç huzursuzluğu, çarpıntı hissi ve gevşeyememe yaşıyorum", medicalName: "Santral Nöromüsküler Eksitabilite / Gevşeyememe", symptomName: "İç Huzursuzluğu, Çarpıntı Hissi ve Gevşeyememe", nutrients: ["Magnezyum", "B12", "Demir"], formKey: "Magnezyum", suggestedLab: "Serum Magnezyum (Mg), TSH & Serbest T4, Ferritin, Hemogram, EKG / Ritm Değerlendirmesi", latencyWeeks: 3 },
      "bleeding_gums": { catId: "cat-E", category: "Doku & Cilt", question: "Dişlerimi fırçalarken veya sert bir meyve ısırırken diş etlerim kolayca kanıyor", medicalName: "Diş Eti Kanaması", symptomName: "Diş Eti Kanaması", nutrients: ["C_Vitamini", "Kolajen"], formKey: "Kolajen", suggestedLab: "Hemogram/Tam Kan Sayımı (Trombosit), C Vitamini Düzeyi, Koagülasyon Paneli (PT/INR), Periodontal Diş Hekimi Muayenesi", latencyWeeks: 4 },
      "easy_bruising": { catId: "cat-E", category: "Doku & Cilt", question: "Hafif çarpmalarda bile cildimde sebepsiz büyük morluklar oluşuyor", medicalName: "Kapiller Frajilite & Spontan Ekimoz", symptomName: "Ciltte Kolay Morarma (Ekimoz)", nutrients: ["C_Vitamini", "Demir"], formKey: null, suggestedLab: "Hemogram/Tam Kan Sayımı (Trombosit), Koagülasyon Paneli (PT/INR, aPTT), Ferritin, ALT/AST", latencyWeeks: 4 },
      "night_blindness": { catId: "cat-F", category: "Göz & Cilt", question: "Alacakaranlıkta veya gece araba kullanırken yolu seçmekte zorlanıyorum (Gece Körlüğü)", medicalName: "Niktalopi (Rodopsin Sentez Yetersizliği)", symptomName: "Alacakaranlıkta Görme Güçlüğü (Gece Körlüğü)", nutrients: ["A_Vitamini", "Çinko"], formKey: "Çinko", suggestedLab: "Serum Retinol / A Vitamini, Serum Çinko, Göz Hastalıkları (Fundus & Karanlık Adaptasyon) Muayenesi", latencyWeeks: 4 },
      "dry_eyes": { catId: "cat-F", category: "Göz & Cilt", question: "Gözlerimde kum kaçmış gibi sürekli kuruluk ve batma hissediyorum", medicalName: "Kseroftalmi & Gözyaşı Lipid Tabakası Kaybı", symptomName: "Göz Kuruluğu ve Batma Hissi", nutrients: ["Omega3", "A_Vitamini", "D3_K2"], formKey: "Omega3", suggestedLab: "Gözyaşı Kırılma Zamanı (Schirmer / Osmolarite), Lipit Profili, 25-OH Vitamin D, Göz Muayenesi", latencyWeeks: 4 },
      "angular_cheilitis": { catId: "cat-E", category: "Doku & Cilt", question: "Ağzımın iki kenarında gülünce kanayan derin yarıklar/çatlaklar var (Açısal Keilit)", medicalName: "Anguler Cheilitis (Perlèche)", symptomName: "Ağız Kenarında Çatlak ve Yarıklar (Açısal Keilit)", nutrients: ["B2", "B6", "Demir", "Çinko"], formKey: "Demir", suggestedLab: "Serum Ferritin, Serum Demiri, Vitamin B12, Folat, B Kompleks Vitaminleri, Açlık Kan Şekeri", latencyWeeks: 4 },
      "brittle_nails": { catId: "cat-G", category: "Saç & Tırnak", question: "Tırnaklarım kat kat soyularak kağıt gibi kırılıyor", medicalName: "Oshikoschizia (Tırnak Keratin Matris Kırılganlığı)", symptomName: "Tırnaklarda Soyulma ve Kırılganlık", nutrients: ["Çinko", "Biyotin", "Demir"], formKey: "Çinko", suggestedLab: "Serum Ferritin, Serum Çinko (Zn), TSH (Tiroid Paneli), Biyotin, Hemogram", latencyWeeks: 6 },
      "white_nail_spots": { catId: "cat-G", category: "Saç & Tırnak", question: "Tırnaklarımın üzerinde beyaz yatay çizgiler veya noktalar belirdi", medicalName: "Tırnakta beyaz çizgi veya nokta (tek başına özgül değildir)", symptomName: "Tırnak Üzerinde Beyaz Çizgi ve Noktalar", nutrients: ["Çinko", "Kalsiyum"], formKey: "Çinko", suggestedLab: "Serum Çinko (Zn), Serum Kalsiyum, Albümin, Dermatolojik Tırnak Değerlendirmesi", latencyWeeks: 0 },
      "taste_loss": { catId: "cat-E", category: "Doku & Cilt", question: "Yemeklerin tadı ve kokusu eskisi gibi gelmiyor, ağzımda metalik tat var", medicalName: "Hipogeuzi / Gustin Metaloproteinaz İnhibisyonu", symptomName: "Tat/Koku Azalması ve Ağızda Metalik Tat", nutrients: ["Çinko", "B12"], formKey: "Çinko", suggestedLab: "Serum Çinko (Zn) Düzeyi, Vitamin B12, Ferritin, KBB / Oral Mukoza Muayenesi", latencyWeeks: 4 },
      "balance_difficulty": { catId: "cat-A", category: "Nörolojik & Zihinsel", question: "Dengemi korumakta veya yürürken düz bir çizgide ilerlemekte zorlanıyorum", medicalName: "Denge ve yürüme güçlüğü", symptomName: "Denge ve Yürüme Güçlüğü", nutrients: ["B12", "Folat", "D3_K2"], formKey: "B12", suggestedLab: "Vitamin B12, Folat, Homosistein / MMA, Hemogram/Tam Kan Sayımı, Nörolojik & Vestibüler Muayene", latencyWeeks: 0 },
      "unexplained_swelling": { catId: "cat-F", category: "Göz & Cilt", question: "Ayak bileklerimde veya bacaklarımda açıklanamayan şişlik oluyor", medicalName: "Bacak veya ayak bileğinde şişlik", symptomName: "Ayak Bileği ve Bacaklarda Şişlik (Ödem)", nutrients: ["Magnezyum", "C_Vitamini"], formKey: null, suggestedLab: "Serum Kreatinin & eGFR, Tam İdrar Tetkiki (Proteinüri), Albümin, ALT/AST, TSH, Kardiyovasküler Değerlendirme", latencyWeeks: 0 },
      "sun_sensitive_rash": { catId: "cat-F", category: "Göz & Cilt", question: "Güneşe maruz kalan cildimde belirgin döküntü veya kızarıklık oluşuyor", medicalName: "Güneşe maruz kalan bölgelerde döküntü", symptomName: "Güneşe Duyarlı Cilt Döküntüsü", nutrients: ["C_Vitamini", "Omega3", "Çinko"], formKey: null, suggestedLab: "Fotosensitivite & Otoimmün Panel (ANA), İlaç Yan Etki Gözden Geçirmesi, Dermatoloji Muayenesi", latencyWeeks: 0 },
      "hair_loss": { catId: "cat-G", category: "Saç & Tırnak", question: "Saçlarımda belirgin dökülme veya seyrelme fark ettim", medicalName: "Saç dökülmesi", symptomName: "Saç Dökülmesi ve Seyrelme", nutrients: ["Demir", "Çinko", "Biyotin", "D3_K2", "B12"], formKey: "Demir", suggestedLab: "Serum Ferritin, Serum Demiri, TSH & Serbest T4, 25-OH Vitamin D, Serum Çinko, Vitamin B12", latencyWeeks: 0 },
      "dark_nail_change": { catId: "cat-G", category: "Saç & Tırnak", question: "Tırnağımda yeni bir koyu çizgi veya renk değişikliği fark ettim", medicalName: "Tırnakta renk değişikliği", symptomName: "Tırnakta Koyu Çizgi ve Renk Değişikliği", nutrients: ["B12", "Çinko"], formKey: null, suggestedLab: "Dermatoskopik Dermatoloji Muayenesi (Subungual Pigmente Lezyon Ayırıcı Tanısı), Hemogram", latencyWeeks: 0 }
    };

    // 1-3 ağırlıkları tanı olasılığı/Bayes faktörü değildir; yalnızca öncelikli hekim değerlendirmesi ve test konuşmasını düzenler.
    const HIGH_PRIORITY_SYMPTOMS = new Set(["pica_craving", "spoon_nails"]);
    const MODERATE_PRIORITY_SYMPTOMS = new Set(["burning_tongue", "angular_cheilitis", "numbness", "night_blindness", "easy_bruising", "bleeding_gums"]);
    Object.keys(ANAMNESIS_DICTIONARY).forEach(symptomKey => {
      ANAMNESIS_DICTIONARY[symptomKey].specificityWeight = HIGH_PRIORITY_SYMPTOMS.has(symptomKey) ? 3 : MODERATE_PRIORITY_SYMPTOMS.has(symptomKey) ? 2 : 1;
    });

    /* ÇEKMECE & SAYFA GEZİNTİ YÖNETİMİ */
    