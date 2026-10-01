import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildShortcutProfilePreview,
    moveShortcutProfileOrder,
    normalizeShortcutProfileOrder,
    sortShortcutProfiles
} from "../core/shortcut-profiles.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const styles = await readFile("style.css", "utf8");

const commands = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" }
];

test("Shuffle+ 11.2.0 conserve un ordre de profils complet et sans doublon", () => {
    assert.equal(version, "11.2.0");
    assert.deepEqual(
        normalizeShortcutProfileOrder(["c", "c", "inconnu"], commands),
        ["c", "a", "b"]
    );
});

test("les favoris sont rendus avant les autres profils sans perdre l’ordre", () => {
    const sorted = sortShortcutProfiles(commands, {
        order: ["c", "b", "a"],
        pinnedIds: ["b"]
    });
    assert.deepEqual(sorted.map((item) => item.id), ["b", "c", "a"]);
});

test("un profil peut être déplacé explicitement", () => {
    assert.deepEqual(
        moveShortcutProfileOrder(["a", "b", "c"], commands, "b", "up"),
        ["b", "a", "c"]
    );
    assert.deepEqual(
        moveShortcutProfileOrder(["a", "b", "c"], commands, "b", "down"),
        ["a", "c", "b"]
    );
});

test("l’aperçu rappelle que Dynamic Lyrics est manuel", () => {
    const preview = buildShortcutProfilePreview({
        shuffle: true,
        startFromBeginning: false,
        openDrivingMode: true,
        openDynamicLyrics: true
    }, {
        sourceLabel: "Ma playlist",
        deviceLabel: "iPhone"
    });
    assert.equal(preview.sourceLabel, "Ma playlist");
    assert.match(preview.dynamicLyricsLabel, /manuellement/);
});

test("le Centre de lancement expose favoris, ordre et aperçu avant lancement", () => {
    assert.match(appSource, /launch-center-favorites/);
    assert.match(appSource, /data-ios-command-action="move-up"/);
    assert.match(appSource, /data-ios-command-action="move-down"/);
    assert.match(appSource, /Aperçu avant lancement/);
    assert.match(appSource, /getOrderedShortcutProfiles/);
    assert.match(styles, /Shuffle\+ v11\.2\.0 — Profils & lancements simplifiés/);
});
