const cacheName = "yoshiRun-v1.2";
const contentToCache = [
    "style.css",
]

self.addEventListener('install', (e) => {
    e.waitUntil((async () => {
        const cache = await caches.open(cacheName);
        await cache.addAll(contentToCache);
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                    if (key === cacheName) { return; }
                    return caches.delete(key);
            }))
    })
      })());
  });

self.addEventListener('fetch', (e) => {
  e.respondWith((async () => {
    const r = await caches.match(e.request);
    if (r) { return r; }
    const response = await fetch(e.request);
    const cache = await caches.open(cacheName);
    cache.put(e.request, response.clone());
    return response;
  })());
});

// delete all the caches that are not updated (do not match the current version)
self.addEventListener('activate', (e) => {
    console.log("Delete old cache");
    e.waitUntil(caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                    if (key === cacheName) { return; }
                    return caches.delete(key);
            }))
    }));
});
