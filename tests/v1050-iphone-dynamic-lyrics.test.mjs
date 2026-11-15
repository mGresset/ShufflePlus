import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildIosShortcutAssistantGuide,
    getIosShortcutAssistantState
} from "../core/ios-shortcut-assistant.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const styleSource = await readFile("style.css", "utf8");

test("Shuffle+ 12.0.1 conserve l’assistant iPhone sans dépendre de Dynamic Lyrics", () => {
    assert.equal(version, "12.0.1");
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

test("aucun Auto-Sync Dynamic Lyrics ne tourne après la v12.0.1", () => {
    assert.doesNotMatch(appSource, /autoSyncOnTrackChange/);
    assert.doesNotMatch(appSource, /pollDynamicLyricsTrackChange/);
    assert.doesNotMatch(appSource, /observeDynamicLyricsPlayback/);
    assert.doesNotMatch(workerSource, /\.\/core\/dynamic-lyrics-sync\.js/);
    assert.match(workerSource, /\.\/core\/ios-shortcut-assistant\.js/);
});
