import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const searchCss = await readFile(
    new URL("../styles/feature-search.css", import.meta.url),
    "utf8"
);

test("Shuffle+ 9.9.42 retire entièrement le cadre Rechercher après fermeture", () => {
    assert.equal(version, "9.9.42");

    assert.match(
        appSource,
        /function syncUniversalSearchLauncherState\(\)[\s\S]*?classList\.toggle\([\s\S]*?"is-search-open"[\s\S]*?setAttribute\([\s\S]*?"aria-expanded"/
    );
    assert.match(
        appSource,
        /function closeUniversalSearch\(\)[\s\S]*?syncUniversalSearchLauncherState\(\)[\s\S]*?activeElement\.blur\(\)/
    );
    assert.match(
        appSource,
        /async function navigateToAppMenu\([\s\S]*?if \(universalSearchOpen\) \{\s*closeUniversalSearch\(\);/
    );

    assert.match(
        searchCss,
        /\.app-menu-search-button\s*\{[\s\S]*?border-color:\s*transparent !important;[\s\S]*?background:\s*transparent !important;/
    );
    assert.match(
        searchCss,
        /body\.is-universal-search-open \.app-menu-search-button[\s\S]*?\.app-menu-search-button\[aria-expanded="true"\][\s\S]*?border-color:\s*var\(--border-active\) !important;/
    );
    assert.match(
        searchCss,
        /@media \(hover: none\) and \(pointer: coarse\)[\s\S]*?\.app-menu-search-button:not\(\.is-search-open\):not\(\[aria-expanded="true"\]\):hover[\s\S]*?border-color:\s*transparent !important;/
    );
});
