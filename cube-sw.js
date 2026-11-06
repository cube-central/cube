// Si ya tienes un service worker, en vez de usar este archivo añade en el tuyo:  importScripts('cube-sw.js');
self.addEventListener('push', e => {
  let d = {}; try { d = e.data.json(); } catch (_) {}
  e.waitUntil(self.registration.showNotification(d.title || 'Cube', { body: d.body || '', tag: d.tag, icon: 'cube-logo.png', data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window' }).then(l => l.length ? l[0].focus() : clients.openWindow(e.notification.data.url || '/')));
});
