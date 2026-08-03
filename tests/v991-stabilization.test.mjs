import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { getAppSectionGroup } from "../core/app-menu.js";
import {
    buildDailyHomeSnapshot,
    renderDailyHomeMarkup
} from "../core/daily-home.js";

const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("la stabilisation active annonce Shuffle+ 9.9.16", () => {
    assert.equal(version, "9.9.16");
    assert.match(appSource, /const APP_VERSION = "9\.9\.16"/);
});

test("Réglages affiche directement le guide sans bouton Voir plus", () => {
    const section = getAppSectionGroup("settings", {
        expertMode: true
    });

    assert.deepEqual(
        section.featured.map(([id]) => id),
        ["settings", "guide"]
    );
    assert.deepEqual(section.more, []);
});

test("le bouton de lecture affiche Lecture lorsque Spotify est en pause", () => {
    const snapshot = buildDailyHomeSnapshot({
        playback: {
            is_playing: false,
            progress_ms: 10_000,
            item: {
                id: "track-1",
                name: "Titre test",
                duration_ms: 180_000,
                artists: [{ name: "Artiste test" }],
                album: { name: "Album test", images: [] }
            },
            device: { name: "iPhone" }
        }
    });
    const markup = renderDailyHomeMarkup(snapshot);

    assert.match(markup, /▶ Lecture/);
    assert.doesNotMatch(markup, /▶ Reprendre/);
});

test("la commande pause conserve immédiatement l’état attendu", () => {
    assert.match(appSource, /let expectedPlayingState = null/);
    assert.match(appSource, /expectedPlayingState = false/);
    assert.match(appSource, /expectedPlayingState = true/);
    assert.match(appSource, /drivingPlaybackState =\s*quickPlaybackState/);
});

test("les réponses Railway invalides produisent une erreur lisible", () => {
    assert.match(appSource, /const responseText = await response\.text\(\)/);
    assert.match(appSource, /SERVER_INVALID_JSON/);
    assert.match(appSource, /Réponse serveur invalide/);
    assert.doesNotMatch(
        appSource,
        /if \(contentType\.includes\("application\/json"\)\) \{\s*data = await response\.json\(\)/
    );
});

test("le constructeur multi-sources utilise bien la page Musique", () => {
    assert.match(
        designSource,
        /data-app-menu-page="music"\] \.mix-builder/
    );
    assert.doesNotMatch(
        designSource,
        /data-app-menu-page="library"/
    );
    assert.match(
        designSource,
        /\.mix-builder[\s\S]*var\(--accent-rgb\)/
    );
});

test("le nettoyage intelligent aligne le niveau puis quatre options", () => {
    assert.match(
        designSource,
        /\.cleanup-field \{[\s\S]*grid-column: 1 \/ -1[\s\S]*grid-template-columns/
    );
    assert.match(
        designSource,
        /\.cleanup-check \{[\s\S]*min-height: 72px/
    );
    assert.match(
        designSource,
        /\.cleanup-check input \{[\s\S]*accent-color: var\(--accent\)/
    );
});
