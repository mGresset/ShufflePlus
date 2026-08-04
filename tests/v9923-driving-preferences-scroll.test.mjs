import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const appSource = await readFile("app.js", "utf8");
const drivingCss = await readFile("styles/feature-driving.css", "utf8");


test("les préférences ouvertes deviennent un volet mobile autonome", () => {
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-preferences-panel\[open\][\s\S]*position:\s*fixed;[\s\S]*inset:[\s\S]*display:\s*flex;[\s\S]*overflow:\s*hidden;/
    );
});


test("la liste des préférences défile jusqu'au dernier réglage sur iPhone", () => {
    assert.match(
        drivingCss,
        /\.driving-preferences-panel\[open\][\s\S]*\.driving-preferences-grid[\s\S]*min-height:\s*0;[\s\S]*max-height:\s*none;[\s\S]*overflow-y:\s*auto;[\s\S]*-webkit-overflow-scrolling:\s*touch;/
    );
    assert.match(drivingCss, /touch-action:\s*pan-y;/);
});


test("un rerendu conserve la position interne du panneau", () => {
    assert.match(appSource, /let drivingPreferencesScrollTop = 0;/);
    assert.match(
        appSource,
        /previousPreferencesGrid[\s\S]*drivingPreferencesScrollTop[\s\S]*previousPreferencesGrid\.scrollTop/
    );
    assert.match(
        appSource,
        /requestAnimationFrame\(\(\) => \{[\s\S]*preferencesGrid\.scrollTop = Math\.min/
    );
});
