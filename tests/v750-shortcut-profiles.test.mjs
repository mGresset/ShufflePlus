import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildShortcutProfileDiagnostic,
    claimShortcutLaunch,
    formatShortcutRunDuration,
    getShortcutProfileReadiness,
    normalizeShortcutHistorySteps
} from "../core/shortcut-profiles.js";

const appSource = await readFile("app.js", "utf8");
const menuSource = await readFile("core/app-menu.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const styleSource = await readFile("style.css", "utf8");

test("un profil fixe est prêt quand sa playlist et son iPhone sont configurés", () => {
    const readiness = getShortcutProfileReadiness({
        commandType: "fixed",
        playlistId: "playlist-1",
        deviceMode: "preferred",
        autoplay: true
    }, {
        playlistIds: ["playlist-1"],
        preferredDevice: { id: "iphone-1", name: "iPhone" }
    });

    assert.equal(readiness.ready, true);
    assert.deepEqual(readiness.missing, []);
});

test("un profil signale les éléments manquants", () => {
    const readiness = getShortcutProfileReadiness({
        commandType: "smartmix",
        mixId: "missing",
        deviceMode: "preferred",
        autoplay: false
    }, {
        mixIds: [],
        preferredDevice: {}
    });

    assert.equal(readiness.ready, false);
    assert.deepEqual(readiness.missing, ["source", "device", "autoplay"]);
});

test("le diagnostic reprend le dernier lancement", () => {
    const diagnostic = buildShortcutProfileDiagnostic({
        id: "drive",
        commandType: "fixed",
        playlistId: "playlist-1",
        deviceMode: "active",
        autoplay: true
    }, [{
        commandId: "drive",
        status: "success",
        createdAt: 1000
    }], {
        playlistIds: ["playlist-1"]
    });

    assert.equal(diagnostic.status, "success");
    assert.equal(diagnostic.label, "Opérationnel");
});

test("la protection ignore une double ouverture immédiate", () => {
    const values = new Map();
    const storage = {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value)
    };

    assert.equal(claimShortcutLaunch(storage, "guard", "drive", { now: 1000 }).accepted, true);
    const duplicate = claimShortcutLaunch(storage, "guard", "drive", { now: 2000 });
    assert.equal(duplicate.accepted, false);
    assert.ok(duplicate.retryAfterMs > 0);
    assert.equal(claimShortcutLaunch(storage, "guard", "drive", { now: 10000 }).accepted, true);
});

test("les étapes et durées de diagnostic sont normalisées", () => {
    assert.deepEqual(normalizeShortcutHistorySteps([
        { id: "device", label: "Appareil", status: "success", message: "iPhone" },
        null
    ]), [{
        id: "device",
        label: "Appareil",
        status: "success",
        message: "iPhone"
    }]);
    assert.equal(formatShortcutRunDuration(2350), "2,4 s");
});

test("la v7.5 expose Mes raccourcis, ses actions et son diagnostic", () => {
    assert.match(menuSource, /Mes raccourcis/);
    assert.match(appSource, /function renderShortcutProfilesDashboard\(/);
    assert.match(appSource, /id="createShortcutProfileButton"/);
    assert.match(appSource, /shortcut-profile-diagnostic-steps/);
    assert.match(appSource, /claimShortcutLaunch\(/);
    assert.match(appSource, /source: "automation-url"/);
    assert.match(styleSource, /\.shortcut-profile-grid/);
    assert.match(serviceWorkerSource, /\.\/core\/shortcut-profiles\.js/);
});
