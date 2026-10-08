import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    MIX_PROFILE_SHARE_SCHEMA,
    MIX_PROFILE_SHARE_VERSION,
    MAX_SHARED_PROFILE_BYTES,
    buildMixProfileShareDocument,
    parseMixProfileShareDocument,
    getMixProfileShareFilename
} from "../core/profile-share.js";

const appSource = await readFile("app.js", "utf8");

const sampleProfile = {
    id: "local-secret-id",
    name: "Sport intense",
    icon: "🏃",
    description: "Profil test",
    isDefault: true,
    shuffleSettings: { preset: "dynamic" },
    exclusionRules: { excludedArtists: ["Test"] },
    priorityRules: { favoredArtists: ["Daft Punk"] },
    coherenceSettings: { enabled: true },
    intensitySettings: { enabled: true },
    cleanupSettings: { enabled: false },
    access_token: "must-not-leak",
    refresh_token: "must-not-leak-either",
    serverToken: "nope"
};

test("le document partagé ne contient que les champs de profil autorisés", () => {
    const payload = buildMixProfileShareDocument(sampleProfile, {
        appVersion: "11.9.1",
        exportedAt: "2026-10-07T20:00:00.000Z"
    });

    assert.equal(payload.schema, MIX_PROFILE_SHARE_SCHEMA);
    assert.equal(payload.version, MIX_PROFILE_SHARE_VERSION);
    assert.equal(payload.appVersion, "11.9.1");
    assert.equal(payload.profile.name, "Sport intense");
    assert.equal(payload.profile.isDefault, undefined);
    assert.equal(payload.profile.id, undefined);
    assert.equal(payload.profile.access_token, undefined);
    assert.equal(payload.profile.refresh_token, undefined);
    assert.equal(payload.profile.serverToken, undefined);
});

test("le parseur refuse un schéma ou une version inconnus", () => {
    assert.throws(
        () => parseMixProfileShareDocument({ schema: "other", version: 1, profile: { name: "X" } }),
        /pas un profil Shuffle\+/i
    );
    assert.throws(
        () => parseMixProfileShareDocument({ schema: MIX_PROFILE_SHARE_SCHEMA, version: 99, profile: { name: "X" } }),
        /Version de profil/i
    );
});

test("le parseur retire les champs supplémentaires avant import", () => {
    const parsed = parseMixProfileShareDocument({
        schema: MIX_PROFILE_SHARE_SCHEMA,
        version: 1,
        profile: {
            ...sampleProfile,
            name: "Import sûr"
        }
    });

    assert.equal(parsed.profile.name, "Import sûr");
    assert.equal(parsed.profile.id, undefined);
    assert.equal(parsed.profile.isDefault, undefined);
    assert.equal(parsed.profile.access_token, undefined);
});

test("le nom de fichier de partage est stable et portable", () => {
    assert.equal(
        getMixProfileShareFilename("Été / Sport ++"),
        "shuffleplus-ete-sport.profile.json"
    );
    assert.equal(getMixProfileShareFilename(""), "shuffleplus-profil.profile.json");
    assert.ok(MAX_SHARED_PROFILE_BYTES >= 64 * 1024);
});

test("l’interface expose partage, import et garde-fous d’import", () => {
    assert.match(appSource, /data-profile-action="share"/);
    assert.match(appSource, /id="importMixProfileButton"/);
    assert.match(appSource, /id="importMixProfileInput"/);
    assert.match(appSource, /navigator\.share/);
    assert.match(appSource, /MAX_SHARED_PROFILE_BYTES/);
    assert.match(appSource, /id: createSavedMixId\(\)/);
    assert.match(appSource, /isDefault: false/);
    assert.match(appSource, /getUniqueImportedProfileName/);
});
