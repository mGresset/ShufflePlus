import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();
const [recovery, app, bootstrap] = await Promise.all([
    readFile(new URL(`../startup-recovery-${version}.js`, import.meta.url), "utf8"),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL(`../bootstrap-${version}.js`, import.meta.url), "utf8")
]);

test("10.2.0 protège le callback Spotify avant toute purge PKCE", () => {
    assert.equal(version, "10.2.0");
    assert.match(recovery, /hasOAuthCallback: Boolean\(/);
    assert.match(recovery, /url\.searchParams\.get\("code"\)/);
    assert.match(recovery, /if \(navigation\.hasOAuthCallback\) \{/);

    const repairStart = recovery.indexOf("async function repairApplication");
    const callbackGuard = recovery.indexOf("if (navigation.hasOAuthCallback)", repairStart);
    const tempClear = recovery.indexOf("clearTemporarySpotifyState();", repairStart);
    assert.ok(callbackGuard > repairStart);
    assert.ok(tempClear > callbackGuard, "la purge PKCE doit arriver après le garde callback");
});

test("10.2.0 bloque une deuxième réparation après le reload", () => {
    assert.match(recovery, /const REPAIR_RELOAD_KEY =/);
    assert.match(recovery, /const REPAIR_COOLDOWN_MS = 60_000;/);
    assert.match(recovery, /recentRepair: recentUrlRepair \|\| recentStoredRepair/);
    assert.match(recovery, /if \(automatic && navigation\.recentRepair\)/);
    assert.match(recovery, /if \(navigation\.recentRepair\)/);
    assert.match(recovery, /url\.searchParams\.set\("recovery", String\(repairTimestamp\)\)/);
});

test("10.2.0 court-circuite la deuxième migration bootstrap", () => {
    assert.match(recovery, /const BUILD_QUERY_KEY = "shuffleplus_build";/);
    assert.match(recovery, /url\.searchParams\.set\(BUILD_QUERY_KEY, BUILD_ID\)/);
    assert.match(bootstrap, /if \(storedBuild === BUILD_ID \|\| queryBuild === BUILD_ID\)/);
});

test("10.2.0 garde le verrou jusqu’à la stabilité du runtime", () => {
    assert.match(recovery, /const RECOVERY_STABILITY_MS = 20_000;/);
    assert.match(recovery, /const STARTUP_WATCHDOG_MS = 25_000;/);
    assert.match(recovery, /cleanRecoveryMarkerAfterStability\(\);/);
    assert.match(recovery, /\}, STARTUP_WATCHDOG_MS\);/);

    const readyHandler = recovery.indexOf('window.addEventListener("shuffleplus:app-ready"');
    const cleanupCall = recovery.indexOf("cleanRecoveryMarkerAfterStability();", readyHandler);
    const immediateRemove = recovery.indexOf("sessionStorage.removeItem(AUTO_REPAIR_KEY)", readyHandler);
    assert.ok(cleanupCall > readyHandler);
    assert.equal(immediateRemove, -1);
});

test("le bouton Réglages utilise le moteur de réparation unique", () => {
    const start = app.indexOf("async function repairPwaCache()");
    const end = app.indexOf("function renderPwaSettingsPanel()", start);
    const source = app.slice(start, end);
    assert.match(source, /window\.ShufflePlusRecovery\?\.repair/);
    assert.match(source, /registration\.scope ===\s*shufflePlusScope/);
    assert.doesNotMatch(source, /registration\.scope\.startsWith\(window\.location\.origin\)/);
    assert.doesNotMatch(source, /window\.location\.reload\(\)/);
    assert.match(source, /window\.location\.replace\(url\.toString\(\)\)/);
});
