import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, appSource, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 10.4.0 ancre la conduite au visual viewport Safari", () => {
    assert.equal(version, "10.4.0");
    assert.match(appSource, /--driving-viewport-offset-top/);
    assert.match(appSource, /visualViewport\?\.offsetTop/);
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.app\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*var\(--driving-viewport-offset-top/
    );
});

test("la page conduite principale reste non défilable", () => {
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-mode-page,[\s\S]*?overflow:\s*hidden;[\s\S]*?overscroll-behavior:\s*none;/
    );
    assert.match(appSource, /function syncDrivingCompactLayout\(\)/);
    assert.match(appSource, /page\.scrollTop = 0/);
});
