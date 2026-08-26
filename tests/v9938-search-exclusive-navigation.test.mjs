import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

<<<<<<< HEAD
test("Shuffle+ 9.9.48 rend la sélection Recherche exclusive", () => {
    assert.equal(version, "9.9.48");
=======
test("Shuffle+ 9.9.47 rend la sélection Recherche exclusive", () => {
    assert.equal(version, "9.9.47");
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
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
