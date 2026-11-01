
(function(){
  function simplifyVitaTakipUI(){
    document.querySelectorAll('span').forEach(function(el){
      if(el.textContent.trim()==='!'){
        const parent=el.parentElement;
        if(parent && /bg-sky-100/.test(parent.className||'')){
          parent.classList.add('vitatakip-reminder-compact');
          parent.setAttribute('title','Hatırlatma tarihi klinik takvim değildir');
          parent.setAttribute('aria-label','Hatırlatma tarihi klinik takvim değildir');
        }
      }
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',simplifyVitaTakipUI,{once:true}); else simplifyVitaTakipUI();
})();
