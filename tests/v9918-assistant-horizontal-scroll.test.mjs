import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");

test("Shuffle+ 9.9.27 conserve le défilement horizontal de l’assistant", () => {
    assert.equal(version, "9.9.27");
    assert.match(
        appSource,
        /let musicalAssistantExamplesScrollLeft = 0;/
    );
    assert.match(
        appSource,
        /function rememberMusicalAssistantExamplesScrollPosition\(\)[\s\S]*examples\.scrollLeft/
    );
});

test("le rerendu mémorise puis restaure le carrousel d’exemples", () => {
    assert.match(
        appSource,
        /function displayPlaylists\(playlists\) \{[\s\S]*activeAppMenu === "assistant"[\s\S]*rememberMusicalAssistantExamplesScrollPosition\(\)/
    );
    assert.match(
        appSource,
        /setMusicalAssistantExampleSelection\([\s\S]*musicalAssistantSelectedExample[\s\S]*restoreMusicalAssistantExamplesScrollPosition\(\)/
    );
});

test("l’exemple actif est maintenu dans la zone visible sans déplacer la page", () => {
    assert.match(
        appSource,
        /\[data-musical-assistant-example\]\[aria-pressed="true"\]/
    );
    assert.match(
        appSource,
        /examples\.scrollWidth - examples\.clientWidth/
    );
    assert.match(
        appSource,
        /selectedRect\.left[\s\S]*selectedRect\.right[\s\S]*examples\.scrollLeft/
    );
    assert.doesNotMatch(
        appSource,
        /selectedButton\.scrollIntoView/
    );
});
