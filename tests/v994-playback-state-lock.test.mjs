import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("la correction de confirmation active annonce Shuffle+ 9.9.4", () => {
    assert.equal(version, "9.9.4");
    assert.match(appSource, /const APP_VERSION = "9\.9\.4"/);
});

test("un retour Spotify en retard ne rétablit pas Pause", () => {
    assert.match(appSource, /let playbackUiOverride = \{/);
    assert.match(appSource, /expiresAt: Date\.now\(\) \+ 8_000/);
    assert.match(appSource, /function reconcilePlaybackWithUiOverride/);
    assert.match(
        appSource,
        /Boolean\(remotePlayback\.is_playing\)[\s\S]*expectedPlaying[\s\S]*clearPlaybackUiOverride/
    );
    assert.match(
        appSource,
        /is_playing: expectedPlaying/
    );
});

test("les vérifications Spotify sont répétées sans bloquer l'interface", () => {
    assert.match(
        appSource,
        /\[900, 1_800, 3_500, 6_000\]/
    );
    assert.match(
        appSource,
        /schedulePlaybackConfirmationChecks\([\s\S]*playbackOverrideToken/
    );
});

test("une erreur de commande annule le verrou et restaure le bouton", () => {
    assert.match(
        appSource,
        /clearPlaybackUiOverride\(\);[\s\S]*updateVisiblePlaybackButtons\([\s\S]*previousPlayingState/
    );
});
