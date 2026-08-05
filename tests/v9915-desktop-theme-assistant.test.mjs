import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");

test("l’harmonisation desktop active annonce Shuffle+ 9.9.35", () => {
    assert.equal(version, "9.9.35");
    assert.match(indexSource, /design-system\.css\?v=9\.9\.35/);
    assert.match(indexSource, /bootstrap-9\.9\.35\.js/);
});

test("le bandeau d’analyse des playlists suit le thème actif", () => {
    assert.match(
        designSource,
        /\.modification-sort-progress\s*\{[\s\S]*border-color:\s*var\(--border-active\)[\s\S]*var\(--accent\)/
    );
});

test("les grands cadres Créer partagent une géométrie commune", () => {
    assert.match(
        designSource,
        /data-app-menu-page="mixes"\]\s*>\s*:where\([\s\S]*\.ios-commands-panel[\s\S]*\.mix-studio-panel[\s\S]*\.saved-mixes-panel[\s\S]*\.schedules-panel[\s\S]*\.mix-history-panel[\s\S]*border-radius:\s*22px/
    );
});

test("les boutons de l’assistant sont espacés et l’exemple actif suit la demande", () => {
    assert.match(
        designSource,
        /\.musical-assistant-form__actions\s*\{[\s\S]*grid-template-columns:[\s\S]*gap:\s*12px/
    );
    assert.match(appSource, /musicalAssistantSelectedExample === example/);
    assert.match(appSource, /aria-pressed="\$\{String\(selected\)\}"/);
    assert.match(
        designSource,
        /\.musical-assistant-examples button\[aria-pressed="true"\][\s\S]*var\(--accent-secondary\)/
    );
});
