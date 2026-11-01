import puppeteer from 'puppeteer-core';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
const p = await b.newPage(); p.setDefaultTimeout(30000);
const results = []; const log = (n, ok, d) => { results.push(ok); console.log((ok ? 'OK   ' : 'FAIL ') + n + (d ? ' -> ' + d : '')); };
const external = new Set(), local404 = [], errs = [];
p.on('request', r => { const u = new URL(r.url()); if (!['localhost', '127.0.0.1'].includes(u.hostname) && u.protocol.startsWith('http')) external.add(u.hostname + u.pathname.slice(0, 40)); });
p.on('response', r => { if (r.status() >= 400 && r.url().includes('localhost')) local404.push(r.status() + ' ' + r.url()); });
p.on('pageerror', e => errs.push(e.message));
await p.evaluateOnNewDocument(() => localStorage.setItem('vitatakip_legal_accepted', 'true'));
await p.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle2' }); await sleep(2500);

// 1) Simge yazı tipleri yerelden yüklendi mi?
const fonts = await p.evaluate(async () => { await document.fonts.ready; const out = []; document.fonts.forEach(f => { if (/Font Awesome/.test(f.family)) out.push(f.family + ':' + f.status); }); return out; });
log('Font Awesome yazı tipleri yerelden yüklendi', fonts.some(f => /loaded/.test(f)), fonts.join(' | '));
const iconOk = await p.evaluate(() => { const i = document.querySelector('.fa-solid'); if (!i) return false; return /Font Awesome 6 Free/.test(getComputedStyle(i).fontFamily); });
log('Simgeler Font Awesome ile çiziliyor', iconOk);

// 2) Kütüphaneler yerelden yükleniyor mu?
const libs = await p.evaluate(async () => {
  const out = {};
  try { await loadVitaOptionalScript('vendor/chartjs/chart.umd.js', 'Chart'); out.chart = typeof window.Chart === 'function' ? window.Chart.version : 'yok'; } catch (e) { out.chart = 'HATA ' + e.message; }
  try { await loadVitaOptionalScript('vendor/pdfjs/pdf.min.js', 'pdfjsLib'); out.pdfjs = window.pdfjsLib ? window.pdfjsLib.version : 'yok'; } catch (e) { out.pdfjs = 'HATA ' + e.message; }
  try { const H = await loadHtml5QrCodeLibrary(); out.html5qr = typeof H === 'function' ? 'ok' : 'yok'; } catch (e) { out.html5qr = 'HATA ' + e.message; }
  try { const Z = await loadZXingBrowser(); out.zxing = Z && Z.BrowserMultiFormatReader ? 'ok' : 'yok'; } catch (e) { out.zxing = 'HATA ' + e.message; }
  return out;
});
log('Chart.js yerelden yüklendi', /^4\./.test(libs.chart), libs.chart);
log('PDF.js yerelden yüklendi (3.11.174)', libs.pdfjs === '3.11.174', libs.pdfjs);
log('HTML5-QRCode yerelden yüklendi', libs.html5qr === 'ok', libs.html5qr);
log('ZXing yerelden yüklendi', libs.zxing === 'ok', libs.zxing);

// 3) PDF.js çalışıyor mu (worker dahil)? Küçük bir PDF'i ayrıştır.
const pdf = await p.evaluate(async () => {
  const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>', null, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  const stream = 'BT /F1 18 Tf 20 50 Td (Kreatinin 0.9) Tj ET';
  let s = '%PDF-1.4\n', offs = [];
  objs.forEach((o, i) => { offs.push(s.length); s += `${i + 1} 0 obj\n` + (o === null ? `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream` : o) + '\nendobj\n'; });
  const xref = s.length; s += `xref\n0 6\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('') + `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
  const doc = await window.pdfjsLib.getDocument({ data: new TextEncoder().encode(s) }).promise;
  const page = await doc.getPage(1); const tc = await page.getTextContent();
  return { pages: doc.numPages, text: tc.items.map(i => i.str).join(' ') };
});
log('PDF.js (worker dahil) PDF içeriğini okudu', pdf.pages === 1 && /Kreatinin/.test(pdf.text), JSON.stringify(pdf));

// 4) Hiç dış sunucu isteği yok, yerel 404 yok
log('Dış sunucuya (CDN) hiç istek yok', external.size === 0, [...external].join(', '));
log('Yerel 404 yok', local404.length === 0, local404.join(' | '));
log('Sayfa hatası yok', errs.length === 0, errs.join(' | '));
console.log('ÖZET', results.filter(Boolean).length + '/' + results.length);
await b.close(); process.exit(0);
