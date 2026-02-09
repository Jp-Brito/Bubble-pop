const CACHE_NAME = 'bubble-pop-v1';

const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './images/favicon.png',
  './images/icon-192.png',
  './images/icon-512.png',
  './images/Bubblepop.png',
  './sounds/pop.mp3',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Ficheiros guardados para uso offline!');
      return cache.addAll(assets);
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});