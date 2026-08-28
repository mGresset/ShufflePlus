import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildPostUpdateDiagnosticMarker,
    buildSpotifyConnectDiagnostic,
    clearPostUpdateDiagnosticMarker,
    formatSpotifyConnectDiagnosticText,
    POST_UPDATE_DIAGNOSTIC_KEY,
    readPostUpdateDiagnosticMarker
} from "../core/spotify-connect-diagnostic.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const bootstrapSource = await readFile(new URL("../bootstrap-10.4.0.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

test("Shuffle+ 10.4.0 diagnostique le device actif même si /devices est vide", () => {
    assert.equal(version, "10.4.0");
    const diagnostic = buildSpotifyConnectDiagnostic({
        connected: true,
        devices: [],
        playback: {
            is_playing: true,
            device: {
                id: "private-id",
                name: "iPhone",
                type: "Smartphone",
                is_active: true
            }
        },
        preferredDevice: {
            id: "private-id",
            name: "iPhone"
        }
    });

    assert.equal(diagnostic.resolvedDevice.name, "iPhone");
    assert.equal(diagnostic.fallbackUsed, true);
    assert.equal(diagnostic.preferredMatched, true);
    assert.equal(diagnostic.label, "Fallback lecteur actif");
});

test("le diagnostic copiable ne divulgue jamais le device_id", () => {
    const diagnostic = buildSpotifyConnectDiagnostic({
        connected: true,
        devices: [{
            id: "secret-device-id",
            name: "Téléphone",
            type: "Smartphone",
            is_active: true
        }]
    });
    const text = formatSpotifyConnectDiagnosticText(diagnostic);
    const serialized = JSON.stringify(diagnostic);

    assert.doesNotMatch(text, /secret-device-id/);
    assert.doesNotMatch(serialized, /secret-device-id/);
    assert.match(text, /aucun token OAuth ni device_id/i);
});

test("le marqueur d'autodiagnostic post-mise-à-jour est relisible et effaçable", () => {
    const storage = memoryStorage();
    const marker = buildPostUpdateDiagnosticMarker({
        fromBuild: "10.1.4-pwa-reset-1",
        toBuild: "10.4.0-pwa-reset-1",
        createdAt: 1234
    });
    storage.setItem(POST_UPDATE_DIAGNOSTIC_KEY, JSON.stringify(marker));

    assert.equal(readPostUpdateDiagnosticMarker(storage).toBuild, "10.4.0-pwa-reset-1");
    assert.equal(clearPostUpdateDiagnosticMarker(storage), true);
    assert.equal(readPostUpdateDiagnosticMarker(storage), null);
});

test("l'interface V10.2 expose le diagnostic Connect, le rapport copiable et l'historique", () => {
    assert.match(appSource, /runSpotifyConnectDiagnosticButton/);
    assert.match(appSource, /copyReliabilityDiagnosticButton/);
    assert.match(appSource, /Historique complet/);
    assert.match(appSource, /getAvailableDevices\(\{ fresh: true \}\)/);
    assert.match(appSource, /getCurrentPlayback\(\{ fresh: true \}\)/);
    assert.match(appSource, /schedulePostUpdateAutoDiagnostic\(\)/);
    assert.match(styleSource, /\.spotify-connect-diagnostic/);
    assert.match(workerSource, /core\/spotify-connect-diagnostic\.js/);
    assert.match(bootstrapSource, /shuffleplus_post_update_diagnostic_v1/);
});
