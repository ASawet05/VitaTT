/* eGFR HESAPLAYICI (CKD-EPI 2021, ırk katsayısız) — bağımsız araç
   Kreatinin + yaş + cinsiyetten tahmini glomerüler filtrasyon hızı hesaplar.
   Mevcut calculateCKDEPI_eGFR ve classifyGFRStage işlevlerini kullanır; tanı koymaz. */
(function(){
  'use strict';
  let modal=null, returnFocus=null, previousOverflow='';
  const STAGES=[
    {id:'G1',range:'≥ 90',text:'Normal veya yüksek'},
    {id:'G2',range:'60–89',text:'Hafif azalma'},
    {id:'G3a',range:'45–59',text:'Hafif–orta azalma'},
    {id:'G3b',range:'30–44',text:'Orta–ileri azalma'},
    {id:'G4',range:'15–29',text:'Ciddi azalma'},
    {id:'G5',range:'< 15',text:'Çok ciddi azalma'}
  ];
  function esc(v){return typeof escapeHtmlText==='function'?escapeHtmlText(v):String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function parseNum(v){const n=Number(String(v||'').trim().replace(',','.'));return Number.isFinite(n)?n:NaN;}

  function ensureModal(){
    if(modal)return modal;
    modal=document.createElement('div');
    modal.className='vita-tool-overlay';
    modal.id='vitaEgfrModal';
    modal.hidden=true;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('aria-labelledby','vitaEgfrTitle');
    modal.innerHTML=`
      <section class="vita-tool-dialog">
        <div class="vita-tool-head">
          <div>
            <h2 id="vitaEgfrTitle"><i class="fa-solid fa-calculator" aria-hidden="true"></i>eGFR Hesaplayıcı</h2>
            <p>Böbrek süzme hızını (eGFR) CKD-EPI 2021 formülüyle tahmin eder. Yetişkinler içindir.</p>
          </div>
          <button type="button" class="vita-tool-close" data-egfr-close aria-label="Hesaplayıcıyı kapat">Kapat</button>
        </div>
        <div class="vita-tool-form">
          <div class="vita-tool-field wide">
            <label for="vitaEgfrCreatinine">Serum kreatinin</label>
            <div style="display:flex;gap:.5rem">
              <input id="vitaEgfrCreatinine" class="vita-tool-input" type="text" inputmode="decimal" autocomplete="off" placeholder="Örn: 0,9" style="flex:1 1 auto">
              <select id="vitaEgfrUnit" class="vita-tool-select" aria-label="Kreatinin birimi" style="flex:0 0 7rem">
                <option value="mgdl">mg/dL</option>
                <option value="umol">µmol/L</option>
              </select>
            </div>
            <span class="vita-tool-hint" id="vitaEgfrCreatinineHint">Laboratuvar raporundaki birimi seçin.</span>
          </div>
          <div class="vita-tool-field">
            <label for="vitaEgfrAge">Yaş</label>
            <input id="vitaEgfrAge" class="vita-tool-input" type="text" inputmode="numeric" autocomplete="off" placeholder="Örn: 40">
          </div>
          <div class="vita-tool-field">
            <label for="vitaEgfrSex">Biyolojik cinsiyet</label>
            <select id="vitaEgfrSex" class="vita-tool-select">
              <option value="">Seçiniz</option>
              <option value="K">Kadın</option>
              <option value="E">Erkek</option>
            </select>
          </div>
        </div>
        <div id="vitaEgfrError" class="vita-tool-error" role="alert" hidden></div>
        <div class="vita-tool-actions">
          <button type="button" class="vita-tool-btn" id="vitaEgfrCalc"><i class="fa-solid fa-equals" aria-hidden="true"></i> Hesapla</button>
          <button type="button" class="vita-tool-btn secondary" id="vitaEgfrFill" hidden>Kayıtlı bilgileri getir</button>
        </div>
        <div id="vitaEgfrResult" aria-live="polite"></div>
        <div class="vita-tool-note">
          <strong>Dikkat:</strong>
          <ul>
            <li>Böbrek işlevi stabilken geçerlidir; akut böbrek hasarı, gebelik, diyaliz ve çok farklı kas kütlesinde (ör. kas hastalığı, ampütasyon, ileri yaşta zayıflık) yanıltıcı olabilir.</li>
            <li>Kreatin takviyesi veya çok fazla et tüketimi kreatinini yükselterek eGFR'yi gerçekte olduğundan düşük gösterebilir.</li>
            <li>Tek bir ölçüm kronik böbrek hastalığı tanısı koydurmaz; tanı için bulgunun en az 3 ay sürmesi ve idrar tetkikleri gibi başka göstergeler gerekir.</li>
            <li>Bu araç ilaç dozu belirlemek için değildir. Sonucu hekiminizle değerlendirin.</li>
          </ul>
        </div>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-egfr-close]').addEventListener('click',close);
    modal.addEventListener('click',e=>{if(e.target===modal)close();});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      if(e.key==='Enter'&&e.target.tagName==='INPUT'){e.preventDefault();calculate();return;}
      if(e.key!=='Tab')return;
      const f=[...modal.querySelectorAll('button:not([hidden]):not([disabled]),input,select')];
      if(!f.length)return;
      if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}
      else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}
    });
    modal.querySelector('#vitaEgfrCalc').addEventListener('click',calculate);
    modal.querySelector('#vitaEgfrFill').addEventListener('click',()=>{prefill(true);calculate();});
    modal.querySelector('#vitaEgfrUnit').addEventListener('change',()=>{
      const unit=modal.querySelector('#vitaEgfrUnit').value;
      const input=modal.querySelector('#vitaEgfrCreatinine');
      const n=parseNum(input.value);
      if(Number.isFinite(n)&&n>0){input.value=String(unit==='umol'?Math.round(n*88.4):Math.round(n/88.4*100)/100).replace('.',',');}
      modal.querySelector('#vitaEgfrCreatinineHint').textContent=unit==='umol'?'µmol/L = mg/dL × 88,4':'Laboratuvar raporundaki birimi seçin.';
    });
    return modal;
  }

  function savedValues(){
    const out={creatinine:null,age:null,sex:''};
    try{
      const u=(typeof state!=='undefined'&&state.user)?state.user:null;
      if(u){ if(Number(u.age)>0)out.age=Number(u.age); if(u.gender==='K'||u.gender==='E')out.sex=u.gender; }
      if(window.VitaLabInsights){
        const m=VitaLabInsights.buildPanel().find(x=>x.key==='creatinine'&&x.present);
        if(m)out.creatinine=m.value;
      } else if(typeof state!=='undefined'&&Number(state.labValues?.creatinine)>0){ out.creatinine=Number(state.labValues.creatinine); }
    }catch(_){}
    return out;
  }
  function prefill(force){
    const v=savedValues();
    const set=(id,val)=>{const el=modal.querySelector(id);if(el&&(force||!el.value)&&val!==null&&val!==''&&val!==undefined)el.value=val;};
    if(force)modal.querySelector('#vitaEgfrUnit').value='mgdl';
    set('#vitaEgfrCreatinine',v.creatinine!==null?String(v.creatinine).replace('.',','):null);
    set('#vitaEgfrAge',v.age);
    set('#vitaEgfrSex',v.sex);
    modal.querySelector('#vitaEgfrFill').hidden=!(v.creatinine!==null||v.age!==null||v.sex);
  }

  function showError(msg){
    const el=modal.querySelector('#vitaEgfrError');
    el.textContent=msg||'';
    el.hidden=!msg;
  }

  function calculate(){
    const result=modal.querySelector('#vitaEgfrResult');
    result.innerHTML='';
    showError('');
    const unit=modal.querySelector('#vitaEgfrUnit').value;
    let scr=parseNum(modal.querySelector('#vitaEgfrCreatinine').value);
    const age=parseNum(modal.querySelector('#vitaEgfrAge').value);
    const sex=modal.querySelector('#vitaEgfrSex').value;
    if(!Number.isFinite(scr)||scr<=0){showError('Lütfen geçerli bir kreatinin değeri girin.');return;}
    if(unit==='umol')scr=scr/88.4;
    if(scr<0.2||scr>20){showError('Kreatinin değeri beklenen aralığın (0,2–20 mg/dL) dışında görünüyor. Değeri ve birimi kontrol edin.');return;}
    if(!Number.isFinite(age)||age<=0||age>120){showError('Lütfen geçerli bir yaş girin.');return;}
    if(age<18){showError('Bu hesaplayıcı yetişkinler (18 yaş ve üzeri) içindir. Çocuk ve ergenlerde farklı bir formül (bedside Schwartz) kullanılır; sonucu çocuk hekimine veya nefrolojiye sorun.');return;}
    if(sex!=='K'&&sex!=='E'){showError('Formül kadın ve erkek için farklı katsayılar kullandığından lütfen biyolojik cinsiyeti seçin.');return;}
    if(typeof calculateCKDEPI_eGFR!=='function'){showError('Hesaplama modülü yüklenemedi.');return;}
    const r=calculateCKDEPI_eGFR(scr,age,sex);
    if(!r){showError('Hesaplama yapılamadı. Girilen değerleri kontrol edin.');return;}
    const rows=STAGES.map(s=>`<tr class="${s.id===r.stage?'active':''}"><td>${esc(s.id)}</td><td>${esc(s.range)}</td><td>${esc(s.text)}</td></tr>`).join('');
    const urgent=r.egfr<15?'<p><strong>Çok düşük eGFR:</strong> Bu sonuç gecikmeden bir sağlık profesyoneli tarafından değerlendirilmelidir. Nefes darlığı, belirgin şişlik, çok az idrar, bilinç bulanıklığı gibi belirtiler varsa 112\'yi arayın.</p>':'';
    result.innerHTML=`
      <div class="vita-tool-result">
        <div><span class="num">${esc(r.egfr)}</span><span class="unit">mL/dk/1.73 m²</span></div>
        <span class="vita-tool-badge ${esc(r.riskLevel)}">Evre ${esc(r.stage)}</span>
        <p>${esc(r.desc)}.</p>
        <p>${esc(r.interpretationNote)}</p>
        ${urgent}
        <table class="vita-tool-table" aria-label="eGFR evreleri (KDIGO)"><thead><tr><th>Evre</th><th>eGFR</th><th>Anlamı</th></tr></thead><tbody>${rows}</tbody></table>
        <p style="font-size:.62rem;color:#64748b">Formül: CKD-EPI 2021 (ırk katsayısı içermez). Hesaplanan kreatinin: ${esc(Math.round(scr*100)/100)} mg/dL.</p>
      </div>`;
  }

  function close(){
    if(!modal)return;
    modal.hidden=true;
    document.body.style.overflow=previousOverflow;
    if(returnFocus&&typeof returnFocus.focus==='function')returnFocus.focus();
  }

  window.openEgfrCalculator=function(trigger){
    const dialog=ensureModal();
    returnFocus=trigger||document.activeElement;
    previousOverflow=document.body.style.overflow;
    prefill(false);
    dialog.hidden=false;
    document.body.style.overflow='hidden';
    const first=dialog.querySelector('#vitaEgfrCreatinine');
    if(first)first.focus();
  };
  window.closeEgfrCalculator=close;
})();
