const APP_VERSION = "10.4.0";
const CACHE_VERSION = "shuffleplus-v10.4.0";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const MAX_RUNTIME_ENTRIES = 120;
const META_CACHE = "shuffleplus-meta-v1";
const ROLLBACK_STATE_URL = new URL(
    "./__shuffleplus_rollback_state__",
    self.registration.scope
).href;
const VERSION_CACHE_PATTERN =
    /^shuffleplus-v(\d+\.\d+\.\d+)-(shell|runtime)$/;

const CRITICAL_APP_SHELL = [
    "./",
    "./index.html",
    "./style.css?v=10.4.0",
    "./design-system.css?v=10.4.0",
    "./bootstrap-10.4.0.js",
    "./app.js?v=10.4.0&build=10.4.0-pwa-reset-1",
    "./auth.js",
    "./config.js",
    "./spotify-api.js",
    "./storage.js",
    "./startup-recovery-10.4.0.js",
    "./update-guard.js",
    "./shuffle-engine.js",
    "./core/app-menu.js",
    "./core/feature-loader.js",
    "./core/style-loader.js",
    "./core/feature-assets.js",
    "./core/runtime-state.js",
    "./core/storage-migrations.js",
    "./core/experience-mode.js",
    "./core/experience-mode-ui.js",
    "./core/experience-mode-controller.js",
    "./core/server-sync-recovery.js",
    "./core/server-sync-ui.js",
    "./core/pwa-update.js",
    "./core/update-safety.js",
    "./core/backup-ui.js",
    "./core/pwa-install-ui.js",
    "./core/spotify-setup-ui.js",
    "./core/security-policy.js",
    "./core/runtime-performance.js",
    "./core/network-performance.js",
    "./core/performance-budget.js",
    "./core/reliability-center.js",
    "./core/spotify-connect-diagnostic.js",
    "./core/release-readiness.js",
    "./core/release-readiness-ui.js",
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
    "./core/shortcut-migration.js",
    "./core/shortcut-callback.js",
    "./core/shortcut-result-channel.js",
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
    "./styles/feature-home.css?v=10.4.0",
    "./universal-search.js",
    "./styles/feature-search.css?v=10.4.0",
    "./styles/feature-settings.css?v=10.4.0",
    "./styles/feature-driving.css?v=10.4.0",
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

function compareSemver(left = "", right = "") {
    const a = String(left).split(".").map((value) => Number(value) || 0);
    const b = String(right).split(".").map((value) => Number(value) || 0);
    for (let index = 0; index < 3; index += 1) {
        if ((a[index] || 0) !== (b[index] || 0)) {
            return (a[index] || 0) - (b[index] || 0);
        }
    }
    return 0;
}

function getVersionCacheGroups(names = []) {
    const groups = new Map();
    for (const name of names) {
        const match = VERSION_CACHE_PATTERN.exec(name);
        if (!match) continue;
        const [, version, kind] = match;
        const current = groups.get(version) || {
            version,
            shellCache: "",
            runtimeCache: ""
        };
        current[kind === "shell" ? "shellCache" : "runtimeCache"] = name;
        groups.set(version, current);
    }
    return [...groups.values()];
}

async function cleanupVersionCaches() {
    const names = await caches.keys();
    const groups = getVersionCacheGroups(names);
    const previous = groups
        .filter((group) => group.version !== APP_VERSION && group.shellCache)
        .sort((a, b) => compareSemver(b.version, a.version))[0] || null;
    const keep = new Set([
        SHELL_CACHE,
        RUNTIME_CACHE,
        META_CACHE,
        previous?.shellCache || "",
        previous?.runtimeCache || ""
    ].filter(Boolean));

    await Promise.all(
        names
            .filter((name) =>
                name.startsWith("shuffleplus-") &&
                !keep.has(name)
            )
            .map((name) => caches.delete(name))
    );

    return previous;
}

async function readRollbackState() {
    try {
        const cache = await caches.open(META_CACHE);
        const response = await cache.match(ROLLBACK_STATE_URL);
        if (!response) return null;
        const state = await response.json();
        return state?.enabled === true ? state : null;
    } catch {
        return null;
    }
}

async function writeRollbackState(state) {
    const cache = await caches.open(META_CACHE);
    await cache.put(
        ROLLBACK_STATE_URL,
        new Response(JSON.stringify(state), {
            headers: { "Content-Type": "application/json" }
        })
    );
    return state;
}

async function clearRollbackState() {
    try {
        const cache = await caches.open(META_CACHE);
        await cache.delete(ROLLBACK_STATE_URL);
        return true;
    } catch {
        return false;
    }
}

async function enableRollback(requestedFromVersion = "") {
    const names = await caches.keys();
    const groups = getVersionCacheGroups(names)
        .filter((group) =>
            group.version !== APP_VERSION &&
            group.shellCache
        )
        .sort((a, b) => compareSemver(b.version, a.version));

    const requested = String(requestedFromVersion || "").trim();
    const previous = groups.find((group) => group.version === requested) || groups[0] || null;
    if (!previous) {
        return { ok: false, reason: "no-previous-cache" };
    }

    await writeRollbackState({
        enabled: true,
        failedVersion: APP_VERSION,
        previousVersion: previous.version,
        shellCache: previous.shellCache,
        runtimeCache: previous.runtimeCache || "",
        enabledAt: Date.now()
    });

    return {
        ok: true,
        previousVersion: previous.version
    };
}

function replyToMessage(event, payload) {
    try {
        event.ports?.[0]?.postMessage(payload);
    } catch {
        // Les messages sans MessageChannel restent autorisés.
    }
}

self.addEventListener("activate", (event) => {
    event.waitUntil((async () => {
        const rollback = await readRollbackState();
        // Un ancien écran restauré peut réenregistrer le Service Worker avec
        // son ancienne query ?v=. Si le script réseau correspond toujours à
        // la version qui a échoué, on conserve le mode rollback. Une version
        // corrective plus récente, elle, repart automatiquement sur le shell
        // courant et efface ce verrou.
        if (rollback && rollback.failedVersion !== APP_VERSION) {
            await clearRollbackState();
        }
        await cleanupVersionCaches();
        await self.clients.claim();
    })());
});

self.addEventListener("message", (event) => {
    if (event.data?.type === "GET_VERSION") {
        replyToMessage(event, {
            version: APP_VERSION,
            runtimeVersion: APP_VERSION
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
    if (event.data?.type === "ROLLBACK_TO_PREVIOUS") {
        event.waitUntil((async () => {
            const result = await enableRollback(
                event.data?.requestedFromVersion || ""
            );
            replyToMessage(event, result);
        })());
    }
    if (event.data?.type === "CLEAR_ROLLBACK_STATE") {
        event.waitUntil((async () => {
            const cleared = await clearRollbackState();
            replyToMessage(event, { ok: cleared });
        })());
    }
    if (event.data?.type === "GET_ROLLBACK_STATE") {
        event.waitUntil((async () => {
            const state = await readRollbackState();
            replyToMessage(event, {
                ok: true,
                state
            });
        })());
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

async function matchRollbackResponse(request, { navigation = false } = {}) {
    const rollback = await readRollbackState();
    if (!rollback?.shellCache) return null;

    const shell = await caches.open(rollback.shellCache);
    const runtime = rollback.runtimeCache
        ? await caches.open(rollback.runtimeCache)
        : null;

    if (navigation) {
        return await shell.match("./index.html") ||
            await shell.match("./") ||
            null;
    }

    return await runtime?.match(request) ||
        await shell.match(request) ||
        await runtime?.match(request, { ignoreSearch: true }) ||
        await shell.match(request, { ignoreSearch: true }) ||
        null;
}

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
        event.respondWith((async () =>
            await matchRollbackResponse(request, { navigation: true }) ||
            await navigationNetworkFirst(request)
        )());
        return;
    }

    if (["script", "style", "manifest"].includes(request.destination)) {
        event.respondWith((async () =>
            await matchRollbackResponse(request) ||
            await staticNetworkFirst(request)
        )());
        return;
    }

    if (["image", "font"].includes(request.destination)) {
        event.respondWith((async () =>
            await matchRollbackResponse(request) ||
            await cacheFirst(request)
        )());
    }
});

