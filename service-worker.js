const CACHE_VERSION = "shuffleplus-v6.8.0-shell";
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css?v=6.8.0",
    "./app.js?v=6.8.0",
    "./auth.js",
    "./config.js",
    "./spotify-api.js",
    "./storage.js",
    "./shuffle-engine.js",
    "./adaptive-dj.js",
    "./musical-assistant.js",
    "./voice-assistant.js",
    "./personalized-recommendations.js",
    "./listening-statistics.js",
    "./musical-dashboard.js",
    "./musical-goals.js",
    "./contextual-help.js",
    "./universal-search.js",
    "./manifest.webmanifest",
    "./favicon.ico",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon-180.png"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_VERSION)
            .then((cache) => cache.addAll(APP_SHELL))
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(
                keys
                    .filter((key) => key !== CACHE_VERSION)
                    .map((key) => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
});

async function networkFirst(request) {
    const cache = await caches.open(CACHE_VERSION);

    try {
        const response = await fetch(request);

        if (response?.ok) {
            cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await cache.match(request, {
            ignoreSearch: request.mode === "navigate"
        });

        if (cached) {
            return cached;
        }

        if (request.mode === "navigate") {
            return (
                await cache.match("./index.html") ||
                await cache.match("./")
            );
        }

        throw error;
    }
}

async function cacheFirst(request) {
    const cache = await caches.open(CACHE_VERSION);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response?.ok) {
        cache.put(request, response.clone());
    }

    return response;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;

    if (request.method !== "GET") {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(networkFirst(request));
        return;
    }

    if ([
        "script",
        "style",
        "manifest"
    ].includes(request.destination)) {
        event.respondWith(networkFirst(request));
        return;
    }

    if ([
        "image",
        "font"
    ].includes(request.destination)) {
        event.respondWith(cacheFirst(request));
    }
});
