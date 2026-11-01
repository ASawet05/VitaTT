import { boot, sleep } from './lib.mjs';
const { b, p, errs } = await boot();
p.setDefaultTimeout(30000); p.on('dialog', d => d.dismiss());
await p.evaluate(() => closeProfileModal()); await sleep(1200);
await p.evaluate(() => document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'));
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };

/* 1) Sınır değer testleri: Hb ve kreatinin */
const B = await p.evaluate(() => {
  const E = (k, v, g) => { const r = KDSSRuleEngine.evaluate(k, v, g, ''); return r.isHigh ? 'yüksek' : (r.isLow ? 'düşük' : (r.status === 'above_ref' ? 'yüksek' : (r.status === 'below_ref' ? 'düşük' : 'normal'))); };
  const set = g => { state.user = { ...state.user, gender: g, age: 40, pregnancyStage: '', pregnancyLactation: false }; };
  const o = {};
  set('K'); o.refHbK = getVitaAppLabReference('hb', 'K'); o.refCrK = getVitaAppLabReference('creatinine', 'K'); o.upK = getCreatinineUpperLimit('K');
  o.hb = { k16: E('hb', 16.0, 'K'), k16_1: E('hb', 16.1, 'K'), k12: E('hb', 12.0, 'K'), k11_9: E('hb', 11.9, 'K') };
  o.cr = { k1_1: E('creatinine', 1.1, 'K'), k1_15: E('creatinine', 1.15, 'K'), k0_5: E('creatinine', 0.5, 'K') };
  set('E'); o.refHbE = getVitaAppLabReference('hb', 'E'); o.refCrE = getVitaAppLabReference('creatinine', 'E'); o.upE = getCreatinineUpperLimit('E');
  o.hbE = { e17_5: E('hb', 17.5, 'E'), e17_6: E('hb', 17.6, 'E'), e13: E('hb', 13.0, 'E'), e12_9: E('hb', 12.9, 'E') };
  o.crE = { e1_3: E('creatinine', 1.3, 'E'), e1_35: E('creatinine', 1.35, 'E'), e1_2: E('creatinine', 1.2, 'E') };
  o.hb19 = VitaLabEvidence.evaluate('hb', 19, { gender: 'K' }).status;
  state.user = { ...state.user, gender: 'K', pregnancyStage: 't1', pregnancyLactation: true }; o.upPreg = getCreatinineUpperLimit('K');
  state.user = { ...state.user, pregnancyStage: '', pregnancyLactation: false, gender: 'K' };
  return o;
});
log('Kadın Hb 16,0 normal, 16,1 yüksek', B.hb.k16 === 'normal' && B.hb.k16_1 === 'yüksek', JSON.stringify(B.hb));
log('Kadın Hb 12,0 normal, 11,9 düşük', B.hb.k12 === 'normal' && B.hb.k11_9 === 'düşük');
log('Erkek Hb 17,5 normal, 17,6 yüksek', B.hbE.e17_5 === 'normal' && B.hbE.e17_6 === 'yüksek', JSON.stringify(B.hbE));
log('Erkek Hb 13,0 normal, 12,9 düşük', B.hbE.e13 === 'normal' && B.hbE.e12_9 === 'düşük');
log('Hb 19 hâlâ acil', B.hb19 === 'urgent', B.hb19);
log('Ekrandaki Hb aralığı değişmedi (K 12–16, E 13–17,5)', /12,0–16,0/.test(B.refHbK) && /13,0–17,5/.test(B.refHbE), B.refHbK + ' | ' + B.refHbE);
log('Kreatinin ekran aralığı cinsiyete özgü', /0,5–1,1/.test(B.refCrK) && /0,7–1,3/.test(B.refCrE), B.refCrK + ' | ' + B.refCrE);
log('Üst sınır tek kaynaktan: K 1,1 / E 1,3 / gebelik 0,8', B.upK === 1.1 && B.upE === 1.3 && B.upPreg === 0.8, [B.upK, B.upE, B.upPreg].join(' / '));
log('Kadın kreatinin 1,1 normal, 1,15 yüksek', B.cr.k1_1 === 'normal' && B.cr.k1_15 === 'yüksek', JSON.stringify(B.cr));
log('Erkek kreatinin 1,3 normal, 1,35 yüksek', B.crE.e1_3 === 'normal' && B.crE.e1_35 === 'yüksek', JSON.stringify(B.crE));
log('Erkek kreatinin 1,2 artık normal (ekran aralığı içinde)', B.crE.e1_2 === 'normal');

