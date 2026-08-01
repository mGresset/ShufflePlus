import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    SIMPLE_SYNC_MERGE_CHOICES,
    buildSimpleSyncSummary,
    getServerSyncLastActivity,
    getSimpleServerSyncStatus,
    normalizeServerSetupStep
} from "../core/server-sync-ui.js";

const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");

test("l’état simplifié distingue connexion, travail, conflit et erreur", () => {
    assert.equal(
        getSimpleServerSyncStatus({ connected: true }).key,
        "connected"
    );
    assert.equal(
        getSimpleServerSyncStatus({ connected: true, busy: true }).key,
        "syncing"
    );
    assert.equal(
        getSimpleServerSyncStatus({ connected: true, pendingConflict: true }).key,
        "choice-required"
    );
    assert.equal(
        getSimpleServerSyncStatus({ connected: true, lastError: "échec" }).key,
        "error"
    );
});

test("la dernière activité retient l’opération la plus récente", () => {
    assert.equal(
        getServerSyncLastActivity({
            connectedAt: 100,
            lastPushAt: 300,
            lastPullAt: 200
        }),
        300
    );
});

test("l’assistant de connexion reste limité aux deux étapes interactives", () => {
    assert.equal(normalizeServerSetupStep(1), 1);
    assert.equal(normalizeServerSetupStep(2), 2);
    assert.equal(normalizeServerSetupStep(9), 1);
});

test("la fusion recommandée combine toutes les catégories", () => {
    assert.deepEqual(
        Object.values(SIMPLE_SYNC_MERGE_CHOICES),
        ["merge", "merge", "merge", "merge", "merge", "merge"]
    );
});

test("le résumé simple reste compréhensible avec ou sans nouveautés", () => {
    assert.match(
        buildSimpleSyncSummary({
            before: { mixes: 2, profiles: 1 },
            after: { mixes: 4, profiles: 2 }
        }),
        /2 mix.*1 profil/
    );
    assert.match(
        buildSimpleSyncSummary({
            before: { mixes: 2 },
            after: { mixes: 2 },
            merged: true
        }),
        /combinées.*Aucune donnée n’a été supprimée/
    );
});

test("Shuffle+ 8.1 affiche un parcours simple et masque les outils techniques", () => {
    assert.match(appSource, /Synchroniser maintenant/);
    assert.match(appSource, /Tester et continuer/);
    assert.match(appSource, /Créer une nouvelle sauvegarde/);
    assert.match(appSource, /Rejoindre une sauvegarde existante/);
    assert.match(appSource, /Combiner les deux — recommandé/);
    assert.match(appSource, /<summary>Options avancées<\/summary>/);
    assert.match(appSource, /async function synchronizeServerNow\(/);
    assert.match(appSource, /async function mergePendingServerSyncAutomatically\(/);
    assert.match(styleSource, /\.simple-sync-main-button/);
    assert.match(styleSource, /\.simple-sync-choice-grid/);
    assert.match(workerSource, /\.\/core\/server-sync-ui\.js/);
});
