import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    groupUniversalSearchResults
} from "../universal-search.js";

const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const searchStyleSource = await readFile("styles/feature-search.css", "utf8");
const versionSource = (await readFile("VERSION", "utf8")).trim();

test("la distribution active annonce Shuffle+ 9.9.37", () => {
    assert.equal(versionSource, "9.9.37");
});

test("la recherche globale est intégrée au menu principal", () => {
    assert.match(appSource, /class="app-menu-button app-menu-search-button"/);
    assert.match(appSource, /data-open-universal-search/);
    assert.match(appSource, /aria-keyshortcuts="Control\+K Meta\+K"/);
    assert.match(searchStyleSource, /repeat\(6, minmax\(0, 1fr\)\)/);
});

test("la grande barre de recherche supérieure a disparu", () => {
    assert.doesNotMatch(appSource, /function renderUniversalSearchLauncher\(/);
    assert.doesNotMatch(appSource, /\$\{renderUniversalSearchLauncher\(\)\}/);
});

test("le menu mobile conserve le libellé Rechercher après le chargement différé", () => {
    assert.match(
        searchStyleSource,
        /@media \(max-width: 760px\)[\s\S]*?\.app-menu-search-button kbd\s*\{\s*display: none;/
    );
    assert.match(
        searchStyleSource,
        /\.app-menu-search-button__label\s*\{[\s\S]*?display: inline;/
    );
    assert.doesNotMatch(
        searchStyleSource,
        /\.app-menu-search-button__label\s*,\s*\.app-menu-search-button kbd\s*\{\s*display: none;/
    );
});

test("les résultats sont regroupés par catégorie sans perdre leur index", () => {
    const groups = groupUniversalSearchResults([
        { type: "playlist", title: "Route" },
        { type: "mix", title: "Conduite" },
        { type: "playlist", title: "Favoris" }
    ]);

    assert.deepEqual(groups.map((group) => group.type), [
        "playlist",
        "mix"
    ]);
    assert.equal(groups[0].label, "Playlist");
    assert.deepEqual(
        groups[0].items.map((item) => item.resultIndex),
        [0, 2]
    );
});

test("la palette reste accessible au clavier et depuis le bouton du menu", () => {
    assert.match(appSource, /event\.key\.toLowerCase\(\) === "k"/);
    assert.match(appSource, /openUniversalSearch\(\)/);
    assert.match(appSource, /id="universalSearchDialog"/);
});
