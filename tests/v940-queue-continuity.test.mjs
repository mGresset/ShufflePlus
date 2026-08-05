import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    analyzeQueueContinuity,
    formatQueueWindowDuration,
    shouldRefreshQueue
} from "../core/queue-continuity.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const homeStyleSource = await readFile("styles/feature-home.css", "utf8");
const drivingStyleSource = await readFile("styles/feature-driving.css", "utf8");

const queue = [
    {
        id: "track-a",
        uri: "spotify:track:a",
        name: "Titre A",
        artist: "Artiste Alpha",
        imageUrl: "https://example.com/a.jpg",
        durationMs: 180_000
    },
    {
        id: "track-b",
        uri: "spotify:track:b",
        name: "Titre B",
        artist: "Artiste Alpha",
        imageUrl: "https://example.com/b.jpg",
        durationMs: 240_000
    },
    {
        id: "track-a",
        uri: "spotify:track:a",
        name: "Titre A",
        artist: "Artiste Alpha",
        imageUrl: "https://example.com/a.jpg",
        durationMs: 180_000
    },
    {
        id: "track-c",
        uri: "spotify:track:c",
        name: "Titre C",
        artist: "Artiste Beta",
        imageUrl: "https://example.com/c.jpg",
        durationMs: 300_000
    }
];

test("la distribution active annonce Shuffle+ 9.9.31", () => {
    assert.equal(version, "9.9.31");
});

test("l’analyse de continuité calcule durée, doublons et artistes", () => {
    const snapshot = analyzeQueueContinuity(queue, {
        updatedAt: 1_000,
        now: 2_000
    });

    assert.equal(snapshot.totalCount, 4);
    assert.equal(snapshot.uniqueCount, 3);
    assert.equal(snapshot.uniqueArtistCount, 2);
    assert.equal(snapshot.duplicateCount, 1);
    assert.equal(snapshot.repeatedArtistCount, 2);
    assert.equal(snapshot.totalDurationMs, 900_000);
    assert.equal(snapshot.durationLabel, "15 min");
    assert.equal(snapshot.stale, false);
    assert.equal(snapshot.itemFlags[2].duplicate, true);
});

test("la fraîcheur de file évite les actualisations inutiles", () => {
    assert.equal(shouldRefreshQueue({ updatedAt: 10_000, now: 20_000 }), false);
    assert.equal(shouldRefreshQueue({ updatedAt: 10_000, now: 120_001 }), true);
    assert.equal(shouldRefreshQueue({ updatedAt: 0, now: 20_000 }), true);
    assert.equal(formatQueueWindowDuration(3_900_000), "1 h 05");
});

test("l’accueil comprend les objets de file déjà normalisés", () => {
    const now = new Date("2026-08-02T19:00:00+02:00");
    const snapshot = buildDailyHomeSnapshot({
        queue,
        queueUpdatedAt: now.getTime(),
        now,
        guidedSetup: {
            complete: true,
            progress: 100,
            steps: []
        }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.equal(snapshot.upcoming[0].artist, "Artiste Alpha");
    assert.equal(snapshot.upcoming[0].durationLabel, "3:00");
    assert.equal(snapshot.queueContinuity.totalCount, 4);
    assert.match(html, /4 titres dans la file/);
    assert.match(html, /15 min visibles/);
    assert.match(html, /Doublon/);
    assert.match(html, /Artiste Alpha/);
});

test("la v9.4 branche le diagnostic de file à l’accueil et au mode conduite", () => {
    assert.match(appSource, /analyzeQueueContinuity/);
    assert.match(appSource, /shouldRefreshQueue/);
    assert.match(appSource, /queueUpdatedAt: drivingQueueState\.updatedAt/);
    assert.match(appSource, /Doublon repéré/);
    assert.match(serviceWorkerSource, /core\/queue-continuity\.js/);
    assert.match(homeStyleSource, /\.v9-home-queue-insights/);
    assert.match(drivingStyleSource, /\.queue-continuity-badges/);
});
