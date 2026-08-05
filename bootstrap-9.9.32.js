const APP_VERSION = "9.9.32";
const BUILD_ID = "9.9.32-pwa-reset-1";
const BUILD_STORAGE_KEY = "shuffleplus_runtime_build_id";
const BUILD_QUERY_KEY = "shuffleplus_build";
const AUTOMATION_HANDOFF_KEY =
    "shuffleplus_automation_handoff_v1";
const AUTOMATION_HANDOFF_TTL_MS = 2 * 60 * 1000;

function captureAutomationHandoff() {
    const url = new URL(window.location.href);
    const action = String(
        url.searchParams.get("action") || ""
    ).trim();

    if (!action) {
        return false;
    }

    try {
        sessionStorage.setItem(
            AUTOMATION_HANDOFF_KEY,
            JSON.stringify({
                search: url.search,
                capturedAt: Date.now(),
                expiresAt:
                    Date.now() + AUTOMATION_HANDOFF_TTL_MS
            })
        );
        return true;
    } catch {
        return false;
    }
}

function readStoredBuild() {
    try {
        return localStorage.getItem(BUILD_STORAGE_KEY) || "";
    } catch {
        return "";
    }
}

function storeBuild() {
    try {
        localStorage.setItem(BUILD_STORAGE_KEY, BUILD_ID);
    } catch {
        // Le paramètre d'URL empêche quand même une boucle de réparation.
    }
}

async function unregisterShufflePlusWorkers() {
    if (!("serviceWorker" in navigator)) {
        return;
    }

    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
        registrations
            .filter((registration) =>
                registration.scope.startsWith(window.location.origin)
            )
            .map((registration) => registration.unregister())
    );
}

async function clearShufflePlusCaches() {
    if (!("caches" in window)) {
        return;
    }

    const names = await caches.keys();
    await Promise.all(
        names
            .filter((name) => name.startsWith("shuffleplus-"))
            .map((name) => caches.delete(name))
    );
}

async function migrateRuntimeIfNeeded() {
    const url = new URL(window.location.href);
    const queryBuild = url.searchParams.get(BUILD_QUERY_KEY) || "";
    const storedBuild = readStoredBuild();

    if (storedBuild === BUILD_ID || queryBuild === BUILD_ID) {
        storeBuild();
        return false;
    }

    storeBuild();
    await unregisterShufflePlusWorkers();
    await clearShufflePlusCaches();

    url.searchParams.set(BUILD_QUERY_KEY, BUILD_ID);
    url.searchParams.set("cache_bust", String(Date.now()));
    window.location.replace(url.toString());
    return true;
}

async function startShufflePlus() {
    captureAutomationHandoff();

    const reloading = await migrateRuntimeIfNeeded();
    if (reloading) {
        return;
    }

    window.__SHUFFLEPLUS_RUNTIME__ = Object.freeze({
        version: APP_VERSION,
        buildId: BUILD_ID,
        loadedAt: Date.now()
    });

    await import(`./app.js?v=${APP_VERSION}&build=${BUILD_ID}`);
}

startShufflePlus().catch((error) => {
    console.error("Chargement de Shuffle+ impossible :", error);
    window.dispatchEvent(
        new CustomEvent("shuffleplus:startup-error", {
            detail: {
                version: APP_VERSION,
                message:
                    "Les fichiers de Shuffle+ n'ont pas pu être chargés. Utilise Réparer Shuffle+ puis rouvre l'application."
            }
        })
    );
});
