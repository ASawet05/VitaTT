import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(20000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
// Gerçek e-posta göndermemek için formsubmit isteklerini yakala ve sahte yanıt ver
let mode = 'ok'; const sent = [];
await p.setRequestInterception(true);
p.on('request', r => {
  if (r.url().includes('formsubmit.co') && r.method() === 'OPTIONS') { r.respond({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type, accept' } }); }
  else if (r.url().includes('formsubmit.co')) {
    sent.push({ url: r.url(), body: r.postData() });
    if (mode === 'ok') r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ success: 'true', message: 'ok' }) });
    else if (mode === 'inactive') r.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ success: 'false', message: 'This form needs Activation.' }) });
    else r.abort('failed');
  } else r.continue();
});
const submit = async (text) => { await p.evaluate(() => openVitaFeedback()); await sleep(400); await p.type('#vitaFeedbackMessage', text); await p.evaluate(() => document.getElementById('vitaFeedbackForm').requestSubmit()); await sleep(1500); };
const st = () => p.evaluate(() => ({ status: document.getElementById('vitaFeedbackDeliveryStatus').innerText.replace(/\s+/g, ' '), entries: getVitaFeedbackEntries().map(e => ({ d: e.deliveredToEmail, a: e.deliveryAttempts, s: e.sender })) }));
await p.evaluate(() => openVitaFeedback()); await sleep(400);
const ui = await p.evaluate(() => ({ text: document.getElementById('feedbackModal').innerText, hasNameInput: !!document.getElementById('vitaFeedbackSenderName'), line: document.getElementById('vitaFeedbackSenderLine').innerText }));
log('Pencerede e-posta adresi görünmüyor', !/gmail|@/.test(ui.text), (ui.text.match(/\S*@\S*/) || [''])[0]);
log('Ad alanı yok, gönderen profilden', !ui.hasNameInput && ui.line === 'Test Kullanici', ui.line);
mode = 'ok'; await submit('Test mesajı: her şey çalışıyor mu?'); let s = await st();
log('Başarılı gönderim: iletildi', /iletildi/i.test(s.status) && s.entries[0].d === true, s.status);
const body = JSON.parse(sent[sent.length - 1].body);
log('Gönderen profil adı, e-posta/sağlık verisi yok', body.Gonderen === 'Test Kullanici' && !/gmail/.test(sent[sent.length - 1].body.replace(/sxgsawet/g, '')), JSON.stringify(Object.keys(body)));
log('İstek doğru adrese gidiyor', /formsubmit\.co\/ajax\/sxgsawet@gmail\.com/.test(sent[sent.length - 1].url));
mode = 'inactive'; await submit('Etkinleştirme bekleyen alıcı testi'); s = await st();
log('Etkinleşmemiş alıcı: "iletildi" DENMEZ, bekliyor', !/Teşekkürler/.test(s.status) && /iletilemedi/.test(s.status) && s.entries[0].d === false, s.status);
mode = 'fail'; await submit('Ağ hatası testi'); s = await st();
log('Ağ hatası: kayıtlı ve bekliyor', s.entries[0].d === false && /iletilemedi/.test(s.status));
mode = 'ok'; await p.evaluate(() => closeVitaFeedback()); await p.evaluate(() => openVitaFeedback()); await sleep(2500); s = await st();
log('Açılışta bekleyenler otomatik yeniden denenir ve iletilir', s.entries.every(e => e.d === true), JSON.stringify(s.entries));
const hist = await p.evaluate(() => document.getElementById('vitaFeedbackHistoryList').innerText);
log('Geçmişte "İletildi" durumu görünür', /İletildi/.test(hist));
log('Hata yok', errs.length === 0, errs.join('|'));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
