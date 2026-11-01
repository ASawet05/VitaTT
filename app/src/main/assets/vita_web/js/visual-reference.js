(function(){
  'use strict';
  const references = {
    tongue: {
      file: 'img/symptoms/tongue.jpg',
      title: 'Dilde yanma, kızarıklık ve pürüzsüzleşme (Glossit) · Görsel örnek',
      text: 'Dil yüzeyindeki papillaların silinmesiyle dilin parlak kırmızı, düz ve hassas görünmesi (atrofik glossit) B12 vitamini, folat veya demir eksikliğiyle ilişkili olabilir. Görsel yalnızca bilgilendirme amaçlıdır; kesin tanı için hekim muayenesi ve kan tahlili gerekir.',
      alt: 'Parlak kırmızı ve pürüzsüz dil yüzeyi (glossit) klinik görsel örneği'
    },
    mouth: {
      file: 'img/symptoms/mouth.jpg',
      title: 'Ağız kenarında çatlak ve yarıklar (Açısal Keilit) · Görsel örnek',
      text: 'Dudak köşelerinde kızarıklık, kabuklanma ve ağzı açarken/gülerken kanayan çatlaklar (anguler keilit) demir, B2 (riboflavin), B6, B12, folat veya çinko eksikliğinin yanı sıra lokal tahriş ve enfeksiyonlarda da görülebilir.',
      alt: 'Ağız köşesinde kızarıklık ve çatlak (açısal keilit) klinik görsel örneği'
    },
    nails: {
      file: 'img/symptoms/nails.jpg',
      title: 'Tırnak üzerinde beyaz çizgiler veya noktalar (Lökonişi) · Görsel örnek',
      text: 'Tırnak plağındaki beyaz nokta veya yatay çizgiler çoğunlukla küçük tırnak matriksi darbelerinden kaynaklanır; bazen çinko/protein yetersizliği veya sistemik durumlarla birlikte değerlendirilir. Tek başına vitamin eksikliği kanıtı değildir.',
      alt: 'Tırnak plağı üzerinde beyaz nokta ve çizgiler görsel örneği'
    },
    spoon_nails: {
      file: 'img/symptoms/spoon_nails.jpg',
      title: 'Kaşık tırnak görünümü (Koilonişi) · Görsel örnek',
      text: 'Tırnak ortasının içbükey biçimde çöküp kenarlarının yukarı doğru kaşık gibi kıvrılması (koilonişi) kronik demir eksikliği ve demir eksikliği anemisinde klasik bir fiziksel bulgudur. Hemogram ve serum ferritin ile hekimce değerlendirilmelidir.',
      alt: 'Ortası çökmüş kaşık tırnak (koilonişi) klinik görsel örneği'
    },
    brittle_nails: {
      file: 'img/symptoms/brittle_nails.jpg',
      title: 'Kat kat soyulan ve kolay kırılan tırnaklar (Onikoşizi) · Görsel örnek',
      text: 'Tırnak uçlarının yatay katmanlar halinde ayrılması ve kağıt gibi soyularak kırılması sık su/kimyasal teması, demir, çinko veya biyotin yetersizliği ve tiroit hastalıklarıyla ilişkili olabilir.',
      alt: 'Uç kısımları katmanlar halinde soyulan ve kırılan tırnak görsel örneği'
    },
    dark_nail: {
      file: 'img/symptoms/dark_nail.jpg',
      title: 'Tırnakta koyu uzunlamasına çizgi (Melanonişi) · Görsel örnek',
      text: 'Tırnak boyunca uzanan kahverengi veya siyah bant (melanonişi) pigment artışı, travma, bazı ilaçlar veya B12 değişimleriyle ilişkili olabileceği gibi; yeni başlayan, genişleyen veya tek tırnakta görülen koyu çizgiler mutlaka dermatoloji uzmanı tarafından incelenmelidir.',
      alt: 'Tırnak plağında uzunlamasına koyu renkli çizgi görsel örneği'
    },
    rash: {
      file: 'img/symptoms/rash.jpg',
      title: 'Güneş gören ciltte kızarıklık ve döküntü (Fotosensitivite) · Görsel örnek',
      text: 'Güneşe maruz kalan ön kol, boyun veya yüzde gelişen simetrik kızarıklık ve döküntüler güneş alerjisi, ilaç duyarlılığı, otoimmün durumlar veya niasin (B3) / B grubu vitamin dengesizlikleriyle ilişkili olabilir; dermatoloji değerlendirmesi önerilir.',
      alt: 'Ön kolda güneşe duyarlı kızarıklık ve döküntü görsel örneği'
    },
    hair: {
      file: 'img/symptoms/hair.jpg',
      title: 'Saçlarda belirgin seyrelme ve dökülme · Görsel örnek',
      text: 'Saç tellerinde incelme, tepe/ayrım hattında açılma veya yaygın dökülme; genetik faktörler, stres, tiroit bozuklukları, ferritin (demir deposu), D vitamini, B12 veya çinko düşüklüğü gibi çok sayıda nedene bağlı olabilir.',
      alt: 'Saç ayrım hattında ve tepede seyrelme görsel örneği'
    }
  };

  let modal = null;
  let returnFocus = null;
  let previousOverflow = '';

  function ensureModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'vita-visual-overlay';
    modal.id = 'vitaVisualReferenceModal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'vitaVisualReferenceTitle');
    modal.innerHTML = '<section class="vita-visual-dialog"><div class="flex items-start justify-between gap-3"><div><h2 id="vitaVisualReferenceTitle" class="text-base font-black text-slate-900"></h2><p id="vitaVisualReferenceText" class="mt-2 text-xs leading-relaxed text-slate-600"></p></div><button type="button" class="vita-visual-close shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-slate-700" aria-label="Örnek görünümü kapat">Kapat</button></div><img id="vitaVisualReferenceImage" class="vita-visual-art" alt=""><p id="vitaVisualReferenceFallback" class="hidden rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600"></p><p class="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-950"><strong>Önemli:</strong> Bu görsel klinik belirtiyi tanımanıza yardımcı olan temsili bir örnektir; tek başına tanı kanıtı değildir. Belirti sürüyorsa hekime danışın.</p></section>';
    document.body.appendChild(modal);
    const closeButton = modal.querySelector('.vita-visual-close');
    function close() {
      modal.hidden = true;
      document.body.style.overflow = previousOverflow;
      if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
    }
    closeButton.addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button:not([disabled])')];
      if (!focusable.length) return;
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
      else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
    });
    return modal;
  }

  window.showVitaVisualReference = function(type, trigger) {
    const reference = references[type];
    if (!reference) return;
    const dialog = ensureModal();
    returnFocus = trigger || document.activeElement;
    previousOverflow = document.body.style.overflow;
    dialog.querySelector('#vitaVisualReferenceTitle').textContent = reference.title;
    dialog.querySelector('#vitaVisualReferenceText').textContent = reference.text;
    const image = dialog.querySelector('#vitaVisualReferenceImage');
    const fallback = dialog.querySelector('#vitaVisualReferenceFallback');
    image.hidden = false;
    fallback.hidden = true;
    image.alt = reference.alt;
    image.onerror = () => {
      image.hidden = true;
      fallback.textContent = 'Görsel örnek yüklenemedi. Açıklamayı okuyabilir veya pencereyi kapatabilirsiniz.';
      fallback.hidden = false;
    };
    image.src = reference.file;
    dialog.hidden = false;
    document.body.style.overflow = 'hidden';
    dialog.querySelector('.vita-visual-close').focus();
  };

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-vita-visual]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    window.showVitaVisualReference(trigger.dataset.vitaVisual, trigger);
  });
})();