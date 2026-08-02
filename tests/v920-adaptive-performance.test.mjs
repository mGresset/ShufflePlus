import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createIntentPrefetcher,
    getNetworkPerformanceProfile,
    shouldPrefetchForProfile
} from "../core/network-performance.js";
import {
    evaluatePerformanceBudget
} from "../core/performance-budget.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

function createFakeDocument() {
    const listeners = new Map();
    return {
        visibilityState: "visible",
        listeners,
        addEventListener(type, callback) {
            listeners.set(type, callback);
        },
        removeEventListener(type) {
            listeners.delete(type);
        },
        dispatch(type, target) {
            listeners.get(type)?.({ type, target });
        }
    };
}

test("la distribution active annonce Shuffle+ 9.4.0", () => {
    assert.equal(version, "9.4.0");
});

test("le profil réseau respecte l’économie de données et les réseaux lents", () => {
    const saved = getNetworkPerformanceProfile({
        online: true,
        saveData: true,
        effectiveType: "4g"
    });
    const balanced = getNetworkPerformanceProfile({
        online: true,
        effectiveType: "3g",
        downlink: 2.1,
        rtt: 280
    });
    const fast = getNetworkPerformanceProfile({
        online: true,
        effectiveType: "4g",
        downlink: 12,
        rtt: 70
    });

    assert.equal(saved.id, "constrained");
    assert.equal(saved.allowBackgroundWarmup, false);
    assert.equal(balanced.id, "balanced");
    assert.equal(fast.id, "fast");
    assert.equal(
        shouldPrefetchForProfile(saved, {
            priority: "normal",
            background: true
        }),
        false
    );
    assert.equal(
        shouldPrefetchForProfile(fast, {
            priority: "low",
            background: true
        }),
        true
    );
});

test("le préchargement par intention ne charge un module qu’une fois", async () => {
    const documentObject = createFakeDocument();
    let calls = 0;
    const prefetcher = createIntentPrefetcher({
        documentObject,
        navigatorObject: {
            onLine: true,
            connection: {
                effectiveType: "4g",
                downlink: 8,
                rtt: 60
            }
        },
        rules: [{
            id: "search",
            selector: "[data-open-search]",
            priority: "high",
            run: async () => {
                calls += 1;
            }
        }]
    });
    const target = {
        closest(selector) {
            return selector === "[data-open-search]" ? this : null;
        }
    };

    documentObject.dispatch("pointerover", target);
    documentObject.dispatch("focusin", target);
    await new Promise((resolve) => setTimeout(resolve, 0));

    assert.equal(calls, 1);
    assert.equal(prefetcher.diagnostics()[0].status, "loaded");
    prefetcher.destroy();
});

test("le budget de performance distingue une charge saine d’un dépassement critique", () => {
    const healthy = evaluatePerformanceBudget({
        loadMs: 1800,
        domContentLoadedMs: 900,
        transferBytes: 500000,
        resources: 70
    }, { id: "fast" });
    const critical = evaluatePerformanceBudget({
        loadMs: 11000,
        domContentLoadedMs: 8000,
        transferBytes: 2400000,
        resources: 260
    }, { id: "fast" });

    assert.equal(healthy.status, "healthy");
    assert.equal(healthy.score, 100);
    assert.equal(critical.status, "critical");
    assert.ok(critical.score < 100);
});

test("la v9.2 sépare le cache critique du préchauffage optionnel", () => {
    assert.match(serviceWorkerSource, /const CRITICAL_APP_SHELL/);
    assert.match(serviceWorkerSource, /WARM_OPTIONAL_SHELL/);
    assert.match(serviceWorkerSource, /warmCriticalShell/);
    assert.match(serviceWorkerSource, /warmOptionalShell/);
    assert.match(appSource, /createIntentPrefetcher/);
    assert.match(appSource, /requestOptionalPwaShellWarmup/);
    assert.match(appSource, /evaluatePerformanceBudget/);
});
