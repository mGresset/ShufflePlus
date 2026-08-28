import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../style.css", import.meta.url), "utf8");
const version = readFileSync(new URL("../VERSION", import.meta.url), "utf8").trim();

test("Shuffle+ 10.3.0 aligne les sous-menus à gauche", () => {
    assert.equal(version, "10.3.0");
    assert.match(
        css,
        /\.app-section-menu\s*\{[\s\S]*?justify-content:\s*flex-start;[\s\S]*?flex-wrap:\s*wrap;/
    );
    assert.match(
        css,
        /\.app-section-menu__featured,[\s\S]*?\.app-section-more__items\s*\{[\s\S]*?justify-content:\s*flex-start;/
    );
    assert.match(
        css,
        /@media \(max-width:\s*760px\)[\s\S]*?\.app-section-menu\s*\{[\s\S]*?justify-content:\s*flex-start;/
    );
});

test("le sélecteur Profil principal reste compact en disposition mobile", () => {
    assert.match(
        css,
        /@media \(max-width:\s*720px\)[\s\S]*?\.launch-center-profile-form select\s*\{[\s\S]*?height:\s*auto;[\s\S]*?min-height:\s*var\(--ui-control-height,\s*48px\);[\s\S]*?flex:\s*0 0 auto;/
    );
});
