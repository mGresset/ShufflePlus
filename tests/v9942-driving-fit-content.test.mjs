import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
<<<<<<< HEAD
const css = await readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8");

test("Shuffle+ 9.9.48 élimine les contrats de hauteur contradictoires du feature CSS", () => {
    assert.equal(version, "9.9.48");
    assert.match(css, /v9\.9\.48 — contrat mobile conduite consolidé/);
    const legacyMarkers = css.match(/v9\.9\.(?:30|33|34|39|41|42|45|47) —/g) || [];
    assert.equal(legacyMarkers.length, 0);
    assert.match(css, /body\.is-driving-mode #content\s*\{[\s\S]*?align-items:\s*stretch;/);
    assert.match(css, /height:\s*100%;[\s\S]*?max-height:\s*100%;/);
=======
const css = await readFile(
    new URL("../styles/feature-driving.css", import.meta.url),
    "utf8"
);

test("Shuffle+ 9.9.47 ajuste le cadre conduite à son contenu", () => {
    assert.equal(version, "9.9.47");
    assert.match(css, /v9\.9\.42 — cadre conduite ajusté à son contenu/);
    assert.match(css, /body\.is-driving-mode #content\s*\{[\s\S]*?align-items:\s*flex-start;/);
    assert.match(css, /body\.is-driving-mode \.driving-mode-page\s*\{[\s\S]*?height:\s*auto;/);
    assert.match(css, /flex:\s*0 1 auto;/);
    assert.match(css, /max-height:\s*100%;/);
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
});
