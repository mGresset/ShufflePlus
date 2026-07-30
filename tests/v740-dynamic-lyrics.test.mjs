import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    DEFAULT_DYNAMIC_LYRICS_SETTINGS,
    normalizeDynamicLyricsSettings,
    normalizeDynamicLyricsCommandOptions,
    buildShortcutRunUrl,
    buildDynamicLyricsLaunchUrl
} from "../core/dynamic-lyrics.js";

const appSource = await readFile("app.js", "utf8");
const cssSource = await readFile("style.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

function expectText(source, text, message) {
    assert.ok(
        source.includes(text),
        message || `Texte absent : ${text}`
    );
}

test("les réglages Dynamic Lyrics sont normalisés sans secret Spotify", () => {
    assert.deepEqual(
        normalizeDynamicLyricsSettings({
            enabled: true,
            shortcutName: "  Paroles Shuffle+  ",
            launchDelayMs: 9000,
            updatedAt: 42
        }),
        {
            enabled: true,
            shortcutName: "Paroles Shuffle+",
            launchDelayMs: 5000,
            updatedAt: 42
        }
    );

    assert.equal(
        DEFAULT_DYNAMIC_LYRICS_SETTINGS.shortcutName,
        "Shuffle+ Dynamic Lyrics"
    );
});

test("un profil choisit séparément l’ouverture de Dynamic Lyrics", () => {
    assert.deepEqual(
        normalizeDynamicLyricsCommandOptions({
            openDynamicLyrics: true,
            dynamicLyricsShortcutName: "  Paroles voiture  "
        }),
        {
            openDynamicLyrics: true,
            dynamicLyricsShortcutName: "Paroles voiture"
        }
    );
});

test("le lien compagnon utilise le schéma officiel de Raccourcis", () => {
    const url = buildShortcutRunUrl("Paroles Shuffle+");
    assert.match(url, /^shortcuts:\/\/run-shortcut\?/);
    assert.match(url, /name=Paroles\+Shuffle%2B/);

    const disabled = buildDynamicLyricsLaunchUrl(
        { openDynamicLyrics: true },
        { enabled: false, shortcutName: "Paroles" }
    );
    assert.equal(disabled, "");

    const enabled = buildDynamicLyricsLaunchUrl(
        { openDynamicLyrics: true },
        { enabled: true, shortcutName: "Paroles" }
    );
    assert.match(enabled, /^shortcuts:\/\/run-shortcut\?/);
});

test("Mix & iOS contient la configuration et l’option par profil", () => {
    expectText(appSource, 'id="dynamicLyricsSettingsForm"');
    expectText(appSource, 'name="openDynamicLyrics"');
    expectText(appSource, 'name="dynamicLyricsShortcutName"');
    expectText(appSource, 'id="testDynamicLyricsShortcutButton"');
    expectText(appSource, 'id="copyDynamicLyricsTestUrlButton"');
    expectText(appSource, 'url.searchParams.set(\n            "lyrics",');
    expectText(appSource, "scheduleDynamicLyricsLaunch(");
});

test("l’intégration reste hors du mode conduite et possède une interface mobile", () => {
    expectText(cssSource, ".dynamic-lyrics-panel");
    expectText(cssSource, ".dynamic-lyrics-actions");
    expectText(cssSource, "Shuffle+ v7.4.0 — intégration compagnon Dynamic Lyrics");
    assert.doesNotMatch(
        appSource,
        /drivingQueueButton[\s\S]{0,500}Dynamic Lyrics/
    );
});

test("les réglages Dynamic Lyrics participent à la sauvegarde et à la synchronisation", () => {
    expectText(appSource, "dynamicLyricsSettings,");
    expectText(appSource, "payload.data.dynamicLyricsSettings");
    expectText(appSource, "saveDynamicLyricsSettings();");
    expectText(appSource, "data.dynamicLyricsSettings?.updatedAt");
});

test("le Service Worker précharge le module Dynamic Lyrics", () => {
    expectText(serviceWorkerSource, "./core/dynamic-lyrics.js");
});
