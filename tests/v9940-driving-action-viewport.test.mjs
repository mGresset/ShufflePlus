import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile(new URL("../app.js", import.meta.url), "utf8");
const version = (await readFile(new URL("../VERSION", import.meta.url), "utf8")).trim();

test("Shuffle+ 10.1.0 conserve le viewport stable pendant une commande conduite", () => {
    assert.equal(version, "10.1.0");
    assert.match(appSource, /let drivingViewportMetricsReady = false;/);
    assert.match(appSource, /function freezeDrivingViewportForAction\(/);
    assert.match(
        appSource,
        /function syncDrivingViewportHeight\(\{ force = false \} = \{\}\)[\s\S]*?remainingFreeze > 0[\s\S]*?scheduleDeferredDrivingViewportSync/
    );
    assert.match(
        appSource,
        /async function runDrivingAction\(action\)[\s\S]*?freezeDrivingViewportForAction\(\);[\s\S]*?renderDrivingModePage\(\);/
    );
});

test("un rerendu ne remesure pas systématiquement Safari", () => {
    assert.match(
        appSource,
        /function renderDrivingModePage\(\)[\s\S]*?if \(!drivingViewportMetricsReady\) \{[\s\S]*?syncDrivingViewportHeight\(\{ force: true \}\);/
    );
    assert.doesNotMatch(
        appSource,
        /function renderDrivingModePage\(\) \{\s*syncDrivingViewportHeight\(\);/
    );
});
