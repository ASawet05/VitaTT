
(function () {
  function applyVitaTakipUIUX() {
    const home = document.getElementById('view-home');
    const neyim = document.getElementById('view-neyim');
    const labs = document.getElementById('view-labs');
    if (!home || !neyim || !labs) return;

    /* Use one clear add action in the checklist, without removing the original handler. */
    const checklist = document.getElementById('supplementChecklistContainer');
    if (checklist) {
      const card = checklist.closest('.bg-white') || checklist.parentElement;
      if (card) {
        const actions = Array.from(card.querySelectorAll('button[onclick*="openAddSupplementModal"]'));
        actions.forEach((button, index) => {
          if (index > 0) button.style.display = 'none';
          else {
            button.classList.add('vita-home-add-label');
            const label = button.querySelector('span');
            if (label) label.textContent = 'Takviye Ekle';
          }
        });
      }
    }

    /* The long integrated-data drawer is replaced by a single factual badge. */
    const formCard = neyim.querySelector('.bg-white.rounded-2xl.shadow-sm');
    if (formCard && !formCard.querySelector('.vita-data-included-badge')) {
      const oldDrawer = Array.from(formCard.children).find(el =>
        (el.textContent || '').includes('Otomatik Entegre Klinik Veri Özeti')
      );
      if (oldDrawer) oldDrawer.style.display = 'none';
    }

    /* Remove only the redundant microcopy below symptom questions, preserving question text and IDs. */
    neyim.querySelectorAll('[data-symptom-description], .symptom-description, .symptom-card small').forEach(el => {
      el.classList.add('vita-symptom-extra');
    });
    neyim.querySelectorAll('details').forEach(el => {
      if (/teknik|biyokimyasal|bulgular/i.test(el.textContent || '') &&
          el.closest('#cdssResultContainer')) el.open = false;
    });

    /* Make sure the 24-hour chrononutrition disclosure is closed on first render. */
    home.querySelectorAll('details').forEach(el => {
      if (/krononutri|24 saatlik akıllı/i.test(el.textContent || '')) el.open = false;
    });

    /* Add concise helper class to the old repeated lab helper line; no input IDs are changed. */
    labs.querySelectorAll('p, small, span').forEach(el => {
      const txt = (el.textContent || '').trim();
      if (txt === 'Değer girildiğinde uygulama içi değerlendirme gösterilir.') {
        el.classList.add('vita-lab-helper');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyVitaTakipUIUX, { once: true });
  } else {
    applyVitaTakipUIUX();
  }
})();
