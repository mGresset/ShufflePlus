import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

test("Shuffle+ 12.0.1 ne propose plus Dynamic Lyrics après un profil", () => {
    assert.equal(version, "12.0.1");
    assert.doesNotMatch(appSource, /Afficher un bouton Dynamic Lyrics après le lancement/);
    assert.doesNotMatch(appSource, /id="openDynamicLyricsButton"/);
    assert.doesNotMatch(appSource, /getDynamicLyricsLaunchContext/);
});

test("Dynamic Lyrics reste uniquement une donnée legacy tolérée", () => {
    assert.match(appSource, /Compatibilité silencieuse avec les profils\/URL créés avant la v12\.0\.1/);
    assert.doesNotMatch(workerSource, /\.\/core\/dynamic-lyrics\.js/);
    assert.doesNotMatch(workerSource, /\.\/core\/dynamic-lyrics-sync\.js/);
});
