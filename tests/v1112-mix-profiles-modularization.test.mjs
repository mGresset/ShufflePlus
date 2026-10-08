import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    normalizeMixProfileRecord,
    getUniqueMixProfileName,
    findMixProfileById,
    duplicateMixProfileRecord,
    restoreDefaultMixProfileRecords,
    renderMixProfilesPanel
} from "../core/mix-profiles.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const moduleSource = await readFile("core/mix-profiles.js", "utf8");
const budgetSource = await readFile("scripts/check-architecture-budget.mjs", "utf8");

const identity = (value = {}) => ({ ...value });
const normalizeProfile = (profile = {}) => normalizeMixProfileRecord(profile, {
    createId: () => "generated-id",
    normalizeShuffleSettings: identity,
    normalizeExclusionRules: identity,
    normalizePriorityRules: identity,
    normalizeCoherenceSettings: identity,
    normalizeIntensitySettings: identity,
    normalizeCleanupSettings: identity
});

test("Shuffle+ 11.13.0 extrait le modèle et le rendu des profils hors de app.js", () => {
    assert.equal(version, "11.13.0");
    assert.match(appSource, /from "\.\/core\/mix-profiles\.js"/);
    assert.match(appSource, /normalizeMixProfileRecord\(/);
    assert.match(appSource, /renderMixProfilesPanel\(/);
    assert.doesNotMatch(appSource, /class="mix-profile-card /);
    assert.match(moduleSource, /export function renderMixProfilesPanel/);
    assert.match(moduleSource, /data-profile-action="share"/);
});

test("le module normalise, retrouve et duplique les profils sans état global", () => {
    const source = normalizeProfile({ id: "sport", name: "Sport", icon: "🏃" });
    assert.equal(source.id, "sport");
    assert.equal(findMixProfileById([source], "sport"), source);

    const duplicated = duplicateMixProfileRecord([source], "sport", {
        normalizeProfile,
        createId: () => "copy-id",
        maxProfiles: 20
    });
    assert.equal(duplicated.reason, "ok");
    assert.equal(duplicated.duplicate.id, "copy-id");
    assert.equal(duplicated.duplicate.name, "Sport copie");
    assert.equal(duplicated.duplicate.isDefault, false);
});

test("les imports et profils par défaut restent déterministes", () => {
    const existing = [{ id: "a", name: "Sport" }, { id: "b", name: "Sport (2)" }];
    assert.equal(getUniqueMixProfileName(existing, "Sport"), "Sport (3)");

    const restored = restoreDefaultMixProfileRecords(
        [{ id: "custom", name: "Perso", isDefault: false }],
        {
            defaults: [{ id: "default", name: "Défaut", isDefault: true }],
            normalizeProfile,
            maxProfiles: 20
        }
    );
    assert.deepEqual(restored.map((profile) => profile.id), ["default", "custom"]);
});

test("le rendu modulaire conserve les actions publiques des profils", () => {
    const profile = normalizeProfile({ id: "sport", name: "Sport", icon: "🏃" });
    const html = renderMixProfilesPanel({
        profiles: [profile],
        activeProfileId: "sport",
        maxProfiles: 20,
        escapeHtml: (value) => String(value ?? ""),
        getSummary: () => "Résumé"
    });
    assert.match(html, /Profils de mix intelligents/);
    assert.match(html, /data-profile-action="apply"/);
    assert.match(html, /data-profile-action="share"/);
    assert.match(html, /id="importMixProfileButton"/);
});

test("le budget CI verrouille le niveau 11.12 de app.js", () => {
    assert.match(budgetSource, /appLines:\s*51240/);
    assert.match(budgetSource, /appBytes:\s*1_560_000/);
});
