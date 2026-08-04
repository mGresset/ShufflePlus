import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");

test("Shuffle+ 9.9.29 ancre le menu mobile au Visual Viewport", () => {
    assert.equal(version, "9.9.29");
    assert.match(
        appSource,
        /function syncMobilePrimaryNavigationViewport\(\)/
    );
    assert.match(
        appSource,
        /visualViewport\?\.offsetTop[\s\S]*visualViewport\?\.height/
    );
    assert.match(
        appSource,
        /viewportTop \+ viewportHeight - menuHeight/
    );
});

test("la barre remplace bottom par une position top synchronisée sur téléphone", () => {
    assert.match(
        styleSource,
        /\.app-menu\.app-menu--primary\.is-mobile-viewport-anchored \{[\s\S]*top:\s*var\(--mobile-primary-menu-top\) !important;[\s\S]*bottom:\s*auto !important;/
    );
    assert.match(
        styleSource,
        /--mobile-primary-menu-height, 82px/
    );
});

test("la position est recalculée pendant le scroll, le resize et l’orientation", () => {
    assert.match(
        appSource,
        /window\.addEventListener\(\s*"scroll",\s*scheduleMobilePrimaryNavigationViewportSync/
    );
    assert.match(
        appSource,
        /window\.visualViewport\?\.addEventListener\(\s*"scroll",\s*scheduleMobilePrimaryNavigationViewportSync/
    );
    assert.match(
        appSource,
        /window\.visualViewport\?\.addEventListener\(\s*"resize",\s*scheduleMobilePrimaryNavigationViewportSync/
    );
    assert.match(
        appSource,
        /orientationchange[\s\S]*scheduleMobilePrimaryNavigationViewportSync\(\)/
    );
});

test("chaque rendu réancre la navigation nouvellement créée", () => {
    assert.match(
        appSource,
        /if \(preserveLiveScroll\)[\s\S]*restoreExactWindowScrollPosition\([\s\S]*else \{[\s\S]*restoreAppMenuScrollPosition\([\s\S]*scheduleMobilePrimaryNavigationViewportSync\(\);/
    );
});
