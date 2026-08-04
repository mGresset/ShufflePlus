import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const designSystem = await readFile("design-system.css", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

const createThemeBlock = designSystem.split(
    "Shuffle+ v9.6.1 — cohérence du thème dans la rubrique Créer"
)[1] || "";

test("la version corrective est 9.9.21", () => {
    assert.equal(version, "9.9.21");
});

test("les principaux panneaux de Créer utilisent les variables du thème", () => {
    for (const selector of [
        ".dynamic-lyrics-panel",
        ".mix-studio-panel",
        ".saved-mixes-panel",
        ".schedules-panel",
        ".mix-history-panel"
    ]) {
        assert.match(createThemeBlock, new RegExp(selector.replace(".", "\\.")));
    }

    assert.match(createThemeBlock, /var\(--ui-card-border\)/);
    assert.match(createThemeBlock, /var\(--ui-card-bg\)/);
    assert.match(createThemeBlock, /var\(--accent\)/);
    assert.match(createThemeBlock, /var\(--accent-rgb\)/);
});

test("les éléments internes et les actions suivent aussi le thème", () => {
    for (const selector of [
        ".mix-studio-source-row:has(input:checked)",
        ".mix-history-metrics strong",
        ".history-ranking li b",
        ".dynamic-lyrics-state.is-enabled",
        ".saved-mix-launch",
        ".schedule-run-button",
        ".mix-history-relaunch"
    ]) {
        assert.ok(
            createThemeBlock.includes(selector),
            `sélecteur thématique absent : ${selector}`
        );
    }
});

test("les actions destructives conservent une couleur sémantique distincte", () => {
    assert.match(createThemeBlock, /\.saved-mix-delete/);
    assert.match(createThemeBlock, /\.mix-history-delete/);
    assert.match(createThemeBlock, /#a45e5e/);
});
