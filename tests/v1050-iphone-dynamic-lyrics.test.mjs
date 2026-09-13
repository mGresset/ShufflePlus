import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildIosShortcutAssistantGuide,
    getIosShortcutAssistantState
} from "../core/ios-shortcut-assistant.js";
import {
    buildDynamicLyricsTrackInput,
    evaluateDynamicLyricsTrackChange,
    getPlaybackTrackKey
} from "../core/dynamic-lyrics-sync.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const styleSource = await readFile("style.css", "utf8");

function playback(id = "track-a") {
    return {
        item: {
            id,
            uri: `spotify:track:${id}`,
            type: "track",
            name: id === "track-a" ? "Premier titre" : "Titre suivant",
            artists: [{ name: "Artiste test" }],
            album: { name: "Album test" }
        }
    };
}

test("Shuffle+ 10.8.0 ajoute l’assistant iPhone simplifié", () => {
    assert.equal(version, "10.8.0");
    const guide = buildIosShortcutAssistantGuide({
        commandName: "Moto",
        launchUrl: "https://example.test/?action=quickplay",
        resultUrl: "https://server.test/v1/launch-results/[RequestId]?token=[ResultToken]"
    });
    assert.match(guide, /RequestId/);
    assert.match(guide, /ResultToken/);
    assert.match(guide, /Attendre 2 secondes/);
    assert.match(guide, /Répéter 30 fois/);

    assert.equal(
        getIosShortcutAssistantState({
            commandName: "Moto",
            launchUrl: "https://example.test/",
            resultUrl: "https://server.test/result",
            successfulRuns: 1
        }).label,
        "Validé sur iPhone"
    );
    assert.match(appSource, /renderIosShortcutAssistantMarkup/);
    assert.match(appSource, /data-ios-assistant-action/);
    assert.match(styleSource, /\.ios-shortcut-assistant-panel/);
});

test("Dynamic Lyrics détecte un vrai changement de titre sans se déclencher au premier échantillon", () => {
    const first = evaluateDynamicLyricsTrackChange({
        playback: playback("track-a"),
        previousTrackKey: "",
        enabled: true,
        autoSyncOnTrackChange: true,
        visible: true
    });
    assert.equal(first.shouldSync, false);
    assert.equal(first.initializeOnly, true);
    assert.equal(first.nextTrackKey, "id:track-a");

    const changed = evaluateDynamicLyricsTrackChange({
        playback: playback("track-b"),
        previousTrackKey: first.nextTrackKey,
        enabled: true,
        autoSyncOnTrackChange: true,
        visible: true
    });
    assert.equal(changed.changed, true);
    assert.equal(changed.shouldSync, true);
    assert.equal(getPlaybackTrackKey(playback("track-b")), "id:track-b");
    assert.match(buildDynamicLyricsTrackInput(playback("track-b")), /Titre suivant/);
});

test("Dynamic Lyrics Auto-Sync reste opt-in et suspend son polling quand la PWA est masquée", () => {
    assert.match(appSource, /name="autoSyncOnTrackChange"/);
    assert.match(appSource, /name="autoSyncIntervalMs"/);
    assert.match(appSource, /id="resyncDynamicLyricsButton"/);
    assert.match(appSource, /stopDynamicLyricsAutoSyncMonitor\(\)/);
    assert.match(appSource, /document\.visibilityState !== "visible"/);
    assert.match(appSource, /observeDynamicLyricsPlayback\(/);
    assert.match(workerSource, /\.\/core\/dynamic-lyrics-sync\.js/);
    assert.match(workerSource, /\.\/core\/ios-shortcut-assistant\.js/);
});
