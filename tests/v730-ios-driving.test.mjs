import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    normalizePreferredSpotifyDevice,
    findStoredPreferredDevice,
    selectSpotifyDevice
} from "../core/spotify-device.js";
import {
    normalizePlaybackQueue,
    formatQueueDuration
} from "../core/playback-queue.js";

const appSource = await readFile("app.js", "utf8");
const spotifyApiSource = await readFile("spotify-api.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

const devices = [
    {
        id: "speaker-1",
        name: "Salon",
        type: "Speaker",
        is_active: true,
        is_restricted: false
    },
    {
        id: "iphone-new",
        name: "iPhone",
        type: "Smartphone",
        is_active: false,
        is_restricted: false
    }
];

test("l’appareil préféré est retrouvé d’abord par device_id", () => {
    const preferred = normalizePreferredSpotifyDevice({
        id: "iphone-new",
        name: "Ancien nom",
        type: "Smartphone"
    });

    assert.equal(
        findStoredPreferredDevice(devices, preferred)?.id,
        "iphone-new"
    );
});

test("un device_id renouvelé est retrouvé par nom et type", () => {
    const preferred = normalizePreferredSpotifyDevice({
        id: "iphone-old",
        name: "iPhone",
        type: "Smartphone"
    });

    assert.equal(
        findStoredPreferredDevice(devices, preferred)?.id,
        "iphone-new"
    );
});

test("le mode préféré retombe sur le smartphone avant l’appareil actif", () => {
    assert.equal(
        selectSpotifyDevice(devices, {
            mode: "preferred",
            preferredDevice: {}
        })?.id,
        "iphone-new"
    );
});

test("la file Spotify est normalisée et limitée", () => {
    const payload = {
        currently_playing: {
            id: "current",
            uri: "spotify:track:current",
            type: "track",
            name: "En cours",
            artists: [{ name: "Artiste A" }],
            album: {
                name: "Album A",
                images: [{ url: "https://example.com/current.jpg" }]
            },
            duration_ms: 181000
        },
        queue: [
            {
                id: "next-1",
                uri: "spotify:track:next-1",
                type: "track",
                name: "Suivant 1",
                artists: [{ name: "Artiste B" }],
                album: { name: "Album B", images: [] },
                duration_ms: 200000
            },
            {
                id: "episode-1",
                uri: "spotify:episode:episode-1",
                type: "episode",
                name: "Podcast",
                show: { name: "Émission" },
                images: [],
                duration_ms: 3600000
            },
            {
                id: "ad-1",
                type: "ad",
                name: "Publicité"
            }
        ]
    };

    const queue = normalizePlaybackQueue(payload, 1);
    assert.equal(queue.current.name, "En cours");
    assert.equal(queue.queue.length, 1);
    assert.equal(queue.queue[0].name, "Suivant 1");
    assert.equal(formatQueueDuration(181000), "3:01");
});

test("la v7.3 branche la file Spotify et le bouton conduite", () => {
    assert.match(spotifyApiSource, /spotifyFetch\("\/me\/player\/queue", \{/);
    assert.match(appSource, /id="drivingQueueButton"/);
    assert.match(appSource, /function renderDrivingQueuePanel\(/);
    assert.match(appSource, /await getPlaybackQueue\(\{ fresh \}\)/);
});

test("le lancement iOS vérifie réellement l’appareil cible", () => {
    assert.match(appSource, /await transferPlayback\(deviceId, false\)/);
    assert.match(appSource, /verifyPlaybackOnDevice\(/);
    assert.match(appSource, /playback\?\.device\?\.id !== deviceId/);
    assert.match(appSource, /openDrivingMode/);
});

test("le Service Worker précharge les modules v7.3", () => {
    assert.match(serviceWorkerSource, /\.\/core\/spotify-device\.js/);
    assert.match(serviceWorkerSource, /\.\/core\/playback-queue\.js/);
});
