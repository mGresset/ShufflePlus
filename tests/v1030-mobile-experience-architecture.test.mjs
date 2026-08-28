import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    prepareExperienceModeTransition
} from "../core/experience-mode-controller.js";

const [
    version,
    appSource,
    uiSource,
    baseStyle,
    settingsStyle,
    workerSource
] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../core/experience-mode-ui.js", import.meta.url), "utf8"),
    readFile(new URL("../style.css", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-settings.css", import.meta.url), "utf8"),
    readFile(new URL("../service-worker.js", import.meta.url), "utf8")
]);

function memoryStorage() {
    const values = new Map();
    return {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); }
    };
}

test("Shuffle+ 10.3.0 garde les cartes Essentiel/Expert lisibles sur mobile", () => {
    assert.equal(version, "10.3.0");
    assert.match(uiSource, /experience-mode-option__icon/);
    assert.match(uiSource, /experience-mode-option__content/);
    assert.match(settingsStyle, /\.experience-mode-option__content\s*\{[\s\S]*?min-width:\s*0;/);
    assert.match(settingsStyle, /\.experience-mode-option strong\s*\{[\s\S]*?word-break:\s*normal;/);
    assert.match(settingsStyle, /@media \(max-width:\s*760px\)[\s\S]*?grid-template-columns:\s*40px minmax\(0, 1fr\);/);
});

test("les styles Expérience ne vivent plus dans le noyau CSS historique", () => {
    assert.doesNotMatch(baseStyle, /\.experience-mode-option/);
    assert.match(settingsStyle, /Shuffle\+ v10\.3\.0 — Expérience Essentiel \/ Expert/);
});

test("la transition Essentiel/Expert est isolée et ramène un menu avancé vers son parent", () => {
    const transition = prepareExperienceModeTransition({
        storage: memoryStorage(),
        mode: "essential",
        activeMenu: "statistics",
        getPrimaryMenu: () => "music"
    });

    assert.equal(transition.mode, "essential");
    assert.equal(transition.expert, false);
    assert.equal(transition.activeMenu, "music");
    assert.equal(transition.menuChanged, true);
    assert.match(transition.announcement, /Mode Essentiel activé/);
});

test("app.js et le shell PWA utilisent le contrôleur Expérience extrait", () => {
    assert.match(appSource, /prepareExperienceModeTransition/);
    assert.doesNotMatch(appSource, /function renderExperienceModePanel\(\)/);
    assert.match(workerSource, /core\/experience-mode-controller\.js/);
});
