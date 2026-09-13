import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    BACKUP_HISTORY_KEY,
    getBackupContentSummary,
    readBackupHistory,
    removeBackupHistoryEntry,
    saveBackupHistoryEntry
} from "../core/backup-history.js";
import { renderBackupPanelMarkup } from "../core/backup-ui.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

function backup(id = 1) {
    return {
        format: "shuffleplus-backup",
        schemaVersion: 1,
        appVersion: "10.8.0",
        exportedAt: new Date(id * 1000).toISOString(),
        data: {
            savedMixes: Array.from({ length: id }, (_, index) => ({ id: `mix-${index}` })),
            favoriteSourceKeys: ["playlist:a"],
            iosCommands: [{ id: "ios-1" }],
            mixProfiles: [{ id: "profile-1" }, { id: "profile-2" }],
            recentTrackUris: []
        }
    };
}

test("Shuffle+ 10.8.0 ajoute un historique local de sauvegardes versionnées", () => {
    assert.equal(version, "10.8.0");
    assert.match(appSource, /saveBackupHistoryEntry/);
    assert.match(appSource, /createLocalBackupButton/);
    assert.match(appSource, /data-backup-history-restore/);
});

test("l’historique conserve les sauvegardes les plus récentes avec leur résumé", () => {
    const storage = memoryStorage();
    for (let index = 1; index <= 4; index += 1) {
        const result = saveBackupHistoryEntry(storage, backup(index), {
            id: `backup-${index}`,
            now: index * 1000,
            maxItems: 3
        });
        assert.equal(result.saved, true);
    }

    const history = readBackupHistory(storage);
    assert.deepEqual(history.map((entry) => entry.id), ["backup-4", "backup-3", "backup-2"]);
    assert.equal(history[0].summary.mixCount, 4);
    assert.equal(history[0].summary.shortcutCount, 1);
    assert.ok(storage.getItem(BACKUP_HISTORY_KEY));
});

test("le résumé et la suppression d’une sauvegarde restent déterministes", () => {
    const storage = memoryStorage();
    const summary = getBackupContentSummary(backup(2));
    assert.deepEqual(summary, {
        mixCount: 2,
        favoriteCount: 1,
        shortcutCount: 1,
        profileCount: 2,
        historyCount: 0
    });

    saveBackupHistoryEntry(storage, backup(2), { id: "keep", now: 2000 });
    saveBackupHistoryEntry(storage, backup(1), { id: "remove", now: 3000 });
    assert.equal(removeBackupHistoryEntry(storage, "remove"), true);
    assert.deepEqual(readBackupHistory(storage).map((entry) => entry.id), ["keep"]);
});

test("le panneau Réglages affiche aperçu, restauration, téléchargement et limite locale", () => {
    const markup = renderBackupPanelMarkup({
        backupHistoryLimit: 6,
        backupHistory: [{
            id: "local-1",
            label: "Sauvegarde manuelle",
            appVersion: "10.8.0",
            createdAt: Date.now(),
            summary: getBackupContentSummary(backup(2))
        }]
    });

    assert.match(markup, /Sauvegardes sur cet appareil/);
    assert.match(markup, /2 mix/);
    assert.match(markup, /1 raccourci/);
    assert.match(markup, /data-backup-history-download="local-1"/);
    assert.match(markup, /data-backup-history-restore="local-1"/);
    assert.match(markup, /1\/6/);
    assert.match(appSource, /reason: "pre-update"/);
    assert.match(appSource, /reason: "before-import"/);
    assert.match(appSource, /reason: "before-restore"/);
});
