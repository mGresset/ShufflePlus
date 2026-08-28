import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const styleSource = await readFile("style.css", "utf8");
const appSource = await readFile("app.js", "utf8");
const controllerSource = await readFile("core/experience-mode-controller.js", "utf8");

test("le toast de confirmation utilise la couleur du thème actif", () => {
    const toastBlock = styleSource.match(/\.app-toast\s*\{[\s\S]*?\n\}/)?.[0] || "";

    assert.match(toastBlock, /var\(--accent\)/);
    assert.match(toastBlock, /var\(--accent-rgb\)/);
    assert.doesNotMatch(toastBlock, /#3d7650|rgb\(16 28 21/);
});

test("le changement de mode affiche toujours une confirmation", () => {
    assert.match(
        controllerSource,
        /Mode \$\{definition\.label\} activé\./
    );
    assert.match(appSource, /showToast\([\s\S]*?"success"/);
});

test("les couleurs d’avertissement et d’erreur restent distinctes", () => {
    assert.match(styleSource, /\.app-toast\.is-warning/);
    assert.match(styleSource, /\.app-toast\.is-error/);
});
