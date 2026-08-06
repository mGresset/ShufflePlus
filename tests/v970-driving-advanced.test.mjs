import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    DEFAULT_ADVANCED_DRIVING_SETTINGS,
    DRIVING_UNLOCK_HOLD_MS,
    normalizeDrivingAdvancedSettings,
    orderDrivingControls,
    getDrivingUnlockProgress
} from "../core/driving-advanced.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const drivingCss = await readFile(
    "styles/feature-driving.css",
    "utf8"
);
const serviceWorker = await readFile(
    "service-worker.js",
    "utf8"
);

test("la distribution active annonce Shuffle+ 9.9.44", () => {
    assert.equal(version, "9.9.44");
});

test("les réglages de conduite avancée restent compatibles avec les anciennes sauvegardes", () => {
    assert.deepEqual(
        normalizeDrivingAdvancedSettings({
            keepScreenAwake: false,
            autoRefresh: true,
            showFeedback: false
        }),
        {
            ...DEFAULT_ADVANCED_DRIVING_SETTINGS,
            keepScreenAwake: false,
            showFeedback: false
        }
    );
});

test("une action principale invalide revient vers Adaptive DJ", () => {
    const settings = normalizeDrivingAdvancedSettings({
        primaryAction: "inconnue"
    });

    assert.equal(settings.primaryAction, "adaptive");
});

test("l’action principale choisie passe en tête sans supprimer les autres commandes", () => {
    const controls = [
        { id: "adaptive" },
        { id: "playpause" },
        { id: "next" },
        { id: "voice" }
    ];
    const ordered = orderDrivingControls(
        controls,
        "next"
    );

    assert.equal(ordered[0].id, "next");
    assert.deepEqual(
        new Set(ordered.map((control) => control.id)),
        new Set(controls.map((control) => control.id))
    );
});

test("le maintien de déverrouillage n’est validé qu’après une seconde", () => {
    const startedAt = 10_000;
    const partial = getDrivingUnlockProgress({
        startedAt,
        now: startedAt + DRIVING_UNLOCK_HOLD_MS - 1
    });
    const complete = getDrivingUnlockProgress({
        startedAt,
        now: startedAt + DRIVING_UNLOCK_HOLD_MS
    });

    assert.equal(partial.complete, false);
    assert.equal(complete.complete, true);
    assert.equal(complete.percent, 100);
});

test("le mode conduite expose le verrouillage, les vibrations et la personnalisation", () => {
    assert.match(appSource, /drivingSafetyLockButton/);
    assert.match(appSource, /startDrivingUnlockHold/);
    assert.match(appSource, /drivingHapticFeedbackInput/);
    assert.match(appSource, /drivingPrimaryActionInput/);
    assert.match(appSource, /drivingLockOnEntryInput/);
    assert.match(appSource, /drivingFullscreenQueueInput/);
    assert.match(appSource, /renderDrivingPreferencesPanel/);
});

test("la file de conduite peut occuper tout l’écran", () => {
    assert.match(appSource, /driving-queue-sheet \$\{drivingModeSettings\.fullscreenQueue/);
    assert.match(drivingCss, /\.driving-queue-sheet\.is-fullscreen/);
    assert.match(drivingCss, /is-driving-queue-fullscreen/);
});

test("le nouveau module est disponible hors connexion", () => {
    assert.match(
        serviceWorker,
        /\.\/core\/driving-advanced\.js/
    );
});
