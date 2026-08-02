import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    GUIDED_SETUP_KEY,
    buildGuidedSetupChecklist,
    normalizeGuidedSetupState,
    readGuidedSetupState,
    resolvePrimaryCommand,
    saveGuidedSetupState
} from "../core/guided-setup.js";

class MemoryStorage {
    constructor(entries = {}) {
        this.data = new Map(Object.entries(entries));
    }

    getItem(key) {
        return this.data.has(key) ? this.data.get(key) : null;
    }

    setItem(key, value) {
        this.data.set(String(key), String(value));
    }
}

const appSource = await readFile("app.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const styleSource = await readFile("style.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

const commands = [
    {
        id: "principal",
        name: "Route",
        commandType: "fixed",
        playlistId: "playlist-1",
        playlistName: "Ma route",
        deviceMode: "preferred",
        shuffle: true
    },
    {
        id: "soirée",
        name: "Soirée",
        commandType: "smartmix",
        mixId: "mix-1"
    }
];

test("l’état guidé est normalisé et conservé localement", () => {
    const storage = new MemoryStorage();
    const result = saveGuidedSetupState(storage, {
        primaryCommandId: "principal",
        shortcutConfirmed: true
    });

    assert.equal(result.saved, true);
    assert.equal(
        readGuidedSetupState(storage, GUIDED_SETUP_KEY).primaryCommandId,
        "principal"
    );
    assert.equal(
        readGuidedSetupState(storage).shortcutConfirmed,
        true
    );
    assert.equal(
        normalizeGuidedSetupState(null).primaryCommandId,
        ""
    );
});

test("la commande principale préfère le choix utilisateur puis principal", () => {
    assert.equal(
        resolvePrimaryCommand(commands, {
            primaryCommandId: "soirée"
        }).id,
        "soirée"
    );
    assert.equal(
        resolvePrimaryCommand(commands, {}).id,
        "principal"
    );
    assert.equal(resolvePrimaryCommand([], {}), null);
});

test("la checklist couvre les sept étapes du lancement en un geste", () => {
    const incomplete = buildGuidedSetupChecklist({
        spotifyConfigured: true,
        spotifyConnected: true,
        commands,
        preferredDevice: { id: "iphone", name: "iPhone" },
        successfulLaunches: [],
        state: { primaryCommandId: "principal" },
        standalone: false
    });

    assert.equal(incomplete.totalCount, 7);
    assert.equal(incomplete.readyCount, 4);
    assert.equal(incomplete.complete, false);

    const complete = buildGuidedSetupChecklist({
        spotifyConfigured: true,
        spotifyConnected: true,
        commands,
        preferredDevice: { id: "iphone", name: "iPhone" },
        successfulLaunches: [
            {
                commandId: "principal",
                status: "success"
            }
        ],
        state: {
            primaryCommandId: "principal",
            shortcutConfirmed: true,
            installationConfirmed: true
        },
        standalone: false
    });

    assert.equal(complete.readyCount, 7);
    assert.equal(complete.progress, 100);
    assert.equal(complete.complete, true);
});

test("Shuffle+ 8.2 relie le lancement principal à l’interface", () => {
    assert.match(appSource, /function renderPrimaryLaunchPanel\(/);
    assert.match(appSource, /function renderGuidedSetupPanel\(/);
    assert.match(appSource, /async function runGuidedPrimaryLaunch\(/);
    assert.match(appSource, /Tester mon installation/);
    assert.match(appSource, /Lancer maintenant/);
    assert.match(appSource, /primaryLaunchSettingsForm/);
    assert.match(indexSource, /Étape 1 · Connexion Spotify/);
    assert.match(styleSource, /\.primary-launch-panel/);
    assert.match(styleSource, /\.guided-setup-steps/);
    assert.match(workerSource, /\.\/core\/guided-setup\.js/);
});

test("la configuration guidée est incluse dans les sauvegardes", () => {
    assert.match(appSource, /guidedSetupState,/);
    assert.match(
        appSource,
        /guidedSetupState:\s*normalizeGuidedSetupState/
    );
    assert.match(
        appSource,
        /saveGuidedSetupState\(\s*localStorage/
    );
});
