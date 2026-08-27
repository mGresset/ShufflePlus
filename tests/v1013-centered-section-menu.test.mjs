import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const version = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

test("Shuffle+ 10.1.3 centre les sous-menus de rubrique", () => {
    assert.equal(version, "10.1.3");
    assert.match(
        css,
        /\.app-section-menu\s*\{[\s\S]*?justify-content:\s*center;[\s\S]*?flex-wrap:\s*wrap;/
    );
    assert.match(
        css,
        /\.app-section-menu__featured,[\s\S]*?\.app-section-more__items\s*\{[\s\S]*?justify-content:\s*center;/
    );
});

test("le sous-menu mobile revient à la ligne sans défilement horizontal", () => {
    assert.match(
        css,
        /@media \(max-width:\s*760px\)[\s\S]*?\.app-section-menu__featured\s*\{[\s\S]*?flex:\s*0 1 auto;[\s\S]*?justify-content:\s*center;[\s\S]*?flex-wrap:\s*wrap;[\s\S]*?overflow:\s*visible;/
    );
});
