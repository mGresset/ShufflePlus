import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");

test("Shuffle+ 11.3.0 ne lance plus Dynamic Lyrics automatiquement après un profil", () => {
    assert.equal(version, "11.3.0");
    assert.doesNotMatch(appSource, /function scheduleDynamicLyricsLaunch\s*\(/);
    assert.doesNotMatch(appSource, /scheduleDynamicLyricsLaunch\s*\(/);
    assert.match(appSource, /Afficher un bouton Dynamic Lyrics après le lancement \(manuel\)/);
    assert.match(appSource, /id="openDynamicLyricsButton"/);
});

test("Dynamic Lyrics reste ouvrable uniquement par une action volontaire", () => {
    assert.match(appSource, /function openDynamicLyricsTestShortcut\(\)/);
    assert.match(appSource, /async function resyncDynamicLyricsNow\(\)/);
    assert.match(appSource, /Resynchroniser manuellement/);
    assert.match(appSource, /Shuffle\+ ne lance plus automatiquement le raccourci Dynamic Lyrics/);
    assert.match(appSource, /automatisation iOS App\/CarPlay/);
});
