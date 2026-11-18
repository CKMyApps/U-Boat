'use strict';

const scope = self.registration.scope;
const cachePrefix = 'ckmyapps:u-boat:' + encodeURIComponent(scope) + ':';
const cacheName = cachePrefix + 'v4';
const assetUrls = [
  'index.html', 'submarine.jpg', 'atlantic-map.png', 'icon-192.png',
  'icon-512.png', 'apple-touch-icon.png', 'manifest.webmanifest'
].map(path => new URL(path, scope).href);

const cacheKeys = new Map(assetUrls.map(url => [url, url]));
cacheKeys.set(scope, new URL('index.html', scope).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.addAll(assetUrls.map(url => new Request(url, {cache: 'reload'})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // The legacy global cache may still serve another installation.
    const names = await caches.keys();
    const oldVersions = names.filter(name => name.startsWith(cachePrefix) && name !== cacheName);
    await Promise.all(oldVersions.map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

async function fetchAsset(request, key) {
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    const cached = await caches.match(key, {cacheName});
    if (cached) return cached;
    throw error;
  }

  if (response.status === 200 && !response.redirected && !new URL(request.url).search) {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(key, response.clone());
    } catch {
      // The online game remains playable if local storage is full.
    }
  }
  return response;
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || request.headers.has('range')) return;

  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  const key = cacheKeys.get(url.href);
  if (key) event.respondWith(fetchAsset(request, key));
});
