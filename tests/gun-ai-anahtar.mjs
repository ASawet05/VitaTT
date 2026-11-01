import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.accept());
await p.evaluate(() => closeProfileModal()); await sleep(1000);
await p.evaluate(() => { try { finishVitaSpotlightTour(true); } catch (e) {} });
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* 1) API anahtarı hesaba özel */
const K = await p.evaluate(() => {
  const A = activeUserId; const o = {};
  saveGeminiApiKey('AIzaKEY_A_123456'); o.a1 = getGeminiApiKey();
  activeUserId = null; o.noSession = getGeminiApiKey();       // çıkış: bellekte gösterilmez
  activeUserId = A; o.aBack = getGeminiApiKey();               // aynı hesaba dönüş: korunur
  activeUserId = 'baska_hesap'; o.b0 = getGeminiApiKey();      // başka hesap: boş
  saveGeminiApiKey('AIzaKEY_B_999999'); o.b1 = getGeminiApiKey();
  activeUserId = A; o.aAfterB = getGeminiApiKey();
  updateApiKeyUI(); o.inputA = document.getElementById('drawerGeminiApiKeyInput').value;
  activeUserId = 'baska_hesap'; updateApiKeyUI(); o.inputB = document.getElementById('drawerGeminiApiKeyInput').value;
  localStorage.removeItem('vita_gemini_api_key_baska_hesap'); activeUserId = A;
  o.legacyKeyGone = localStorage.getItem('vita_gemini_api_key') === null;
  return o;
});
log('Aynı hesapta anahtar kaydedilir', K.a1 === 'AIzaKEY_A_123456');
log('Oturum yokken anahtar gösterilmez/kullanılmaz', K.noSession === '', JSON.stringify(K.noSession));
log('Aynı hesaba dönünce anahtar korunur', K.aBack === 'AIzaKEY_A_123456');
log('Başka hesapta anahtar boş', K.b0 === '', K.b0);
log('Başka hesabın anahtarı ayrı saklanır', K.b1 === 'AIzaKEY_B_999999' && K.aAfterB === 'AIzaKEY_A_123456');
log('Anahtar kutusu hesaba göre güncellenir', K.inputA === 'AIzaKEY_A_123456' && K.inputB === 'AIzaKEY_B_999999', K.inputA + ' | ' + K.inputB);
log('Eski ortak anahtar kopyası yok', K.legacyKeyGone);

/* 2) Gün değişimi: açıkken de sıfırlanır */
const D = await p.evaluate(async () => {
  state.supplements = [{ id: 's1', name: 'Test', timing: 'Sabah', taken: true }]; state.hydration = state.hydration || {}; state.hydration.current = 750; saveState();
  const y = new Date(Date.now() - 86400000).toLocaleDateString('tr-TR');
  localStorage.setItem('vitatakip_lastActiveDate_' + activeUserId, y);
  window.dispatchEvent(new Event('focus')); await new Promise(r => setTimeout(r, 300));
  return { taken: state.supplements[0].taken, water: state.hydration.current, date: localStorage.getItem('vitatakip_lastActiveDate_' + activeUserId) === new Date().toLocaleDateString('tr-TR') };
});
log('Gün değişince su sıfırlanır', D.water === 0, String(D.water));
log('Gün değişince takviye işareti sıfırlanır', D.taken === false);
log('Tarih güncellenir', D.date);

/* 3) Yerel yanıt kısa ve öz */
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 34; document.getElementById('modalInputGender').value = 'K'; document.getElementById('modalInputHeight').value = 165; document.getElementById('modalInputWeight').value = 62; document.getElementById('modalCustomMedications').value = 'Metformin, Pantoprazol'; saveUserProfileFromModal(); });
await sleep(400);
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabFerritin: '9', inputLabB12: '180', inputLabHb: '10.9', inputLabD3: '14', inputLabMg: '1.5', inputLabCreatinine: '0.9' })) { const e = document.getElementById(id); if (e) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } } saveCurrentLabRecordWithDate(); });
await sleep(500);
const C = await p.evaluate(async () => {
  VitaAIChat.toggle && VitaAIChat.toggle(true);
  const before = document.body.innerText.length;
  VitaAIChat.sendPreset('tahlil');
  await new Promise(r => setTimeout(r, 4000));
  const el = document.querySelector('.vita-ai-compact');
  return { found: !!el, len: el ? el.innerText.length : 0, topics: el ? el.querySelectorAll('.vita-ai-topic').length : 0, text: el ? el.innerText.slice(0, 700) : document.body.innerText.slice(-600) };
});
console.log(C.text);
log('Yerel yanıt kompakt biçimde', C.found);
log('Yerel yanıt kısa (≤ 1000 karakter görünür)', C.found && C.len <= 1000, String(C.len));
log('Konular kaybolmaz (≤ 8)', C.topics >= 1 && C.topics <= 8, String(C.topics));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
