import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

const visibleMarkers = [
    'id="dynamicLyricsSettingsForm"',
    'id="testDynamicLyricsShortcutButton"',
    'id="copyDynamicLyricsTestUrlButton"',
    'id="resyncDynamicLyricsButton"',
    'id="openDynamicLyricsButton"',
    'data-home-open-dynamic-lyrics',
    'id="drivingDynamicLyricsButton"',
    'name="openDynamicLyrics"',
    'name="dynamicLyricsShortcutName"'
];

test("Dynamic Lyrics n’est plus exposé dans l’interface Shuffle+", () => {
    for (const marker of visibleMarkers) {
        assert.ok(!appSource.includes(marker), `marqueur UI encore actif : ${marker}`);
    }
});

test("Dynamic Lyrics n’est plus chargé ni exécuté par le runtime", () => {
    assert.doesNotMatch(appSource, /from "\.\/core\/dynamic-lyrics\.js"/);
    assert.doesNotMatch(appSource, /from "\.\/core\/dynamic-lyrics-sync\.js"/);
    assert.doesNotMatch(appSource, /observeDynamicLyricsPlayback\s*\(/);
    assert.doesNotMatch(appSource, /startDynamicLyricsAutoSyncMonitor\s*\(/);
    assert.doesNotMatch(appSource, /getDynamicLyricsLaunchContext\s*\(/);
    assert.doesNotMatch(workerSource, /\.\/core\/dynamic-lyrics(?:-sync)?\.js/);
});

test("les anciens champs Dynamic Lyrics restent tolérés pour compatibilité", () => {
    assert.match(appSource, /function normalizeLegacyDynamicLyricsCommandOptions\(/);
    assert.match(appSource, /hasOwnProperty\.call\(command, "openDynamicLyrics"\)/);
    assert.match(appSource, /hasOwnProperty\.call\(command, "dynamicLyricsShortcutName"\)/);
    assert.match(appSource, /params\.get\("lyrics"\) === "1"/);
    assert.match(appSource, /params\.get\("lyricsShortcut"\) \|\| ""/);
});

test("les nouvelles URL de profils ne réémettent plus les paramètres Dynamic Lyrics", () => {
    const buildStart = appSource.indexOf("function buildIosCommandUrl(");
    const buildEnd = appSource.indexOf("function buildUniversalLaunchUrl(", buildStart);
    const buildSource = appSource.slice(buildStart, buildEnd);
    assert.doesNotMatch(buildSource, /searchParams\.set\(\s*"lyrics"/);
    assert.doesNotMatch(buildSource, /lyricsShortcut/);
});
