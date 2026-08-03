import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createSpotifyRequestManager,
    parseRetryAfterMilliseconds
} from "../core/spotify-request-manager.js";
import { buildAppHealthSnapshot } from "../app-health.js";

const appSource = await readFile("app.js", "utf8");
const spotifyApiSource = await readFile("spotify-api.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

function createDeferred() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

test("Retry-After est converti en millisecondes", () => {
    assert.equal(parseRetryAfterMilliseconds("2"), 2000);
    assert.equal(parseRetryAfterMilliseconds("0.25"), 250);
    assert.equal(parseRetryAfterMilliseconds("invalid"), 0);
});

test("deux lectures Spotify identiques partagent une seule requête réseau", async () => {
    let currentTime = 1000;
    let networkCalls = 0;
    const deferred = createDeferred();
    const manager = createSpotifyRequestManager({
        now: () => currentTime
    });
    const request = async () => {
        networkCalls += 1;
        return deferred.promise;
    };

    const first = manager.execute({
        key: "GET:/me/player",
        method: "GET",
        cacheTtlMs: 4000,
        request
    });
    const second = manager.execute({
        key: "GET:/me/player",
        method: "GET",
        cacheTtlMs: 4000,
        request
    });

    deferred.resolve({ is_playing: true });

    assert.deepEqual(await first, { is_playing: true });
    assert.deepEqual(await second, { is_playing: true });
    assert.equal(networkCalls, 1);

    currentTime += 100;
    assert.deepEqual(
        await manager.execute({
            key: "GET:/me/player",
            method: "GET",
            cacheTtlMs: 4000,
            request
        }),
        { is_playing: true }
    );

    const diagnostics = manager.getDiagnostics();
    assert.equal(diagnostics.networkRequests, 1);
    assert.equal(diagnostics.deduplicatedRequests, 1);
    assert.equal(diagnostics.cacheHits, 1);
});

test("une commande de lecture invalide le cache Spotify", async () => {
    let reads = 0;
    const manager = createSpotifyRequestManager();
    const read = () => manager.execute({
        key: "GET:/me/player",
        method: "GET",
        cacheTtlMs: 4000,
        request: async () => ({ sequence: ++reads })
    });

    assert.deepEqual(await read(), { sequence: 1 });
    assert.deepEqual(await read(), { sequence: 1 });

    await manager.execute({
        key: "PUT:/me/player/play",
        method: "PUT",
        request: async () => null
    });

    assert.deepEqual(await read(), { sequence: 2 });
});

test("QUOTA_EXCEEDED déclenche un refroidissement global sans nouvel appel", async () => {
    let currentTime = 1000;
    let networkCalls = 0;
    const manager = createSpotifyRequestManager({
        now: () => currentTime,
        quotaCooldownMs: 5000
    });

    await assert.rejects(
        manager.execute({
            key: "GET:/me/player",
            method: "GET",
            request: async () => {
                networkCalls += 1;
                const error = new Error("Too many requests");
                error.status = 429;
                error.reason = "QUOTA_EXCEEDED";
                throw error;
            }
        }),
        /Too many requests/
    );

    await assert.rejects(
        manager.execute({
            key: "GET:/me/player/devices",
            method: "GET",
            request: async () => {
                networkCalls += 1;
                return [];
            }
        }),
        (error) => {
            assert.equal(error.code, "SPOTIFY_API_COOLDOWN");
            assert.equal(error.reason, "QUOTA_EXCEEDED");
            assert.match(error.message, /appels en pause/i);
            return true;
        }
    );

    assert.equal(networkCalls, 1);
    assert.equal(manager.getDiagnostics().blockedByCooldown, 1);

    currentTime += 5001;
    assert.deepEqual(
        await manager.execute({
            key: "GET:/me/player/devices",
            method: "GET",
            request: async () => {
                networkCalls += 1;
                return [];
            }
        }),
        []
    );
    assert.equal(networkCalls, 2);
});

test("le diagnostic signale une pause du quota Spotify", () => {
    const snapshot = buildAppHealthSnapshot({
        secureContext: true,
        localStorageAvailable: true,
        online: true,
        spotifyApiDiagnostics: {
            networkRequests: 12,
            cacheHits: 8,
            cooldownActive: true,
            cooldownReason: "QUOTA_EXCEEDED",
            cooldownRemainingMs: 65000
        }
    });
    const check = snapshot.checks.find(
        (item) => item.id === "spotify-api"
    );

    assert.equal(check.category, "spotify");
    assert.equal(check.level, "attention");
    assert.match(check.value, /QUOTA_EXCEEDED/);
    assert.equal(snapshot.runtime.spotifyApi.cacheHits, 8);
});

test("Shuffle+ 7.4.3 espace les actualisations et précharge le gestionnaire", () => {
    assert.match(appSource, /const PLAYBACK_AUTO_REFRESH_MS = 2_000;/);
    assert.match(appSource, /const DRIVING_MODE_REFRESH_MS = PLAYBACK_AUTO_REFRESH_MS;/);
    assert.match(appSource, /const DRIVING_QUEUE_REFRESH_MS = 30000;/);
    assert.match(appSource, /const MODIFICATION_REQUEST_CONCURRENCY = 1;/);
    assert.match(appSource, /MODIFICATION_REQUEST_DELAY_MS = 900/);
    assert.match(appSource, /stopDrivingRefreshTimer\(\);\s*stopMusicalDashboardRefreshTimer\(\);/);
    assert.match(appSource, /getSpotifyApiDiagnostics\(\)/);
    assert.match(spotifyApiSource, /spotifyRequestManager\.execute/);
    assert.match(spotifyApiSource, /getSpotifyCacheTtl/);
    assert.match(serviceWorkerSource, /\.\/core\/spotify-request-manager\.js/);
});
