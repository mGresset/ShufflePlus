import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const drivingCss = await readFile(
    "styles/feature-driving.css",
    "utf8"
);

test("Shuffle+ 9.9.33 utilise le viewport dynamique du navigateur", () => {
    assert.equal(version, "9.9.33");
    assert.match(
        appSource,
        /CSS\?\.supports\?\.\("height", "100dvh"\)/
    );
    assert.match(
        appSource,
        /"--driving-viewport-height",\s*"100dvh"/
    );
    assert.match(
        drivingCss,
        /height:\s*var\(--driving-viewport-height, 100dvh\)/
    );
});

test("le mode conduite mobile occupe tout le cadre et intègre ses préférences", () => {
    assert.match(
        drivingCss,
        /body\.is-driving-mode #content \{[\s\S]*display:\s*flex;[\s\S]*height:\s*100%/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-mode-page \{[\s\S]*min-height:\s*100%/
    );
    assert.match(
        drivingCss,
        /body\.is-driving-mode \.driving-preferences-panel \{[\s\S]*position:\s*static;[\s\S]*grid-area:\s*preferences/
    );
    assert.match(
        drivingCss,
        /"secondary"\s*\n\s*"preferences"\s*\n\s*"message"/
    );
});

test("les synchronisations Spotify mettent à jour le mode conduite sans reconstruire la page", () => {
    assert.match(
        appSource,
        /function updateDrivingPlaybackDom\(\)/
    );
    assert.match(
        appSource,
        /function renderActivePlaybackSurface\(\) \{[\s\S]*activeAppMenu === "driving"[\s\S]*updateDrivingPlaybackDom\(\)/
    );
    assert.match(
        appSource,
        /async function refreshDrivingPlayback\([\s\S]*if \(!updateDrivingPlaybackDom\(\)\) \{[\s\S]*renderDrivingModePage\(\)/
    );
});

test("la pochette est conservée lorsque son URL ne change pas et préchargée sinon", () => {
    assert.match(
        appSource,
        /frame\.dataset\.imageUrl === normalizedUrl[\s\S]*return;/
    );
    assert.match(appSource, /const nextImage = new Image\(\);/);
    assert.match(appSource, /nextImage\.decoding = "async";/);
    assert.match(appSource, /frame\.replaceChildren\(nextImage\);/);
    assert.match(appSource, /class="driving-cover-frame"/);
});
