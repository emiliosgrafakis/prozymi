/* Service worker: κρατά αντίγραφο της εφαρμογής για χρήση χωρίς internet.
   Πάντα δοκιμάζει πρώτα το δίκτυο, άρα μια νέα έκδοση φτάνει μόλις υπάρξει σύνδεση.
   Δεν αγγίζει ποτέ τα αιτήματα προς το GitHub API (τα δεδομένα). */
var CACHE = "prozymi-shell-v4";
var SHELL = ["./", "index.html", "manifest.webmanifest", "app/style.css", "app/content.js", "app/app.js",
  "app/icons-v2/icon.svg", "app/icons-v2/icon-192.png", "app/icons-v2/icon-512.png",
  "app/icons-v2/icon-maskable-512.png", "app/icons-v2/apple-touch-icon.png"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req.url, { cache: "no-cache" }).then(function (res) {
      if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req.mode === "navigate" ? "index.html" : req, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === "navigate" ? caches.match("index.html") : undefined);
      });
    })
  );
});
