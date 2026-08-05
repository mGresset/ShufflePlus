import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

function extractFunction(name) {
    const start = appSource.indexOf(`function ${name}`);
    assert.notEqual(start, -1, `fonction ${name} absente`);
    const next = appSource.indexOf("\nfunction ", start + 10);
    const nextAsync = appSource.indexOf("\nasync function ", start + 10);
    const candidates = [next, nextAsync].filter((value) => value !== -1);
    const end = candidates.length ? Math.min(...candidates) : appSource.length;
    return appSource.slice(start, end);
}

test("la correction de défilement rapide annonce Shuffle+ 9.9.43", () => {
    assert.equal(version, "9.9.43");
});

test("la position en mémoire suit immédiatement chaque événement de scroll", () => {
    const source = extractFunction("scheduleAppMenuScrollSave");
    const rememberIndex = source.indexOf("rememberCurrentAppMenuScroll()");
    const timeoutIndex = source.indexOf("window.setTimeout");
    assert.ok(rememberIndex !== -1);
    assert.ok(timeoutIndex !== -1);
    assert.ok(rememberIndex < timeoutIndex);
    assert.doesNotMatch(
        source.slice(timeoutIndex),
        /rememberCurrentAppMenuScroll\(\)/
    );
});

test("le polling silencieux ne reconstruit jamais l'accueil", () => {
    const start = appSource.indexOf("async function refreshMusicalDashboardPlayback");
    const end = appSource.indexOf("function openDashboardSection", start);
    const source = appSource.slice(start, end);
    assert.match(source, /shouldRenderMusicalDashboardPlaybackSurface\(\)/);
    assert.match(source, /if \(!updatedInPlace && !silent\)/);
    assert.doesNotMatch(source, /displayPlaylists\(playlistsCache\)/);
});

test("le mode Essentiel n'attend aucune carte détaillée Spotify", () => {
    const source = extractFunction("shouldRenderMusicalDashboardPlaybackSurface");
    assert.match(source, /isExpertExperience\(experienceMode\)/);
    assert.match(source, /musicalDashboardSettings\.showNowPlaying/);
});

test("un rerendu explicite de la même page conserve le scroll vivant", () => {
    const start = appSource.indexOf("function displayPlaylists(playlists)");
    const end = appSource.indexOf("\nfunction getTrackStableKey", start);
    const source = appSource.slice(start, end);
    assert.match(source, /activePageBeforeRender/);
    assert.match(source, /liveScrollBeforeRender/);
    assert.match(source, /restoreExactWindowScrollPosition\(\s*liveScrollBeforeRender/);
});
