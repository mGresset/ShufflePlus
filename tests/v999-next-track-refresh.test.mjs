import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createOptimisticNextPlayback,
    getPlaybackClockSnapshot,
    hasPlaybackTrackChanged
} from "../core/playback-clock.js";
import {
    normalizeMusicalDashboardSettings
} from "../musical-dashboard.js";

const appSource = await readFile("app.js", "utf8");
const spotifyApiSource = await readFile(
    "spotify-api.js",
    "utf8"
);
const version = (await readFile("VERSION", "utf8")).trim();

function currentPlayback() {
    return {
        is_playing: true,
        progress_ms: 52_000,
        item: {
            id: "track-current",
            uri: "spotify:track:current",
            type: "track",
            name: "Titre actuel",
            duration_ms: 180_000,
            artists: [{ name: "Artiste actuel" }],
            album: {
                name: "Album actuel",
                images: [{ url: "https://example.test/current.jpg" }]
            }
        },
        device: {
            id: "device-1",
            name: "iPhone"
        }
    };
}

const nextQueueItem = {
    id: "track-next",
    uri: "spotify:track:next",
    type: "track",
    name: "Titre suivant",
    artist: "Nouvel artiste",
    album: "Nouvel album",
    imageUrl: "https://example.test/next.jpg",
    durationMs: 210_000
};

test("la synchronisation rapide annonce Shuffle+ 9.9.9", () => {
    assert.equal(version, "9.9.9");
    assert.match(appSource, /const APP_VERSION = "9\.9\.9"/);
});

test("Suivant peut afficher immédiatement le morceau prédit et remettre la barre à zéro", () => {
    const optimistic = createOptimisticNextPlayback(
        currentPlayback(),
        nextQueueItem,
        10_000
    );

    assert.equal(optimistic.item.id, "track-next");
    assert.equal(optimistic.item.name, "Titre suivant");
    assert.equal(optimistic.item.artists[0].name, "Nouvel artiste");
    assert.equal(optimistic.progress_ms, 0);
    assert.equal(optimistic.__shuffleplusPredictedNext, true);

    const afterOneSecond = getPlaybackClockSnapshot(
        optimistic,
        11_000
    );
    assert.equal(afterOneSecond.progress_ms, 1_000);
});

test("la transition se confirme seulement quand Spotify change réellement de titre", () => {
    assert.equal(
        hasPlaybackTrackChanged(
            currentPlayback(),
            currentPlayback()
        ),
        false
    );

    assert.equal(
        hasPlaybackTrackChanged(
            currentPlayback(),
            {
                ...currentPlayback(),
                item: {
                    ...currentPlayback().item,
                    id: "track-next",
                    uri: "spotify:track:next"
                }
            }
        ),
        true
    );
});

test("Suivant lance une confirmation fraîche en rafale sur les interfaces rapides", () => {
    assert.match(
        appSource,
        /NEXT_TRACK_CONFIRMATION_DELAYS_MS = Object\.freeze\(\[[\s\S]*180[\s\S]*5_000[\s\S]*7_500/
    );
    assert.match(
        appSource,
        /async function skipDrivingTrack\(\)[\s\S]*beginNextTrackUiTransition\(state\)[\s\S]*skipToNext\(deviceId\)[\s\S]*scheduleNextTrackConfirmationChecks/
    );
    assert.match(
        appSource,
        /normalizedAction === "next"[\s\S]*beginNextTrackUiTransition\(state\)[\s\S]*skipToNext\(deviceId\)[\s\S]*scheduleNextTrackConfirmationChecks/
    );
    assert.match(
        appSource,
        /refreshNextTrackTransition\(token\)[\s\S]*getCurrentPlayback\(\{ fresh: true \}\)/
    );
});

test("la synchronisation automatique visible est ramenée à cinq secondes", () => {
    assert.match(
        appSource,
        /const PLAYBACK_AUTO_REFRESH_MS = 5_000/
    );
    assert.match(
        appSource,
        /const DRIVING_MODE_REFRESH_MS = PLAYBACK_AUTO_REFRESH_MS/
    );
    assert.equal(
        normalizeMusicalDashboardSettings({
            autoRefreshSeconds: 20
        }).autoRefreshSeconds,
        5
    );
    assert.equal(
        normalizeMusicalDashboardSettings({
            autoRefreshSeconds: 0
        }).autoRefreshSeconds,
        0
    );
});

test("la file Spotify peut être relue sans cache après Suivant", () => {
    assert.match(
        spotifyApiSource,
        /getPlaybackQueue\(\{[\s\S]*fresh = false[\s\S]*skipCache: Boolean\(fresh\)/
    );
    assert.match(
        appSource,
        /refreshDrivingQueue\(\{[\s\S]*fresh = false[\s\S]*getPlaybackQueue\(\{ fresh \}\)/
    );
});
