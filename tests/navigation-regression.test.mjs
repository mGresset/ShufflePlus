import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");

function readFunctionSource(name, nextName) {
    const start = appSource.indexOf(`function ${name}(`);
    const end = appSource.indexOf(`function ${nextName}(`, start + 1);

    assert.notEqual(start, -1, `Fonction ${name} absente`);
    assert.notEqual(end, -1, `Fonction suivante ${nextName} absente`);

    return appSource.slice(start, end);
}

test("le menu principal utilise les groupes importés", () => {
    const source = readFunctionSource("renderAppMenu", "renderAdaptiveDjMenu");

    assert.match(source, /APP_MENU_GROUPS\.map\(\(group\) =>/);
    assert.doesNotMatch(source, /\$\{groups\.map\(\(group\) =>/);
});

test("le diagnostic conserve ses propres catégories", () => {
    const source = readFunctionSource(
        "renderAppHealthPanel",
        "renderPwaSettingsPanel"
    );

    assert.match(source, /const groups = \[/);
    assert.match(source, /\$\{groups\.map\(\(group\) =>/);
    assert.doesNotMatch(source, /APP_MENU_GROUPS\.map\(\(group\) =>/);
});
