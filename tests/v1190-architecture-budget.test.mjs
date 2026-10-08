import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildReliabilityDiagnosticText,
    buildReliabilityQueueState,
    readReliabilityEventJournal,
    selectReliabilityActiveDevice,
    writeReliabilityEventJournal
} from "../core/reliability-runtime.js";

test("le journal de fiabilité persiste sans faire fuiter d’état non normalisé", () => {
    const data = new Map();
    const storage = {
        getItem: (key) => data.get(key) ?? null,
        setItem: (key, value) => data.set(key, value)
    };

    assert.equal(writeReliabilityEventJournal(storage, "events", [
        {
            category: "spotify",
            level: "success",
            label: "Spotify prêt",
            detail: "OK",
            createdAt: 100
        }
    ]), true);

    const events = readReliabilityEventJournal(storage, "events");
    assert.equal(events.length, 1);
    assert.equal(events[0].label, "Spotify prêt");
});

test("le diagnostic texte reste volontairement sans identifiants sensibles", () => {
    const report = buildReliabilityDiagnosticText({
        appVersion: "11.9.1",
        online: true,
        spotifyConnected: true,
        serverStatus: "healthy",
        pwaControlled: true,
        spotifyDiagnosticText: "Spotify Connect prêt",
        services: [{ level: "healthy", label: "PWA", value: "active" }],
        events: [{
            category: "device",
            level: "success",
            label: "Appareil détecté",
            detail: "smartphone",
            createdAt: 100
        }]
    });

    assert.match(report, /Shuffle\+ 11\.9\.1/);
    assert.match(report, /aucun token OAuth/);
    assert.doesNotMatch(report, /device_id\s*:/i);
    assert.doesNotMatch(report, /refresh_token/i);
});

test("les helpers de contexte fiabilité normalisent file et appareil", () => {
    const queue = buildReliabilityQueueState({
        queue: [{ id: "a" }, { id: "b" }],
        updatedAt: 1_000
    }, 2_500);
    assert.deepEqual(queue, {
        count: 2,
        updatedAt: 1_000,
        ageMs: 1_500
    });

    const device = selectReliabilityActiveDevice({
        spotifyConnectDiagnostic: {
            resolvedDevice: { name: "iPhone", type: "Smartphone", id: "secret-id" }
        },
        activePlaybackDevice: { name: "Fallback" }
    });
    assert.equal(device.name, "iPhone");
    assert.equal(device.type, "Smartphone");
});

test("les styles fiabilité ne résident plus dans le CSS global", async () => {
    const [globalCss, reliabilityCss, homeCss] = await Promise.all([
        readFile(new URL("../style.css", import.meta.url), "utf8"),
        readFile(new URL("../styles/feature-reliability.css", import.meta.url), "utf8"),
        readFile(new URL("../styles/feature-home.css", import.meta.url), "utf8")
    ]);

    assert.doesNotMatch(globalCss, /\.reliability-center-panel\s*\{/);
    assert.doesNotMatch(globalCss, /\.spotify-connect-diagnostic\s*,/);
    assert.doesNotMatch(globalCss, /\.primary-launch-reliability\s*\{/);
    assert.match(reliabilityCss, /\.reliability-center-panel\s*\{/);
    assert.match(reliabilityCss, /\.spotify-connect-diagnostic\s*,/);
    assert.match(homeCss, /\.primary-launch-reliability\s*\{/);
});
