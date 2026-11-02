/* Кэш для работы без интернета */
var CACHE = "hockey-v9";
var FILES = ["./", "./index.html", "./style.css", "./config.js", "./app-core.js", "./app-ui.js", "./app-report.js", "./app-events.js", "./test-guides.js", "./exercise-guides.js", "./plan.json", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES).catch(function () { }); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
/* Свежий файл важнее кэша: страница, скрипты и план берутся из сети,
   кэш остаётся страховкой на случай, когда сети нет. */
function isFresh(url) {
  return /\.(html|js|css|json|webmanifest)(\?|$)/.test(url) || url.slice(-1) === "/";
}

self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (e.request.method !== "GET") return;
  if (url.indexOf("script.google.com") >= 0 || url.indexOf("ntfy.sh") >= 0) return;

  if (isFresh(url)) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
        }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) { return hit || caches.match("./"); });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () { });
        }
        return res;
      });
    })
  );
});
