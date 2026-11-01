import puppeteer from 'puppeteer-core';
export async function boot() {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 850 });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.evaluateOnNewDocument(() => { localStorage.setItem('vitatakip_legal_accepted', 'true'); });
  await p.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  // kayıt ol
  await p.evaluate(() => { document.getElementById('authTabRegisterBtn').click(); });
  await p.type('#authInputFullName', 'Test Kullanici');
  await p.type('#authInputPassword', 'testpass123');
  await p.evaluate(() => { document.getElementById('authInputPasswordConfirm').value = 'testpass123'; });
  await p.evaluate(() => { document.getElementById('authSubmitBtn').click(); });
  await new Promise(r => setTimeout(r, 2500));
  return { b, p, errs };
}
export const sleep = ms => new Promise(r => setTimeout(r, ms));
