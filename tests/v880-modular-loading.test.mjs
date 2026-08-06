import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    FEATURE_STYLE_ASSETS,
    getFeatureStyleNamesForMenu
} from "../core/feature-assets.js";
import { createStylesheetLoader } from "../core/style-loader.js";

const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const indexSource = await readFile("index.html", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

function createFakeDocument() {
    const links = [];
    return {
        links,
        head: {
            append(link) {
                links.push(link);
                link.sheet = {};
                link.dataset.loaded = "true";
                link.listeners?.load?.();
            }
        },
        createElement() {
            const listeners = {};
            return {
                dataset: {},
                listeners,
                addEventListener(type, callback) {
                    listeners[type] = callback;
                }
            };
        },
        querySelector(selector) {
            const match = selector.match(/data-shuffleplus-(?:style|preload)="([^"]+)"/);
            if (!match) return null;
            return links.find((link) =>
                link.dataset.shuffleplusStyle === match[1] ||
                link.dataset.shuffleplusPreload === match[1]
            ) || null;
        },
        querySelectorAll() {
            return links;
        }
    };
}

test("la distribution active annonce Shuffle+ 9.9.44", () => {
    assert.equal(version, "9.9.44");
});

test("les feuilles de fonctionnalités sont déclarées centralement", () => {
    assert.deepEqual(getFeatureStyleNamesForMenu("settings"), ["settings"]);
    assert.deepEqual(getFeatureStyleNamesForMenu("driving"), ["driving"]);
    assert.deepEqual(getFeatureStyleNamesForMenu("dashboard"), ["home"]);
    assert.equal(FEATURE_STYLE_ASSETS.home, "./styles/feature-home.css");
    assert.equal(FEATURE_STYLE_ASSETS.search, "./styles/feature-search.css");
});

test("le chargeur ajoute une feuille versionnée une seule fois", async () => {
    const documentObject = createFakeDocument();
    const loader = createStylesheetLoader(
        { search: "./styles/feature-search.css" },
        { documentObject, version: "9.9.44" }
    );
    await loader.load("search");
    await loader.load("search");
    assert.equal(documentObject.links.length, 1);
    assert.match(documentObject.links[0].href, /feature-search\.css\?v=9\.9\.44$/);
    assert.equal(loader.isLoaded("search"), true);
});

test("la recherche universelle est chargée dynamiquement", () => {
    assert.doesNotMatch(appSource, /from ["']\.\/universal-search\.js["']/);
    assert.match(appSource, /universalSearch:\s*\(\)\s*=>\s*import\("\.\/universal-search\.js"\)/);
    assert.match(appSource, /await ensureUniversalSearchFeature\(\)/);
});

test("les styles spécialisés ne gonflent plus la feuille initiale", () => {
    assert.doesNotMatch(styleSource, /Shuffle\+ v9\.9\.44 — Recherche compacte/);
    assert.doesNotMatch(designSource, /Mode conduite v8\.4 : progression/);
    assert.doesNotMatch(indexSource, /feature-home\.css|feature-search\.css|feature-settings\.css|feature-driving\.css/);
});
