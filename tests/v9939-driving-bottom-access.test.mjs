import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, appSource, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 9.9.44 ancre la conduite au visual viewport Safari", () => {
    assert.equal(version, "9.9.44");
    assert.match(appSource, /--driving-viewport-offset-top/);
    assert.match(appSource, /visualViewport\?\.offsetTop/);
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.app\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?top:\s*var\(--driving-viewport-offset-top/
    );
});

test("le défilement conduite est conservé pendant les rerendus", () => {
    assert.match(appSource, /let drivingPageScrollTop = 0;/);
    assert.match(
        appSource,
        /previousDrivingPage\.scrollTop/
    );
    assert.match(
        appSource,
        /drivingPage\.scrollTop = Math\.min\(\s*drivingPageScrollTop/
    );
});

test("une réserve basse suffisante laisse remonter les derniers contrôles", () => {
    assert.match(
        drivingCss,
        /Shuffle\+ v9\.9\.39 — viewport Safari ancré et bas de conduite durable/
    );
    assert.match(
        drivingCss,
        /driving-mode-page::after\s*\{[\s\S]*?min-height:\s*max\(\s*144px/
    );
    assert.match(
        drivingCss,
        /scroll-padding-bottom:\s*max\(\s*144px/
    );
});
