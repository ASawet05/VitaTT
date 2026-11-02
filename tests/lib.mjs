import puppeteer from 'puppeteer-core';
/* opts.preload: sayfa betiklerinden önce çalışacak işlev (ör. bulut emülatör yapılandırması)
   opts.register: false ise kayıt/giriş yapılmaz (giriş ekranında kalır) */
export async function boot(opts = {}) {
  const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox'] });
  const p = await b.newPage();
  await p.setViewport({ width: 400, height: 850 });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.evaluateOnNewDocument(() => { localStorage.setItem('vitatakip_legal_accepted', 'true'); });
  if (opts.preload) await p.evaluateOnNewDocument(opts.preload, opts.preloadArg);
  await p.goto('http://localhost:8080/index.html', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));
  if (opts.register === false) return { b, p, errs };
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
