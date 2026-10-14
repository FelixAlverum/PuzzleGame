// Service Worker: macht die Spielesammlung offline spielbar.
// - Gebaute Dateien unter assets/ tragen einen Hash im Namen und ändern sich nie: erst Cache, sonst Netz.
// - Alles andere (Seite, Manifest, Icon): erst Netz, sonst Cache – so kommt jede Änderung sofort an.
// - Aufräumen: Nach jedem frischen Laden der Seite fliegen gehashte Dateien raus, die der aktuelle Build nicht mehr
//   braucht. „Braucht“ = von index.html aus erreichbar, auch über Skripte, die Spiele nachladen.
// Neue Cache-Version = alle alten Caches werden beim Aktivieren gelöscht.
const CACHE = 'spielesammlung-v2';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

const isAsset = url => url.pathname.includes('/assets/');
const fileName = url => url.pathname.split('/').pop();
// Von Vite gebaute Dateien: name-HASH.ext (Hash: 8 Zeichen). index.html nennt sie „assets/…“, Skripte „./…“.
const HASHED = /([A-Za-z0-9_-]+-[A-Za-z0-9_-]{8}\.(?:js|css|svg|png|webp|woff2?))/g;

// Gehashte Dateien löschen, die vom aktuellen index.html aus nicht mehr erreichbar sind.
// Skripte werden mitgelesen, denn sie nennen die Spiele, die sie nachladen. Fehlt ein Skript noch im Cache
// (direkt nach einem Deploy), wird es geholt – sonst würden unveränderte Spiele fälschlich gelöscht.
async function prune(html) {
  const cache = await caches.open(CACHE);
  const used = new Set(), queue = [html];
  while (queue.length) {
    for (const [, name] of queue.pop().matchAll(HASHED)) {
      if (used.has(name)) continue;
      used.add(name);
      if (!name.endsWith('.js')) continue;
      const url = new URL('assets/' + name, self.registration.scope);
      let res = await cache.match(url);
      if (!res) {
        try {
          res = await fetch(url);
          if (res.ok) await cache.put(url, res.clone());
          else res = null;
        } catch (e) {
          return;                                // offline: lieber nichts löschen
        }
      }
      if (res) queue.push(await res.text());
    }
  }
  for (const req of await cache.keys()) {
    const url = new URL(req.url);
    if (isAsset(url) && !used.has(fileName(url))) await cache.delete(req);
  }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (isAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) event.waitUntil(cache.put(req, res.clone()));
      return res;
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res.ok) {
        event.waitUntil(cache.put(req, res.clone()));
        if (req.mode === 'navigate') event.waitUntil(res.clone().text().then(prune));
      }
      return res;
    } catch (e) {
      return (await cache.match(req)) || (req.mode === 'navigate' && (await cache.match('./'))) || Response.error();
    }
  })());
});
