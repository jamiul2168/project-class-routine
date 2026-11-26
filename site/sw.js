// Class Routine – offline-capable service worker
const VERSION = "cr-v28";
const SHELL = VERSION + "-shell";     // app files (page, icons, fonts)
const RUNTIME = VERSION + "-runtime"; // notice files, routine images, etc.

const SCOPE = self.registration.scope;
const u = p => new URL(p, SCOPE).href;

// Files saved for offline use. Page is listed twice because hosts differ
// (/class-routine vs /class-routine.html); whichever works gets cached.
const PAGE_URLS = [u("./"), u("index.html")];
const CORE = [
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png",
  "favicon.png", "logo.png", "watermark.png", "id-card.html", "id-preview-front.jpg", "id-preview-back.jpg", "IdSans_600.woff2", "IdName_700.woff",
  "ShurjoWeb_400.woff2", "ShurjoWeb_700.woff2", "Redaction_400.woff2", "Redaction_700.woff2"
].map(u);

// A redirected response can't be served for a navigation, so rebuild it.
async function clean(res) {
  if (!res || !res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

async function save(cacheName, url, opts) {
  try {
    const res = await fetch(url, opts || { cache: "reload" });
    if (res && (res.ok || res.type === "opaque")) {
      await (await caches.open(cacheName)).put(url, await clean(res));
      return true;
    }
  } catch (_) {}
  return false;
}

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    // never fail the install because of one missing file
    await Promise.all([...PAGE_URLS, ...CORE].map(x => save(SHELL, x)));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k.startsWith("cr-v") && !k.startsWith(VERSION)) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

// Page asks: "download everything now" (install button / Sync button) and wants progress.
self.addEventListener("message", e => {
  const d = e.data || {};
  if (!d.precache) return;
  const port = e.ports && e.ports[0];
  e.waitUntil((async () => {
    const extra = (Array.isArray(d.precache) ? d.precache : [])
      .filter(x => typeof x === "string" && !/\/api\/public/.test(x)); // routine data lives in localStorage
    const list = [...PAGE_URLS, ...CORE];
    const total = list.length + extra.length;
    let done = 0;
    const tick = () => { done++; try { port && port.postMessage({ done, total }); } catch (_) {} };
    for (const x of list) { await save(SHELL, x); tick(); }
    for (const x of extra) { await save(RUNTIME, x, { cache: "reload" }); tick(); }
    try { port && port.postMessage({ done: total, total, end: true }); } catch (_) {}
  })());
});

const isNav = req => req.mode === "navigate";

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Never touch live data / counters
  if (/\/api\/(public|hit|track|feedback)/.test(url.pathname)) return;
  if (url.pathname.endsWith("/sw.js")) return;

  // 1) The page itself: cache first, refresh in background; offline falls back to the saved page
  if (isNav(req) && url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      let hit = await cache.match(req, { ignoreSearch: true });
      if (!hit && (url.pathname === "/" || /class-routine/.test(url.pathname))) {
        hit = await cache.match(PAGE_URLS[0]) || await cache.match(PAGE_URLS[1]);
      }
      const net = fetch(req).then(async r => {
        if (r && r.ok) await cache.put(req.url.split("#")[0], await clean(r.clone()));
        return r;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const r = await net;
      if (r) return r;
      return (await cache.match(PAGE_URLS[0])) || (await cache.match(PAGE_URLS[1]))
        || new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
    })());
    return;
  }

  // 2) Same-origin static files: cache first, refresh in background
  if (url.origin === location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req, { ignoreSearch: true });
      const net = fetch(req).then(async r => { if (r && r.ok) await cache.put(req, r.clone()); return r; }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      return (await net) || Response.error();
    })());
    return;
  }

  // 3) Notice files, routine images, icons, Google Fonts: cache first, save when first seen
  if (/\/api\/file\//.test(url.pathname) || /(^|\.)cloudinary\.com$|(^|\.)iconify\.design$|fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith((async () => {
      const cache = await caches.open(RUNTIME);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && (r.ok || r.type === "opaque")) await cache.put(req, r.clone());
        return r;
      } catch (_) { return Response.error(); }
    })());
  }
});
