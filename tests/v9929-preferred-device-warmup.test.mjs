import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildPreferredDeviceDiscoveryPolicy
} from "../core/launch-reliability.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("Shuffle+ 12.0.1 prolonge la détection de l’iPhone enregistré", () => {
    assert.equal(version, "12.0.1");
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

test("le lancement affiche une phase de réveil sans appareil de secours", async () => {
    const reliabilitySource = await readFile(new URL("../core/spotify-reliability.js", import.meta.url), "utf8");
    assert.match(reliabilitySource, /Réveil de Spotify Connect sur l’iPhone/);
    assert.match(reliabilitySource, /resolveStrictLaunchDevice[\s\S]*fallbackCandidates:\s*\[\]/);
    assert.match(appSource, /resolveLaunchDevice\(/);
});
