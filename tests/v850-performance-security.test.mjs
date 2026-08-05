import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    SHUFFLEPLUS_CSP,
    getSecurityPolicyDiagnostics,
    isTrustedExternalUrl,
    openTrustedExternalUrl
} from "../core/security-policy.js";
import {
    getRuntimePerformanceSnapshot,
    markDeferredSections,
    optimizeImageElement,
    scheduleIdleTask
} from "../core/runtime-performance.js";
import {
    buildPwaInstallState,
    renderPwaInstallGuideMarkup,
    renderPwaSettingsPanelMarkup
} from "../core/pwa-install-ui.js";
import {
    applySpotifySetupView,
    renderSpotifyConnectionSettingsPanelMarkup
} from "../core/spotify-setup-ui.js";

const versionSource = (await readFile("VERSION", "utf8")).trim();
const indexSource = await readFile("index.html", "utf8");
const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const designSource = await readFile("design-system.css", "utf8");
const localServerSource = await readFile("scripts/serve-local.mjs", "utf8");

function createAttributeElement({ tagName = "IMG", priority = false } = {}) {
    const attributes = new Map();
    return {
        tagName,
        attributes,
        hasAttribute(name) {
            return attributes.has(name);
        },
        setAttribute(name, value) {
            attributes.set(name, String(value));
        },
        closest() {
            return priority ? {} : null;
        }
    };
}

