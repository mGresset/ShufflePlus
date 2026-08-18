import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const css = await readFile(
    new URL("../styles/feature-driving.css", import.meta.url),
    "utf8"
);

test("Shuffle+ 9.9.47 équilibre le mode conduite sur toute la hauteur", () => {
    assert.equal(version, "9.9.47");
    assert.match(css, /v9\.9\.47 — conduite équilibrée sur toute la hauteur/);
    assert.match(css, /body\.is-driving-mode #content\s*\{[\s\S]*?align-items:\s*stretch;/);
    assert.match(css, /body\.is-driving-mode \.driving-mode-page\s*\{[\s\S]*?height:\s*100%;/);
    assert.match(css, /flex:\s*1 1 auto;/);
    assert.match(css, /align-self:\s*stretch;/);
    assert.match(css, /justify-content:\s*space-between;/);
    assert.match(css, /overflow:\s*hidden;/);
});

test("les petits écrans conservent la variante compacte sans débordement", () => {
    assert.match(css, /max-height:\s*760px[\s\S]*?justify-content:\s*flex-start;/);
    assert.match(css, /max-height:\s*760px[\s\S]*?gap:\s*3px;/);
});
