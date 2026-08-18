import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const designSource = await readFile("design-system.css", "utf8");

test("Shuffle+ 9.9.47 neutralise le survol tactile persistant", () => {
    assert.equal(version, "9.9.47");
    assert.match(
        designSource,
        /button\[aria-pressed="false"\]:hover,[\s\S]*button\[aria-pressed="false"\]:active[\s\S]*background:\s*var\(--ui-control-bg\)\s*!important/
    );
    assert.doesNotMatch(
        styleSource,
        /\.musical-assistant-examples button:hover\s*\{[\s\S]*background:\s*rgb\(var\(--accent-rgb\)/
    );
});

test("le rendu frais réapplique l’unique sélection de l’assistant", () => {
    assert.match(
        appSource,
        /if \(activeAppMenu === "assistant"\) \{[\s\S]*setMusicalAssistantExampleSelection\([\s\S]*musicalAssistantSelectedExample/
    );
    assert.match(
        appSource,
        /let activeButtonAssigned = false;[\s\S]*!activeButtonAssigned[\s\S]*activeButtonAssigned = true/
    );
});

test("les anciens marqueurs visuels sont retirés de chaque exemple", () => {
    assert.match(
        appSource,
        /button\.classList\.remove\("is-selected"\);[\s\S]*button\.setAttribute\([\s\S]*"aria-pressed"/
    );
    assert.match(
        designSource,
        /-webkit-tap-highlight-color:\s*transparent;[\s\S]*touch-action:\s*manipulation;/
    );
});
