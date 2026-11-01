import { boot, sleep } from './lib.mjs';

const only = process.argv[2];
const snap = (p) => p.evaluate(() => {
  const vis = id => { const e = document.getElementById(id); if (!e) return 'NA'; const s = getComputedStyle(e); return (s.display === 'none' || e.classList.contains('hidden')) ? 'hid' : 'SHOW'; };
  return {
    tab: state.activeTab,
    empty: vis('cdssResultsEmptyState'), overview: vis('cdssResultsOverview'), container: vis('cdssResultContainer'),
    findings: vis('cdssFindingsSection'), triage: vis('triageLabRecommendationsContainer'),
    symState: [...state.selectedSymptoms].length, arr: (state.selectedSymptomsArray || []).length,
    labVals: Object.keys(state.labValues || {}).filter(k => state.labValues[k] !== '' && state.labValues[k] != null).length,
    hist: (state.labHistory || []).length,
    canRun: canRunClinicalAnalysis(),
  };
});

async function scenario(name, fn) {
  if (only && only !== name) return;
  const { b, p, errs } = await boot();
  await p.evaluate(() => { closeProfileModal(); });
  await sleep(300);
  try { await fn(p); } catch (e) { console.log(name, 'STEP ERROR', e.message); }
  await p.evaluate(() => navigateToView('view-clinical-results'));
  await sleep(1500);
  console.log(name, JSON.stringify(await snap(p)));
  if (errs.length) console.log('  errs:', errs.slice(0, 4).join(' | '));
  await p.screenshot({ path: `shot_${name}.png` });
  await b.close();
}

const pickSymptoms = async (p, n) => {
  await p.evaluate(() => navigateToView('view-neyim'));
  await sleep(700);
  const clicked = await p.evaluate((n) => {
    const cards = [...document.querySelectorAll('.anamnesis-card')].slice(0, n);
    cards.forEach(c => c.click());
    return cards.length;
  }, n);
  await sleep(500);
  return clicked;
};
const typeLabs = async (p, vals) => {
  await p.evaluate(() => navigateToView('view-labs'));
  await sleep(700);
  for (const [id, v] of Object.entries(vals)) {
    await p.evaluate((id, v) => { const el = document.getElementById(id); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); }, id, v);
  }
  await sleep(400);
};

await scenario('S0_empty', async (p) => { await sleep(1500); await p.evaluate(() => { if (typeof endVitaSpotlightTour==='function') endVitaSpotlightTour(true); document.getElementById('vitaSpotlightLayer')?.classList.add('hidden'); }); });
await scenario('S1_symptoms_only', async (p) => { console.log('  cards clicked', await pickSymptoms(p, 3)); });
await scenario('S2a_lab_typed_only', async (p) => { await typeLabs(p, { inputLabCreatinine: '0.9', inputLabFerritin: '12' }); });
await scenario('S2b_lab_saved_only', async (p) => {
  await typeLabs(p, { inputLabCreatinine: '0.9', inputLabFerritin: '12' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(600);
});
await scenario('S3_lab_saved_plus_symptoms', async (p) => {
  await typeLabs(p, { inputLabCreatinine: '0.9', inputLabFerritin: '12' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(600);
  await pickSymptoms(p, 2);
});
await scenario('S5_archive_only_plus_symptoms', async (p) => {
  await typeLabs(p, { inputLabCreatinine: '0.9', inputLabFerritin: '12' });
  await p.evaluate(() => saveCurrentLabRecordWithDate()); await sleep(600);
  await p.evaluate(() => { state.labValues = {}; document.querySelectorAll('[id^="inputLab"]').forEach(e => { if (e.type !== 'date') e.value = ''; }); });
  await pickSymptoms(p, 2);
});
