import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup,
    renderHomeNowPlayingUpcomingMarkup
} from "../core/daily-home.js";
import {
    DEFAULT_HOME_LAYOUT,
    moveHomeLayoutBlock
} from "../core/home-layout.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const homeStyles = await readFile("styles/feature-home.css", "utf8");

function makePlayback() {
    return {
        is_playing: true,
        progress_ms: 61_000,
        shuffle_state: true,
        repeat_state: "context",
        device: {
            id: "iphone-test",
            name: "iPhone",
            type: "Smartphone",
            is_active: true
        },
        item: {
            type: "track",
            name: "Titre V11.1",
            duration_ms: 210_000,
            artists: [{ name: "Artiste test" }],
            album: {
                name: "Album test",
                images: [{ url: "https://example.test/cover.jpg" }]
            }
        }
    };
}

test("Shuffle+ 11.7.0 enrichit la lecture en cours avec l’état Spotify", () => {
    assert.equal(version, "11.7.0");
    const snapshot = buildDailyHomeSnapshot({
        playback: makePlayback(),
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });

    assert.equal(snapshot.playback.deviceName, "iPhone");
    assert.equal(snapshot.playback.deviceType, "Smartphone");
    assert.equal(snapshot.playback.deviceActive, true);
    assert.equal(snapshot.playback.shuffleActive, true);
    assert.equal(snapshot.playback.repeatMode, "context");
    assert.equal(snapshot.playback.repeatLabel, "Contexte");
});

test("la carte Lecture en cours V2 affiche appareil, shuffle, répétition et Dynamic Lyrics manuel", () => {
    const snapshot = buildDailyHomeSnapshot({
        playback: makePlayback(),
        dynamicLyricsEnabled: true,
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.match(html, /v111-home-now-playing/);
    assert.match(html, /data-home-now-device-name/);
    assert.match(html, /Aléatoire ON/);
    assert.match(html, /Répétition Contexte/);
    assert.match(html, /data-home-open-dynamic-lyrics/);
    assert.ok(
        html.indexOf("data-home-now-playing") < html.indexOf("v98-home-blocks"),
        "Lecture en cours doit rester prioritaire"
    );
});

test("l’aperçu Lecture en cours limite les prochains titres à trois", () => {
    const snapshot = buildDailyHomeSnapshot({
        playback: makePlayback(),
        queue: [1, 2, 3, 4].map((id) => ({
            id: String(id),
            name: `Titre ${id}`,
            artist: `Artiste ${id}`
        })),
        homeLayout: { ...DEFAULT_HOME_LAYOUT, queuePreviewCount: 5 }
    });
    const preview = renderHomeNowPlayingUpcomingMarkup(snapshot);

    assert.match(preview, /Titre 1/);
    assert.match(preview, /Titre 2/);
    assert.match(preview, /Titre 3/);
    assert.doesNotMatch(preview, /Titre 4/);
});

test("l’ordre personnalisé peut déplacer les blocs sans toucher aux autres réglages", () => {
    const initial = {
        ...DEFAULT_HOME_LAYOUT,
        density: "compact",
        showQueue: false
    };
    const moved = moveHomeLayoutBlock(initial, "main", "up");

    assert.deepEqual(moved.order.slice(0, 2), ["main", "quickAccess"]);
    assert.equal(moved.density, "compact");
    assert.equal(moved.showQueue, false);
});

test("le personnalisateur propose des contrôles monter/descendre et garde Lecture en cours prioritaire", () => {
    const snapshot = buildDailyHomeSnapshot({
        playback: makePlayback(),
        homeLayout: {
            ...DEFAULT_HOME_LAYOUT,
            order: ["main", "quickAccess", "queue", "shortcuts"]
        },
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });
    const html = renderDailyHomeMarkup(snapshot);

    assert.match(html, /value="custom"/);
    assert.match(html, /v111-home-order-pinned/);
    assert.match(html, /Toujours en premier/);
    assert.match(html, /data-home-move-block="main"/);
    assert.match(html, /data-home-move-direction="up"/);
    assert.match(appSource, /function moveHomeLayoutSettings\(/);
});

test("les métadonnées V11.1 se mettent à jour en place sans reconstruire l’accueil", () => {
    const start = appSource.indexOf("function updateHomeNowPlayingDom()");
    const end = appSource.indexOf("function renderMusicalDashboardPlaybackBody", start);
    const updater = appSource.slice(start, end);

    assert.match(updater, /data-home-now-device-name/);
    assert.match(updater, /data-home-shuffle-state/);
    assert.match(updater, /data-home-repeat-state/);
    assert.match(updater, /updateHomeUpcomingPreviewDom\(\)/);
    assert.match(appSource, /data-home-open-dynamic-lyrics/);
    assert.match(homeStyles, /Shuffle\+ v11\.7\.0 — Accueil & Lecture en cours V2/);
});
