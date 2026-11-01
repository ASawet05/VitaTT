/* UYGULAMAYI İNDİR / TELEFONA YÜKLE bölümü
   Kullanıcı hesabına ilk girdiğinde yalnızca 1 kerelik kısa süreli yüzen alt bildirim olarak
   görünür, kapatma (×) düğmesiyle veya birkaç saniye sonra otomatik kapanır; sayfa altında yer kaplamaz. */
(function(){
  'use strict';
  const VITA_STORE_LINKS={
    android:'',
    ios:''
  };
  let deferredPrompt=null, modal=null, returnFocus=null, previousOverflow='', autoHideTimer=null;

  const isStandalone=()=>window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true||Boolean(window.VitaAndroidBridge)||Boolean(window.AndroidVitaBridge);
  const isSecureContextForInstall=()=>window.isSecureContext||location.hostname==='localhost'||location.hostname==='127.0.0.1';

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;dismissInstallSection(true);});

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='vita-tool-overlay';
    modal.id='vitaInstallModal';
    modal.hidden=true;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','vitaInstallTitle');
    modal.innerHTML=`<section class="vita-tool-dialog">
      <div class="vita-tool-head"><div><h2 id="vitaInstallTitle"></h2><p id="vitaInstallLead"></p></div>
      <button type="button" class="vita-tool-close" data-install-close aria-label="Kapat">Kapat</button></div>
      <ol class="vita-install-steps" id="vitaInstallSteps"></ol>
      <div class="vita-tool-note" id="vitaInstallNote" hidden></div>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-install-close]').addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closeModal();return;}
      if(e.key==='Tab'){e.preventDefault();modal.querySelector('[data-install-close]').focus();}
    });
    return modal;
  }
  function closeModal(){
    if(!modal)return;
    modal.hidden=true;
    document.body.style.overflow=previousOverflow;
    if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();
  }
  function openModal(title,lead,steps,trigger){
    const m=ensureModal();
    returnFocus=trigger||document.activeElement;
    previousOverflow=document.body.style.overflow;
    m.querySelector('#vitaInstallTitle').textContent=title;
    m.querySelector('#vitaInstallLead').textContent=lead;
    m.querySelector('#vitaInstallSteps').innerHTML=steps.map(s=>`<li>${s}</li>`).join('');
    const note=m.querySelector('#vitaInstallNote');
    if(!isSecureContextForInstall()){
      note.hidden=false;
      note.innerHTML='<strong>Not:</strong> Yükleme seçeneği HTTPS bir adresten veya localhost üzerinden açıldığında görünür.';
    } else { note.hidden=true; note.innerHTML=''; }
    document.body.style.overflow='hidden';
    m.hidden=false;
    m.querySelector('[data-install-close]').focus();
  }

  async function installAndroid(trigger){
    dismissInstallSection(true);
    if(VITA_STORE_LINKS.android){window.open(VITA_STORE_LINKS.android,'_blank','noopener');return;}
    if(deferredPrompt){
      const p=deferredPrompt; deferredPrompt=null;
      try{ await p.prompt(); await p.userChoice; }catch(_){}
      return;
    }
    openModal('Android & Bilgisayar (Web PWA) Kurulumu','Tarayıcı menüsünden VitaTakip\'i telefonunuza veya bilgisayarınıza bağımsız uygulama olarak kurabilirsiniz.',[
      'Uygulamayı <strong>Chrome</strong> veya <strong>Edge</strong> tarayıcısı ile açın.',
      'Telefonda sağ üstteki <strong>⋮</strong> menüsüne, bilgisayarda adres çubuğunun sağındaki <strong>Uygulamayı Yükle (⊕)</strong> simgesine tıklayın.',
      '<strong>“Uygulamayı yükle”</strong> veya <strong>“Ana ekrana ekle”</strong> seçeneğini seçin.',
      '<strong>Yükle</strong> düğmesine dokunun; VitaTakip hem çevrimdışı çalışan bir Web uygulaması hem de mobil uygulama olarak cihazınıza eklenir.'
    ],trigger);
  }
  function installIOS(trigger){
    dismissInstallSection(true);
    if(VITA_STORE_LINKS.ios){window.open(VITA_STORE_LINKS.ios,'_blank','noopener');return;}
    openModal('iPhone / iPad / Mac (Safari) Kurulumu','Apple cihazlarda uygulama Safari üzerinden ana ekrana veya Dock\'a eklenir.',[
      'Uygulamayı <strong>Safari</strong> ile açın.',
      'Alttaki (iPad ve Mac\'te üstteki) <strong>Paylaş</strong> simgesine (yukarı oklu kare) dokunun.',
      'Listeyi kaydırıp <strong>“Ana Ekrana Ekle”</strong> (Mac\'te <strong>“Dock\'a Ekle”</strong>) seçeneğine dokunun.',
      'Sağ üstteki <strong>Ekle</strong> düğmesine dokunun; VitaTakip simgesi ana ekranınıza eklenir.'
    ],trigger);
  }

  window.openVitaWebMobileInstallModal=async function(trigger){
    if(deferredPrompt){
      const p=deferredPrompt; deferredPrompt=null;
      try{ await p.prompt(); await p.userChoice; return; }catch(_){}
    }
    const ua=navigator.userAgent||'';
    if(/iPad|iPhone|iPod/i.test(ua)){
      installIOS(trigger);
      return;
    }
    openModal('Web & Mobil Uygulama Kurulumu (PWA + APK)','VitaTakip hibrit mimarisi sayesinde hem Web tarayıcısında (Bilgisayar/Tablet/Telefon) hem de Android Mobil Uygulama olarak çalışır:',[
      '<strong>Bilgisayar (Chrome / Edge):</strong> Adres çubuğunun sağındaki <strong>Uygulamayı Yükle</strong> simgesine tıklayarak masaüstü uygulaması olarak kurun.',
      '<strong>Android Telefon (Web PWA veya APK):</strong> Chrome menüsünden (⋮) <strong>“Uygulamayı yükle / Ana ekrana ekle”</strong> seçeneğini kullanın veya doğrudan <strong>Android APK</strong> paketini kurun.',
      '<strong>iPhone / iPad (Safari):</strong> Paylaş menüsünden <strong>“Ana Ekrana Ekle”</strong> seçeneğine dokunarak tam ekran mobil uygulama olarak kullanın.'
    ],trigger);
  };

  function dismissInstallSection(markSeen){
    if(autoHideTimer){clearTimeout(autoHideTimer);autoHideTimer=null;}
    const section=document.getElementById('vitaInstallSection');
    if(section){
      section.hidden=true;
      section.classList.add('hidden');
      section.style.display='none';
    }
    if(markSeen){
      try{
        localStorage.setItem('vitatakip_install_banner_seen_once','true');
        if(window.activeUserId) localStorage.setItem('vitatakip_install_banner_seen_'+window.activeUserId,'true');
      }catch(_){}
    }
  }

  window.dismissVitaInstallBanner=function(){
    dismissInstallSection(true);
  };

  window.triggerVitaInstallToastOnce=function(userId){
    if(isStandalone()) return;
    const section=document.getElementById('vitaInstallSection');
    if(!section)return;
    try{
      const key = userId ? ('vitatakip_install_banner_seen_'+userId) : 'vitatakip_install_banner_seen_once';
      if(localStorage.getItem(key)==='true' || localStorage.getItem('vitatakip_install_banner_seen_once')==='true'){
        dismissInstallSection(false);
        return;
      }
      localStorage.setItem(key,'true');
      localStorage.setItem('vitatakip_install_banner_seen_once','true');
    }catch(_){}

    section.hidden=false;
    section.classList.remove('hidden');
    section.style.display='block';
    if(autoHideTimer)clearTimeout(autoHideTimer);
    autoHideTimer=setTimeout(()=>{
      dismissInstallSection(true);
    }, 3200);
  };

  function init(){
    const section=document.getElementById('vitaInstallSection');
    if(!section)return;
    // Başlangıçta her zaman gizli tut; yalnızca hesaba ilk girişte 1 kerelik kısa süreli gösterilir.
    section.hidden=true;
    section.classList.add('hidden');
    section.style.display='none';
    const a=section.querySelector('[data-install="android"]');
    const i=section.querySelector('[data-install="ios"]');
    const closeBtn=section.querySelector('[data-install-dismiss]');
    if(a)a.addEventListener('click',e=>{e.preventDefault();if(window.SoundEffects&&SoundEffects.playClick)try{SoundEffects.playClick();}catch(_){} installAndroid(a);});
    if(i)i.addEventListener('click',e=>{e.preventDefault();if(window.SoundEffects&&SoundEffects.playClick)try{SoundEffects.playClick();}catch(_){} installIOS(i);});
    if(closeBtn)closeBtn.addEventListener('click',e=>{e.preventDefault();dismissInstallSection(true);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
