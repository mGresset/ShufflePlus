import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const app = await readFile(new URL("../app.js", import.meta.url), "utf8");
const design = await readFile(new URL("../design-system.css", import.meta.url), "utf8");

test("Shuffle+ 10.4.0 centre le bandeau connecté sur mobile", () => {
    assert.equal(version, "10.4.0");
    assert.match(design, /Shuffle\+ v10\.2\.0 — centrage du bandeau mobile/);
    assert.match(design, /body\.is-connected \.hero[\s\S]*?justify-content:\s*center;/);
    assert.match(design, /body\.is-connected #welcome[\s\S]*?text-align:\s*center;/);
});

test("l’éditeur de raccourci vise le début du formulaire", () => {
    const editorStart = app.indexOf("function openShortcutProfileEditor");
    assert.ok(editorStart >= 0);
    const editor = app.slice(editorStart, editorStart + 1200);
    assert.match(editor, /requestAnimationFrame/);
    assert.match(editor, /getElementById\("iosCommandForm"\)/);
    assert.match(editor, /block:\s*"start"/);
    assert.doesNotMatch(editor, /block:\s*"center"/);
    assert.match(design, /#iosCommandForm[\s\S]*?scroll-margin-top:\s*16px;/);
});
