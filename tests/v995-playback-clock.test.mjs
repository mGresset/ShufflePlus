import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getPlaybackClockSnapshot,
    setPlaybackClockPlayingState,
    stampPlaybackClock
} from "../core/playback-clock.js";

const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

function playback({
    progressMs = 10_000,
    playing = true
} = {}) {
    return {
        is_playing: playing,
        progress_ms: progressMs,
        item: {
            id: "track-1",
            uri: "spotify:track:track-1",
            duration_ms: 180_000
        }
    };
}

test("la correction active annonce Shuffle+ 9.9.22", () => {
    assert.equal(version, "9.9.22");
    assert.match(appSource, /const APP_VERSION = "9\.9\.22"/);
});

test("l'horloge locale avance sans nouvel appel Spotify", () => {
    const stamped = stampPlaybackClock(
        playback(),
        1_000
    );
    const later = getPlaybackClockSnapshot(
        stamped,
        4_500
    );

    assert.equal(later.progress_ms, 13_500);
});

test("la pause fige immédiatement la progression locale", () => {
    const stamped = stampPlaybackClock(
        playback(),
        1_000
    );
    const paused = setPlaybackClockPlayingState(
        stamped,
        false,
        4_500
    );
    const later = getPlaybackClockSnapshot(
        paused,
        10_000
    );

    assert.equal(paused.progress_ms, 13_500);
    assert.equal(later.progress_ms, 13_500);
    assert.equal(later.is_playing, false);
});

test("la reprise repart depuis le temps figé", () => {
    const paused = setPlaybackClockPlayingState(
        stampPlaybackClock(playback(), 1_000),
        false,
        4_000
    );
    const resumed = setPlaybackClockPlayingState(
        paused,
        true,
        6_000
    );
    const later = getPlaybackClockSnapshot(
        resumed,
        8_000
    );

    assert.equal(later.progress_ms, 15_000);
});

test("l'interface maintient l'état demandé jusqu'à confirmation stable", () => {
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
        /return applyPlaybackIntentOverride\([\s\S]*expectedPlaying/
    );
});

test("la progression visible est actualisée deux fois par seconde", () => {
    assert.match(appSource, /function updatePlaybackProgressDom/);
    assert.match(appSource, /startPlaybackClockTimer\(\)/);
    assert.match(appSource, /},\s*500\s*\);/);
    assert.match(appSource, /--v9-progress/);
    assert.match(appSource, /musical-dashboard-progress i/);
});

test("le module d'horloge reste disponible hors connexion", () => {
    assert.match(serviceWorkerSource, /core\/playback-clock\.js/);
});
