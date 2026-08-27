import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const version = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const homeStyles = await readFile("styles/feature-home.css", "utf8");

test("la correction mobile active annonce Shuffle+ 10.0.0", () => {
    assert.equal(version, "10.0.0");
    assert.match(indexSource, /bootstrap-10\.0\.0\.js/);
    assert.match(indexSource, /startup-recovery-10\.0\.0\.js/);
});

test("la version compacte reste visible dans la barre connectée", () => {
    assert.match(appSource, /versionElement\.textContent = `v\$\{APP_VERSION\}`/);
    assert.match(
        designSource,
        /body\.is-connected \.version-line \.version\s*\{[\s\S]*?display:\s*inline-flex\s*!important/
    );
});

test("la déconnexion est une icône accessible sans capsule", () => {
    assert.match(indexSource, /id="logoutButton"[\s\S]*class="header-logout-button"/);
    assert.match(indexSource, /aria-label="Se déconnecter de Spotify"/);
    assert.match(indexSource, /header-logout-button__icon/);
    assert.doesNotMatch(indexSource, /id="logoutButton"[\s\S]{0,180}ui-button--danger/);
    assert.match(designSource, /#logoutButton\.header-logout-button[\s\S]*border:\s*0\s*!important/);
    assert.match(designSource, /#logoutButton\.header-logout-button[\s\S]*background:\s*transparent\s*!important/);
});

test("le tableau de bord espace les deux grands blocs", () => {
    assert.match(
        designSource,
        /\.app-menu-page\[data-app-menu-page="dashboard"\]\.is-active\s*\{[\s\S]*display:\s*grid;[\s\S]*gap:\s*20px;/
    );
});

test("la carte Configuration mobile garde une hauteur naturelle", () => {
    assert.match(homeStyles, /\.v9-home-next-step\s*\{[\s\S]*height:\s*auto;[\s\S]*overflow:\s*hidden;/);
    assert.match(homeStyles, /@media \(max-width: 520px\)[\s\S]*\.v9-home-next-step\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
    assert.match(homeStyles, /\.v9-home-next-step button\s*\{[\s\S]*width:\s*100%;[\s\S]*min-height:\s*48px;/);
});
