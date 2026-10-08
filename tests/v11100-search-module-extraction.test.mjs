import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const searchSource = await readFile("universal-search.js", "utf8");

test("11.10 extrait les rubriques et le rendu Spotify du monolithe", () => {
    assert.doesNotMatch(appSource, /function getUniversalSearchSections\(/);
    assert.doesNotMatch(appSource, /function renderSpotifyCatalogSearchResults\(/);
    assert.doesNotMatch(appSource, /function renderSpotifyCatalogProfileChooser\(/);
    assert.match(searchSource, /export function getUniversalSearchSections\(/);
    assert.match(searchSource, /export function renderSpotifyCatalogSearchResults\(/);
    assert.match(searchSource, /export function renderSpotifyCatalogProfileChooser\(/);
});

test("11.10 conserve la recherche comme fonctionnalité chargée à la demande", () => {
    assert.match(appSource, /universalSearch:\s*\(\)\s*=>\s*import\("\.\/universal-search\.js"\)/);
    assert.doesNotMatch(appSource, /from ["']\.\/universal-search\.js["']/);
    assert.ok(appSource.split(/\r?\n/).length <= 51650);
});
