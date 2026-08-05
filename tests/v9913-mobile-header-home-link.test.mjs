import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");

test("la barre mobile active annonce Shuffle+ 9.9.34", () => {
    assert.equal(version, "9.9.34");
    assert.match(indexSource, /bootstrap-9\.9\.34\.js/);
    assert.match(indexSource, /startup-recovery-9\.9\.34\.js/);
});

test("la version et l’état réseau restent côte à côte sur mobile", () => {
    assert.match(
        designSource,
        /@media \(max-width: 760px\)[\s\S]*body\.is-connected \.version-line\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*flex-direction:\s*row;[\s\S]*flex-wrap:\s*nowrap;/
    );
});

test("le logo Shuffle+ est un lien accessible vers l’accueil", () => {
    assert.match(indexSource, /id="brandHomeLink"/);
    assert.match(indexSource, /href="\.\/"/);
    assert.match(indexSource, /aria-label="Revenir à l’accueil Shuffle\+"/);
    assert.match(appSource, /brandHomeLink\.addEventListener\("click"/);
    assert.match(appSource, /await navigateToAppMenu\("dashboard"\)/);
    assert.match(appSource, /dashboard:\s*0/);
});

test("le lien de marque conserve un focus et une cible tactile", () => {
    assert.match(designSource, /\.brand-home-link:focus-visible\s*\{[\s\S]*outline:/);
    assert.match(designSource, /body\.is-connected \.brand-home-link\s*\{[\s\S]*min-height:\s*44px;/);
});
