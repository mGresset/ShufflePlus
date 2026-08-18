import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const css = await readFile(
    new URL("../styles/feature-driving.css", import.meta.url),
    "utf8"
);

test("Shuffle+ 9.9.45 ajuste le cadre conduite à son contenu", () => {
    assert.equal(version, "9.9.45");
    assert.match(css, /v9\.9\.42 — cadre conduite ajusté à son contenu/);
    assert.match(css, /body\.is-driving-mode #content\s*\{[\s\S]*?align-items:\s*flex-start;/);
    assert.match(css, /body\.is-driving-mode \.driving-mode-page\s*\{[\s\S]*?height:\s*auto;/);
    assert.match(css, /flex:\s*0 1 auto;/);
    assert.match(css, /max-height:\s*100%;/);
});
