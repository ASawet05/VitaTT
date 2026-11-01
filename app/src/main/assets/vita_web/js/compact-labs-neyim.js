
(function(){
 const labDefs=[['d3','Vitamin D3','inputLabRef-d3'],['b12','Vitamin B12','inputLabRef-b12'],['ferritin','Ferritin','inputLabRef-ferritin'],['mg','Magnezyum','inputLabRef-mg'],['ca','Kalsiyum','inputLabRef-ca'],['zinc','Çinko','inputLabRef-zinc'],['creatinine','Kreatinin','inputLabRef-creatinine'],['folate','Folat','inputLabRef-folate'],['alt','ALT','inputLabRef-alt'],['hb','Hemoglobin','inputLabRef-hb'],['mcv','MCV','inputLabRef-mcv'],['crp','CRP','inputLabRef-crp']];
 function init(){
  const labs=document.getElementById('view-labs');
  if(labs && !document.getElementById('vitaLabRangesModal')){
   const modal=document.createElement('div'); modal.id='vitaLabRangesModal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-label','Laboratuvar referans aralıkları');
   modal.innerHTML='<div class="vita-modal-panel"><div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem"><h2 style="font-size:1rem;font-weight:900;margin:0">Referans aralıklarını özelleştir</h2><button type="button" id="vitaLabRangesClose" aria-label="Kapat" style="font-size:1.4rem;padding:.2rem .5rem;color:#334155">×</button></div><p style="font-size:.8rem;color:#64748b;margin:.2rem 0 1rem">İsteğe bağlı olarak tahlil raporunuzdaki aralığı yazın. Birim ve aralıkları raporunuzla aynı kullanın.</p><div id="vitaLabRangeFields" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.8rem"></div><div style="display:flex;justify-content:flex-end;margin-top:1rem"><button type="button" id="vitaLabRangesDone" style="padding:.65rem 1rem;border-radius:.65rem;background:#0f766e;color:white;font-weight:800">Tamam</button></div></div>';
   labs.appendChild(modal);
   const fields=modal.querySelector('#vitaLabRangeFields');
   labDefs.forEach(([key,label,id])=>{ const input=document.getElementById(id); if(!input)return; const wrap=document.createElement('label'); wrap.style.cssText='display:flex;flex-direction:column;gap:.35rem;font-size:.78rem;font-weight:800;color:#334155'; wrap.appendChild(document.createTextNode(label)); input.placeholder='Rapordaki referans aralığı'; input.setAttribute('aria-label',label+' referans aralığı'); input.style.display='block'; wrap.appendChild(input); fields.appendChild(wrap); const details=input.closest('details'); if(details) details.style.display='none'; });
   function close(){modal.classList.remove('is-open');} modal.querySelector('#vitaLabRangesClose').onclick=close; modal.querySelector('#vitaLabRangesDone').onclick=close; modal.addEventListener('click',e=>{if(e.target===modal)close();}); document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
   const trigger=document.createElement('button'); trigger.type='button'; trigger.className='vita-range-settings-trigger'; trigger.innerHTML='<i class="fa-solid fa-sliders" aria-hidden="true"></i> Aralıkları Özelleştir'; trigger.onclick=()=>modal.classList.add('is-open');
   const dateInput=labs.querySelector('input[type="date"]'); let host=dateInput?.parentElement || labs.querySelector('h1')?.parentElement || labs.firstElementChild; if(host){host.appendChild(trigger);}else labs.prepend(trigger);
   // hide the old reference info controls without touching their functions or IDs
   labs.querySelectorAll('button[onclick*="showLabReferenceGuide"]').forEach(b=>b.remove());
  }
  // Replace the integrated summary's large disclosure card with a single-line status badge; keep original nodes hidden for compatibility.
  const neyim=document.getElementById('view-neyim');
  if(neyim){
   const heading=[...neyim.querySelectorAll('h2,h3,h4')].find(x=>x.textContent.includes('Otomatik Entegre Klinik Veri Özeti'));
   if(heading){ const block=heading.closest('[onclick*="acc-integrated-summary"]')?.parentElement || heading.parentElement?.parentElement?.parentElement; if(block && !block.dataset.vitaHiddenSummary){ block.style.display='none'; block.dataset.vitaHiddenSummary='true'; }}
   // Convert symptom-card parent groups to wrapping chip rows, preserving each card's click handler.
   neyim.querySelectorAll('.anamnesis-card').forEach(card=>{const p=card.parentElement;if(p && !p.classList.contains('vita-symptom-chip-wrap')){ const siblings=[...p.children].filter(el=>el.classList?.contains('anamnesis-card')); if(siblings.length>=2)p.classList.add('vita-symptom-chip-wrap'); }});
   // Add a single collapsed technical-log disclosure around clearly labelled technical sections only when safe to do so is not possible structurally;
   // keep existing result nodes visible and compact to avoid breaking output-generation hooks.
  }
  // Remove the hidden lifestyle questionnaire from report output only; profile controls and data IDs stay available.
  document.querySelectorAll('h4').forEach(h=>{if(h.textContent.includes('Beslenme ve güneşlenme (kısa anket)')){const section=h.closest('.hidden'); if(section){section.setAttribute('aria-hidden','true'); section.classList.add('vita-report-hidden-questionnaire');}}});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
