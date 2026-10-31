const CACHE_NAME = 'ramkumar-bhandar-v13-strict-live';
const STATIC_ASSETS = [
  '/manifest.json',
  '/css/app.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Some assets could not be cached immediately:', err);
      });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          console.log('Purging legacy service worker cache:', k);
          return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. APIs: Direct network only, fallback to offline notification
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({
            success: false,
            offline: true,
            message: 'इंटरनेट उपलब्ध नहीं है - स्थानीय डेटा उपयोग किया जा रहा है'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // 2. Navigation & HTML: STRICT NETWORK-ONLY (Never serve stale HTML shell!)
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => {
        return new Response('<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8"/><title>ऑफ़लाइन</title></head><body style="font-family:sans-serif;padding:24px;text-align:center;"><h2>📶 इंटरनेट कनेक्शन नहीं है</h2><p>कृपया इंटरनेट कनेक्ट करके दोबारा ताज़ा करें।</p><button onclick="location.reload()" style="padding:10px 20px;font-size:16px;border-radius:12px;background:#003629;color:#fff;border:none;">🔄 पुनः प्रयास करें</button></body></html>', {
          headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
      })
    );
    return;
  }

  // 3. Application JavaScript: STRICT NETWORK DIRECT (Never serve stale scripts!)
  if (url.pathname.startsWith('/js/')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  // 4. Static Images & Icons: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});
