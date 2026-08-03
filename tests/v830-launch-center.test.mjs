import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    getAppSectionGroup,
    getVisibleAppMenuGroups
} from "../core/app-menu.js";

const appSource = await readFile("app.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const styleSource = await readFile("style.css", "utf8");
const packageSource = await readFile("package.json", "utf8");
const versionSource = (await readFile("VERSION", "utf8")).trim();

test("la navigation v8.3 place le centre de lancement au premier niveau", () => {
    const primaryItems = getVisibleAppMenuGroups()[0].items;
    const launchItem = primaryItems.find(([id]) => id === "quick");
    const launchSection = getAppSectionGroup("quick");

    assert.deepEqual(launchItem, ["quick", "▶️", "Lancer"]);
    assert.deepEqual(
        launchSection.featured[0],
        ["quick", "▶️", "Centre de lancement"]
    );
});

test("l’URL universelle utilise une action stable indépendante du profil", () => {
    assert.match(appSource, /function buildUniversalLaunchUrl\(/);
    assert.match(appSource, /url\.searchParams\.set\("action", "launch"\)/);
    assert.match(appSource, /normalized\.action === "launch"/);
    assert.match(appSource, /await runGuidedPrimaryLaunch\(\)/);
    assert.match(appSource, /data-copy-universal-launch/);
    assert.match(appSource, /data-share-universal-launch/);
});

test("le lancement affiche une progression et un diagnostic actionnable", () => {
    assert.match(appSource, /function renderIosLaunchProgress\(/);
    assert.match(appSource, /function buildLaunchDiagnosticText\(/);
    assert.match(appSource, /data-copy-current-launch-diagnostic/);
    assert.match(appSource, /data-launch-open-spotify/);
    assert.match(appSource, /data-launch-reconnect-spotify/);
    assert.match(styleSource, /\.launch-progress-screen/);
    assert.match(styleSource, /\.launch-center/);
});

test("le mode conduite montre les trois prochains titres", () => {
    assert.match(appSource, /function renderDrivingQueuePreview\(/);
    assert.match(appSource, /\.slice\(0, 3\)/);
    assert.match(appSource, /data-open-driving-queue/);
    assert.match(styleSource, /\.driving-queue-preview/);
});

test("la v8.3 conserve la personnalisation par variables de thème", () => {
    assert.match(styleSource, /var\(--accent-color\)/);
    assert.match(styleSource, /var\(--accent-contrast/);
    assert.match(appSource, /renderUiThemeSettingsPanel\(\)/);
    assert.doesNotMatch(indexSource, /Bienvenue Matthieu/);
});

test("les métadonnées de distribution annoncent la v9.9.18", () => {
    assert.equal(versionSource, "9.9.18");
    assert.match(packageSource, /"version": "9\.9\.18"/);
    assert.match(indexSource, /shuffleplus-version" content="9\.9\.18/);
    assert.match(indexSource, /startup-recovery-9\.9\.18\.js/);
});
