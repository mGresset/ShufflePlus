const CACHE_VERSION = "shuffleplus-v7.1.1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const APP_SHELL = [
    "./",
    "./index.html",
    "./style.css?v=7.1.1",
    "./app.js?v=7.1.1",
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
    "./usage-profiles.js",
    "./app-health.js",
    "./offline-performance.js",
    "./manifest.webmanifest",
    "./favicon.ico",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon-180.png"
];

async function warmShell() {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(
        APP_SHELL.map(async (url) => {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) await cache.put(url, response);
        })
    );
}

self.addEventListener("install", (event) => {
    event.waitUntil(warmShell());
});

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) =>
                    name.startsWith("shuffleplus-") &&
                    ![SHELL_CACHE, RUNTIME_CACHE].includes(name)
                )
                .map((name) => caches.delete(name))
        );
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    if (event.data?.type === "WARM_APP_SHELL") {
        event.waitUntil(warmShell());
    }
    if (event.data?.type === "CLEAR_RUNTIME_CACHE") {
        event.waitUntil(caches.delete(RUNTIME_CACHE));
    }
});

async function fetchWithTimeout(request, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(request, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

async function navigationNetworkFirst(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetchWithTimeout(request, 4500);
        if (response?.ok) await cache.put("./index.html", response.clone());
        return response;
    } catch {
        return await cache.match("./index.html") ||
            await cache.match("./") ||
            new Response("Shuffle+ est hors connexion.", {
                status: 503,
                headers: { "Content-Type": "text/plain; charset=utf-8" }
            });
    }
}

async function staleWhileRevalidate(request) {
    const shell = await caches.open(SHELL_CACHE);
    const runtime = await caches.open(RUNTIME_CACHE);
    const cached = await shell.match(request, { ignoreSearch: true }) ||
        await runtime.match(request, { ignoreSearch: true });
    const update = fetch(request)
        .then(async (response) => {
            if (response?.ok) await runtime.put(request, response.clone());
            return response;
        })
        .catch(() => null);
    return cached || await update || new Response("", { status: 504 });
}

async function cacheFirst(request) {
    const runtime = await caches.open(RUNTIME_CACHE);
    const shell = await caches.open(SHELL_CACHE);
    const cached = await runtime.match(request) || await shell.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response?.ok) await runtime.put(request, response.clone());
    return response;
}

self.addEventListener("fetch", (event) => {
    const request = event.request;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;

    if (request.mode === "navigate") {
        event.respondWith(navigationNetworkFirst(request));
        return;
    }

    if (["script", "style", "manifest"].includes(request.destination)) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    if (["image", "font"].includes(request.destination)) {
        event.respondWith(cacheFirst(request));
    }
});
