(() => {
    "use strict";

    const CURRENT_VERSION = String(
        document.querySelector('meta[name="shuffleplus-version"]')?.content || ""
    ).trim();
    const BUILD_STORAGE_KEY = "shuffleplus_runtime_build_id";
    const BUILD_QUERY_KEY = "shuffleplus_build";
    const APPLIED_VERSION_KEY = "shuffleplus_pwa_applied_version_v1";
    const SNAPSHOT_KEY = "shuffleplus_preupdate_snapshot_v1";
    const TRANSACTION_KEY = "shuffleplus_pwa_update_transaction_v1";
    const ROLLBACK_NOTICE_KEY = "shuffleplus_pwa_rollback_notice_v1";
    const UPDATE_WINDOW_MS = 15 * 60 * 1000;
    const STARTUP_TIMEOUT_MS = 18_000;
    const STABILITY_MS = 10_000;

    let startupTimer = 0;
    let stabilityTimer = 0;
    let finished = false;
    let rollbackRunning = false;

    function safeParse(value, fallback = null) {
        try {
            return JSON.parse(value);
        } catch {
            return fallback;
        }
    }

    function safeGet(storage, key) {
        try {
            return storage?.getItem?.(key) || "";
        } catch {
            return "";
        }
    }

    function safeSet(storage, key, value) {
        try {
            storage?.setItem?.(key, String(value));
            return true;
        } catch {
            return false;
        }
    }

    function safeRemove(storage, key) {
        try {
            storage?.removeItem?.(key);
            return true;
        } catch {
            return false;
        }
    }

    function isRecent(timestamp) {
        const value = Number(timestamp || 0);
        const age = Date.now() - value;
        return Number.isFinite(value) && value > 0 && age >= 0 && age <= UPDATE_WINDOW_MS;
    }

    function readSnapshot() {
        const value = safeParse(safeGet(localStorage, SNAPSHOT_KEY), null);
        if (
            !value ||
            value.format !== "shuffleplus-preupdate-snapshot" ||
            String(value.toVersion || "") !== CURRENT_VERSION ||
            !isRecent(value.createdAt)
        ) {
            return null;
        }
        return value;
    }

    function readTransaction() {
        const value = safeParse(safeGet(localStorage, TRANSACTION_KEY), null);
        if (
            !value ||
            value.format !== "shuffleplus-pwa-update-transaction" ||
            String(value.toVersion || "") !== CURRENT_VERSION ||
            !isRecent(value.startedAt)
        ) {
            return null;
        }
        return value;
    }

    function inferPendingUpdate() {
        const transaction = readTransaction();
        if (transaction) {
            return {
                ...transaction,
                source: "transaction"
            };
        }

        const appliedVersion = safeGet(sessionStorage, APPLIED_VERSION_KEY);
        const snapshot = readSnapshot();
        if (appliedVersion !== CURRENT_VERSION || !snapshot) {
            return null;
        }

        const fromVersion = String(snapshot.fromVersion || "").trim();
        return {
            format: "shuffleplus-pwa-update-transaction",
            schemaVersion: 1,
            source: "snapshot",
            status: "verifying",
            fromVersion,
            toVersion: CURRENT_VERSION,
            fromBuild: fromVersion ? `${fromVersion}-pwa-reset-1` : "",
            toBuild: CURRENT_VERSION ? `${CURRENT_VERSION}-pwa-reset-1` : "",
            startedAt: Number(snapshot.createdAt || Date.now())
        };
    }

    const pending = inferPendingUpdate();
    if (!pending || !CURRENT_VERSION) {
        return;
    }

    function persistTransaction(status, extra = {}) {
        const next = {
            ...pending,
            ...extra,
            format: "shuffleplus-pwa-update-transaction",
            schemaVersion: 1,
            status,
            updatedAt: Date.now()
        };
        safeSet(localStorage, TRANSACTION_KEY, JSON.stringify(next));
        return next;
    }

    function postWorkerMessage(type, payload = {}, timeoutMs = 3000) {
        return new Promise((resolve) => {
            const controller = navigator.serviceWorker?.controller;
            if (!controller || typeof MessageChannel !== "function") {
                resolve(null);
                return;
            }

            const channel = new MessageChannel();
            let settled = false;
            const finish = (value) => {
                if (settled) return;
                settled = true;
                window.clearTimeout(timer);
                channel.port1.onmessage = null;
                channel.port1.close?.();
                channel.port2.close?.();
                resolve(value || null);
            };
            const timer = window.setTimeout(() => finish(null), timeoutMs);
            channel.port1.onmessage = (event) => finish(event.data || null);

            try {
                controller.postMessage(
                    { type, ...payload },
                    [channel.port2]
                );
            } catch {
                finish(null);
            }
        });
    }

    async function completeUpdate() {
        if (finished || rollbackRunning) return;
        finished = true;
        window.clearTimeout(startupTimer);
        window.clearTimeout(stabilityTimer);
        safeRemove(localStorage, TRANSACTION_KEY);
        await postWorkerMessage("CLEAR_ROLLBACK_STATE", {}, 1200);
        window.dispatchEvent(new CustomEvent("shuffleplus:update-stable", {
            detail: {
                version: CURRENT_VERSION,
                fromVersion: pending.fromVersion || ""
            }
        }));
    }

    async function rollback(reason = "startup-timeout") {
        if (finished || rollbackRunning) return false;
        rollbackRunning = true;
        window.clearTimeout(startupTimer);
        window.clearTimeout(stabilityTimer);

        persistTransaction("rollback-requested", { reason });

        const response = await postWorkerMessage(
            "ROLLBACK_TO_PREVIOUS",
            {
                requestedFromVersion: String(pending.fromVersion || "")
            },
            3500
        );

        if (!response?.ok || !response.previousVersion) {
            rollbackRunning = false;
            persistTransaction("rollback-unavailable", { reason });
            window.dispatchEvent(new CustomEvent("shuffleplus:update-rollback-unavailable", {
                detail: { reason }
            }));
            return false;
        }

        const previousVersion = String(response.previousVersion || pending.fromVersion || "");
        const previousBuild = String(
            pending.fromBuild ||
            (previousVersion ? `${previousVersion}-pwa-reset-1` : "")
        );

        if (previousBuild) {
            safeSet(localStorage, BUILD_STORAGE_KEY, previousBuild);
        }
        safeRemove(sessionStorage, APPLIED_VERSION_KEY);
        safeSet(localStorage, ROLLBACK_NOTICE_KEY, JSON.stringify({
            format: "shuffleplus-pwa-rollback-notice",
            schemaVersion: 1,
            failedVersion: CURRENT_VERSION,
            restoredVersion: previousVersion,
            reason,
            createdAt: Date.now()
        }));
        persistTransaction("rolled-back", {
            reason,
            restoredVersion: previousVersion,
            rolledBackAt: Date.now()
        });

        const url = new URL(window.location.href);
        if (previousBuild) {
            url.searchParams.set(BUILD_QUERY_KEY, previousBuild);
        }
        url.searchParams.set("rollback", String(Date.now()));
        url.searchParams.delete("cache_bust");
        url.searchParams.delete("recovery");
        window.location.replace(url.toString());
        return true;
    }

    persistTransaction("verifying", {
        verifiedAt: Date.now()
    });

    window.__SHUFFLEPLUS_UPDATE_GUARD__ = Object.freeze({
        version: CURRENT_VERSION,
        fromVersion: String(pending.fromVersion || ""),
        startedAt: Number(pending.startedAt || 0),
        rollback: (reason = "manual") => rollback(reason)
    });

    window.addEventListener("shuffleplus:app-ready", (event) => {
        if (String(event.detail?.version || "") !== CURRENT_VERSION) {
            void rollback("version-mismatch");
            return;
        }
        window.clearTimeout(startupTimer);
        stabilityTimer = window.setTimeout(() => {
            void completeUpdate();
        }, STABILITY_MS);
    }, { once: true });

    window.addEventListener("shuffleplus:startup-error", () => {
        void rollback("startup-error");
    }, { once: true });

    window.addEventListener("error", (event) => {
        if (event.target instanceof HTMLScriptElement) {
            void rollback("script-load-error");
        }
    }, true);

    startupTimer = window.setTimeout(() => {
        void rollback("startup-timeout");
    }, STARTUP_TIMEOUT_MS);
})();
