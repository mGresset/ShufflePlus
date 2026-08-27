import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");

test("les sous-menus restent responsifs sans défilement horizontal", () => {
    assert.match(
        css,
        /@media \(max-width:\s*760px\)[\s\S]*?\.app-section-menu__featured\s*\{[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?overflow:\s*visible;/
    );
});
