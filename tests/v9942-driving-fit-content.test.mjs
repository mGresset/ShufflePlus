import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const css = await readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8");

test("Shuffle+ 10.1.1 élimine les contrats de hauteur contradictoires du feature CSS", () => {
    assert.equal(version, "10.1.1");
    assert.match(css, /v10\.1\.1 — contrat mobile conduite consolidé/);
    const legacyMarkers = css.match(/v9\.9\.(?:30|33|34|39|41|42|45|47) —/g) || [];
    assert.equal(legacyMarkers.length, 0);
    assert.match(css, /body\.is-driving-mode #content\s*\{[\s\S]*?align-items:\s*stretch;/);
    assert.match(css, /height:\s*100%;[\s\S]*?max-height:\s*100%;/);
});
