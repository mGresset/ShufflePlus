import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildShortcutLaunchSuffixTemplate,
    buildShortcutMigrationGuide,
    buildShortcutResultUrlTemplate,
    getShortcutCompatibilityState,
    inspectLegacyShortcutUrl
} from "../core/shortcut-migration.js";
import {
    getPreUpdateSnapshotSummary,
    readPreUpdateSnapshot,
    savePreUpdateSnapshot
} from "../core/update-safety.js";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

test("Shuffle+ 10.1.4 détecte les raccourcis legacy sans ResultToken", () => {
    assert.equal(version, "10.1.4");
    const result = inspectLegacyShortcutUrl(
        "https://example.test/?action=quickplay&resultServer=https%3A%2F%2Frailway.test&requestId=abc12345"
    );
    assert.equal(result.valid, true);
    assert.equal(result.legacy, true);
    assert.equal(result.compatible, false);
    assert.deepEqual(result.missing, ["resultToken"]);
});

test("le modèle V10.1 fournit les deux variables magiques et l’URL Railway sécurisée", () => {
    assert.equal(
        buildShortcutLaunchSuffixTemplate(),
        "&requestId=[RequestId]&resultToken=[ResultToken]"
    );
    assert.equal(
        buildShortcutResultUrlTemplate("https://shuffleplus-production.up.railway.app/"),
        "https://shuffleplus-production.up.railway.app/v1/launch-results/[RequestId]?token=[ResultToken]"
    );
    const guide = buildShortcutMigrationGuide({
        launchUrl: "https://shuffle.test/?action=quickplay",
        serverUrl: "https://shuffleplus-production.up.railway.app"
    });
    assert.match(guide, /Générer un UUID/);
    assert.match(guide, /ResultToken/);
    assert.match(guide, /pas X-Callback/);
});

test("le diagnostic iOS distingue configuration, test et succès", () => {
    assert.equal(getShortcutCompatibilityState({}).level, "neutral");
    assert.equal(getShortcutCompatibilityState({ commandCount: 1 }).level, "attention");
    assert.equal(getShortcutCompatibilityState({
        commandCount: 1,
        serverUrl: "https://railway.test"
    }).value, "Prêt à tester");
    assert.equal(getShortcutCompatibilityState({
        commandCount: 1,
        serverUrl: "https://railway.test",
        successfulRuns: 2
    }).level, "healthy");
});

test("une sauvegarde locale est créée avant une mise à jour PWA et reste relisible", () => {
    const storage = memoryStorage();
    const backup = {
        format: "shuffleplus-backup",
        schemaVersion: 1,
        data: { iosCommands: [{ id: "car" }] }
    };
    const saved = savePreUpdateSnapshot(storage, backup, {
        fromVersion: "10.0.1",
        toVersion: "10.1.4",
        now: 1234
    });
    assert.equal(saved.saved, true);
    const snapshot = readPreUpdateSnapshot(storage);
    assert.equal(snapshot.fromVersion, "10.0.1");
    assert.equal(snapshot.toVersion, "10.1.4");
    assert.equal(snapshot.backup.data.iosCommands[0].id, "car");
    assert.equal(getPreUpdateSnapshotSummary(snapshot).available, true);
});

test("l’interface V10.1 expose la migration iOS, le diagnostic et la sauvegarde de mise à jour", () => {
    assert.match(appSource, /renderShortcutMigrationPanelMarkup/);
    assert.match(appSource, /data-ios-migration-action/);
    assert.match(appSource, /savePreUpdateSnapshot\(/);
    assert.match(appSource, /renderBackupPanelMarkup/);
    assert.match(styleSource, /\.ios-shortcut-migration-panel/);
    assert.match(styleSource, /\.preupdate-backup/);
    assert.match(workerSource, /core\/shortcut-migration\.js/);
    assert.match(workerSource, /core\/update-safety\.js/);
    assert.match(workerSource, /core\/backup-ui\.js/);
});
