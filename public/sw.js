// إشعارات غرفة التشغيل على الجهاز
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('push', function (e) {
  var d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: 'ذا كابيتال سويتس', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'ذا كابيتال سويتس', {
    body: d.body || '', icon: 'img/icon-192.png', badge: 'img/icon-192.png', tag: d.tag || undefined, renotify: !!d.tag,
    dir: 'rtl', lang: 'ar', data: { url: d.url || '/files.html' }
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL((e.notification.data && e.notification.data.url) || '/files.html', self.location.origin).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ('focus' in cs[i]) { return cs[i].navigate(url).then(function (c) { return (c || cs[i]).focus(); }).catch(function () { return self.clients.openWindow(url); }); } }
    return self.clients.openWindow(url);
  }));
});
