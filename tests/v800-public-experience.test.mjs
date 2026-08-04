import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    EXPERIENCE_MODE_KEY,
    ensureExperienceMode,
    isExpertExperience,
    readExperienceMode,
    saveExperienceMode
} from "../core/experience-mode.js";
import {
    getAppSectionGroup
} from "../core/app-menu.js";
import {
    SERVER_SYNC_ADDRESS_KEY,
    SERVER_SYNC_RECOVERY_KEY,
    clearServerSyncRecovery,
    getServerSyncRecoveryDiagnostics,
    recoverServerSyncState,
    rememberServerSyncState
} from "../core/server-sync-recovery.js";
import {
    CURRENT_STORAGE_SCHEMA_VERSION,
    runStorageMigrations
} from "../core/storage-migrations.js";

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
const indexSource = await readFile("index.html", "utf8");
const styleSource = await readFile("style.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

test("une nouvelle installation démarre en mode Essentiel", () => {
    const storage = new MemoryStorage();
    const result = ensureExperienceMode({ storage });

    assert.equal(result.mode, "essential");
    assert.equal(storage.getItem(EXPERIENCE_MODE_KEY), "essential");
    assert.equal(isExpertExperience(result.mode), false);
});

test("une installation existante est migrée en mode Expert", () => {
    const storage = new MemoryStorage({
        shuffleplus_spotify_app_config_v1: JSON.stringify({
            clientId: "0123456789abcdefghijklmn"
        })
    });
    const result = ensureExperienceMode({ storage });

    assert.equal(result.mode, "expert");
    assert.equal(result.migratedExistingUser, true);
    assert.equal(readExperienceMode(storage), "expert");

    saveExperienceMode(storage, "essential");
    assert.equal(readExperienceMode(storage), "essential");
});

test("le mode Essentiel masque les sous-sections avancées", () => {
    const essentialMusic = getAppSectionGroup("music", {
        drivingAvailable: true,
        expertMode: false
    });
    const expertMusic = getAppSectionGroup("music", {
        drivingAvailable: true,
        expertMode: true
    });
    const essentialQuick = getAppSectionGroup("quick", {
        drivingAvailable: true,
        expertMode: false
    });

    assert.deepEqual(
        essentialMusic.featured.map(([id]) => id),
        ["music", "recommendations"]
    );
    assert.deepEqual(essentialMusic.more, []);
    assert.equal(
        expertMusic.more.some(([id]) => id === "statistics"),
        true
    );
    assert.equal(
        essentialQuick.featured.some(([id]) => id === "driving"),
        true
    );
});

test("la liaison serveur complète est sauvegardée puis restaurée", () => {
    const storage = new MemoryStorage();
    const state = {
        enabled: true,
        serverUrl: "https://shuffle-sync.up.railway.app/",
        spaceId: "space-123",
        deviceToken: "device-token",
        rootSecret: "root-secret",
        revision: 4
    };

    const saved = rememberServerSyncState(storage, state, 1234);
    assert.equal(saved.recoverySaved, true);
    assert.ok(storage.getItem(SERVER_SYNC_RECOVERY_KEY));
    assert.ok(storage.getItem(SERVER_SYNC_ADDRESS_KEY));

    const recovered = recoverServerSyncState(storage, {});
    assert.equal(recovered.recovered, true);
    assert.equal(recovered.source, "recovery");
    assert.equal(recovered.state.serverUrl, "https://shuffle-sync.up.railway.app");
    assert.equal(recovered.state.spaceId, "space-123");

    const diagnostics = getServerSyncRecoveryDiagnostics(storage);
    assert.equal(diagnostics.recoveryAvailable, true);
    assert.equal(diagnostics.serverHost, "shuffle-sync.up.railway.app");
});

test("une déconnexion efface les secrets mais conserve la dernière adresse", () => {
    const storage = new MemoryStorage();
    rememberServerSyncState(storage, {
        serverUrl: "https://shuffle-sync.up.railway.app",
        spaceId: "space-123",
        deviceToken: "device-token",
        rootSecret: "root-secret"
    });

    clearServerSyncRecovery(storage, { preserveAddress: true });

    assert.equal(storage.getItem(SERVER_SYNC_RECOVERY_KEY), null);
    assert.ok(storage.getItem(SERVER_SYNC_ADDRESS_KEY));

    const recovered = recoverServerSyncState(storage, {});
    assert.equal(recovered.source, "address");
    assert.equal(recovered.addressRestored, true);
});

test("la migration v8 protège une configuration serveur corrompue", () => {
    const storage = new MemoryStorage({
        shuffleplus_server_sync_v1: "{configuration-incomplète",
        shuffleplus_saved_mixes_v1: "[{mix-invalide]"
    });

    const report = runStorageMigrations({
        storage,
        appVersion: "8.0.0",
        now: 2000
    });

    assert.equal(CURRENT_STORAGE_SCHEMA_VERSION, 3);
    assert.deepEqual(report.protectedKeys, ["shuffleplus_server_sync_v1"]);
    assert.ok(storage.getItem("shuffleplus_server_sync_v1"));
    assert.equal(storage.getItem("shuffleplus_saved_mixes_v1"), null);
});

test("Shuffle+ 8 relie l’expérience publique et la récupération serveur à l’interface", () => {
    assert.match(appSource, /function renderExperienceModePanel\(/);
    assert.match(appSource, /function renderV8WelcomePanel\(/);
    assert.match(appSource, /recoverServerSyncState\(/);
    assert.match(appSource, /rememberServerSyncState\(/);
    assert.match(appSource, /isExpertExperience\(experienceMode\)/);
    assert.match(indexSource, /Shuffle\+ 9\.9\.26 · Candidate v10/);
    assert.match(styleSource, /\.v8-welcome-panel/);
    assert.match(styleSource, /\.experience-mode-options/);
    assert.match(workerSource, /\.\/core\/experience-mode\.js/);
    assert.match(workerSource, /\.\/core\/server-sync-recovery\.js/);
});


test("les boutons des Réglages ne sont plus confondus avec le mode d’expérience du document", () => {
    assert.match(
        appSource,
        /document\.documentElement\.dataset\.experienceMode = experienceMode/
    );
    assert.match(
        appSource,
        /button\[data-select-experience-mode\]/
    );
    assert.match(
        appSource,
        /dataset\.selectExperienceMode/
    );
    assert.doesNotMatch(
        appSource,
        /event\.target\.closest\(\s*"\[data-experience-mode\]"/
    );
    assert.match(
        styleSource,
        /html\[data-experience-mode="essential"\]/
    );
});
