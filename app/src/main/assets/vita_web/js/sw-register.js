if ('serviceWorker' in navigator && /^https?:$/i.test(window.location.protocol) && window.location.hostname !== 'appassets.androidplatform.net') {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
