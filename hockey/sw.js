/* Кэш для работы без интернета */
var CACHE = "hockey-v5";
var FILES = ["./", "./index.html", "./style.css", "./config.js", "./app-core.js", "./app-ui.js", "./app-report.js", "./app-events.js", "./test-guides.js", "./plan.json", "./manifest.webmanifest", "./icon-180.png", "./icon-512.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES).catch(function () { }); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var url = e.request.url;
  if (url.indexOf("script.google.com") >= 0 || url.indexOf("ntfy.sh") >= 0) return;
  if (url.indexOf("plan.json") >= 0) {
    e.respondWith(fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put("./plan.json", copy); });
      return res;
    }).catch(function () { return caches.match(e.request) || caches.match("./plan.json"); }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && e.request.method === "GET") {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
