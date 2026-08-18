import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildPreferredDeviceDiscoveryPolicy
} from "../core/launch-reliability.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("Shuffle+ 9.9.46 prolonge la détection de l’iPhone enregistré", () => {
    assert.equal(version, "9.9.46");
    const policy = buildPreferredDeviceDiscoveryPolicy({
        strict: true,
        attempts: 6,
        delayMs: 1100
    });
    assert.deepEqual(policy, {
        maxAttempts: 10,
        retryDelayMs: 1000,
        initialDelayMs: 700
    });
});

test("les modes souples conservent leurs réglages de détection", () => {
    assert.deepEqual(
        buildPreferredDeviceDiscoveryPolicy({
            strict: false,
            attempts: 6,
            delayMs: 1100
        }),
        {
            maxAttempts: 6,
            retryDelayMs: 1100,
            initialDelayMs: 0
        }
    );
});

test("le lancement affiche une phase de réveil sans appareil de secours", () => {
    assert.match(appSource, /Réveil de Spotify Connect sur l’iPhone/);
    assert.match(appSource, /strictPreferredDevice\s*\?\s*\[\]/);
});
