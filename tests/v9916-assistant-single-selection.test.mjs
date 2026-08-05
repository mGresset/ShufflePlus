import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");

test("Shuffle+ 9.9.31 utilise un état dédié pour l’exemple actif", () => {
    assert.equal(version, "9.9.31");
    assert.match(
        appSource,
        /let musicalAssistantSelectedExample = "";/
    );
    assert.match(
        appSource,
        /function setMusicalAssistantExampleSelection\([\s\S]*MUSICAL_ASSISTANT_EXAMPLES\.includes\(candidate\)/
    );
    assert.match(
        appSource,
        /musicalAssistantSelectedExample === example/
    );
});

test("un clic efface l’ancienne sélection avant de rendre le nouvel exemple", () => {
    assert.match(
        appSource,
        /querySelectorAll\("\[data-musical-assistant-example\]"\)[\s\S]*button\.setAttribute\([\s\S]*"aria-pressed"/
    );
    assert.match(
        appSource,
        /assistantExampleButton\.blur\(\);[\s\S]*analyzeMusicalAssistantRequest\([\s\S]*\{ selectedExample \}/
    );
});

test("la couleur active dépend uniquement de aria-pressed=true", () => {
    assert.match(
        designSource,
        /\.musical-assistant-examples button\[aria-pressed="true"\][\s\S]*linear-gradient/
    );
    assert.doesNotMatch(
        designSource,
        /\.musical-assistant-examples button:is\([\s\S]*\.is-selected/
    );
    assert.match(
        designSource,
        /button\[aria-pressed="false"\]:focus:not\(:focus-visible\)[\s\S]*background:\s*var\(--ui-control-bg\)/
    );
});
