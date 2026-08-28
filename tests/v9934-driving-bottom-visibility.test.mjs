import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, appSource, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 10.4.0 utilise la hauteur réellement visible de Safari", () => {
    assert.equal(version, "10.4.0");
    assert.match(appSource, /const visualViewport = window\.visualViewport;/);
    assert.match(appSource, /--driving-viewport-height/);
    assert.match(appSource, /--driving-viewport-offset-top/);
    assert.match(appSource, /window\.visualViewport\?\.addEventListener\(\s*"scroll"/);
});

test("le bas du mode conduite ne dépend plus d’un spacer artificiel", () => {
    assert.match(
        drivingCss,
        /\.driving-mode-page::after\s*\{[\s\S]*?content:\s*none;[\s\S]*?display:\s*none;/
    );
    assert.doesNotMatch(drivingCss, /scroll-padding-bottom:\s*max\(\s*144px/);
    assert.doesNotMatch(drivingCss, /min-height:\s*max\(\s*144px/);
});
