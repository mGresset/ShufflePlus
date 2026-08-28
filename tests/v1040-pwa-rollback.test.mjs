import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    PWA_UPDATE_TRANSACTION_KEY,
    beginPwaUpdateTransaction,
    clearPwaUpdateTransaction,
    readPwaUpdateTransaction
} from "../core/pwa-update.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const indexSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
const workerSource = await readFile(new URL("../service-worker.js", import.meta.url), "utf8");
const bootstrapSource = await readFile(new URL("../bootstrap-10.4.0.js", import.meta.url), "utf8");
const guardSource = await readFile(new URL("../update-guard.js", import.meta.url), "utf8");
const recoverySource = await readFile(new URL("../startup-recovery-10.4.0.js", import.meta.url), "utf8");

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
}

test("Shuffle+ 10.4.0 crée une transaction avant activation PWA", () => {
    assert.equal(version, "10.4.0");
    const storage = memoryStorage();
    const transaction = beginPwaUpdateTransaction(storage, {
        fromVersion: "10.3.0",
        toVersion: "10.4.0",
        now: 1234
    });

    assert.equal(transaction.status, "activating");
    assert.equal(transaction.fromBuild, "10.3.0-pwa-reset-1");
    assert.equal(transaction.toBuild, "10.4.0-pwa-reset-1");
    assert.equal(readPwaUpdateTransaction(storage).toVersion, "10.4.0");
    assert.ok(storage.getItem(PWA_UPDATE_TRANSACTION_KEY));
    assert.equal(clearPwaUpdateTransaction(storage), true);
    assert.equal(readPwaUpdateTransaction(storage), null);
});

test("la bannière PWA annonce la sauvegarde et le contrôle automatique", () => {
    assert.match(appSource, /beginPwaUpdateTransaction\(/);
    assert.match(appSource, /Sauvegarde créée · activation puis contrôle automatique du démarrage/);
    assert.match(appSource, /Mettre à jour maintenant/);
});

test("le bootstrap conserve les caches lors d’une mise à jour intentionnelle", () => {
    assert.match(bootstrapSource, /getIntentionalPwaUpdate\(/);
    assert.match(bootstrapSource, /if \(intentionalUpdate\)/);
    assert.match(bootstrapSource, /seule copie de rollback/);
    assert.match(bootstrapSource, /markUpdateTransactionVerifying/);
});

test("le Service Worker garde une version précédente et sait l’activer en secours", () => {
    assert.match(workerSource, /cleanupVersionCaches\(/);
    assert.match(workerSource, /ROLLBACK_TO_PREVIOUS/);
    assert.match(workerSource, /CLEAR_ROLLBACK_STATE/);
    assert.match(workerSource, /matchRollbackResponse\(/);
    assert.match(workerSource, /previousVersion/);
    assert.match(workerSource, /META_CACHE/);
});

test("update-guard surveille le démarrage et revient au cache précédent si nécessaire", () => {
    assert.ok(indexSource.indexOf("./update-guard.js") < indexSource.indexOf("./bootstrap-10.4.0.js"));
    assert.match(guardSource, /shuffleplus:app-ready/);
    assert.match(guardSource, /shuffleplus:startup-error/);
    assert.match(guardSource, /ROLLBACK_TO_PREVIOUS/);
    assert.match(guardSource, /STARTUP_TIMEOUT_MS = 18_000/);
    assert.match(guardSource, /STABILITY_MS = 10_000/);
});


test("la récupération automatique laisse la priorité au rollback PWA", () => {
    assert.match(recoverySource, /__SHUFFLEPLUS_UPDATE_GUARD__/);
    assert.match(recoverySource, /updateGuard\.rollback\("startup-recovery"\)/);
    assert.match(recoverySource, /sans purger les caches/);
});
