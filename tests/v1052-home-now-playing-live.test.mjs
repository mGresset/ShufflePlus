import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");

test("Shuffle+ 11.0.0 place Lecture en cours en premier sur l’accueil", () => {
    assert.equal(version, "11.0.0");

    const snapshot = buildDailyHomeSnapshot({
        playback: {
            is_playing: true,
            progress_ms: 42_000,
            item: {
                type: "track",
                name: "Titre test",
                duration_ms: 180_000,
                artists: [{ name: "Artiste test" }],
                album: {
                    name: "Album test",
                    images: [{ url: "https://example.test/cover.jpg" }]
                }
            },
            device: { name: "iPhone" }
        },
        contextualSuggestion: {
            contextId: "test",
            name: "Suggestion test",
            reason: "Contexte test"
        },
        quickAccess: {
            pinnedProfiles: [{ id: "p1", name: "Profil test" }]
        },
        guidedSetup: { complete: true, progress: 100, steps: [] }
    });

    const html = renderDailyHomeMarkup(snapshot);
    const nowPlayingIndex = html.indexOf("data-home-now-playing");
    const contextualIndex = html.indexOf("v9-home-contextual");
    const quickAccessIndex = html.indexOf('aria-label="Accès immédiat"');
    const launchIndex = html.indexOf("v9-home-launch-card");

    assert.ok(nowPlayingIndex >= 0, "la lecture en cours doit être rendue");
    assert.ok(nowPlayingIndex < contextualIndex, "elle doit précéder la suggestion contextuelle");
    assert.ok(nowPlayingIndex < quickAccessIndex, "elle doit précéder l’accès immédiat");
    assert.ok(nowPlayingIndex < launchIndex, "elle doit précéder le profil principal");
});

test("le Now Playing de l’accueil actualise titre, pochette et métadonnées sans reconstruire la page", () => {
    const updaterStart = appSource.indexOf("function updateHomeNowPlayingDom()");
    const updaterEnd = appSource.indexOf("function renderMusicalDashboardPlaybackBody", updaterStart);
    const updater = appSource.slice(updaterStart, updaterEnd);

    assert.ok(updaterStart >= 0, "le rafraîchissement DOM de l’accueil doit exister");
    assert.match(updater, /data-home-now-title-heading/);
    assert.match(updater, /data-home-now-artist/);
    assert.match(updater, /data-home-now-title/);
    assert.match(updater, /data-home-now-album/);
    assert.match(updater, /data-home-now-cover/);
    assert.match(updater, /cover\.setAttribute\(\s*"src",\s*playback\.imageUrl/);
    assert.match(updater, /playback\.durationLabel/);
});

test("chaque rafraîchissement Spotify du dashboard propage le nouveau morceau à l’accueil", () => {
    const refreshStart = appSource.indexOf("async function refreshMusicalDashboardPlayback");
    const refreshEnd = appSource.indexOf("function openDashboardSection", refreshStart);
    const refreshSource = appSource.slice(refreshStart, refreshEnd);

    assert.match(refreshSource, /getCurrentPlayback\(\{ fresh \}\)/);
    assert.match(refreshSource, /updateHomeNowPlayingDom\(\)/);

    const activeSurfaceStart = appSource.indexOf("function renderActivePlaybackSurface()");
    const activeSurfaceEnd = appSource.indexOf("async function refreshNextTrackTransition", activeSurfaceStart);
    const activeSurface = appSource.slice(activeSurfaceStart, activeSurfaceEnd);
    assert.match(activeSurface, /activeAppMenu === "dashboard"[\s\S]*updateHomeNowPlayingDom\(\)/);
});
