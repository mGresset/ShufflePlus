import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 10.0.0 utilise un seul contrat mobile conduite vertical", () => {
    assert.equal(version, "10.0.0");
    assert.match(drivingCss, /v10\.0\.0 — contrat mobile conduite consolidé/);
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-mode-page,[\s\S]*?display:\s*flex;[\s\S]*?flex-direction:\s*column;/
    );
    assert.doesNotMatch(drivingCss, /v9\.9\.(?:30|33|34|39|41|42|45|47) —/);
});

test("la file absorbe la hauteur variable sans rendre la page défilable", () => {
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-queue-preview\s*\{[\s\S]*?max-height:\s*142px;[\s\S]*?flex:\s*1 1 92px;[\s\S]*?overflow:\s*hidden;/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-main-controls\s*\{[\s\S]*?grid-template-rows:\s*repeat\(2, minmax\(68px, 1fr\)\)/
    );
});
