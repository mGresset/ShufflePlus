import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

function extractFunction(name) {
    const start = appSource.indexOf(`function ${name}`);
    assert.notEqual(start, -1, `fonction ${name} absente`);
    const next = appSource.indexOf("\nfunction ", start + 10);
    return appSource.slice(start, next === -1 ? undefined : next);
}

test("la correction de défilement annonce Shuffle+ 9.9.43", () => {
    assert.equal(version, "9.9.43");
});

test("le rafraîchissement du dashboard met à jour la carte en place", () => {
    const source = extractFunction("updateMusicalDashboardPlaybackDom");
    assert.match(source, /musical-dashboard-card\.is-main/);
    assert.match(source, /updatePlaybackProgressDom\(\)/);
    assert.doesNotMatch(source, /contentElement\.innerHTML/);
    assert.doesNotMatch(source, /restoreAppMenuScrollPosition/);
});

test("le rendu actif ne reconstruit plus l’accueil à chaque état Spotify", () => {
    const source = extractFunction("renderActivePlaybackSurface");
    assert.match(source, /shouldRenderMusicalDashboardPlaybackSurface\(\)/);
    assert.match(source, /updateMusicalDashboardPlaybackDom\(\)/);
    assert.doesNotMatch(source, /displayPlaylists\(playlistsCache\)/);
});

test("le polling automatique ne reconstruit jamais l’accueil", () => {
    const start = appSource.indexOf("async function refreshMusicalDashboardPlayback");
    const end = appSource.indexOf("function openDashboardSection", start);
    const source = appSource.slice(start, end);
    assert.match(source, /if \(!updatedInPlace && !silent\)/);
    assert.doesNotMatch(source, /displayPlaylists\(playlistsCache\)/);
});
