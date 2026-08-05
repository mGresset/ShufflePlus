import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    applyPlaybackIntentOverride,
    getPlaybackClockSnapshot,
    setPlaybackClockPlayingState,
    stampPlaybackClock
} from "../core/playback-clock.js";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

function playback({
    playing = true,
    progressMs = 10_000
} = {}) {
    return {
        is_playing: playing,
        progress_ms: progressMs,
        item: {
            id: "track-1",
            uri: "spotify:track:track-1",
            duration_ms: 180_000
        },
        device: {
            id: "device-1",
            name: "iPhone"
        }
    };
}

test("la protection visuelle active annonce Shuffle+ 9.9.31", () => {
    assert.equal(version, "9.9.31");
    assert.match(appSource, /const APP_VERSION = "9\.9\.31"/);
});

test("cinq secondes d'ancien état Lecture ne déplacent plus une Pause locale", () => {
    const playing = stampPlaybackClock(
        playback({ progressMs: 20_000 }),
        1_000
    );
    const pausedAnchor = setPlaybackClockPlayingState(
        playing,
        false,
        2_000
    );
    const staleRemote = stampPlaybackClock(
        playback({
            playing: true,
            progressMs: 25_000
        }),
        7_000
    );
    const effective = applyPlaybackIntentOverride(
        staleRemote,
        {
            anchorPlayback: pausedAnchor,
            expectedPlaying: false,
            now: 7_000
        }
    );
    const later = getPlaybackClockSnapshot(
        effective,
        12_000
    );

    assert.equal(effective.is_playing, false);
    assert.equal(effective.progress_ms, 21_000);
    assert.equal(later.progress_ms, 21_000);
});

test("une reprise locale avance depuis la position figée malgré un ancien état Pause", () => {
    const pausedAnchor = stampPlaybackClock(
        playback({
            playing: false,
            progressMs: 30_000
        }),
        2_000
    );
    const staleRemote = stampPlaybackClock(
        playback({
            playing: false,
            progressMs: 30_000
        }),
        7_000
    );
    const resumed = applyPlaybackIntentOverride(
        staleRemote,
        {
            anchorPlayback: pausedAnchor,
            expectedPlaying: true,
            now: 7_000
        }
    );
    const later = getPlaybackClockSnapshot(
        resumed,
        10_000
    );

    assert.equal(resumed.is_playing, true);
    assert.equal(resumed.progress_ms, 30_000);
    assert.equal(later.progress_ms, 33_000);
});

test("chaque rendu visible consomme l'état local effectif", () => {
    assert.match(
        appSource,
        /function updatePlaybackProgressDom\(\)[\s\S]*getEffectivePlaybackState[\s\S]*updateVisiblePlaybackButtons/
    );
    assert.match(
        appSource,
        /function getMusicalDashboardSnapshot\(\)[\s\S]*playback:getEffectivePlaybackState/
    );
    assert.match(
        appSource,
        /function renderV9HomePanel\(\)[\s\S]*playback: getEffectivePlaybackState/
    );
    assert.match(
        appSource,
        /function renderQuickControlPage\(\)[\s\S]*commitEffectivePlaybackState/
    );
    assert.match(
        appSource,
        /function renderDrivingModePage\(\)[\s\S]*commitEffectivePlaybackState/
    );
});

test("Pause/Reprise centralise confirmation et restauration en cas d'erreur", () => {
    assert.match(
        appSource,
        /async function runQuickControlAction\([\s\S]*playbackOverrideToken[\s\S]*schedulePlaybackConfirmationChecks\([\s\S]*playbackOverrideToken/
    );
    assert.match(
        appSource,
        /catch \(error\) \{[\s\S]*playbackCommandExpectedState[\s\S]*clearPlaybackUiOverride\(\)[\s\S]*playbackRollbackState/
    );
    assert.match(
        appSource,
        /rollbackPlaybackState:\s*playbackRollbackState/
    );
});
