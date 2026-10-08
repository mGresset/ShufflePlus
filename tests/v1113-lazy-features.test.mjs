import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createFeatureLoader, createLazyFeatureAccessor } from "../core/feature-loader.js";

const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

function shellBlock(name) {
    const match = workerSource.match(new RegExp(`const\\s+${name}\\s*=\\s*\\[([\\s\\S]*?)\\];`));
    return match?.[1] || "";
}

test("l’Assistant musical quitte le graphe statique du noyau", () => {
    assert.doesNotMatch(appSource, /from ["']\.\/musical-assistant\.js["']/);
    assert.match(appSource, /musicalAssistant:\s*\(\)\s*=>\s*import\("\.\/musical-assistant\.js"\)/);
    assert.match(appSource, /await ensureMusicalAssistantFeature\(\)/);
});

test("le partage de profils est chargé uniquement au premier usage", () => {
    assert.doesNotMatch(appSource, /from ["']\.\/core\/profile-share\.js["']/);
    assert.match(appSource, /profileShare:\s*\(\)\s*=>\s*import\("\.\/core\/profile-share\.js"\)/);
    assert.match(appSource, /await ensureProfileShareFeature\(\)/);
});

test("les deux modules différés restent disponibles dans le shell PWA optionnel", () => {
    const runtime = shellBlock("RUNTIME_APP_SHELL");
    const optional = shellBlock("OPTIONAL_APP_SHELL");
    assert.doesNotMatch(runtime, /musical-assistant\.js|core\/profile-share\.js/);
    assert.match(optional, /\.\/musical-assistant\.js/);
    assert.match(optional, /\.\/core\/profile-share\.js/);
});

test("l’accesseur lazy déduplique les chargements concurrents", async () => {
    let calls = 0;
    const loader = createFeatureLoader({
        demo: async () => {
            calls += 1;
            await Promise.resolve();
            return { ready: true };
        }
    });
    const feature = createLazyFeatureAccessor(loader, "demo");
    const [a, b] = await Promise.all([feature.load(), feature.load()]);
    assert.equal(calls, 1);
    assert.equal(a, b);
    assert.equal(feature.isLoaded(), true);
    assert.equal(feature.get().ready, true);
});
