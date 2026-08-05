import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { UI_ACCENT_PRESETS, getUiThemePalette } from "../core/ui-theme.js";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");

test("la distribution corrective active annonce Shuffle+ 9.9.39", () => {
    assert.equal(version, "9.9.39");
});

test("le thème Corail complète les quatorze couleurs prédéfinies", () => {
    assert.equal(Object.keys(UI_ACCENT_PRESETS).length, 14);
    assert.deepEqual(UI_ACCENT_PRESETS.coral, {
        id: "coral",
        label: "Corail",
        primary: "#fb7185",
        secondary: "#f97316"
    });
});

test("la palette Corail produit des variables de thème exploitables", () => {
    const palette = getUiThemePalette({ accent: "coral" });
    assert.equal(palette.id, "coral");
    assert.equal(palette.primary, "#fb7185");
    assert.match(palette.rgb, /^\d+ \d+ \d+$/);
});

test("la grille des couleurs conserve sept colonnes sur grand écran", () => {
    assert.match(styleSource, /\.ui-theme-swatches\s*\{[\s\S]*?grid-template-columns:\s*repeat\(7,/);
});
