/* Honeybadger Timer service worker.
   The app opens instantly from the copy saved on the phone, then quietly checks for a newer
   copy whenever there is a connection. After you replace index.html on the web, open the app
   once with internet, close it fully, and open it again to see the update. */
var CACHE = 'honeybadger-timer-v24-1';
var FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.all(FILES.map(function (url) {
        return cache.add(new Request(url, { cache: 'reload' }));
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (hit) {
        var refresh = fetch(new Request(req.url, { cache: 'no-cache' })).then(function (res) {
          if (res && res.ok && res.type === 'basic' && !res.redirected) cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });

        if (hit) {
          event.waitUntil(refresh);
          return hit;
        }
        return refresh.then(function (res) {
          if (res) return res;
          if (req.mode === 'navigate') return cache.match('./index.html');
          return Response.error();
        });
      });
    })
  );
});
