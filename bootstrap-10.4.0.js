const APP_VERSION = "10.4.0";
const BUILD_ID = "10.4.0-pwa-reset-1";
const BUILD_STORAGE_KEY = "shuffleplus_runtime_build_id";
const BUILD_QUERY_KEY = "shuffleplus_build";
const POST_UPDATE_DIAGNOSTIC_KEY =
    "shuffleplus_post_update_diagnostic_v1";
const PREUPDATE_SNAPSHOT_KEY =
    "shuffleplus_preupdate_snapshot_v1";
const PWA_UPDATE_TRANSACTION_KEY =
    "shuffleplus_pwa_update_transaction_v1";
const PWA_UPDATE_APPLIED_VERSION_KEY =
    "shuffleplus_pwa_applied_version_v1";
const INTENTIONAL_UPDATE_MAX_AGE_MS = 15 * 60 * 1000;
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

function safeParse(value, fallback = null) {
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function isRecentUpdateTimestamp(value) {
    const timestamp = Number(value || 0);
    const age = Date.now() - timestamp;
    return Number.isFinite(timestamp) &&
        timestamp > 0 &&
        age >= 0 &&
        age <= INTENTIONAL_UPDATE_MAX_AGE_MS;
}

function getIntentionalPwaUpdate() {
    let transaction = null;
    let snapshot = null;
    let appliedVersion = "";

    try {
        transaction = safeParse(
            localStorage.getItem(PWA_UPDATE_TRANSACTION_KEY),
            null
        );
        snapshot = safeParse(
            localStorage.getItem(PREUPDATE_SNAPSHOT_KEY),
            null
        );
        appliedVersion =
            sessionStorage.getItem(PWA_UPDATE_APPLIED_VERSION_KEY) || "";
    } catch {
        return null;
    }

    if (
        transaction?.format === "shuffleplus-pwa-update-transaction" &&
        String(transaction.toVersion || "") === APP_VERSION &&
        isRecentUpdateTimestamp(transaction.startedAt)
    ) {
        return {
            source: "transaction",
            fromVersion: String(transaction.fromVersion || ""),
            startedAt: Number(transaction.startedAt || 0)
        };
    }

    if (
        appliedVersion === APP_VERSION &&
        snapshot?.format === "shuffleplus-preupdate-snapshot" &&
        String(snapshot.toVersion || "") === APP_VERSION &&
        isRecentUpdateTimestamp(snapshot.createdAt)
    ) {
        return {
            source: "snapshot",
            fromVersion: String(snapshot.fromVersion || ""),
            startedAt: Number(snapshot.createdAt || 0)
        };
    }

    return null;
}

function markUpdateTransactionVerifying(intentionalUpdate) {
    if (!intentionalUpdate) return;
    try {
        const current = safeParse(
            localStorage.getItem(PWA_UPDATE_TRANSACTION_KEY),
            {}
        ) || {};
        localStorage.setItem(
            PWA_UPDATE_TRANSACTION_KEY,
            JSON.stringify({
                ...current,
                format: "shuffleplus-pwa-update-transaction",
                schemaVersion: 1,
                status: "verifying",
                fromVersion:
                    String(current.fromVersion || intentionalUpdate.fromVersion || ""),
                toVersion: APP_VERSION,
                fromBuild:
                    String(current.fromBuild ||
                        (intentionalUpdate.fromVersion
                            ? `${intentionalUpdate.fromVersion}-pwa-reset-1`
                            : "")),
                toBuild: BUILD_ID,
                startedAt:
                    Number(current.startedAt || intentionalUpdate.startedAt || Date.now()),
                updatedAt: Date.now()
            })
        );
    } catch {
        // Le garde de mise à jour peut aussi fonctionner avec le snapshot seul.
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
    const shufflePlusScope = new URL("./", window.location.href).href;
    await Promise.all(
        registrations
            .filter((registration) =>
                registration.scope === shufflePlusScope
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

    const intentionalUpdate = getIntentionalPwaUpdate();

    if (storedBuild) {
        try {
            localStorage.setItem(
                POST_UPDATE_DIAGNOSTIC_KEY,
                JSON.stringify({
                    format: "shuffleplus-post-update-diagnostic",
                    schemaVersion: 1,
                    fromBuild: storedBuild,
                    toBuild: BUILD_ID,
                    createdAt: Date.now()
                })
            );
        } catch {
            // L’autodiagnostic est opportuniste et ne bloque jamais la migration.
        }
    }

    if (intentionalUpdate) {
        // Une mise à jour déclenchée depuis la bannière PWA possède déjà un
        // nouveau Service Worker actif. Purger ici les caches supprimerait la
        // seule copie de rollback. On conserve donc l’ancien shell jusqu’à la
        // validation de stabilité par update-guard.js.
        storeBuild();
        markUpdateTransactionVerifying(intentionalUpdate);
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
