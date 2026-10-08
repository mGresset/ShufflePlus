import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getNextPlayerRepeatState,
    getPlayerRepeatLabel,
    normalizePlayerSeekPosition,
    normalizePlayerVolume
} from "../core/player-plus.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const apiSource = await readFile("spotify-api.js", "utf8");
const appSource = await readFile("app.js", "utf8");
const homeStyles = await readFile("styles/feature-home.css", "utf8");

function makePlayback() {
    return {
        is_playing: true,
        progress_ms: 65_000,
        repeat_state: "context",
        device: {
            id: "iphone-player-plus",
            name: "iPhone",
            type: "Smartphone",
            volume_percent: 37
        },
        item: {
            type: "track",
            uri: "spotify:track:test",
            name: "Player+ Test",
            duration_ms: 240_000,
            artists: [{ name: "Shuffle+" }],
            album: { name: "V11.5", images: [] }
        }
    };
}

test("Player+ normalise volume, seek et cycle de répétition", () => {
    assert.equal(normalizePlayerVolume(-10), 0);
    assert.equal(normalizePlayerVolume(44.6), 45);
    assert.equal(normalizePlayerVolume(180), 100);
    assert.equal(normalizePlayerSeekPosition(300_000, 240_000), 240_000);
    assert.equal(normalizePlayerSeekPosition(-1, 240_000), 0);
    assert.equal(getNextPlayerRepeatState("off"), "context");
    assert.equal(getNextPlayerRepeatState("context"), "track");
    assert.equal(getNextPlayerRepeatState("track"), "off");
    assert.equal(getPlayerRepeatLabel("track"), "Titre");
});

test("l’accueil expose les commandes Player+ et l’état réel du volume", () => {
    const snapshot = buildDailyHomeSnapshot({ playback: makePlayback() });
    const html = renderDailyHomeMarkup(snapshot);

    assert.equal(snapshot.playback.progressMs, 65_000);
    assert.equal(snapshot.playback.durationMs, 240_000);
    assert.equal(snapshot.playback.volumePercent, 37);
    assert.equal(
        buildDailyHomeSnapshot({
            playback: {
                ...makePlayback(),
                device: { id: "silent-volume", volume_percent: null }
            }
        }).playback.volumePercent,
        null
    );
    assert.match(html, /data-dashboard-playback="previous"/);
    assert.match(html, /data-home-seek/);
    assert.match(html, /data-dashboard-playback="repeat"/);
    assert.match(html, /data-home-volume/);
    assert.match(html, />37%<\/b>/);
});

test("Spotify API contient les cinq commandes Player+ officielles", () => {
    assert.match(apiSource, /export async function skipToPrevious/);
    assert.match(apiSource, /\/me\/player\/previous/);
    assert.match(apiSource, /export async function seekPlayback/);
    assert.match(apiSource, /\/me\/player\/seek\?/);
    assert.match(apiSource, /export async function setPlaybackRepeat/);
    assert.match(apiSource, /\/me\/player\/repeat\?/);
    assert.match(apiSource, /export async function setPlaybackVolume/);
    assert.match(apiSource, /\/me\/player\/volume\?/);
    assert.match(apiSource, /export async function addToPlaybackQueue/);
    assert.match(apiSource, /\/me\/player\/queue\?/);
});

test("l’app relie les nouvelles commandes au runtime et à Lire ensuite", () => {
    assert.match(appSource, /normalizedAction === "previous"/);
    assert.match(appSource, /normalizedAction === "repeat"/);
    assert.match(appSource, /async function runPlayerPlusSeek/);
    assert.match(appSource, /async function runPlayerPlusVolume/);
    assert.match(appSource, /async function queueTrackNextAt/);
    assert.match(appSource, /data-track-action="queue-next"/);
    assert.match(appSource, /await addToPlaybackQueue\(track\.uri, deviceId\)/);
});

test("les styles Player+ restent responsifs sur mobile", () => {
    assert.match(homeStyles, /Shuffle\+ v11\.9\.0 — Player\+/);
    assert.match(homeStyles, /\.v115-home-player-plus/);
    assert.match(homeStyles, /\.v115-home-volume/);
    assert.match(homeStyles, /@media \(max-width: 620px\)/);
});
