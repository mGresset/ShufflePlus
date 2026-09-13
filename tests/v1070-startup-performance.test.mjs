import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createStartupTaskQueue } from "../core/startup-performance.js";
import { buildAppHealthSnapshot } from "../app-health.js";

const [version, appSource, workerSource] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8")
]);

function createEventTarget(initial = {}) {
    const listeners = new Map();
    return {
        ...initial,
        addEventListener(type, listener) {
            if (!listeners.has(type)) listeners.set(type, new Set());
            listeners.get(type).add(listener);
        },
        removeEventListener(type, listener) {
            listeners.get(type)?.delete(listener);
        },
        dispatch(type) {
            for (const listener of [...(listeners.get(type) || [])]) {
                listener({ type });
            }
        }
    };
}

function createGlobalTarget() {
    const target = createEventTarget();
    return {
        ...target,
        setTimeout,
        clearTimeout
    };
}

test("Shuffle+ 10.8.0 introduit une file de tâches de démarrage non critiques", () => {
    assert.equal(version, "10.8.0");
    assert.match(appSource, /createStartupTaskQueue/);
    assert.match(workerSource, /\.\/core\/startup-performance\.js/);
});

test("la file de démarrage déduplique une tâche et la termine en arrière-plan", async () => {
    const globalObject = createGlobalTarget();
    const documentObject = createEventTarget({ visibilityState: "visible" });
    const navigatorObject = { onLine: true };
    let calls = 0;

    const queue = createStartupTaskQueue({
        globalObject,
        documentObject,
        navigatorObject
    });

    const first = queue.schedule("library", async () => {
        calls += 1;
    }, { idle: false });
    const second = queue.schedule("library", async () => {
        calls += 1;
    }, { idle: false });

    assert.equal(first, second);
    await first;
    assert.equal(calls, 1);
    assert.equal(queue.diagnostics()[0].status, "completed");
});

test("une tâche réseau différée attend le retour en ligne", async () => {
    const globalObject = createGlobalTarget();
    const documentObject = createEventTarget({ visibilityState: "visible" });
    const navigatorObject = { onLine: false };
    let calls = 0;

    const queue = createStartupTaskQueue({
        globalObject,
        documentObject,
        navigatorObject
    });

    const promise = queue.schedule("devices", async () => {
        calls += 1;
    }, {
        idle: false,
        requiresOnline: true
    });

    await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(queue.diagnostics()[0].status, "waiting-network");
    assert.equal(calls, 0);

    navigatorObject.onLine = true;
    globalObject.dispatch("online");
    await promise;
    assert.equal(calls, 1);
    assert.equal(queue.diagnostics()[0].status, "completed");
});

test("le démarrage avec bibliothèque locale reporte les rafraîchissements secondaires", () => {
    assert.match(
        appSource,
        /canRefreshLibraryAfterInteractive[\s\S]*?deferStartupTask\([\s\S]*?"live-library-refresh"/
    );
    assert.match(
        appSource,
        /needsDevicesImmediately[\s\S]*?deferStartupTask\([\s\S]*?"spotify-devices-refresh"/
    );
    assert.match(
        appSource,
        /activeAppMenu === "dashboard"[\s\S]*?refreshMusicalDashboardPlayback\(\{silent:true\}\);[\s\S]*?startScheduleWatcher/
    );
    assert.doesNotMatch(
        appSource,
        /activeAppMenu === "dashboard"[\s\S]{0,300}?refreshMusicalDashboardPlayback\(\{silent:true\}\);\s*await refreshDrivingQueue/
    );
});

test("le Centre de fiabilité expose le démarrage interactif et les tâches différées", () => {
    const snapshot = buildAppHealthSnapshot({
        secureContext: true,
        localStorageAvailable: true,
        runtimeStateDiagnostics: {
            snapshot: {
                lifecycle: { interactiveMs: 840 },
                startup: {
                    deferredCount: 2,
                    completedCount: 2,
                    errorCount: 0
                }
            }
        }
    });
    const check = snapshot.checks.find((item) => item.id === "interactive-startup");

    assert.ok(check);
    assert.equal(check.available, true);
    assert.match(check.value, /840 ms/);
    assert.match(check.value, /2 tâche\(s\) différée\(s\)/);
});