/* 2) Tüm parametreler: ekrandaki aralık ↔ motor (yalnızca klinik olarak anlamlı yönler) */
const G = await p.evaluate(() => {
  const keys = ['d3', 'b12', 'ferritin', 'mg', 'ca', 'zinc', 'creatinine', 'folate', 'alt', 'hb', 'mcv', 'crp'];
  const parse = t => { const m = String(t).replace(/,/g, '.').match(/(\d+(?:\.\d+)?)\s*[–\-—]\s*(\d+(?:\.\d+)?)/); return m ? [Number(m[1]), Number(m[2])] : null; };
  const bad = [];
  // Düşük yönü klinik olarak anlamsız/eylemsiz olanlar: kreatinin, ALT, CRP (sıfır alt sınır) — bilerek "normal" kalır
  const lowIgnored = new Set(['creatinine', 'alt', 'crp']);
  for (const g of ['K', 'E']) {
    state.user = { ...state.user, gender: g, pregnancyStage: '', pregnancyLactation: false };
    for (const k of keys) {
      const rng = parse(getVitaAppLabReference(k, g)); if (!rng) { bad.push({ g, k, not: 'aralık yok' }); continue; }
      const [lo, hi] = rng, span = hi - lo;
      const probe = v => { const e = KDSSRuleEngine.evaluate(k, Number(v.toFixed(2)), g, ''); return e.isHigh || e.status === 'above_ref' ? 'yüksek' : (e.isLow || e.status === 'below_ref' || e.status === 'borderline' && !e.isHigh ? 'düşük' : 'normal'); };
      const mid = probe((lo + hi) / 2); if (mid !== 'normal') bad.push({ g, k, test: 'orta', got: mid });
      const up = probe(hi + span * 0.05); if (up !== 'yüksek' && !(k === 'b12' || k === 'folate' || k === 'd3' || k === 'zinc' || k === 'mcv' || k === 'ca' || k === 'mg' || k === 'ferritin')) bad.push({ g, k, test: 'üst+5%', got: up });
      const dn = probe(lo - span * 0.05); if (dn !== 'düşük' && !lowIgnored.has(k)) bad.push({ g, k, test: 'alt-5%', got: dn });
    }
  }
  return bad;
});
log('Ekran aralığı ↔ motor: orta/alt/üst tutarlı (anlamlı yönlerde)', G.length === 0, JSON.stringify(G));

/* 3) Uçtan uca: ekranda ve analizde aynı sonuç */
await p.evaluate(() => { openProfileModal(false); document.getElementById('modalInputAge').value = 40; document.getElementById('modalInputGender').value = 'E'; document.getElementById('modalInputHeight').value = 178; document.getElementById('modalInputWeight').value = 80; document.getElementById('modalChronicNone').checked = true; document.getElementById('modalPregnancyStatus').value = ''; saveUserProfileFromModal(); }); await sleep(500);
await p.evaluate(() => navigateToView('view-labs')); await sleep(300);
await p.evaluate(() => { for (const [id, v] of Object.entries({ inputLabHb: '17.8', inputLabCreatinine: '1.35' })) { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); } saveCurrentLabRecordWithDate(); }); await sleep(500);
await p.evaluate(() => navigateToView('view-clinical-results')); await sleep(1700);
const U = await p.evaluate(() => ({ rows: [...document.querySelectorAll('.vs-val')].map(d => d.innerText.replace(/\s+/g, ' ')), refs: [...document.querySelectorAll('.vs-val')].map(d => ((d.querySelector('.vs-ref') || {}).textContent || '')) }));
log('Erkek Hb 17,8 "Yüksek" (ekran aralığı 13–17,5)', U.rows.some(r => /Hemoglobin.*Yüksek/.test(r)), U.rows.join(' || '));
log('Erkek kreatinin 1,35 "Yüksek" (ekran aralığı 0,7–1,3)', U.rows.some(r => /Kreatinin.*Yüksek/.test(r)));
log('Satırda gösterilen referans motorla aynı', U.refs.some(r => /0,7–1,3/.test(r)) && U.refs.some(r => /13,0–17,5/.test(r)), U.refs.join(' | '));
log('Hata yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
