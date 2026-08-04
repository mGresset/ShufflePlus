import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    FINALIZATION_CHECKS,
    buildReleaseReadiness,
    buildReleaseReadinessExport,
    normalizeFinalizationState,
    updateFinalizationConfirmation
} from "../core/release-readiness.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const indexSource = await readFile("index.html", "utf8");
const settingsStyles = await readFile("styles/feature-settings.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");
const packageSource = JSON.parse(await readFile("package.json", "utf8"));

function healthySnapshot() {
    const ids = [
        "secure-context",
        "local-storage",
        "storage-schema",
        "feature-loader"
    ];
    return {
        checks: ids.map((id) => ({ id, available: true }))
    };
}

test("la préversion finale active annonce Shuffle+ 9.9.21", () => {
    assert.equal(version, "9.9.21");
    assert.match(indexSource, /release-candidate/);
});

test("les validations terrain sont normalisées et horodatées", () => {
    const empty = normalizeFinalizationState({
        confirmations: {
            inconnu: { confirmed: true }
        }
    });
    const updated = updateFinalizationConfirmation(
        empty,
        "spotify-playback",
        true,
        12_345
    );

    assert.equal(Object.keys(empty.confirmations).length, FINALIZATION_CHECKS.length);
    assert.equal(updated.confirmations["spotify-playback"].confirmed, true);
    assert.equal(updated.confirmations["spotify-playback"].confirmedAt, 12_345);
});

test("la préparation reste candidate tant que les essais réels ne sont pas tous confirmés", () => {
    const readiness = buildReleaseReadiness({
        appVersion: version,
        healthSnapshot: healthySnapshot(),
        finalizationState: {},
        buildValidated: true,
        serverTestsValidated: true
    });

    assert.equal(readiness.status.id, "candidate");
    assert.equal(readiness.automaticPassed, readiness.automaticTotal);
    assert.equal(readiness.fieldPassed, 0);
    assert.ok(readiness.score >= 50 && readiness.score < 100);
});

test("la préparation devient prête uniquement après les cinq validations terrain", () => {
    let state = normalizeFinalizationState();
    FINALIZATION_CHECKS.forEach((check, index) => {
        state = updateFinalizationConfirmation(
            state,
            check.id,
            true,
            20_000 + index
        );
    });
    const readiness = buildReleaseReadiness({
        appVersion: version,
        healthSnapshot: healthySnapshot(),
        finalizationState: state,
        buildValidated: true,
        serverTestsValidated: true
    });

    assert.equal(readiness.status.id, "ready");
    assert.equal(readiness.score, 100);
    assert.equal(readiness.fieldPassed, FINALIZATION_CHECKS.length);
});

test("un contrôle automatique manquant bloque la préparation", () => {
    const snapshot = healthySnapshot();
    snapshot.checks.find((check) => check.id === "storage-schema").available = false;
    const readiness = buildReleaseReadiness({
        healthSnapshot: snapshot,
        buildValidated: true,
        serverTestsValidated: true
    });

    assert.equal(readiness.status.id, "blocked");
    assert.equal(readiness.blockingCount, 1);
});

test("le rapport de préparation reste privé", () => {
    const readiness = buildReleaseReadiness({
        appVersion: version,
        healthSnapshot: healthySnapshot(),
        buildValidated: true,
        serverTestsValidated: true
    });
    const exported = buildReleaseReadinessExport(readiness, {});
    const serialized = JSON.stringify(exported);

    assert.match(exported.privacy, /aucun jeton Spotify/i);
    assert.doesNotMatch(serialized, /client_secret|refresh_token|access_token/i);
});

test("l’interface, la sauvegarde et le cache intègrent la préparation v10", () => {
    assert.match(appSource, /Pré-finalisation v10/);
    assert.match(appSource, /data-finalization-check/);
    assert.match(appSource, /payload\.data\.finalizationState/);
    assert.match(settingsStyles, /\.release-readiness-panel/);
    assert.match(serviceWorkerSource, /core\/release-readiness\.js/);
    assert.match(packageSource.scripts.check, /check-release-readiness\.mjs/);
});
