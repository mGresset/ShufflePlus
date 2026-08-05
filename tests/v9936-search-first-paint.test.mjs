import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const styleSource = await readFile(new URL("../style.css", import.meta.url), "utf8");
const searchStyleSource = await readFile(new URL("../styles/feature-search.css", import.meta.url), "utf8");


test("Shuffle+ 9.9.42 masque le raccourci de recherche dès le premier rendu mobile", () => {
    assert.equal(version, "9.9.42");
    assert.match(
        styleSource,
        /@media \(max-width: 760px\)[\s\S]*?\.app-menu-search-button kbd\s*\{\s*display:\s*none !important;/
    );
    assert.match(
        searchStyleSource,
        /@media \(max-width: 760px\)[\s\S]*?\.app-menu-search-button kbd\s*\{\s*display:\s*none;/
    );
});
