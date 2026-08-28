import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const bootstrapSource = await readFile(
    `bootstrap-${version}.js`,
    "utf8"
);
const serviceWorkerSource = await readFile(
    "service-worker.js",
    "utf8"
);
const appSource = await readFile("app.js", "utf8");

test("la v10.3.0 charge l'application par un bootstrap propre à la release", () => {
    assert.equal(version, "10.3.0");
    assert.match(
        indexSource,
        /type="module" src="\.\/bootstrap-10\.3\.0\.js"/
    );
    assert.doesNotMatch(
        indexSource,
        /type="module" src="\.\/app\.js/
    );
    assert.match(
        bootstrapSource,
        /const BUILD_ID = "10\.3\.0-pwa-reset-1"/
    );
    assert.match(
        bootstrapSource,
        /unregisterShufflePlusWorkers[\s\S]*clearShufflePlusCaches[\s\S]*window\.location\.replace/
    );
    assert.match(
        bootstrapSource,
        /await import\(`\.\/app\.js\?v=\$\{APP_VERSION\}&build=\$\{BUILD_ID\}`\)/
    );
});

test("le Service Worker précharge les ressources portant l'identité exacte du build", () => {
    assert.match(
        serviceWorkerSource,
        /"\.\/bootstrap-10\.3\.0\.js"/
    );
    assert.match(
        serviceWorkerSource,
        /"\.\/app\.js\?v=10\.3\.0&build=10\.3\.0-pwa-reset-1"/
    );
});

test("une réponse réseau incertaine après Pause ne restaure plus l'ancien état", () => {
    assert.match(
        appSource,
        /let playbackMutationAttempted = false;[\s\S]*playbackMutationAttempted = true;[\s\S]*await pausePlayback/
    );
    assert.match(
        appSource,
        /if \(playbackMutationAttempted\) \{[\s\S]*setPlaybackClockPlayingState\([\s\S]*playbackCommandExpectedState[\s\S]*schedulePlaybackConfirmationChecks\([\s\S]*return quickPlaybackState;/
    );
});

test("le mode conduite conserve lui aussi l'intention après une réponse incertaine", () => {
    assert.match(
        appSource,
        /async function toggleDrivingPlayback\(\)[\s\S]*let playbackMutationAttempted = false;[\s\S]*if \(playbackMutationAttempted\) \{[\s\S]*expectedPlayingState[\s\S]*schedulePlaybackConfirmationChecks\([\s\S]*return;/
    );
});
