import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const authSource = await readFile("auth.js", "utf8");
const recoveryTestSource = await readFile(
    "tests/v731-recovery.test.mjs",
    "utf8"
);
const attributesSource = await readFile(".gitattributes", "utf8");
const buildSource = await readFile("scripts/build.mjs", "utf8");

const tokenFailurePattern =
    /clearTemporaryAuth\(\);\r?\n\s*console\.error\("Erreur token Spotify/;
const authLfSource = authSource.replace(/\r\n?/g, "\n");
const authCrlfSource = authLfSource.replace(/\n/g, "\r\n");

test("le contrôle OAuth accepte les fins de ligne LF et CRLF", () => {
    assert.match(authLfSource, tokenFailurePattern);
    assert.match(authCrlfSource, tokenFailurePattern);
    assert.doesNotMatch(authCrlfSource, /\r\r\n/);
    assert.match(recoveryTestSource, /\\r\?\\n/);
});

test("Git impose LF aux sources sans traiter les fichiers binaires comme du texte", () => {
    assert.match(attributesSource, /\*\.js text eol=lf/);
    assert.match(attributesSource, /\*\.mjs text eol=lf/);
    assert.match(attributesSource, /\*\.png binary/);
});

test("le build ignore les anciens bootstrap de récupération versionnés", () => {
    assert.match(buildSource, /currentRecoveryFile/);
    assert.match(buildSource, /startup-recovery-/);
    assert.match(buildSource, /entry\.name !== currentRecoveryFile/);
});
