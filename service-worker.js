const APP_VERSION = "9.9.18";
const CACHE_VERSION = "shuffleplus-v9.9.18";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const MAX_RUNTIME_ENTRIES = 120;

const CRITICAL_APP_SHELL = [
    "./",
    "./index.html",
    "./style.css?v=9.9.18",
    "./design-system.css?v=9.9.18",
    "./bootstrap-9.9.18.js",
    "./app.js?v=9.9.18&build=9.9.18-pwa-reset-1",
    "./auth.js",
    "./config.js",
    "./spotify-api.js",
    "./storage.js",
    "./startup-recovery-9.9.18.js",
    "./shuffle-engine.js",
    "./core/app-menu.js",
    "./core/feature-loader.js",
    "./core/style-loader.js",
    "./core/feature-assets.js",
    "./core/runtime-state.js",
    "./core/storage-migrations.js",
    "./core/experience-mode.js",
    "./core/server-sync-recovery.js",
    "./core/server-sync-ui.js",
    "./core/pwa-update.js",
    "./core/pwa-install-ui.js",
    "./core/spotify-setup-ui.js",
    "./core/security-policy.js",
    "./core/runtime-performance.js",
    "./core/network-performance.js",
    "./core/performance-budget.js",
    "./core/reliability-center.js",
    "./core/release-readiness.js",
    "./core/platform.js",
    "./core/spotify-app-config.js",
    "./core/html-utils.js",
    "./core/ui-theme.js",
    "./core/ui-consistency.js",
    "./core/spotify-device.js",
    "./core/spotify-request-manager.js",
    "./core/playback-queue.js",
    "./core/playback-clock.js",
    "./core/queue-continuity.js",
    "./core/driving-ui.js",
    "./core/driving-advanced.js",
    "./core/dynamic-lyrics.js",
    "./core/session-recovery.js",
    "./core/shortcut-profiles.js",
    "./core/launch-reliability.js",
    "./core/guided-setup.js",
    "./core/daily-home.js",
    "./core/home-layout.js",
    "./core/home-quick-access.js",
    "./core/contextual-profiles.js",
    "./adaptive-dj.js",
    "./musical-assistant.js",
    "./voice-assistant.js",
    "./personalized-recommendations.js",
    "./listening-statistics.js",
    "./musical-dashboard.js",
    "./musical-goals.js",
    "./contextual-help.js",
    "./usage-profiles.js",
    "./offline-performance.js",
    "./manifest.webmanifest"
];

const OPTIONAL_APP_SHELL = [
    "./app-health.js",
    "./styles/feature-home.css?v=9.9.18",
    "./universal-search.js",
    "./styles/feature-search.css?v=9.9.18",
    "./styles/feature-settings.css?v=9.9.18",
    "./styles/feature-driving.css?v=9.9.18",
    "./favicon.ico",
    "./icons/icon-192.png",
    "./icons/icon-512.png",
    "./icons/icon-maskable-512.png",
    "./icons/apple-touch-icon-180.png"
];

async function cacheOptionalShell(cache) {
    await Promise.allSettled(
        OPTIONAL_APP_SHELL.map(async (url) => {
            const response = await fetch(url, { cache: "reload" });
            if (response.ok) {
                await cache.put(url, response);
            }
        })
    );
}

async function warmCriticalShell() {
    const cache = await caches.open(SHELL_CACHE);

    // Seuls les fichiers nécessaires au premier écran bloquent l’installation.
    // Les outils secondaires sont préchauffés plus tard selon le réseau.
    await cache.addAll(CRITICAL_APP_SHELL);
}

async function warmOptionalShell() {
    const cache = await caches.open(SHELL_CACHE);
    await cacheOptionalShell(cache);
}

async function warmShell() {
    await warmCriticalShell();
    await warmOptionalShell();
}

async function trimRuntimeCache(cache) {
    const keys = await cache.keys();
    const overflow = keys.length - MAX_RUNTIME_ENTRIES;

    if (overflow <= 0) {
        return;
    }

    await Promise.all(
        keys
            .slice(0, overflow)
            .map((request) => cache.delete(request))
    );
}

async function putInRuntimeCache(cache, request, response) {
    await cache.put(request, response);
    await trimRuntimeCache(cache);
}

self.addEventListener("install", (event) => {
    event.waitUntil(warmCriticalShell());
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
    if (event.data?.type === "GET_VERSION") {
        event.ports?.[0]?.postMessage({
            version: APP_VERSION
        });
    }
    if (event.data?.type === "SKIP_WAITING") {
        self.skipWaiting();
    }
    if (event.data?.type === "WARM_APP_SHELL") {
        event.waitUntil(warmShell());
    }
    if (event.data?.type === "WARM_OPTIONAL_SHELL") {
        event.waitUntil(warmOptionalShell());
    }
    if (event.data?.type === "CLEAR_RUNTIME_CACHE") {
        event.waitUntil(caches.delete(RUNTIME_CACHE));
    }
    if (event.data?.type === "CLEAR_ALL_APP_CACHES") {
        event.waitUntil((async () => {
            const names = await caches.keys();
            await Promise.all(
                names
                    .filter((name) => name.startsWith("shuffleplus-"))
                    .map((name) => caches.delete(name))
            );
        })());
    }
});

async function fetchWithTimeout(request, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(request, {
            signal: controller.signal,
            cache: "no-store"
        });
    } finally {
        clearTimeout(timer);
    }
}

async function navigationNetworkFirst(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
        const response = await fetchWithTimeout(request, 4500);
        if (response?.ok) {
            await cache.put("./index.html", response.clone());
        }
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

async function staticNetworkFirst(request) {
    const shell = await caches.open(SHELL_CACHE);
    const runtime = await caches.open(RUNTIME_CACHE);

    try {
        const response = await fetchWithTimeout(request, 4500);
        if (response?.ok) {
            await putInRuntimeCache(
                runtime,
                request,
                response.clone()
            );
        }
        return response;
    } catch {
        // On respecte d’abord le paramètre de version. Le secours sans query
        // n’est utilisé qu’en mode hors connexion.
        return await runtime.match(request) ||
            await shell.match(request) ||
            await runtime.match(request, { ignoreSearch: true }) ||
            await shell.match(request, { ignoreSearch: true }) ||
            new Response("", { status: 504 });
    }
}

async function cacheFirst(request) {
    const runtime = await caches.open(RUNTIME_CACHE);
    const shell = await caches.open(SHELL_CACHE);
    const cached = await runtime.match(request) || await shell.match(request);
    if (cached) {
        return cached;
    }

    const response = await fetch(request);
    if (response?.ok) {
        await putInRuntimeCache(
            runtime,
            request,
            response.clone()
        );
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
        event.respondWith(navigationNetworkFirst(request));
        return;
    }

    if (["script", "style", "manifest"].includes(request.destination)) {
        event.respondWith(staticNetworkFirst(request));
        return;
    }

    if (["image", "font"].includes(request.destination)) {
        event.respondWith(cacheFirst(request));
    }
});
