import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { createSessionResumeCoordinator } from "../core/session-resume.js";
import { buildAppHealthSnapshot } from "../app-health.js";

const [version, appSource, workerSource] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8")
]);

test("Shuffle+ 11.0.0 ajoute une reprise de session iPhone dédiée", () => {
    assert.equal(version, "11.0.0");
    assert.match(appSource, /createSessionResumeCoordinator/);
    assert.match(appSource, /sessionResumeCoordinator\.markHidden\(\)/);
    assert.match(appSource, /sessionResumeCoordinator\.requestResume\([\s\S]*?"visibilitychange"/);
    assert.match(appSource, /sessionResumeCoordinator\.requestResume\([\s\S]*?"online"/);
    assert.match(workerSource, /\.\/core\/session-resume\.js/);
});

test("une courte mise en arrière-plan ne déclenche pas Spotify", async () => {
    let current = 1000;
    let calls = 0;
    const coordinator = createSessionResumeCoordinator({
        now: () => current,
        staleAfterMs: 12000,
        onResume: async () => {
            calls += 1;
        }
    });

    coordinator.markHidden();
    current += 5000;
    const result = await coordinator.requestResume("visibilitychange");

    assert.equal(result.status, "skipped");
    assert.equal(result.reason, "fresh-session");
    assert.equal(calls, 0);
});

test("une longue suspension resynchronise une seule fois et déduplique les reprises concurrentes", async () => {
    let current = 1000;
    let calls = 0;
    let release;
    const gate = new Promise((resolve) => {
        release = resolve;
    });
    const coordinator = createSessionResumeCoordinator({
        now: () => current,
        staleAfterMs: 12000,
        onResume: async () => {
            calls += 1;
            await gate;
            current += 40;
            return { ok: true };
        }
    });

    coordinator.markHidden();
    current += 30000;
    const first = coordinator.requestResume("visibilitychange");
    const second = coordinator.requestResume("pageshow", { force: true });

    assert.equal(first, second);
    assert.equal(calls, 1);
    release();
    const result = await first;

    assert.equal(result.status, "completed");
    assert.equal(result.hiddenDurationMs, 30000);
    assert.equal(coordinator.diagnostics().resumeCount, 1);
    assert.equal(coordinator.diagnostics().errorCount, 0);
});

test("le retour réseau peut forcer une reprise même sans suspension préalable", async () => {
    let calls = 0;
    const coordinator = createSessionResumeCoordinator({
        onResume: async ({ reason }) => {
            calls += 1;
            return reason;
        }
    });

    const result = await coordinator.requestResume("online", {
        force: true,
        visible: true,
        online: true
    });

    assert.equal(result.status, "completed");
    assert.equal(calls, 1);
});

test("la reprise réelle force les métadonnées Spotify et actualise appareil/file sans reconstruire l'accueil", () => {
    assert.match(
        appSource,
        /async function refreshSessionAfterResume[\s\S]*?getCurrentPlayback\(\{[\s\S]*?fresh: true[\s\S]*?\}\)/
    );
    assert.match(
        appSource,
        /refreshSessionAfterResume[\s\S]*?getAvailableDevices\(\{ fresh: true \}\)/
    );
    assert.match(
        appSource,
        /refreshSessionAfterResume[\s\S]*?refreshDrivingQueue\(\{[\s\S]*?fresh: true/
    );
    assert.match(
        appSource,
        /refreshSessionAfterResume[\s\S]*?updateHomeNowPlayingDom\(\)/
    );
});

test("le Centre de fiabilité expose la reprise de session", () => {
    const snapshot = buildAppHealthSnapshot({
        secureContext: true,
        localStorageAvailable: true,
        runtimeStateDiagnostics: {
            snapshot: {
                resume: {
                    status: "completed",
                    resumeCount: 3,
                    lastDurationMs: 180,
                    errorCount: 0
                }
            }
        }
    });
    const check = snapshot.checks.find((item) => item.id === "session-resume");

    assert.ok(check);
    assert.equal(check.available, true);
    assert.match(check.value, /3 reprise\(s\)/);
    assert.match(check.value, /180 ms/);
});