test("la distribution active annonce Shuffle+ 9.9.43", () => {
    assert.equal(versionSource, "9.9.43");
    assert.match(indexSource, /shuffleplus-version" content="9\.9\.43/);
    assert.match(indexSource, /startup-recovery-9\.9\.43\.js" defer/);
    assert.match(appSource, /const APP_VERSION = "9\.9\.43"/);
    assert.match(workerSource, /shuffleplus-v9\.9\.43/);
});

test("la CSP bloque les scripts inline, eval, les objets et les frames", () => {
    const diagnostics = getSecurityPolicyDiagnostics(SHUFFLEPLUS_CSP);

    assert.equal(diagnostics.valid, true);
    assert.equal(diagnostics.allowsInlineScripts, false);
    assert.equal(diagnostics.allowsEval, false);
    assert.match(SHUFFLEPLUS_CSP, /object-src 'none'/);
    assert.match(SHUFFLEPLUS_CSP, /script-src-attr 'none'/);
    assert.match(indexSource, /http-equiv="Content-Security-Policy"/);
    assert.match(localServerSource, /"Content-Security-Policy": SHUFFLEPLUS_CSP/);
    assert.doesNotMatch(appSource, /window\.open\s*\(/);
});

test("les ouvertures externes sont limitées aux hôtes Spotify approuvés", () => {
    assert.equal(isTrustedExternalUrl("https://developer.spotify.com/dashboard"), true);
    assert.equal(isTrustedExternalUrl("https://open.spotify.com/track/abc"), true);
    assert.equal(isTrustedExternalUrl("http://open.spotify.com/"), false);
    assert.equal(isTrustedExternalUrl("https://example.com/"), false);

    const calls = [];
    const opened = openTrustedExternalUrl(
        "https://open.spotify.com/",
        {
            windowObject: {
                open(...args) {
                    calls.push(args);
                    return {};
                }
            }
        }
    );

    assert.equal(opened, true);
    assert.deepEqual(calls[0], [
        "https://open.spotify.com/",
        "_blank",
        "noopener,noreferrer"
    ]);
});

test("les images secondaires sont rendues paresseusement sans ralentir les pochettes prioritaires", () => {
    const secondary = createAttributeElement();
    const priority = createAttributeElement({ priority: true });

    assert.equal(optimizeImageElement(secondary), true);
    assert.equal(secondary.attributes.get("loading"), "lazy");
    assert.equal(secondary.attributes.get("decoding"), "async");
    assert.equal(secondary.attributes.get("fetchpriority"), "low");

    optimizeImageElement(priority);
    assert.equal(priority.attributes.get("loading"), "eager");
    assert.equal(priority.attributes.get("fetchpriority"), "high");
});

test("les sections longues reçoivent le rendu différé", () => {
    const classes = new Set();
    const section = {
        classList: {
            contains(value) {
                return classes.has(value);
            },
            add(value) {
                classes.add(value);
            }
        },
        closest() {
            return null;
        }
    };
    const root = {
        querySelectorAll() {
            return [section];
        }
    };

    assert.equal(markDeferredSections(root), 1);
    assert.equal(classes.has("ui-deferred-section"), true);
    assert.match(designSource, /\.ui-deferred-section[\s\S]*content-visibility:\s*auto/);
});

test("la planification de performance reste compatible sans requestIdleCallback", async () => {
    let ran = false;
    const timers = [];
    const globalObject = {
        setTimeout(callback) {
            timers.push(callback);
            return 1;
        },
        clearTimeout() {}
    };

    scheduleIdleTask(() => {
        ran = true;
    }, { globalObject });

    assert.equal(ran, false);
    timers[0]();
    assert.equal(ran, true);

    const snapshot = getRuntimePerformanceSnapshot({
        getEntriesByType(type) {
            if (type === "navigation") {
                return [{ domContentLoadedEventEnd: 128.4, loadEventEnd: 244.7 }];
            }
            return [{ transferSize: 1200 }, { transferSize: 800 }];
        }
    });

    assert.deepEqual(snapshot, {
        available: true,
        resources: 2,
        domContentLoadedMs: 128,
        loadMs: 245,
        transferBytes: 2000
    });
});

test("l’interface PWA est maintenant isolée dans un module testable", () => {
    const state = buildPwaInstallState({ promptAvailable: true });
    assert.equal(state.id, "available");

    const markup = renderPwaSettingsPanelMarkup({
        state,
        serviceWorkerSupported: true,
        cacheAvailable: true,
        standalone: false
    });
    assert.match(markup, /Installation disponible/);
    assert.match(markup, /ui-button--primary/);
    assert.match(markup, /Cache de l’interface/);

    assert.match(
        renderPwaInstallGuideMarkup({ ios: true }),
        /Sur l’écran d’accueil/
    );
    assert.match(appSource, /renderPwaSettingsPanelMarkup/);
});

test("la vue Spotify extraite garde le champ, le focus et les réglages", () => {
    let focused = false;
    const elements = {
        panel: { hidden: true },
        redirect: { textContent: "" },
        loginButton: { hidden: false, disabled: true, textContent: "" },
        clientIdInput: { focus() { focused = true; } }
    };

    applySpotifySetupView({
        configuration: {},
        redirectUri: "https://mgresset.github.io/ShufflePlus/",
        connected: false,
        focus: true,
        elements,
        requestAnimationFrame(callback) {
            callback();
        }
    });

    assert.equal(elements.panel.hidden, false);
    assert.equal(elements.loginButton.hidden, true);
    assert.equal(elements.redirect.textContent, "https://mgresset.github.io/ShufflePlus/");
    assert.equal(focused, true);

    const settingsMarkup = renderSpotifyConnectionSettingsPanelMarkup({
        configuration: { clientId: "12345678901234567890" },
        redirectUri: "https://mgresset.github.io/ShufflePlus/",
        drivingModeAvailable: true,
        maskedClientId: "1234…7890"
    });
    assert.match(settingsMarkup, /Configurée/);
    assert.match(settingsMarkup, /1234…7890/);
    assert.match(settingsMarkup, /Disponible sur cet appareil/);
});

test("le Service Worker précharge les quatre modules v8.5", () => {
    assert.match(workerSource, /\.\/core\/pwa-install-ui\.js/);
    assert.match(workerSource, /\.\/core\/spotify-setup-ui\.js/);
    assert.match(workerSource, /\.\/core\/security-policy\.js/);
    assert.match(workerSource, /\.\/core\/runtime-performance\.js/);
});
