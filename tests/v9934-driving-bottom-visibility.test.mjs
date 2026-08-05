import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [version, appSource, drivingCss] = await Promise.all([
    readFile(new URL("../VERSION", import.meta.url), "utf8").then((value) => value.trim()),
    readFile(new URL("../app.js", import.meta.url), "utf8"),
    readFile(new URL("../styles/feature-driving.css", import.meta.url), "utf8")
]);

test("Shuffle+ 9.9.40 utilise la hauteur réellement visible de Safari", () => {
    assert.equal(version, "9.9.40");
    assert.match(appSource, /const visualViewport = window\.visualViewport;/);
    assert.match(appSource, /--driving-viewport-height/);
    assert.match(appSource, /--driving-browser-bottom-clearance/);
    assert.match(appSource, /window\.visualViewport\?\.addEventListener\(\s*"scroll"/);
});

test("le bas du mode conduite dispose d'un espace de scroll sécurisé", () => {
    assert.match(
        drivingCss,
        /Shuffle\+ v9\.9\.34 — bas du mode conduite accessible sur Safari iPhone/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-mode-page::after\s*\{[\s\S]*?--driving-browser-bottom-clearance/
    );
    assert.match(
        drivingCss,
        /scroll-padding-bottom:\s*calc\([\s\S]*?env\(safe-area-inset-bottom\)/
    );
});
