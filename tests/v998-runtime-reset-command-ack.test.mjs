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

<<<<<<< HEAD
test("la v9.9.48 charge l'application par un bootstrap propre à la release", () => {
    assert.equal(version, "9.9.48");
    assert.match(
        indexSource,
        /type="module" src="\.\/bootstrap-9\.9\.48\.js"/
=======
test("la v9.9.47 charge l'application par un bootstrap propre à la release", () => {
    assert.equal(version, "9.9.47");
    assert.match(
        indexSource,
        /type="module" src="\.\/bootstrap-9\.9\.47\.js"/
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
    );
    assert.doesNotMatch(
        indexSource,
        /type="module" src="\.\/app\.js/
    );
    assert.match(
        bootstrapSource,
<<<<<<< HEAD
        /const BUILD_ID = "9\.9\.48-pwa-reset-1"/
=======
        /const BUILD_ID = "9\.9\.47-pwa-reset-1"/
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
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
<<<<<<< HEAD
        /"\.\/bootstrap-9\.9\.48\.js"/
    );
    assert.match(
        serviceWorkerSource,
        /"\.\/app\.js\?v=9\.9\.48&build=9\.9\.48-pwa-reset-1"/
=======
        /"\.\/bootstrap-9\.9\.47\.js"/
    );
    assert.match(
        serviceWorkerSource,
        /"\.\/app\.js\?v=9\.9\.47&build=9\.9\.47-pwa-reset-1"/
>>>>>>> 52d770a83528fa73c8bfab6870d9cad4767612e9
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
