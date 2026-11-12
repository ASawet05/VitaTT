import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(20000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
// Geri bildirim hiçbir sunucuya gitmemeli: localhost dışındaki her istek kaydedilir; mailto gezintisi engellenir.
const external = []; const mailto = [];
await p.setRequestInterception(true);
p.on('request', r => {
  const u = r.url();
  if (u.startsWith('mailto:')) { mailto.push(u); r.abort('aborted'); return; }
  if (!/^https?:\/\/localhost[:/]/.test(u) && !u.startsWith('data:') && !u.startsWith('blob:')) external.push(u);
  r.continue();
});
const submit = async (text) => { await p.evaluate(() => openVitaFeedback()); await sleep(400); await p.type('#vitaFeedbackMessage', text); await p.evaluate(() => document.getElementById('vitaFeedbackForm').requestSubmit()); await sleep(1200); };
await p.evaluate(() => openVitaFeedback()); await sleep(400);
const ui = await p.evaluate(() => ({ text: document.getElementById('feedbackModal').innerText, hasNameInput: !!document.getElementById('vitaFeedbackSenderName'), line: document.getElementById('vitaFeedbackSenderLine').innerText }));
log('Pencerede e-posta adresi görünmüyor', !/gmail|@/.test(ui.text), (ui.text.match(/\S*@\S*/) || [''])[0]);
log('Ad alanı yok, gönderen profilden', !ui.hasNameInput && ui.line === 'Test Kullanici', ui.line);
await submit('Test mesajı: her şey çalışıyor mu?');
const s = await p.evaluate(() => ({ status: document.getElementById('vitaFeedbackDeliveryStatus').innerText.replace(/\s+/g, ' '), entries: getVitaFeedbackEntries().map(e => ({ s: e.sender, m: e.message })) }));
log('Geri bildirim cihaza kaydedildi', s.entries.length === 1 && s.entries[0].s === 'Test Kullanici' && /çalışıyor/.test(s.entries[0].m), JSON.stringify(s.entries));
log('Durum: cihazda kayıtlı, e-posta uygulamasıyla gönderilir', /kaydedildi/.test(s.status) && /e-posta uygulamanız/.test(s.status), s.status);
const hist = await p.evaluate(() => document.getElementById('vitaFeedbackHistoryList').innerText);
log('Geçmişte "Cihazda kayıtlı" görünür', /Cihazda kayıtlı/.test(hist));
const src = await p.evaluate(() => submitVitaFeedback.toString() + sendVitaFeedbackViaEmailClient.toString());
log('Geri bildirim kodunda ağ isteği yok', !/fetch\(|XMLHttpRequest|formsubmit/i.test(src));
log('Hiçbir dış sunucuya istek gitmedi', external.length === 0, external.join(', '));
log('Hata yok', errs.length === 0, errs.join('|'));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
