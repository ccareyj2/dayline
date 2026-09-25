// Dayline service worker: offline app shell + notification taps.
// When you change any app file, bump VERSION so phones pick up the update.
const VERSION = 'dayline-v1.0.0';

const CORE = [
  './',
  'index.html',
  'help.html',
  'css/app.css',
  'config.js',
  'manifest.webmanifest',
  'js/main.js',
  'js/store.js',
  'js/dates.js',
  'js/tz.js',
  'js/recur.js',
  'js/parse.js',
  'js/notify.js',
  'js/calendar/index.js',
  'js/calendar/oauth.js',
  'js/calendar/links.js',
  'js/calendar/google.js',
  'js/calendar/outlook.js',
  'js/ui/dom.js',
  'js/ui/views.js',
  'js/ui/schedule.js',
  'js/ui/sheets.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon.svg',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(CORE.map((url) => new Request(url, { cache: 'reload' }))))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('dayline-') && k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(request, { cache: 'no-store' });
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;
    throw new Error('offline');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok && res.type === 'basic') cache.put(request, res.clone());
  return res;
}

async function navigate(request) {
  const cache = await caches.open(VERSION);
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  const isRoot = url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`;
  const hit = isRoot ? await cache.match('index.html') : await cache.match(request, { ignoreSearch: true });
  if (hit) return hit;
  try {
    return await fetch(request);
  } catch {
    return (await cache.match('index.html')) || Response.error();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Google / Microsoft APIs go straight to the network
  if (req.mode === 'navigate') {
    event.respondWith(navigate(req));
    return;
  }
  if (url.pathname.endsWith('/config.js')) {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(cacheFirst(req));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const taskId = event.notification.data && event.notification.data.taskId;
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = all.find((c) => c.url.startsWith(self.registration.scope));
      if (client) {
        await client.focus();
        if (taskId) client.postMessage({ type: 'open-task', id: taskId });
        return;
      }
      await self.clients.openWindow(self.registration.scope);
    })()
  );
});
