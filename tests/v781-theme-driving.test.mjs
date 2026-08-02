import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    UI_ACCENT_PRESETS,
    normalizeHexColor,
    normalizeUiThemeSettings,
    getUiThemePalette,
    getContrastText
} from "../core/ui-theme.js";

import {
    getAppSectionGroup
} from "../core/app-menu.js";

const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

const v781Style = styleSource.split(
    "— thèmes étendus et conduite synchronisée"
)[1] || "";

test("le sélecteur propose au moins treize palettes", () => {
    assert.equal(Object.keys(UI_ACCENT_PRESETS).length, 14);
    assert.ok(UI_ACCENT_PRESETS.turquoise);
    assert.ok(UI_ACCENT_PRESETS.lime);
    assert.ok(UI_ACCENT_PRESETS.fuchsia);
    assert.ok(UI_ACCENT_PRESETS.gold);
    assert.ok(UI_ACCENT_PRESETS.coral);
    assert.equal(UI_ACCENT_PRESETS.coral.label, "Corail");
    assert.ok(UI_ACCENT_PRESETS.graphite);
});

test("les couleurs personnalisées sont normalisées et persistées", () => {
    assert.equal(normalizeHexColor("#AbC"), "#aabbcc");
    assert.equal(normalizeHexColor("12abef"), "#12abef");
    assert.equal(normalizeHexColor("incorrect", "#000000"), "#000000");

    const settings = normalizeUiThemeSettings({
        accent: "custom",
        customColor: "#11AACC",
        motionEnabled: false,
        highContrast: true
    });

    assert.equal(settings.accent, "custom");
    assert.equal(settings.customColor, "#11aacc");
    assert.equal(settings.motionEnabled, false);
    assert.equal(settings.highContrast, true);
});

test("la palette personnalisée génère un accent secondaire et un contraste lisible", () => {
    const palette = getUiThemePalette({
        accent: "custom",
        customColor: "#f8e71c"
    });

    assert.equal(palette.primary, "#f8e71c");
    assert.notEqual(palette.secondary, palette.primary);
    assert.match(palette.rgb, /^\d+ \d+ \d+$/);
    assert.equal(getContrastText("#ffffff"), "#0b0b12");
    assert.equal(getContrastText("#050505"), "#ffffff");
});

test("Profils de lancement est la première section du menu Créer", () => {
    const section = getAppSectionGroup("mixes");

    assert.deepEqual(section.featured[0], [
        "mixes",
        "📱",
        "Profils de lancement"
    ]);

    const iosPosition = appSource.indexOf(
        "${renderIosCommandsPanel()}"
    );
    const studioPosition = appSource.indexOf(
        "${renderMixStudioSection()}"
    );

    assert.ok(iosPosition > 0);
    assert.ok(studioPosition > iosPosition);
});

test("le mode conduite utilise les variables du thème", () => {
    assert.match(
        v781Style,
        /body\.is-driving-mode \.driving-control-primary[\s\S]*var\(--accent\)/
    );
    assert.match(
        v781Style,
        /body\.is-driving-mode \.driving-feedback-controls button\.is-active[\s\S]*rgb\(var\(--accent-rgb\)/
    );
    assert.match(
        v781Style,
        /body\.is-driving-mode \.driving-wake-lock-control\.is-active[\s\S]*var\(--accent\)/
    );
    assert.match(
        v781Style,
        /body\.is-driving-mode \.driving-secondary-controls input[\s\S]*accent-color: var\(--accent\)/
    );
});

test("les contrôles de couleur personnalisée sont rendus et mis en cache", () => {
    assert.match(appSource, /id="uiThemeCustomColorInput"/);
    assert.match(appSource, /id="uiThemeCustomHexInput"/);
    assert.match(appSource, /id="applyUiThemeCustomColorButton"/);
    assert.match(appSource, /function updateUiThemeCustomColor/);
    assert.match(workerSource, /\.\/core\/ui-theme\.js/);
});
