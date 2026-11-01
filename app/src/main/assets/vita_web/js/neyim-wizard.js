
  (function(){
    'use strict';
    const root=document.getElementById('view-neyim');
    if(!root||root.dataset.wizardInitialized==='true')return;
    root.dataset.wizardInitialized='true';
    const categories=['cat-A','cat-B','cat-C','cat-D','cat-E','cat-F','cat-G'];
    const addedSymptoms=[
      {key:'balance_difficulty',icon:'fa-person-walking text-teal-600',note:'Ani başlayan denge kaybı acil değerlendirme gerektirebilir.'},
      {key:'unexplained_swelling',icon:'fa-person-circle-exclamation text-amber-600',note:'Şişlik tek başına vitamin eksikliği anlamına gelmez; nefes darlığı varsa acil yardım alın.'},
      {key:'sun_sensitive_rash',icon:'fa-sun text-amber-500',note:'Döküntülerin dermatolojik ve ilaçla ilişkili farklı nedenleri olabilir.'},
      {key:'hair_loss',icon:'fa-hand-sparkles text-teal-600',note:'Saç dökülmesi tek başına vitamin eksikliğini göstermez.'},
      {key:'dark_nail_change',icon:'fa-magnifying-glass text-slate-600',note:'Yeni, değişen veya genişleyen koyu çizgi dermatoloji değerlendirmesi gerektirebilir.'}
    ];
    const visualForSymptom={
      burning_tongue:'tongue',
      angular_cheilitis:'mouth',
      white_nail_spots:'nails',
      sun_sensitive_rash:'rash',
      hair_loss:'hair',
      dark_nail_change:'dark_nail',
      spoon_nails:'spoon_nails',
      brittle_nails:'brittle_nails'
    };
    const progressLabel=document.getElementById('anamnesisCategoryProgressLabel');
    const progressBar=document.getElementById('anamnesisCategoryProgressBar');
    const progress=document.getElementById('anamnesisCategoryProgress');
    const backButton=document.getElementById('anamnesisStepBack');
    const nextButton=document.getElementById('anamnesisStepNext');
    const stepHint=document.getElementById('anamnesisStepHint');
    const analysisRow=document.getElementById('cdssAnalysisActionRow');
    const categoryNames=['Hafıza ve odaklanma','Enerji ve kan','Kemik ve bağışıklık','Sinir ve kas','Ağız ve duyu','Göz, cilt ve genel beden','Saç ve tırnak'];
    function integrateAdditionalSymptoms(){
      const existingKeys=new Set();
      root.querySelectorAll('.anamnesis-card').forEach(card=>{
        const match=(card.getAttribute('onclick')||'').match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/);
        if(!match)return;
        existingKeys.add(match[1]);
        const meta=ANAMNESIS_DICTIONARY[match[1]];
        const targetPanel=meta&&document.getElementById(`anamnesis-panel-${meta.catId}`);
        const targetGrid=targetPanel&&targetPanel.querySelector('.grid');
        if(targetGrid&&card.parentElement!==targetGrid)targetGrid.appendChild(card);
      });
      addedSymptoms.forEach(item=>{
        if(existingKeys.has(item.key))return;
        const meta=ANAMNESIS_DICTIONARY[item.key];
        const panel=meta&&document.getElementById(`anamnesis-panel-${meta.catId}`);
        const grid=panel&&panel.querySelector('.grid');
        if(!meta||!grid)return;
        const card=document.createElement('div');
        card.className='anamnesis-card p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition cursor-pointer select-none shadow-sm';
        card.setAttribute('onclick',`if(window.SoundEffects) SoundEffects.playClick(); toggleAnamnesisCard(this, '${item.key}')`);
        card.innerHTML=`<div class="flex items-center justify-between"><i class="fa-solid ${item.icon} text-base" aria-hidden="true"></i><div class="w-4 h-4 rounded-full border border-slate-300 check-dot"></div></div><h4 class="text-xs font-bold text-slate-800 mt-1.5"></h4><p class="text-[10px] text-slate-500 mt-1"></p>`;
        card.querySelector('h4').textContent=meta.question;
        card.querySelector('p').textContent=item.note;
        grid.appendChild(card);
      });
    }
    integrateAdditionalSymptoms();
    function updateVisibleCardCounts(){
      categories.forEach(id=>{
        const panel=document.getElementById(`anamnesis-panel-${id}`);
        const countLabel=panel&&panel.querySelector(':scope > .flex.items-center.justify-between .text-slate-400.font-semibold');
        if(!panel||!countLabel)return;
        const visibleCards=[...panel.querySelectorAll('.anamnesis-card')];
        countLabel.textContent=`${visibleCards.length} belirti`;
      });
    }

    function activeStep(){
      const index=categories.findIndex(id=>{
        const panel=document.getElementById(`anamnesis-panel-${id}`);
        return panel&&!panel.classList.contains('hidden');
      });
      return Math.max(0,index);
    }
    function updateStepUI(){
      const index=activeStep();
      const panel=document.getElementById(`anamnesis-panel-${categories[index]}`);
      if(progressLabel)progressLabel.textContent=`Adım ${index+1} / ${categories.length}`;
      if(progressBar)progressBar.style.width=`${((index+1)/categories.length)*100}%`;
      if(progress){
        progress.setAttribute('aria-valuenow',String(index+1));
        progress.setAttribute('aria-valuemax',String(categories.length));
        progress.setAttribute('aria-valuetext',`Adım ${index+1} / ${categories.length}`);
        progress.setAttribute('aria-label',`${categoryNames[index]} adımı`);
      }
      if(backButton)backButton.disabled=index===0;
      if(nextButton)nextButton.hidden=index===categories.length-1;
      if(stepHint)stepHint.textContent=index===categories.length-1
        ?'Son adım. Anamnez Triyaj ve eGFR Analiz butonuna tıklayarak sonucu hemen görüntüleyebilirsiniz.'
        :'Bu adımı boş bırakıp devam edebilir veya istediğiniz anda aşağıdaki Anamnez Triyaj ve eGFR Analiz butonuna basabilirsiniz.';
      if(analysisRow)analysisRow.classList.remove('hidden');
      root.classList.remove('vita-analysis-locked');
      if(panel){
        panel.setAttribute('role','region');
        panel.setAttribute('aria-label',`Adım ${index+1}: ${categoryNames[index]}`);
        panel.setAttribute('tabindex','-1');
      }
    }
    function goToStep(direction){
      const target=Math.max(0,Math.min(categories.length-1,activeStep()+direction));
      if(target===activeStep())return;
      if(typeof switchAnamnesisCategoryTab!=='function')return;
      switchAnamnesisCategoryTab(categories[target]);
      updateStepUI();
      const panel=document.getElementById(`anamnesis-panel-${categories[target]}`);
      if(panel){
        panel.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
        panel.focus({preventScroll:true});
      }
    }
    window.vitaAnamnesisStep=goToStep;

    root.querySelectorAll('.anamnesis-card').forEach(card=>{
      const match=(card.getAttribute('onclick')||'').match(/toggleAnamnesisCard\(this,\s*'([^']+)'\)/);
      if(!match)return;
      const key=match[1];
      card.setAttribute('role','button');
      card.setAttribute('tabindex','0');
      card.setAttribute('aria-pressed',String(card.classList.contains('border-indigo-500')));
      if(visualForSymptom[key]){
        const header=card.querySelector(':scope > div:first-child');
        const dot=header&&header.querySelector('.check-dot');
        if(header&&dot&&!header.querySelector('[data-vita-visual]')){
          const info=document.createElement('button');
          info.type='button';
          info.className='vita-visual-info';
          info.dataset.vitaVisual=visualForSymptom[key];
          info.setAttribute('aria-label',`${card.querySelector('h4')?.textContent||'Belirti'} için görsel örneği görüntüle`);
          info.title='Görsel örnek';
          info.innerHTML='<i class="fa-regular fa-circle-question" aria-hidden="true"></i>';
          info.addEventListener('click',event=>{
            event.preventDefault();
            event.stopPropagation();
            window.showVitaVisualReference(info.dataset.vitaVisual,info);
          });
          header.insertBefore(info,dot);
        }
      }
      card.addEventListener('keydown',event=>{
        if(event.target!==card||!(event.key==='Enter'||event.key===' '))return;
        event.preventDefault();
        card.click();
      });
      new MutationObserver(()=>{
        card.setAttribute('aria-pressed',String(card.classList.contains('border-indigo-500')));
      }).observe(card,{attributes:true,attributeFilter:['class']});
    });

    const panels=categories.map(id=>document.getElementById(`anamnesis-panel-${id}`)).filter(Boolean);
    if(panels.length){
      new MutationObserver(()=>{
        updateStepUI();
        updateVisibleCardCounts();
      }).observe(root.querySelector('#anamnesisCategoriesContainer'),{
        subtree:true,attributes:true,attributeFilter:['class']
      });
    }
    updateStepUI();
    updateVisibleCardCounts();
  })();
  