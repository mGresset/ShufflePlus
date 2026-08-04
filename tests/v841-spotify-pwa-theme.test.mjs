import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const versionSource = (await readFile("VERSION", "utf8")).trim();
const packageSource = await readFile("package.json", "utf8");
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const pwaUiSource = await readFile("core/pwa-install-ui.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const settingsStyleSource = await readFile("styles/feature-settings.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

const v841Design = designSource.split(
    "Shuffle+ v8.4.1 — Connexion Spotify lisible et PWA liée au thème"
)[1] || "";
const pwaThemeSource = settingsStyleSource;

test("la distribution active annonce Shuffle+ 9.9.22", () => {
    assert.equal(versionSource, "9.9.22");
    assert.match(packageSource, /"version": "9\.9\.22"/);
    assert.match(indexSource, /shuffleplus-version" content="9\.9\.22/);
    assert.match(indexSource, /startup-recovery-9\.9\.22\.js/);
    assert.match(appSource, /const APP_VERSION = "9\.9\.22"/);
    assert.match(workerSource, /shuffleplus-v9\.9\.22/);
});

test("le Client ID Spotify possède un bloc explicatif autonome", () => {
    assert.match(indexSource, /class="spotify-client-id-card"/);
    assert.match(indexSource, /id="spotifyClientIdTitle">Renseigner le Client ID/);
    assert.match(indexSource, /Ne renseigne jamais le Client Secret/);
    assert.match(indexSource, /aria-describedby="spotifySetupClientIdHelp"/);
    assert.match(indexSource, /id="spotifySetupClientIdHelp"/);
});

test("les actions Client ID sont regroupées sous un champ pleine largeur", () => {
    assert.match(indexSource, /class="spotify-client-id-field"[\s\S]*class="spotify-client-id-actions"/);
    assert.match(indexSource, /spotify-client-id-actions[\s\S]*Enregistrer et continuer[\s\S]*openSpotifyDeveloperButton/);
    assert.match(v841Design, /\.spotify-setup-form[\s\S]*grid-template-columns:\s*1fr\s*!important/);
    assert.match(v841Design, /\.spotify-client-id-actions[\s\S]*grid-template-columns:/);
    assert.match(v841Design, /\.spotify-client-id-field > input[\s\S]*width:\s*100%/);
});

test("les capacités PWA utilisent des indicateurs pilotés par le thème", () => {
    assert.match(pwaUiSource, /class="pwa-capability \$\{serviceWorkerSupported \? "is-ready" : "is-unavailable"\}"/);
    assert.match(pwaUiSource, /class="pwa-capability \$\{standalone \? "is-ready" : "is-info"\}"/);
    assert.match(pwaUiSource, /class="ui-button \$\{safeState\.id === "installed" \? "ui-button--secondary" : "ui-button--primary"\}"/);
    assert.doesNotMatch(pwaUiSource, /\$\{serviceWorkerSupported \? "✅" : "❌"\}/);
});

test("la couche v8.4.1 remplace les verts PWA par la palette active", () => {
    assert.ok(pwaThemeSource.length > 0);
    assert.match(pwaThemeSource, /\.pwa-state-installed,[\s\S]*background:\s*rgb\(var\(--accent-rgb\)/);
    assert.match(pwaThemeSource, /\.pwa-capability > b[\s\S]*var\(--accent\)/);
    assert.match(pwaThemeSource, /\.pwa-settings-actions \.ui-button--primary[\s\S]*var\(--accent-secondary\)/);
    assert.doesNotMatch(pwaThemeSource, /#1ed760|#1d5d36|#9cf0b8|#315d40|#10281a/i);
});
