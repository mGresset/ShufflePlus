import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
    buildShortcutCallbackUrl,
    normalizeShortcutCallbackUrl,
    readShortcutCallbackConfig
} from "../core/shortcut-callback.js";

test("les callbacks acceptent uniquement le schéma Shortcuts", () => {
    assert.match(
        normalizeShortcutCallbackUrl(
            "shortcuts://x-callback-url/ic-success/123"
        ),
        /^shortcuts:\/\//
    );
    assert.equal(
        normalizeShortcutCallbackUrl("https://example.com/return"),
        ""
    );
    assert.equal(
        normalizeShortcutCallbackUrl("javascript:alert(1)"),
        ""
    );
});

test("les trois paramètres x-callback sont lus depuis l’URL", () => {
    const params = new URLSearchParams({
        "x-success": "shortcuts://x-callback-url/ic-success/ok",
        "x-error": "shortcuts://x-callback-url/ic-error/ko",
        "x-cancel": "shortcuts://x-callback-url/ic-cancel/stop"
    });
    const callbacks = readShortcutCallbackConfig(params);

    assert.equal(callbacks.enabled, true);
    assert.match(callbacks.successUrl, /ic-success/);
    assert.match(callbacks.errorUrl, /ic-error/);
    assert.match(callbacks.cancelUrl, /ic-cancel/);
});

test("un succès renvoie un résultat JSON au raccourci", () => {
    const callbackUrl = buildShortcutCallbackUrl(
        {
            successUrl: "shortcuts://x-callback-url/ic-success/ok"
        },
        {
            version: "10.4.0",
            status: "success",
            action: "quickplay",
            device: "iPhone enregistré",
            message: "Lecture confirmée"
        }
    );
    const url = new URL(callbackUrl);
    const result = JSON.parse(url.searchParams.get("result"));

    assert.equal(result.success, true);
    assert.equal(result.version, "10.4.0");
    assert.equal(result.device, "iPhone enregistré");
});

test("une erreur utilise x-error et fournit le message", () => {
    const callbackUrl = buildShortcutCallbackUrl(
        {
            successUrl: "shortcuts://x-callback-url/ic-success/ok",
            errorUrl: "shortcuts://x-callback-url/ic-error/ko"
        },
        {
            status: "error",
            code: "DEVICE_NOT_FOUND",
            message: "iPhone enregistré indisponible"
        }
    );
    const url = new URL(callbackUrl);

    assert.match(url.pathname, /ic-error/);
    assert.equal(
        url.searchParams.get("errorMessage"),
        "iPhone enregistré indisponible"
    );
    assert.equal(
        url.searchParams.get("errorCode"),
        "DEVICE_NOT_FOUND"
    );
});

test("sans x-error, l’échec revient par x-success avec success=false", () => {
    const callbackUrl = buildShortcutCallbackUrl(
        {
            successUrl: "shortcuts://x-callback-url/ic-success/ok"
        },
        {
            status: "error",
            message: "Erreur de lecture"
        }
    );
    const result = JSON.parse(
        new URL(callbackUrl).searchParams.get("result")
    );

    assert.equal(result.success, false);
    assert.equal(result.status, "error");
});

test("Shuffle+ branche le retour automatique et l’action X-Callback", async () => {
    const appSource = await readFile("app.js", "utf8");
    const serviceWorker = await readFile("service-worker.js", "utf8");

    assert.match(appSource, /readShortcutCallbackConfig\(params\)/);
    assert.match(appSource, /window\.location\.replace\(target\)/);
    assert.match(appSource, /Ouvrir les URL X-Callback/);
    assert.match(serviceWorker, /core\/shortcut-callback\.js/);
});
