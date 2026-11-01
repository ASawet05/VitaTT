/* BESİNLE DESTEK: takviye yerine doğal besin kaynakları (klinik analiz sonuç ekranı) */
    /* Yalnızca genel beslenme bilgisidir: doz, miktar veya tedavi önerisi içermez. */
    /* t = hayvansal etiket: meat (et), fish (balık), egg (yumurta), dairy (süt ürünü) */
    const VITA_FOOD_SOURCES = {
      C_Vitamini: { name: "C vitamini", emoji: "🍊", foods: [
        { e: "🍊", n: "Portakal" }, { e: "🥝", n: "Kivi" }, { e: "🫑", n: "Kırmızı / yeşil biber" },
        { e: "🍓", n: "Çilek" }, { e: "🍋", n: "Limon" }, { e: "🥦", n: "Brokoli" }, { e: "🌿", n: "Taze maydanoz" }
      ], tip: "C vitamini ısıya ve bekletmeye duyarlıdır; çiğ ya da az pişmiş tüketmek daha uygundur." },
      D3_K2: { name: "D vitamini (ve K2)", emoji: "☀️", foods: [
        { e: "🐟", n: "Yağlı balık", s: "somon, uskumru, sardalya, hamsi", t: "fish" },
        { e: "🥚", n: "Yumurta sarısı", t: "egg" },
        { e: "🍄", n: "Mantar", s: "güneş / UV görmüş", },
        { e: "🥛", n: "D vitamini eklenmiş süt, yoğurt veya bitkisel süt", s: "etiketten kontrol edin" }
      ], tip: "Besinler D vitamini ihtiyacının yalnızca küçük bir bölümünü karşılar; asıl kaynak güneş ışığıdır. Tahlilde düşüklük varsa tek başına besinle düzelmeyebilir.", vitK: true },
      B12: { name: "B12 vitamini", emoji: "🥩", foods: [
        { e: "🥩", n: "Kırmızı et", t: "meat" }, { e: "🐟", n: "Balık", s: "somon, sardalya, uskumru", t: "fish" },
        { e: "🥚", n: "Yumurta", t: "egg" }, { e: "🥛", n: "Süt, yoğurt, peynir", t: "dairy" },
        { e: "🥣", n: "B12 eklenmiş bitkisel süt / kahvaltılık", s: "etikette B12 yazanı seçin" },
        { e: "🧂", n: "B12 ile zenginleştirilmiş besin mayası" }
      ], tip: "B12 bitkisel besinlerde doğal olarak bulunmaz. Yaş, mide koruyucu ilaçlar veya metformin emilimi azaltabilir; bu durumlarda besin tek başına yeterli olmayabilir." },
      Demir: { name: "Demir", emoji: "🫘", foods: [
        { e: "🥩", n: "Kırmızı et", t: "meat" }, { e: "🫘", n: "Mercimek, nohut, kuru fasulye" },
        { e: "🥚", n: "Yumurta", t: "egg" }, { e: "🍇", n: "Kuru üzüm, kuru kayısı, pekmez" },
        { e: "🥬", n: "Ispanak, pazı", s: "bitkisel demir daha az emilir" }, { e: "🎃", n: "Kabak çekirdeği, tahin" }
      ], tip: "Bitkisel demir, yanında C vitamini (portakal, limon, biber) olunca daha iyi emilir. Çay ve kahveyi yemekle birlikte değil, yemekten 1–2 saat sonra için.", extra: "Süt ürünleri ve kalsiyum da demir emilimini azaltabilir; yemekle aynı anda büyük miktarda almamak yardımcı olur." },
      Folat: { name: "Folat (B9)", emoji: "🥬", foods: [
        { e: "🥬", n: "Koyu yeşil yapraklılar", s: "ıspanak, roka, marul, pazı" }, { e: "🫘", n: "Mercimek, nohut, fasulye" },
        { e: "🥦", n: "Brokoli" }, { e: "🥑", n: "Avokado" }, { e: "🍊", n: "Portakal" }, { e: "🌾", n: "Zenginleştirilmiş tahıl ürünleri" }
      ], tip: "Folat ısıya duyarlıdır; sebzeleri uzun süre haşlamak kaybı artırır. Buharda veya kısa pişirmek daha iyidir.", vitK: true },
      Magnezyum: { name: "Magnezyum", emoji: "🥜", foods: [
        { e: "🎃", n: "Kabak çekirdeği" }, { e: "🥜", n: "Badem, fındık, ceviz" }, { e: "🥬", n: "Ispanak, pazı" },
        { e: "🌾", n: "Tam tahıl", s: "yulaf, bulgur, esmer pirinç" }, { e: "🫘", n: "Kuru baklagiller" },
        { e: "🍌", n: "Muz" }, { e: "🍫", n: "Bitter çikolata", s: "%70 ve üzeri, az miktarda" }
      ], tip: "Rafine tahıl ve işlenmiş gıdalar magnezyumdan fakirdir; tam tahıl ve kuruyemiş tercih edilebilir.", kidney: true, vitK: true, ppi: true },
      Kalsiyum: { name: "Kalsiyum", emoji: "🥛", foods: [
        { e: "🥛", n: "Süt, yoğurt, ayran, peynir", t: "dairy" }, { e: "🌰", n: "Susam, tahin" }, { e: "🥜", n: "Badem" },
        { e: "🥬", n: "Brokoli, lahana, roka" }, { e: "🐟", n: "Kılçıklı sardalya", t: "fish" },
        { e: "🥣", n: "Kalsiyum eklenmiş bitkisel süt", s: "etiketten kontrol edin" }
      ], tip: "Kalsiyumun emilmesi için D vitamini gerekir. Ispanak kalsiyum içerse de emilimi düşüktür, ana kaynak olarak sayılmaz.", ppi: true },
      "Çinko": { name: "Çinko", emoji: "🎃", foods: [
        { e: "🥩", n: "Kırmızı et", t: "meat" }, { e: "🎃", n: "Kabak çekirdeği" }, { e: "🫘", n: "Nohut, mercimek" },
        { e: "🥚", n: "Yumurta", t: "egg" }, { e: "🧀", n: "Peynir, yoğurt", t: "dairy" }, { e: "🥜", n: "Ceviz, kaju" },
        { e: "🦪", n: "Midye, deniz ürünleri", t: "fish" }
      ], tip: "Baklagil ve tahılları önceden ıslatmak ve mayalı ekmek tercih etmek çinko emilimini artırabilir." },
      Omega3: { name: "Omega-3", emoji: "🐟", foods: [
        { e: "🐟", n: "Yağlı balık", s: "somon, uskumru, sardalya, hamsi", t: "fish" }, { e: "🌰", n: "Ceviz" },
        { e: "🌱", n: "Keten tohumu, chia tohumu", s: "öğütülmüş" }, { e: "🫒", n: "Zeytinyağı", s: "soğuk, çiğ kullanım" }
      ], tip: "Kan sulandırıcı kullanıyorsanız balık yağı takviyesi ve besin miktarlarında değişiklik yapmadan önce doktorunuza danışın." },
      A_Vitamini: { name: "A vitamini", emoji: "🥕", foods: [
        { e: "🥕", n: "Havuç" }, { e: "🍠", n: "Tatlı patates" }, { e: "🎃", n: "Balkabağı" },
        { e: "🍑", n: "Kayısı" }, { e: "🥬", n: "Ispanak" }, { e: "🥚", n: "Yumurta", t: "egg" }
      ], tip: "Bitkisel karotenoidler az yağ ile (örneğin zeytinyağı) birlikte daha iyi emilir. Karaciğer gibi aşırı A vitamini içeren besinler bu listeye alınmamıştır.", vitK: true },
      B2: { name: "B2 vitamini (riboflavin)", emoji: "🥛", foods: [
        { e: "🥛", n: "Süt, yoğurt", t: "dairy" }, { e: "🥚", n: "Yumurta", t: "egg" },
        { e: "🍄", n: "Mantar" }, { e: "🥜", n: "Badem" }, { e: "🥬", n: "Ispanak" }
      ], tip: "B2 ışığa duyarlıdır; süt ve türevlerini şeffaf kapta ışıkta bırakmamak kaybı azaltır." },
      B6: { name: "B6 vitamini", emoji: "🍌", foods: [
        { e: "🍌", n: "Muz" }, { e: "🫘", n: "Nohut" }, { e: "🥔", n: "Patates" },
        { e: "🐟", n: "Balık", t: "fish" }, { e: "🍗", n: "Tavuk, hindi", t: "meat" }, { e: "🥜", n: "Fıstık, ceviz" }
      ], tip: "B6 dengeli beslenmeyle genellikle karşılanır; yüksek doz takviyesi sinir hasarına yol açabileceğinden doktor kontrolü gerekir." },
      Biyotin: { name: "Biyotin (B7)", emoji: "🥚", foods: [
        { e: "🥚", n: "Pişmiş yumurta", s: "çiğ yumurta akı biyotini bağlar", t: "egg" }, { e: "🥜", n: "Badem, ceviz, fıstık" },
        { e: "🍠", n: "Tatlı patates" }, { e: "🍄", n: "Mantar" }, { e: "🌻", n: "Ay çekirdeği" }
      ], tip: "Biyotin takviyeleri bazı tahlil sonuçlarını (örneğin tiroid, troponin) yanıltabilir; kullanıyorsanız laboratuvara ve doktora bildirin." },
      Kolajen: { name: "Kolajen sentezi desteği", emoji: "🍊", foods: [
        { e: "🍊", n: "C vitamini kaynakları", s: "portakal, kivi, biber" }, { e: "🥚", n: "Yumurta", t: "egg" },
        { e: "🍗", n: "Tavuk, hindi", t: "meat" }, { e: "🐟", n: "Balık", t: "fish" },
        { e: "🫘", n: "Baklagiller" }, { e: "🥜", n: "Kuruyemişler" }
      ], tip: "Vücut kolajeni C vitamini ve yeterli proteinle üretir; bu ikisini beslenmeyle karşılamak temel destektir." },
      Kreatin: { name: "Kreatin (doğal kaynaklar)", emoji: "🥩", foods: [
        { e: "🥩", n: "Kırmızı et", t: "meat" }, { e: "🐟", n: "Balık", s: "ringa, somon, ton", t: "fish" }
      ], tip: "Kreatin vitamin değildir; bitkisel besinlerde yok denecek kadar azdır.", kidney: true }
    };
    const VITA_FOOD_ORDER = ["D3_K2", "B12", "Demir", "Folat", "Magnezyum", "Kalsiyum", "Çinko", "C_Vitamini", "Omega3", "A_Vitamini", "B2", "B6", "Biyotin", "Kolajen", "Kreatin"];

    function vitaFoodAllowedForDiet(food, diet) {
      if (diet === "vegan") return !food.t;
      if (diet === "vegetarian") return food.t !== "meat" && food.t !== "fish";
      return true;
    }

    function renderFoodAlternatives() {
      const host = document.getElementById("foodAlternativesSection");
      if (!host) return;
      const cdss = state.lastCDSS;
      if (!cdss) { host.classList.add("hidden"); host.innerHTML = ""; return; }

      const ctx = cdss.foodContext || {};
      const diet = ctx.dietPattern || state.user?.dietPattern || "unspecified";
      const reasons = new Map();
      const addReason = (key, kind, names) => {
        if (!VITA_FOOD_SOURCES[key]) return;
        if (!reasons.has(key)) reasons.set(key, { lab: false, borderline: false, protocol: false, symptoms: [] });
        const r = reasons.get(key);
        if (kind === "symptom") (names || []).forEach(n => { if (n && !r.symptoms.includes(n)) r.symptoms.push(n); });
        else r[kind] = true;
      };
      (cdss.lowLabNutrients || []).forEach(k => addReason(k, "lab"));
      (cdss.borderlineLabNutrients || []).forEach(k => addReason(k, "borderline"));
      (cdss.protocol || []).forEach(item => { if (item && item.formKey) addReason(item.formKey, "protocol"); });
      Object.entries(cdss.symptomNutrientMap || {}).forEach(([k, names]) => addReason(k, "symptom", names));

      const entries = [...reasons.entries()].sort((a, b) => {
        const rank = r => r.lab ? 0 : (r.borderline ? 1 : (r.protocol ? 2 : 3));
        return rank(a[1]) - rank(b[1]) || VITA_FOOD_ORDER.indexOf(a[0]) - VITA_FOOD_ORDER.indexOf(b[0]);
      });
      if (!entries.length) { host.classList.add("hidden"); host.innerHTML = ""; return; }

      const openKeys = new Set([...host.querySelectorAll("details[data-food-key][open]")].map(d => d.dataset.foodKey));
      const drawerWasOpen = !!host.querySelector("details.vita-food-drawer[open]");
      const esc = escapeHtmlText;

      const itemHtml = ([key, r]) => {
        const src = VITA_FOOD_SOURCES[key];
        const foods = src.foods.filter(f => vitaFoodAllowedForDiet(f, diet));
        if (!foods.length) return "";
        const badges = [];
        if (r.lab) badges.push('<span class="vita-food-badge lab">Tahlil: düşük bulundu</span>');
        else if (r.borderline) badges.push('<span class="vita-food-badge lab">Tahlil: sınırda</span>');
        if (r.protocol) badges.push('<span class="vita-food-badge protocol">Takip adayı</span>');
        if (!r.lab && !r.borderline && !r.protocol && r.symptoms.length) badges.push(`<span class="vita-food-badge symptom" title="${esc(r.symptoms.slice(0, 3).join(", "))}">Belirti kaydıyla ilişkili</span>`);
        const preview = foods.slice(0, 4).map(f => `${f.e} ${esc(f.n.split(",")[0])}`).join(" · ");
        const chips = foods.map(f => `<span class="vita-food-chip"><span aria-hidden="true">${f.e}</span>${esc(f.n)}${f.s ? ` <span class="sub">(${esc(f.s)})</span>` : ""}</span>`).join("");
        const extras = [];
        if (key === "B12" && diet === "vegan") extras.push("Vegan beslenmede bitkisel besinler doğal B12 sağlamaz; zenginleştirilmiş ürünler çoğu zaman yeterli olmaz. B12 durumunuzu ve gerekirse takviye ihtiyacını doktorunuzla konuşun.");
        if (key === "B12" && (ctx.hasPPI || ctx.hasMetformin)) extras.push("Kullandığınız ilaç (mide koruyucu veya metformin) B12 emilimini azaltabilir; besin tek başına yeterli olmayabilir.");
        if (ctx.hasPPI && ["Demir", "Magnezyum", "Kalsiyum"].includes(key)) extras.push("Mide asidini azaltan ilaçlar bu mineralin emilimini azaltabilir.");
        if (ctx.hasKidneyRisk && (VITA_FOOD_SOURCES[key].kidney)) extras.push("Böbrek hastalığı veya riski bildirildi: bu besinlerin miktarı sınırlanabilir, doktor/diyetisyene danışın.");
        const extraHtml = extras.map(t => `<p class="vita-food-extra">${esc(t)}</p>`).join("");
        return `
          <details class="vita-food-item" data-food-key="${esc(key)}" ${openKeys.has(key) ? "open" : ""}>
            <summary>
              <span class="vita-food-title">
                <span class="name"><span class="em" aria-hidden="true">${src.emoji}</span>${esc(src.name)}<span class="vita-food-badges">${badges.join("")}</span></span>
                <span class="preview">${preview}</span>
              </span>
              <i class="fa-solid fa-chevron-down vita-food-chev" aria-hidden="true"></i>
            </summary>
            <div class="vita-food-chips">${chips}</div>
            ${extraHtml}
            <p class="vita-food-tip"><i class="fa-solid fa-lightbulb" aria-hidden="true"></i>${esc(src.tip)}</p>
          </details>`;
      };

      const primary = entries.filter(([, r]) => r.lab || r.borderline || r.protocol).map(itemHtml).join("");
      const secondary = entries.filter(([, r]) => !r.lab && !r.borderline && !r.protocol).map(itemHtml).join("");
      const shownCount = entries.filter(([k]) => VITA_FOOD_SOURCES[k].foods.some(f => vitaFoodAllowedForDiet(f, diet))).length;

      const notes = [];
      if (ctx.isPediatric) notes.push('<div class="vita-food-note warn"><strong>18 yaş altı:</strong> çocuk ve ergenlerde beslenme düzeni çocuk/aile hekimi ve diyetisyenle birlikte planlanmalıdır.</div>');
      if (ctx.hasBloodThinner) notes.push('<div class="vita-food-note warn"><strong>Kan sulandırıcı kullanıyorsunuz:</strong> yeşil yapraklı sebzeler (ıspanak, pazı, brokoli, roka) K vitamini içerir. Miktarı bir gün çok, bir gün hiç şeklinde değil, düzenli tutun ve beslenmenizi değiştirmeden önce doktorunuza danışın.</div>');
      if (ctx.hasKidneyRisk) notes.push('<div class="vita-food-note warn"><strong>Böbrek riski bildirildi:</strong> potasyum, fosfor ve magnezyum yönünden zengin besinler (kuru baklagil, kuruyemiş, muz, tam tahıl, süt ürünleri) için miktar sınırı gerekebilir. Beslenmenizi doktor veya diyetisyenle belirleyin.</div>');
      if (ctx.hasHepaticRisk) notes.push('<div class="vita-food-note warn"><strong>Karaciğer enzimi (ALT) yüksek:</strong> beslenme değişikliklerini yapmadan önce doktorunuzla görüşün.</div>');
      if (diet === "vegan" || diet === "vegetarian") notes.push(`<div class="vita-food-note info">Profilinizdeki ${diet === "vegan" ? "vegan" : "vejetaryen"} beslenme biçimine uymayan besinler listeden çıkarıldı.</div>`);

      host.classList.remove("hidden");
      host.style.display = "block";
      const shouldOpenDrawer = drawerWasOpen || Boolean(cdss.hasNoCurrentLabs);
      host.innerHTML = `
        <div class="vita-food-card">
          <div class="vita-food-head">
            <div>
              <h3><i class="fa-solid fa-leaf" aria-hidden="true"></i>Besinle destek seçenekleri</h3>
              <p>Takviye almak istemezseniz, ilgili vitamin ve minerallerin doğal besin kaynaklarına göz atabilirsiniz.</p>
            </div>
          </div>
          <details class="vita-food-drawer" ${shouldOpenDrawer ? "open" : ""}>
            <summary>
              <span><i class="fa-solid fa-seedling" style="margin-right:.5rem;color:#047857" aria-hidden="true"></i>Besin kaynaklarını göster<span class="vita-food-count">${shownCount} bileşen</span></span>
              <i class="fa-solid fa-chevron-down vita-food-chev" aria-hidden="true"></i>
            </summary>
            <div class="vita-food-body">
              ${notes.join("")}
              ${primary ? `<p class="vita-food-group-title">Tahlil ve takip adaylarınızla ilişkili</p>${primary}` : ""}
              ${secondary ? `<p class="vita-food-group-title">Belirti kayıtlarınızla ilişkili</p>${secondary}` : ""}
              <p class="vita-food-foot">Bu liste genel beslenme bilgisidir; tanı veya tedavi önerisi değildir ve miktar belirtmez. Tahlilde eksiklik saptandıysa yalnızca besinle düzelme yeterli olmayabilir; takviye gerekip gerekmediğine ve miktara doktorunuz karar verir. Alerji ve besin intoleranslarınızı dikkate alın.</p>
            </div>
          </details>
        </div>`;
    }
