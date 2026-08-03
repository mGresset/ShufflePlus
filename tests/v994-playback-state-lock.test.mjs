import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("la correction de confirmation active annonce Shuffle+ 9.9.5", () => {
    assert.equal(version, "9.9.5");
    assert.match(appSource, /const APP_VERSION = "9\.9\.5"/);
});

test("un retour Spotify en retard ne rétablit pas Pause", () => {
    assert.match(appSource, /let playbackUiOverride = \{/);
    assert.match(appSource, /expiresAt: Date\.now\(\) \+ 12_000/);
    assert.match(appSource, /function reconcilePlaybackWithUiOverride/);
    assert.match(
        appSource,
        /Boolean\(stampedRemote\.is_playing\)[\s\S]*expectedPlaying[\s\S]*confirmedAt = now/
    );
    assert.match(
        appSource,
        /is_playing: expectedPlaying/
    );
});

test("les vérifications Spotify sont répétées sans bloquer l'interface", () => {
    assert.match(
        appSource,
        /\[900, 1_800, 3_500, 6_000, 9_000, 12_100\]/
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
