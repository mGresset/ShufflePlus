import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");

test("Shuffle+ 10.7.0 ne relance plus Raccourcis automatiquement à chaque morceau", () => {
    assert.equal(version, "10.7.0");
    const observeStart = appSource.indexOf("async function observeDynamicLyricsPlayback");
    const resyncStart = appSource.indexOf("async function resyncDynamicLyricsNow");
    const observeSource = appSource.slice(observeStart, resyncStart);
    const autoGuard = observeSource.indexOf("if (!force)");
    const shortcutBuild = observeSource.indexOf("buildShortcutRunUrl(");
    const externalOpen = observeSource.indexOf("window.location.href = url");
    assert.ok(autoGuard >= 0, "le garde auto iOS doit exister");
    assert.ok(shortcutBuild > autoGuard, "le raccourci ne doit être construit qu’après le garde manuel");
    assert.ok(externalOpen > autoGuard, "l’ouverture externe doit rester réservée au chemin manuel");
    assert.match(observeSource, /synchronisation native Spotify/);
});

test("l’interface explique la surveillance sans ouverture automatique de Raccourcis", () => {
    assert.match(appSource, /Surveiller les changements de titre \(sans ouvrir Raccourcis\)/);
    assert.match(appSource, /iOS demanderait une confirmation à chaque fois/);
    assert.match(appSource, /Resynchroniser manuellement/);
});
