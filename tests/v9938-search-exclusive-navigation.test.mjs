import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

test("Shuffle+ 10.3.0 rend la sélection Recherche exclusive", () => {
    assert.equal(version, "10.3.0");
    assert.match(
        appSource,
        /const selected =\s*!universalSearchOpen &&\s*button\.dataset\.appMenu ===\s*primaryMenu;/
    );
    assert.match(
        appSource,
        /const selected =\s*!universalSearchOpen &&\s*activePrimaryMenu === id;/
    );
    assert.match(
        appSource,
        /aria-expanded="\$\{universalSearchOpen \? "true" : "false"\}"/
    );
});

test("la fermeture de Recherche restaure la rubrique active", () => {
    assert.match(
        appSource,
        /function closeUniversalSearch\(\)[\s\S]*?universalSearchOpen = false;[\s\S]*?syncUniversalSearchLauncherState\(\);/
    );
    assert.match(
        appSource,
        /button\.classList\.toggle\(\s*"is-active",\s*selected\s*\);[\s\S]*?button\.setAttribute\(\s*"aria-current"/
    );
});
