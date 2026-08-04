import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createSpotifyRequestManager
} from "../core/spotify-request-manager.js";

const appSource = await readFile("app.js", "utf8");
const spotifyApiSource = await readFile(
    "spotify-api.js",
    "utf8"
);
const version = (await readFile("VERSION", "utf8")).trim();

test("la convergence Pause/Lecture active annonce Shuffle+ 9.9.24", () => {
    assert.equal(version, "9.9.24");
    assert.match(appSource, /const APP_VERSION = "9\.9\.24"/);
});

test("une ancienne lecture GET ne peut plus repeupler le cache après Pause", async () => {
    const manager = createSpotifyRequestManager();
    let resolveOldPlayback;

    const oldPlaybackRequest = manager.execute({
        key: "GET:/me/player:",
        method: "GET",
        cacheTtlMs: 4_000,
        request: () => new Promise((resolve) => {
            resolveOldPlayback = resolve;
        })
    });

    await Promise.resolve();

    await manager.execute({
        key: "PUT:/me/player/pause:",
        method: "PUT",
        request: async () => null
    });

    resolveOldPlayback({ is_playing: true });
    await oldPlaybackRequest;

    const freshPlayback = await manager.execute({
        key: "GET:/me/player:",
        method: "GET",
        cacheTtlMs: 4_000,
        request: async () => ({ is_playing: false })
    });

    assert.equal(freshPlayback.is_playing, false);
    assert.equal(
        manager.getDiagnostics().networkRequests,
        3
    );
});

test("les vérifications de convergence contournent le cache Spotify", () => {
    assert.match(
        spotifyApiSource,
        /getCurrentPlayback\(\{[\s\S]*fresh = false[\s\S]*skipCache: Boolean\(fresh\)/
    );
    assert.match(
        appSource,
        /refreshMusicalDashboardPlayback\(\{[\s\S]*fresh: true[\s\S]*Vérification Spotify différée/
    );
    assert.match(
        appSource,
        /getCurrentPlayback\(\{[\s\S]*fresh: true[\s\S]*reconcilePlaybackWithUiOverride/
    );
});

test("le verrou attend un état frais et stable avant de se libérer", () => {
    assert.match(
        appSource,
        /PLAYBACK_OVERRIDE_HARD_TIMEOUT_MS = 30_000/
    );
    assert.match(
        appSource,
        /PLAYBACK_OVERRIDE_MIN_HOLD_MS = 6_500/
    );
    assert.match(
        appSource,
        /PLAYBACK_OVERRIDE_REQUIRED_MATCHES = 2/
    );
    assert.match(
        appSource,
        /if \(fresh && remoteHasState\)[\s\S]*matchingFreshCount \+= 1/
    );
    assert.match(
        appSource,
        /now >= playbackUiOverride\.minimumReleaseAt[\s\S]*matchingFreshCount >=[\s\S]*PLAYBACK_OVERRIDE_REQUIRED_MATCHES[\s\S]*clearPlaybackUiOverride\(\)/
    );
});

test("le mode conduite utilise le même verrou et la même horloge", () => {
    assert.match(
        appSource,
        /async function toggleDrivingPlayback\(\)[\s\S]*beginPlaybackUiOverride[\s\S]*setPlaybackClockPlayingState[\s\S]*schedulePlaybackConfirmationChecks/
    );
});
