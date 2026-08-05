import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createPendingNextPlayback,
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

test("la synchronisation rapide annonce Shuffle+ 9.9.31", () => {
    assert.equal(version, "9.9.31");
    assert.match(appSource, /const APP_VERSION = "9\.9\.31"/);
});

test("Suivant conserve le titre courant et fige la barre avant confirmation", () => {
    const pending = createPendingNextPlayback(
        currentPlayback(),
        10_000
    );

    assert.equal(pending.item.id, "track-current");
    assert.equal(pending.item.name, "Titre actuel");
    assert.equal(pending.progress_ms, 52_000);
    assert.equal(pending.is_playing, true);
    assert.equal(pending.__shuffleplusAwaitingNext, true);

    const afterOneSecond = getPlaybackClockSnapshot(
        pending,
        11_000
    );
    assert.equal(afterOneSecond.progress_ms, 52_000);
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

test("Suivant attend 700 ms puis vérifie Spotify toutes les 700 ms", () => {
    assert.match(
        appSource,
        /const NEXT_TRACK_FIRST_REFRESH_DELAY_MS = 700/
    );
    assert.match(
        appSource,
        /const NEXT_TRACK_RETRY_INTERVAL_MS = 700/
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
    assert.match(
        appSource,
        /normalizedAction !== "next"[\s\S]*window\.setTimeout\(resolve, 140\)/
    );
    assert.doesNotMatch(
        appSource,
        /scheduleNextTrackConfirmationChecks\([\s\S]{0,120}await refreshNextTrackTransition/
    );
});

test("la synchronisation automatique visible est ramenée à deux secondes", () => {
    assert.match(
        appSource,
        /const PLAYBACK_AUTO_REFRESH_MS = 2_000/
    );
    assert.match(
        appSource,
        /const DRIVING_MODE_REFRESH_MS = PLAYBACK_AUTO_REFRESH_MS/
    );
    assert.equal(
        normalizeMusicalDashboardSettings({
            autoRefreshSeconds: 20
        }).autoRefreshSeconds,
        2
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
