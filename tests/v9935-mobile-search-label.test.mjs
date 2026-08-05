import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const searchCss = await readFile(
    new URL("../styles/feature-search.css", import.meta.url),
    "utf8"
);
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");

test("Shuffle+ 9.9.36 conserve le libellé Rechercher après le chargement différé", () => {
    assert.equal(version, "9.9.36");
    assert.match(appSource, /class="app-menu-search-button__label"[\s\S]*?Rechercher/);
    assert.match(
        searchCss,
        /@media \(max-width: 760px\)[\s\S]*?\.app-menu-search-button kbd\s*\{\s*display:\s*none;\s*\}/
    );
    assert.match(
        searchCss,
        /\.app-menu-search-button__label\s*\{[\s\S]*?display:\s*inline;/
    );
    assert.doesNotMatch(
        searchCss,
        /\.app-menu-search-button__label\s*,\s*\.app-menu-search-button kbd\s*\{\s*display:\s*none;/
    );
});
