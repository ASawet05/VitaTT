/* UYGULAMAYI İNDİR — Android, iPhone/iPad ve Bilgisayar için tek pencere.
   - Android: GitHub Releases'teki en son APK indirilir (ya da tarayıcıdan web uygulaması olarak yüklenir).
   - iPhone/iPad: App Store sürümü yok; Safari'den "Ana Ekrana Ekle" ile tam ekran uygulama olur.
   - Bilgisayar: Chrome/Edge'in "Uygulamayı yükle" özelliği (ayrı kurulum dosyası gerekmez).
   Uygulamanın içinden (Android uygulaması veya yüklü web uygulaması) açıldığında indirme seçenekleri gizlenir.
   Adrese #indir eklenirse pencere doğrudan açılır (ör. paylaşılan bağlantı). */
(function(){
  'use strict';
  const APK_URL='https://github.com/ASawet05/VitaTT/releases/latest/download/VitaTakip.apk';
  const APK_SIZE='yaklaşık 28 MB';
  let deferredPrompt=null, modal=null, returnFocus=null, previousOverflow='', autoHideTimer=null, activeTab='';

  const ua=()=>navigator.userAgent||'';
  const isAndroidApp=()=>Boolean(window.VitaAndroidBridge)||Boolean(window.AndroidVitaBridge);
  const isStandalone=()=>isAndroidApp()||window.navigator.standalone===true||(window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches);
  const isIOS=()=>/iPad|iPhone|iPod/i.test(ua())||(/Macintosh/i.test(ua())&&navigator.maxTouchPoints>1);
  const isAndroid=()=>/Android/i.test(ua());
  const detectPlatform=()=>isIOS()?'ios':(isAndroid()?'android':'desktop');
  const isSecureContextForInstall=()=>window.isSecureContext||location.hostname==='localhost'||location.hostname==='127.0.0.1';

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;if(modal&&!modal.hidden)render(activeTab);});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;dismissInstallSection(true);closeModal();});

  async function runBrowserInstall(){
    if(!deferredPrompt)return false;
    const p=deferredPrompt; deferredPrompt=null;
    try{ await p.prompt(); await p.userChoice; }catch(_){}
    return true;
  }

  const TABS=[
    {id:'android',icon:'fa-brands fa-android',label:'Android'},
    {id:'ios',icon:'fa-brands fa-apple',label:'iPhone / iPad'},
    {id:'desktop',icon:'fa-solid fa-desktop',label:'Bilgisayar'}
  ];

  function panelHtml(id){
    const browserBtn=deferredPrompt?`<button type="button" class="vita-dl-secondary" data-dl-browser><i class="fa-solid fa-circle-down" aria-hidden="true"></i> Web uygulaması olarak yükle</button>`:'';
    if(id==='android'){
      return `<a class="vita-dl-primary" href="${APK_URL}" rel="noopener" data-dl-apk>
          <i class="fa-brands fa-android" aria-hidden="true"></i>
          <span><strong>Android uygulamasını indir</strong><small>VitaTakip.apk · ${APK_SIZE}</small></span></a>
        <ol class="vita-install-steps">
          <li>İndirme bitince bildirimden veya <strong>İndirilenler</strong> klasöründen <strong>VitaTakip.apk</strong> dosyasını açın.</li>
          <li>"Bilinmeyen uygulamaları yükle" izni istenirse tarayıcınız için <strong>İzin ver</strong>'i açıp geri dönün.</li>
          <li><strong>Yükle</strong>'ye dokunun. Play Protect uyarı gösterirse <strong>Yine de yükle</strong>'yi seçin.</li>
        </ol>
        <div class="vita-tool-note">Bu, Play Store'a çıkmadan önceki <strong>test sürümüdür</strong>. Google Play sürümü hazırlanıyor.</div>
        <details class="vita-dl-alt"><summary>APK kurmak istemiyorum</summary>
          <p>Chrome'da sağ üstteki <strong>⋮</strong> menüsünden <strong>"Ana ekrana ekle"</strong> veya <strong>"Uygulamayı yükle"</strong>'yi seçin. Uygulama web sürümü olarak kurulur.</p>${browserBtn}
        </details>`;
    }
    if(id==='ios'){
      const notSafari=/CriOS|FxiOS|EdgiOS/i.test(ua());
      return `<div class="vita-tool-note vita-dl-info">App Store sürümü henüz yok. Safari'den ana ekrana eklediğinizde VitaTakip kendi simgesiyle, tam ekran ve internetsiz de çalışır. Verileriniz ve bulut eşitleme aynıdır.</div>
        <ol class="vita-install-steps">
          <li>Bu sayfayı <strong>Safari</strong> ile açın.${notSafari?' (Chrome\'da da alttaki <strong>Paylaş</strong> düğmesiyle aynı adımlar çalışır.)':''}</li>
          <li>Alttaki <strong>Paylaş</strong> düğmesine (yukarı oklu kare <i class="fa-solid fa-arrow-up-from-bracket" aria-hidden="true"></i>) dokunun. iPad'de üst köşededir.</li>
          <li>Listeyi kaydırıp <strong>"Ana Ekrana Ekle"</strong>'ye dokunun.</li>
          <li>Sağ üstteki <strong>Ekle</strong>'ye dokunun. VitaTakip simgesi ana ekranınıza gelir.</li>
        </ol>`;
    }
    const isFirefox=/Firefox/i.test(ua())&&!/Seamonkey/i.test(ua());
    const isMacSafari=/Macintosh/i.test(ua())&&/Safari/i.test(ua())&&!/Chrome|Chromium|Edg/i.test(ua());
    const direct=deferredPrompt?`<button type="button" class="vita-dl-primary" data-dl-browser>
          <i class="fa-solid fa-desktop" aria-hidden="true"></i>
          <span><strong>Bilgisayara yükle</strong><small>Windows · macOS · Linux — kurulum dosyası gerekmez</small></span></button>`:'';
    let steps;
    if(isMacSafari){
      steps=`<li>Üst menüden <strong>Dosya → Dock'a Ekle</strong>'yi seçin.</li><li><strong>Ekle</strong>'ye tıklayın; VitaTakip Dock'ta ve Uygulamalar klasöründe görünür.</li>`;
    } else if(isFirefox){
      steps=`<li>Firefox uygulama yüklemeyi desteklemiyor. Bu sayfayı <strong>Chrome</strong> veya <strong>Edge</strong> ile açın.</li><li>Adres çubuğunun sağındaki <strong>Yükle</strong> simgesine <i class="fa-solid fa-circle-down" aria-hidden="true"></i> tıklayın.</li>`;
    } else {
      steps=`<li>Adres çubuğunun sağındaki <strong>Yükle</strong> simgesine <i class="fa-solid fa-circle-down" aria-hidden="true"></i> tıklayın.</li>
          <li>Simge yoksa: Chrome'da <strong>⋮ → Yayınla, kaydet ve paylaş → Sayfayı uygulama olarak yükle</strong>; Edge'de <strong>… → Uygulamalar → Bu siteyi uygulama olarak yükle</strong>.</li>
          <li><strong>Yükle</strong>'ye tıklayın. VitaTakip masaüstünde ve Başlat menüsünde kendi penceresinde açılır.</li>`;
    }
    return `${direct}<ol class="vita-install-steps">${steps}</ol>
      <div class="vita-tool-note vita-dl-info">Ayrı bir kurulum dosyası indirmeniz gerekmez. Verileriniz ve bulut eşitleme tarayıcıdakiyle aynıdır.</div>`;
  }

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='vita-tool-overlay';
    modal.id='vitaInstallModal';
    modal.hidden=true;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','vitaInstallTitle');
    modal.innerHTML=`<section class="vita-tool-dialog vita-dl-dialog">
      <div class="vita-tool-head"><div><h2 id="vitaInstallTitle"><i class="fa-solid fa-download" aria-hidden="true"></i>VitaTakip'i indirin</h2>
      <p id="vitaInstallLead">Cihazınızı seçin. Aynı Google hesabıyla girerseniz kayıtlarınız tüm cihazlarda görünür.</p></div>
      <button type="button" class="vita-tool-close" data-install-close aria-label="Kapat">Kapat</button></div>
      <div class="vita-dl-tabs" role="tablist" aria-label="Cihaz türü">${TABS.map(t=>`<button type="button" role="tab" class="vita-dl-tab" data-dl-tab="${t.id}" id="vitaDlTab-${t.id}" aria-controls="vitaDlPanel"><i class="${t.icon}" aria-hidden="true"></i><span>${t.label}</span><em class="vita-dl-here" hidden>Bu cihaz</em></button>`).join('')}</div>
      <div class="vita-dl-panel" id="vitaDlPanel" role="tabpanel"></div>
      <div class="vita-tool-note" id="vitaInstallNote" hidden></div>
    </section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-install-close]').addEventListener('click',closeModal);
    modal.addEventListener('click',e=>{
      if(e.target===modal){closeModal();return;}
      const tab=e.target.closest('[data-dl-tab]');
      if(tab){render(tab.getAttribute('data-dl-tab'));return;}
      if(e.target.closest('[data-dl-browser]')){runBrowserInstall().then(ok=>{if(ok)closeModal();});}
    });
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();closeModal();return;}
      const tab=e.target.closest&&e.target.closest('[data-dl-tab]');
      if(tab&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){
        e.preventDefault();
        const i=TABS.findIndex(t=>t.id===tab.getAttribute('data-dl-tab'));
        const next=TABS[(i+(e.key==='ArrowRight'?1:TABS.length-1))%TABS.length].id;
        render(next); modal.querySelector(`[data-dl-tab="${next}"]`).focus();
      }
    });
    return modal;
  }

  function render(id){
    const m=ensureModal();
    activeTab=id||detectPlatform();
    const here=detectPlatform();
    m.querySelectorAll('[data-dl-tab]').forEach(b=>{
      const on=b.getAttribute('data-dl-tab')===activeTab;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-selected',on?'true':'false');
      b.tabIndex=on?0:-1;
      b.querySelector('.vita-dl-here').hidden=b.getAttribute('data-dl-tab')!==here;
    });
    const panel=m.querySelector('#vitaDlPanel');
    panel.setAttribute('aria-labelledby','vitaDlTab-'+activeTab);
    panel.innerHTML=panelHtml(activeTab);
    const note=m.querySelector('#vitaInstallNote');
    if(isStandalone()){
      note.hidden=false;
      note.textContent=isAndroidApp()?'Şu an VitaTakip Android uygulamasındasınız. Diğer cihazlar için bu seçenekleri kullanabilirsiniz.':'VitaTakip bu cihazda zaten yüklü ve uygulama olarak açık.';
    } else if(!isSecureContextForInstall()&&activeTab!=='android'){
      note.hidden=false;
      note.textContent='Not: Yükleme seçeneği yalnızca güvenli (https) adresten açıldığında çalışır.';
    } else { note.hidden=true; note.textContent=''; }
  }

  function closeModal(){
    if(!modal||modal.hidden)return;
    modal.hidden=true;
    document.body.style.overflow=previousOverflow;
    if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();
  }
  function openDownload(tab,trigger){
    dismissInstallSection(true);
    const m=ensureModal();
    returnFocus=trigger||document.activeElement;
    previousOverflow=document.body.style.overflow;
    render(tab);
    document.body.style.overflow='hidden';
    m.hidden=false;
    const cur=m.querySelector('.vita-dl-tab.is-active');
    (cur||m.querySelector('[data-install-close]')).focus();
  }

  window.openVitaDownloadModal=openDownload;
  /* Eski çağrılar (Ayarlar düğmesi vb.) için */
  window.openVitaWebMobileInstallModal=function(trigger){openDownload(null,trigger);};

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
  window.dismissVitaInstallBanner=function(){dismissInstallSection(true);};

  /* Hesaba ilk girişte bir kez alt bildirim (15 sn sonra veya × ile kapanır) */
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
    autoHideTimer=setTimeout(()=>{dismissInstallSection(true);},15000);
  };

  function init(){
    const section=document.getElementById('vitaInstallSection');
    if(section){
      section.hidden=true;
      section.classList.add('hidden');
      section.style.display='none';
      section.querySelectorAll('[data-install]').forEach(btn=>btn.addEventListener('click',e=>{
        e.preventDefault();
        if(window.SoundEffects&&SoundEffects.playClick)try{SoundEffects.playClick();}catch(_){}
        openDownload(btn.getAttribute('data-install'),btn);
      }));
      const closeBtn=section.querySelector('[data-install-dismiss]');
      if(closeBtn)closeBtn.addEventListener('click',e=>{e.preventDefault();dismissInstallSection(true);});
    }
    /* Uygulamanın içindeyken indirme girişleri gizlenir */
    if(isStandalone())document.querySelectorAll('[data-vita-download-entry]').forEach(el=>{el.hidden=true;el.style.display='none';});
    if(/^#indir$/i.test(location.hash||''))setTimeout(()=>openDownload(null,null),300);
  }
  window.addEventListener('hashchange',()=>{if(/^#indir$/i.test(location.hash||''))openDownload(null,null);});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
