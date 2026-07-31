import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    APP_PRIMARY_MENU_IDS,
    getAppSectionGroup,
    getPrimaryAppMenu,
    getVisibleAppMenuGroups
} from "../core/app-menu.js";

import {
    getPwaVersionFromScriptUrl,
    shouldDisplayPwaUpdate
} from "../core/pwa-update.js";

const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

test("la navigation principale contient exactement cinq rubriques", () => {
    assert.deepEqual(APP_PRIMARY_MENU_IDS, [
        "dashboard",
        "music",
        "mixes",
        "quick",
        "settings"
    ]);

    const items = getVisibleAppMenuGroups()
        .flatMap((group) => group.items)
        .map(([id]) => id);

    assert.deepEqual(items, APP_PRIMARY_MENU_IDS);
});

test("les anciennes rubriques restent reliées à leur menu parent", () => {
    assert.equal(getPrimaryAppMenu("statistics"), "music");
    assert.equal(getPrimaryAppMenu("adaptive"), "mixes");
    assert.equal(getPrimaryAppMenu("driving"), "quick");
    assert.equal(getPrimaryAppMenu("guide"), "settings");
});

test("le mode conduite disparaît du sous-menu hors iOS", () => {
    const ios = getAppSectionGroup("quick", {
        drivingAvailable: true
    });
    const desktop = getAppSectionGroup("quick", {
        drivingAvailable: false
    });

    assert.equal(ios.more.some(([id]) => id === "driving"), true);
    assert.equal(desktop.more.some(([id]) => id === "driving"), false);
});

test("l’interface rend le sous-menu et masque les fonctions avancées derrière Voir plus", () => {
    assert.match(appSource, /function renderAppSectionMenu\(/);
    assert.match(appSource, /class="app-section-more"/);
    assert.match(appSource, /Voir plus/);
    assert.match(styleSource, /grid-template-columns:\s*repeat\(5, minmax\(0, 1fr\)\)/);
});

test("la même version de Service Worker ne réaffiche pas la bannière", () => {
    assert.equal(shouldDisplayPwaUpdate({
        currentVersion: "7.8.0",
        availableVersion: "7.8.0"
    }), false);

    assert.equal(shouldDisplayPwaUpdate({
        currentVersion: "7.8.0",
        availableVersion: "7.9.0",
        appliedVersion: "7.9.0"
    }), false);

    assert.equal(shouldDisplayPwaUpdate({
        currentVersion: "7.8.0",
        availableVersion: "7.9.0"
    }), true);
});

test("la version du worker peut être lue et le worker répond à GET_VERSION", () => {
    assert.equal(
        getPwaVersionFromScriptUrl(
            "https://example.test/service-worker.js?v=7.8.0"
        ),
        "7.8.0"
    );
    assert.match(workerSource, /type === "GET_VERSION"/);
    assert.match(workerSource, /version: APP_VERSION/);
});

test("le clic de mise à jour mémorise la version et attend controllerchange", () => {
    assert.match(appSource, /rememberAppliedPwaVersion\(/);
    assert.match(appSource, /pwaUpdateApplying = true/);
    assert.match(appSource, /Mise à jour de Shuffle\+ en cours/);
    assert.match(appSource, /controllerchange/);
});
