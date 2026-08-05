import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [version, designSystem] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../design-system.css", import.meta.url), "utf8")
]);

test("la version corrective active est 9.9.40", () => {
    assert.equal(version, "9.9.40");
});

test("le créateur de mix multi-sources suit le thème actif", () => {
    assert.match(
        designSystem,
        /data-app-menu-page="music"\] \.mix-builder[\s\S]*?border-color: var\(--ui-card-border\) !important;/
    );
    assert.match(
        designSystem,
        /data-app-menu-page="music"\] \.source-card\.is-selected[\s\S]*?var\(--border-active\)/
    );
    assert.match(
        designSystem,
        /\.source-selector input:checked \+ span[\s\S]*?var\(--accent\)[\s\S]*?var\(--accent-secondary\)/
    );
});

test("les accès rapides centrent les icônes et les libellés", () => {
    assert.match(
        designSystem,
        /\.musical-dashboard-shortcuts button \{[\s\S]*?justify-items: center !important;[\s\S]*?text-align: center !important;/
    );
    assert.match(
        designSystem,
        /\.musical-dashboard-shortcuts button > span,[\s\S]*?text-align: center !important;/
    );
});
