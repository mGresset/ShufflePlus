import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const appSource = await readFile("app.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const buildSource = await readFile("scripts/build.mjs", "utf8");
const versionSource = (await readFile("VERSION", "utf8")).trim();

test("la v8.7.0 charge le design system après les styles historiques", () => {
    assert.equal(versionSource, "8.7.0");

    const legacyStyle = indexSource.indexOf("style.css?v=8.7.0");
    const designStyle = indexSource.indexOf("design-system.css?v=8.7.0");

    assert.ok(legacyStyle > 0);
    assert.ok(designStyle > legacyStyle);
    assert.match(workerSource, /design-system\.css\?v=8\.7\.0/);
    assert.match(buildSource, /"design-system\.css"/);
});

test("les anciens noms de variables de thème sont reliés à la palette active", () => {
    assert.match(designSource, /--accent-color:\s*var\(--accent\)/);
    assert.match(designSource, /--muted-text:\s*var\(--text-muted\)/);
    assert.match(designSource, /--text-primary:\s*var\(--text-main\)/);
    assert.match(designSource, /--border-color:\s*var\(--border-soft\)/);
});

test("le design system expose des variantes cohérentes de boutons", () => {
    assert.match(designSource, /\.ui-button--primary/);
    assert.match(designSource, /\.ui-button--secondary/);
    assert.match(designSource, /\.ui-button--ghost/);
    assert.match(designSource, /\.ui-button--danger/);
    assert.match(designSource, /--ui-control-height:\s*46px/);
    assert.match(designSource, /--ui-radius-md:\s*14px/);
});

test("l’accueil et le centre de lancement utilisent les variantes sémantiques", () => {
    assert.match(
        appSource,
        /class="primary-launch-button ui-button ui-button--primary"/
    );
    assert.match(
        appSource,
        /class="launch-center-primary ui-button ui-button--primary"/
    );
    assert.match(
        appSource,
        /class="ui-button ui-button--ghost"[\s\S]*data-guided-nav="quick"/
    );
    assert.match(
        appSource,
        /class="ui-button ui-button--secondary"[\s\S]*data-share-universal-launch/
    );
});

test("les formulaires, états actifs et réglages d’accessibilité suivent le thème", () => {
    assert.match(designSource, /select,[\s\S]*textarea/);
    assert.match(designSource, /accent-color:\s*var\(--accent\)/);
    assert.match(designSource, /html\.high-contrast/);
    assert.match(designSource, /html\.reduce-motion/);
    assert.match(designSource, /\.app-menu-button\.is-active/);
});
