import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    renderPwaSettingsPanelMarkup
} from "../core/pwa-install-ui.js";
import {
    getUiThemePalette
} from "../core/ui-theme.js";

const versionSource = (await readFile("VERSION", "utf8")).trim();
const packageSource = await readFile("package.json", "utf8");
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const legacyStyleSource = await readFile("style.css", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const settingsStyleSource = await readFile("styles/feature-settings.css", "utf8");

const pwaLegacySlice = legacyStyleSource.split(".pwa-update-actions button {")[1]
    ?.split("@media (display-mode: standalone)")[0] || "";
const v860Design = settingsStyleSource.split(
    "Garantie de palette dans les réglages"
)[1] || settingsStyleSource;

const LEGACY_GREEN_PATTERN = /#1ed760|#1d5d36|#9cf0b8|#315d40|#101913|#2f4938|#3c7350|#173923|#d9f7e3|#3d8055|#d8f7e2/i;

test("la distribution active annonce Shuffle+ 9.9.36", () => {
    assert.equal(versionSource, "9.9.36");
    assert.match(packageSource, /"version": "9\.9\.36"/);
    assert.match(indexSource, /shuffleplus-version" content="9\.9\.36/);
    assert.match(indexSource, /startup-recovery-9\.9\.36\.js/);
    assert.match(appSource, /const APP_VERSION = "9\.9\.36"/);
    assert.match(workerSource, /shuffleplus-v9\.9\.36/);
});

test("la règle historique PWA ne cible plus tous les span imbriqués", () => {
    assert.match(
        `${legacyStyleSource}\n${settingsStyleSource}`,
        /\.pwa-capabilities > \.pwa-capability(?:\s*|:is\([^)]*\)\s*)\{/
    );
    assert.doesNotMatch(
        `${legacyStyleSource}\n${settingsStyleSource}`,
        /\.pwa-capabilities span\s*\{/
    );
});

test("les libellés internes des capacités restent transparents", () => {
    assert.ok(v860Design.length > 0);
    assert.match(
        v860Design,
        /\.pwa-capabilities > \.pwa-capability > span[\s\S]*background:\s*transparent\s*!important/
    );
    assert.match(
        v860Design,
        /\.pwa-capabilities > \.pwa-capability > span[\s\S]*border:\s*0\s*!important/
    );
});

test("les capacités prêtes et informatives utilisent la couleur du thème", () => {
    assert.match(
        v860Design,
        /\.pwa-capability:is\(\.is-ready, \.is-info\)[\s\S]*var\(--accent\)/
    );
    assert.match(v860Design, /rgb\(var\(--accent-rgb\) \/ 9%\)/);
    assert.doesNotMatch(v860Design, LEGACY_GREEN_PATTERN);
});

test("la zone PWA historique ne contient plus les anciens verts fixes", () => {
    assert.ok(pwaLegacySlice.length > 0);
    assert.doesNotMatch(pwaLegacySlice, LEGACY_GREEN_PATTERN);
    assert.match(pwaLegacySlice, /var\(--accent\)/);
    assert.match(pwaLegacySlice, /var\(--accent-secondary\)/);
});

test("le rendu PWA garde des classes sémantiques sans couleur codée dans le HTML", () => {
    const markup = renderPwaSettingsPanelMarkup({
        state: {
            id: "available",
            label: "Installation disponible",
            description: "Installation possible."
        },
        serviceWorkerSupported: true,
        cacheAvailable: true,
        standalone: false
    });

    assert.match(markup, /pwa-capability is-ready/);
    assert.match(markup, /pwa-capability is-info/);
    assert.doesNotMatch(markup, /#1ed760|green|rgb\(/i);
});

test("le preset bleu reste la source de vérité du thème bleu", () => {
    const palette = getUiThemePalette({ accent: "blue" });
    assert.equal(palette.primary, "#3b82f6");
    assert.equal(palette.secondary, "#06b6d4");
});
