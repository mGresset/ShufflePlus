import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    analyzeShuffleOrder,
    createSeededRandom,
    normalizeShuffleSeed,
    smartShuffleTracks,
    smartShuffleTracksDetailed
} from "../shuffle-engine.js";

globalThis.localStorage = {
    getItem() {
        return null;
    },
    setItem() {}
};

function createTrack(index, artistIndex = index % 5) {
    return {
        id: `track-${index}`,
        uri: `spotify:track:${index}`,
        name: `Titre ${index}`,
        popularity: 25 + ((index * 13) % 70),
        duration_ms: 150000 + ((index * 19000) % 210000),
        artists: [
            {
                id: `artist-${artistIndex}`,
                name: `Artiste ${artistIndex}`
            }
        ],
        album: {
            id: `album-${Math.floor(index / 2)}`,
            name: `Album ${Math.floor(index / 2)}`
        }
    };
}

const tracks = Array.from(
    { length: 24 },
    (_, index) => createTrack(index)
);

const options = {
    artistGap: 3,
    albumGap: 2,
    trackGap: 10,
    intensitySettings: {
        curve: "rising",
        startIntensity: 30,
        endIntensity: 80,
        strength: "normal"
    },
    coherenceSettings: {
        level: "balanced",
        durationJumpSeconds: 150
    }
};

test("une même graine reproduit exactement le même mélange", () => {
    const first = smartShuffleTracksDetailed(tracks, {
        ...options,
        seed: "route-2026"
    });
    const second = smartShuffleTracksDetailed(tracks, {
        ...options,
        seed: "route-2026",
        recentTrackUris: first.recentTrackUris
    });

    assert.deepEqual(
        first.tracks.map((track) => track.uri),
        second.tracks.map((track) => track.uri)
    );
    assert.deepEqual(
        first.placements.map((item) => item.reasons),
        second.placements.map((item) => item.reasons)
    );
});

test("des graines différentes peuvent produire des ordres différents", () => {
    const first = smartShuffleTracksDetailed(tracks, {
        ...options,
        seed: "graine-a"
    });
    const second = smartShuffleTracksDetailed(tracks, {
        ...options,
        seed: "graine-b"
    });

    assert.notDeepEqual(
        first.tracks.map((track) => track.uri),
        second.tracks.map((track) => track.uri)
    );
});

test("le rapport explicable compare l’avant et l’après", () => {
    const report = smartShuffleTracksDetailed(tracks, {
        ...options,
        seed: "rapport"
    });

    assert.equal(report.tracks.length, tracks.length);
    assert.equal(report.placements.length, tracks.length);
    assert.equal(typeof report.beforeScore, "number");
    assert.equal(typeof report.afterScore, "number");
    assert.equal(
        report.improvement,
        report.afterScore - report.beforeScore
    );
    assert.ok(
        report.placements.every(
            (placement) => placement.reasons.length > 0
        )
    );
    assert.deepEqual(
        analyzeShuffleOrder(report.tracks, options),
        report.after
    );
});

test("les contraintes impossibles sont relâchées et signalées", () => {
    const singleArtistTracks = Array.from(
        { length: 8 },
        (_, index) => createTrack(index, 1)
    );
    const report = smartShuffleTracksDetailed(
        singleArtistTracks,
        {
            ...options,
            artistGap: 4,
            seed: "un-seul-artiste"
        }
    );

    assert.ok(report.relaxations.length > 0);
    assert.ok(
        report.placements.some(
            (placement) => placement.relaxation !== "strict"
        )
    );
});

test("l’API historique smartShuffleTracks reste compatible", () => {
    const sourceUris = tracks.map((track) => track.uri);
    const result = smartShuffleTracks(tracks, {
        ...options,
        seed: "compatibilite"
    });

    assert.equal(result.length, tracks.length);
    assert.deepEqual(
        [...result.map((track) => track.uri)].sort(),
        [...sourceUris].sort()
    );
    assert.deepEqual(
        tracks.map((track) => track.uri),
        sourceUris
    );
});

test("le générateur pseudo-aléatoire est stable", () => {
    const first = createSeededRandom("stable");
    const second = createSeededRandom("stable");

    assert.deepEqual(
        Array.from({ length: 5 }, () => first()),
        Array.from({ length: 5 }, () => second())
    );
    assert.equal(normalizeShuffleSeed(" Ma graine ! "), "Magraine");
});

test("l’interface v7.7 expose le rapport et la graine", async () => {
    const [appSource, styleSource] = await Promise.all([
        readFile("app.js", "utf8"),
        readFile("style.css", "utf8")
    ]);

    assert.match(appSource, /smartShuffleTracksDetailed/);
    assert.match(appSource, /Pourquoi cet ordre \?/);
    assert.match(appSource, /replayShuffleSeedButton/);
    assert.match(appSource, /Pourquoi ici \?/);
    assert.match(styleSource, /shuffle-explainability-report/);
});
