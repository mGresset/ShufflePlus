import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile("style.css", "utf8");
const html = await readFile("index.html", "utf8");
const sw = await readFile("service-worker.js", "utf8");

function expectText(source, text, message) {
    assert.ok(source.includes(text), message || `Texte absent : ${text}`);
}

test("le header connecté mobile conserve quatre zones sur une ligne", () => {
    expectText(
        css,
        "grid-template-columns:\n            auto auto minmax(0, 1fr) auto;",
        "Le header mobile doit réserver une colonne au bouton de déconnexion."
    );
    expectText(css, "body.is-connected .brand h1");
    expectText(css, "body.is-connected #welcome");
    expectText(css, "text-overflow: ellipsis;");
    expectText(css, "body.is-connected #logoutButton");
});

test("le bandeau de mise à jour passe au-dessus du menu mobile", () => {
    expectText(css, ".pwa-update-banner {\n    z-index: 10050;");
    expectText(
        css,
        "bottom: calc(84px + env(safe-area-inset-bottom));"
    );
    expectText(
        css,
        "grid-template-columns: repeat(2, minmax(0, 1fr));"
    );
    expectText(css, "min-height: 44px;");
});

test("les ressources v7.3.2 sont versionnées pour renouveler le cache", () => {
    expectText(html, "style.css?v=7.3.2");
    expectText(html, "app.js?v=7.3.2");
    expectText(html, "startup-recovery-7.3.2.js");
    expectText(sw, "shuffleplus-v7.3.2");
    expectText(sw, "startup-recovery-7.3.2.js");
});
