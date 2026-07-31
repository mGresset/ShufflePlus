import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    createFeatureLoader
} from "../core/feature-loader.js";
import {
    createRuntimeState
} from "../core/runtime-state.js";
import {
    CURRENT_STORAGE_SCHEMA_VERSION,
    STORAGE_RECOVERY_KEY,
    STORAGE_SCHEMA_KEY,
    getStorageMigrationDiagnostics,
    runStorageMigrations
} from "../core/storage-migrations.js";
import {
    buildAppHealthExport,
    buildAppHealthSnapshot
} from "../app-health.js";

class MemoryStorage {
    constructor(entries = {}) {
        this.data = new Map(Object.entries(entries));
    }

    get length() {
        return this.data.size;
    }

    key(index) {
        return [...this.data.keys()][index] ?? null;
    }

    getItem(key) {
        return this.data.has(key) ? this.data.get(key) : null;
    }

    setItem(key, value) {
        this.data.set(String(key), String(value));
    }

    removeItem(key) {
        this.data.delete(String(key));
    }
}

const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

test("le chargeur progressif déduplique deux imports simultanés", async () => {
    let calls = 0;
    const loader = createFeatureLoader({
        diagnostics: async () => {
            calls += 1;
            await new Promise((resolve) => setTimeout(resolve, 5));
            return { ready: true };
        }
    });

    const [first, second] = await Promise.all([
        loader.load("diagnostics"),
        loader.load("diagnostics")
    ]);

    assert.equal(calls, 1);
    assert.equal(first, second);
    assert.equal(loader.isLoaded("diagnostics"), true);
    assert.equal(loader.getStatus("diagnostics").status, "loaded");
});

test("la migration sauvegarde puis répare un JSON local corrompu", () => {
    const storage = new MemoryStorage({
        shuffleplus_saved_mixes_v1: "[{incorrect]",
        spotify_access_token: "token-non-json",
        shuffleplus_ui_theme_v1: JSON.stringify({ accent: "violet" })
    });

    const report = runStorageMigrations({
        storage,
        appVersion: "7.9.0",
        now: 1234
    });

    assert.equal(report.available, true);
    assert.deepEqual(report.repairedKeys, ["shuffleplus_saved_mixes_v1"]);
    assert.equal(storage.getItem("shuffleplus_saved_mixes_v1"), null);
    assert.equal(storage.getItem("spotify_access_token"), "token-non-json");
    assert.ok(storage.getItem(STORAGE_RECOVERY_KEY));

    const meta = JSON.parse(storage.getItem(STORAGE_SCHEMA_KEY));
    assert.equal(meta.schemaVersion, CURRENT_STORAGE_SCHEMA_VERSION);
    assert.equal(meta.appVersion, "7.9.0");
});

test("une migration sans espace de sauvegarde préserve les données corrompues", () => {
    const storage = new MemoryStorage({
        shuffleplus_saved_mixes_v1: "[{incorrect]"
    });
    const originalSetItem = storage.setItem.bind(storage);
    storage.setItem = (key, value) => {
        if (key === STORAGE_RECOVERY_KEY) {
            throw new Error("Quota dépassé");
        }
        originalSetItem(key, value);
    };

    const report = runStorageMigrations({
        storage,
        appVersion: "7.9.0"
    });

    assert.equal(report.recoveryCreated, false);
    assert.deepEqual(report.preservedKeys, ["shuffleplus_saved_mixes_v1"]);
    assert.equal(storage.getItem("shuffleplus_saved_mixes_v1"), "[{incorrect]");
});

test("l’état d’exécution central suit les changements sans exposer de donnée musicale", () => {
    let clock = 1000;
    const state = createRuntimeState({
        lifecycle: { ready: false },
        session: { connected: false }
    }, {
        now: () => clock
    });

    state.merge("lifecycle", { ready: true });
    state.merge("session", { connected: true, product: "premium" });
    clock = 1600;

    const diagnostics = state.getDiagnostics();
    assert.equal(diagnostics.revision, 2);
    assert.equal(diagnostics.uptimeMs, 600);
    assert.equal(diagnostics.snapshot.lifecycle.ready, true);
    assert.equal(diagnostics.snapshot.session.product, "premium");
});

test("le diagnostic v7.9 inclut architecture et migrations sans identifiant personnel", () => {
    const storage = new MemoryStorage();
    runStorageMigrations({ storage, appVersion: "7.9.0", now: 100 });
    const storageMigration = getStorageMigrationDiagnostics({ storage });
    const snapshot = buildAppHealthSnapshot({
        appVersion: "7.9.0",
        secureContext: true,
        localStorageAvailable: true,
        featureRuntime: [
            { name: "appHealth", status: "loaded", durationMs: 12 }
        ],
        runtimeStateDiagnostics: {
            revision: 3,
            uptimeMs: 250,
            snapshot: {
                session: { connected: true, product: "premium" }
            }
        },
        storageMigration
    });
    const exported = buildAppHealthExport(snapshot);

    assert.equal(exported.schemaVersion, 2);
    assert.equal(snapshot.runtime.featureModules[0].name, "appHealth");
    assert.equal(snapshot.runtime.storage.schemaVersion, CURRENT_STORAGE_SCHEMA_VERSION);
    assert.doesNotMatch(JSON.stringify(exported), /access_token|refresh_token|clientSecret/i);
});

test("app.js charge le diagnostic à la demande et initialise les migrations avant les préférences", () => {
    assert.doesNotMatch(appSource, /from "\.\/app-health\.js"/);
    assert.match(appSource, /appHealth:\s*\(\)\s*=>\s*import\("\.\/app-health\.js"\)/);
    assert.ok(
        appSource.indexOf("runStorageMigrations({") <
        appSource.indexOf("readLibraryPreferences()")
    );
    assert.match(appSource, /createRuntimeState\(/);
});

test("le Service Worker prépare les nouveaux modules d’architecture", () => {
    assert.match(workerSource, /\.\/core\/feature-loader\.js/);
    assert.match(workerSource, /\.\/core\/runtime-state\.js/);
    assert.match(workerSource, /\.\/core\/storage-migrations\.js/);
});
