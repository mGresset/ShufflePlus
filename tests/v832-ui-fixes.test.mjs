import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const designSource = await readFile("design-system.css", "utf8");
const indexSource = await readFile("index.html", "utf8");
const versionSource = (await readFile("VERSION", "utf8")).trim();

test("la v9.5.0 garantit que les éléments hidden restent invisibles", () => {
    assert.equal(versionSource, "9.5.0");
    assert.match(designSource, /\[hidden\]\s*\{\s*display:\s*none\s*!important/);
});

test("le header connecté possède une grille desktop stable", () => {
    assert.match(
        designSource,
        /body\.is-connected \.hero[\s\S]*grid-template-columns:[\s\S]*max-content[\s\S]*minmax\(170px, 1fr\)[\s\S]*max-content/
    );
    assert.match(
        designSource,
        /body\.is-connected \.actions > button[\s\S]*white-space:\s*nowrap/
    );
});

test("la page Réglages est strictement liée au thème actif", () => {
    assert.match(
        designSource,
        /\.app-menu-page\[data-app-menu-page="settings"\]/
    );
    assert.match(
        designSource,
        /button\[type="submit"\][\s\S]*var\(--accent\)[\s\S]*var\(--accent-secondary\)/
    );
    assert.match(
        designSource,
        /\.priority-save-button[\s\S]*\.coherence-save-button[\s\S]*\.intensity-save-button/
    );
    assert.match(
        designSource,
        /input\[type="checkbox"\][\s\S]*accent-color:\s*var\(--accent\)\s*!important/
    );
});

test("la navigation sticky desktop ne laisse plus d’interstice", () => {
    assert.match(
        designSource,
        /\.app-menu\.app-menu--primary[\s\S]*top:\s*0/
    );
    assert.match(indexSource, /design-system\.css\?v=9\.5\.0/);
});
