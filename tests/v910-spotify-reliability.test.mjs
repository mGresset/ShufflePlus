import test from "node:test";
import assert from "node:assert/strict";

import {
    buildLaunchReliabilitySummary,
    getSpotifyPlaybackRetryDelay,
    isLaunchDeviceFailoverEligible,
    shouldResumePendingLaunch,
    shouldRetrySpotifyPlayback
} from "../core/launch-reliability.js";

test("la v9.9.31 résume la fiabilité du profil principal", () => {
    const now = 1_800_000;
    const summary = buildLaunchReliabilitySummary([
        {
            commandId: "principal",
            status: "success",
            deviceName: "iPhone",
            createdAt: now - 1000
        },
        {
            commandId: "principal",
            status: "success",
            deviceName: "iPhone",
            createdAt: now - 2000
        },
        {
            commandId: "principal",
            status: "error",
            createdAt: now - 3000
        }
    ], {
        commandId: "principal",
        now
    });

    assert.equal(summary.state, "stable");
    assert.equal(summary.successRate, 67);
    assert.equal(summary.lastDeviceName, "iPhone");
});

test("les erreurs Spotify temporaires déclenchent une nouvelle tentative", () => {
    assert.equal(
        shouldRetrySpotifyPlayback({ status: 429 }, { attempt: 1, maxAttempts: 3 }),
        true
    );
    assert.equal(
        shouldRetrySpotifyPlayback({ status: 403 }, { attempt: 1, maxAttempts: 3 }),
        false
    );
    assert.equal(
        getSpotifyPlaybackRetryDelay({ retryAfter: "2" }, { attempt: 1 }),
        2000
    );
});

test("Shuffle+ peut basculer vers un appareil de secours", () => {
    assert.equal(
        isLaunchDeviceFailoverEligible({
            code: "PLAYBACK_NOT_CONFIRMED",
            message: "La lecture n’a pas démarré"
        }),
        true
    );
    assert.equal(
        isLaunchDeviceFailoverEligible({
            status: 403,
            message: "Spotify Premium requis"
        }),
        false
    );
});

test("un lancement récent peut reprendre après le retour du réseau", () => {
    const now = 2_000_000;
    assert.equal(
        shouldResumePendingLaunch({
            action: "quickplay",
            createdAt: now - 60_000
        }, {
            online: true,
            visible: true,
            now
        }),
        true
    );
    assert.equal(
        shouldResumePendingLaunch({
            action: "quickplay",
            createdAt: now - 60_000
        }, {
            online: false,
            visible: true,
            now
        }),
        false
    );
    assert.equal(
        shouldResumePendingLaunch({
            action: "quickplay",
            createdAt: now - 20 * 60_000
        }, {
            online: true,
            visible: true,
            now
        }),
        false
    );
});
