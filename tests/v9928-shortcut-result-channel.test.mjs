import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import {
    buildShortcutResultEndpoint,
    normalizeShortcutResultRequestId,
    normalizeShortcutResultServerUrl,
    publishShortcutResult,
    readShortcutResultChannelConfig
} from "../core/shortcut-result-channel.js";

const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const version = (await readFile("VERSION", "utf8")).trim();

test("Shuffle+ 9.9.45 publie un résultat de raccourci sur Railway", () => {
    assert.equal(version, "9.9.45");
    assert.match(appSource, /publishAutomationResult/);
    assert.match(appSource, /status: "running"/);
    assert.match(workerSource, /core\/shortcut-result-channel\.js/);
});

test("l’identifiant de requête reste une capacité URL sûre", () => {
    assert.equal(
        normalizeShortcutResultRequestId("550e8400-e29b-41d4-a716-446655440000"),
        "550e8400-e29b-41d4-a716-446655440000"
    );
    assert.equal(normalizeShortcutResultRequestId("../secret"), "");
});

test("le serveur de résultat exige HTTPS hors développement local", () => {
    assert.equal(
        normalizeShortcutResultServerUrl("https://shuffleplus.up.railway.app/"),
        "https://shuffleplus.up.railway.app"
    );
    assert.equal(
        normalizeShortcutResultServerUrl("http://shuffleplus.example.com"),
        ""
    );
    assert.equal(
        normalizeShortcutResultServerUrl("http://127.0.0.1:8787/"),
        "http://127.0.0.1:8787"
    );
});

test("la configuration est lue depuis l’URL de lancement", () => {
    const config = readShortcutResultChannelConfig(
        new URLSearchParams({
            requestId: "550e8400-e29b-41d4-a716-446655440000",
            resultServer: "https://shuffleplus.up.railway.app"
        })
    );
    assert.equal(config.enabled, true);
    assert.match(
        buildShortcutResultEndpoint(config),
        /\/v1\/launch-results\/550e8400-e29b-41d4-a716-446655440000$/
    );
});

test("la publication envoie un JSON minimal et retente en cas d’échec", async () => {
    const calls = [];
    const fetchImpl = async (url, options) => {
        calls.push({ url, options });
        return {
            ok: calls.length > 1,
            status: calls.length > 1 ? 201 : 503
        };
    };

    const result = await publishShortcutResult(
        {
            requestId: "550e8400-e29b-41d4-a716-446655440000",
            serverUrl: "https://shuffleplus.up.railway.app"
        },
        {
            version: "9.9.45",
            status: "success",
            device: "iPhone",
            message: "Lecture confirmée"
        },
        { fetchImpl, attempts: 2, timeoutMs: 1000 }
    );

    assert.equal(result.published, true);
    assert.equal(calls.length, 2);
    const payload = JSON.parse(calls[1].options.body);
    assert.equal(payload.success, true);
    assert.equal(payload.status, "success");
    assert.equal(payload.device, "iPhone");
});
