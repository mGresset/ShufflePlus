import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");

test("Shuffle+ 12.0.1 retire complètement les ouvertures Dynamic Lyrics", () => {
    assert.equal(version, "12.0.1");
    assert.doesNotMatch(appSource, /openDynamicLyricsTestShortcut/);
    assert.doesNotMatch(appSource, /resyncDynamicLyricsNow/);
    assert.doesNotMatch(appSource, /buildDynamicLyricsLaunchUrl/);
    assert.doesNotMatch(appSource, /openDynamicLyricsButton/);
});

test("la compatibilité legacy ne réactive jamais la fonctionnalité", () => {
    assert.match(appSource, /normalizeLegacyDynamicLyricsCommandOptions/);
    assert.doesNotMatch(appSource, /url\.searchParams\.set\(\s*"lyrics"/);
    assert.doesNotMatch(appSource, /Dynamic Lyrics proposé manuellement après lancement/);
});
