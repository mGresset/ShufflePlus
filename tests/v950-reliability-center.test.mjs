import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    appendReliabilityEvent,
    buildReliabilityExport,
    buildReliabilityRecoveryPlan,
    buildReliabilityServices,
    deriveReliabilityEventFromStatus,
    formatReliabilityAge,
    normalizeReliabilityEvents
} from "../core/reliability-center.js";

const version = (await readFile("VERSION", "utf8")).trim();
const appSource = await readFile("app.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const serviceWorkerSource = await readFile("service-worker.js", "utf8");

function createSnapshot(overrides = {}) {
    return {
        runtime: {
            online: true,
            spotifyConnected: true,
            spotifyApi: {
                networkRequests: 4,
                cacheHits: 3,
                cooldownActive: false
            },
            serverSyncRecovery: {
                connected: true,
                addressAvailable: true
            },
            ...overrides.runtime
        },
        checks: [
            {
                id: "service-worker",
                available: true
            },
            {
                id: "cache",
                available: true
            }
        ],
        ...overrides
    };
}

test("la distribution active annonce Shuffle+ 9.9.28", () => {
    assert.equal(version, "9.9.28");
});

test("le journal normalise, déduplique et limite les événements", () => {
    const first = appendReliabilityEvent([], {
        category: "spotify",
        level: "success",
        label: "Lecture Spotify confirmée",
        createdAt: 1_000
    }, { now: 1_000 });
    const second = appendReliabilityEvent(first, {
        category: "spotify",
        level: "success",
        label: "Lecture Spotify confirmée",
        createdAt: 2_000
    }, { now: 2_000 });

    assert.equal(second.length, 1);
    assert.equal(second[0].count, 2);
    assert.equal(normalizeReliabilityEvents(second)[0].category, "spotify");
});

test("les statuts importants deviennent des événements génériques et privés", () => {
    const launch = deriveReliabilityEventFromStatus(
        "Playlist lancée sur Salon de Marc.",
        "",
        3_000
    );
    const server = deriveReliabilityEventFromStatus(
        "Serveur disponible · 9.9.28.",
        "success",
        4_000
    );

    assert.equal(launch.label, "Lecture Spotify confirmée");
    assert.doesNotMatch(launch.detail, /Marc/);
    assert.equal(server.label, "Serveur Railway disponible");
});

test("le centre construit quatre services et un plan de récupération", () => {
    const snapshot = createSnapshot();
    const services = buildReliabilityServices(snapshot, {
        serverHealth: {
            status: "healthy",
            version: "9.9.28",
            latencyMs: 42
        },
        queueState: {
            count: 7,
            ageMs: 20_000
        },
        activeDevice: {
            name: "iPhone",
            type: "Smartphone"
        }
    });
    const recovery = buildReliabilityRecoveryPlan(snapshot, {
        serverHealth: { status: "healthy" },
        queueState: { count: 7, ageMs: 20_000 },
        activeDevice: { name: "iPhone" }
    });

    assert.deepEqual(
        services.map((service) => service.id),
        ["spotify", "railway", "pwa", "device"]
    );
    assert.equal(services[0].level, "healthy");
    assert.equal(services[1].value, "42 ms");
    assert.equal(recovery[0].id, "run-diagnostic");
});

test("le plan propose les actions adaptées aux pannes", () => {
    const snapshot = createSnapshot({
        runtime: {
            online: true,
            spotifyConnected: false,
            spotifyApi: {},
            serverSyncRecovery: {
                connected: true,
                addressAvailable: true
            }
        },
        checks: [
            { id: "service-worker", available: false },
            { id: "cache", available: false }
        ]
    });
    const actions = buildReliabilityRecoveryPlan(snapshot, {
        serverHealth: { status: "critical" },
        queueState: { count: 0, ageMs: Number.POSITIVE_INFINITY },
        activeDevice: {},
        pendingLaunch: true
    });
    const ids = actions.map((action) => action.id);

    assert.ok(ids.includes("reconnect-spotify"));
    assert.ok(ids.includes("repair-cache"));
    assert.ok(ids.includes("retry-server"));
    assert.ok(ids.includes("resume-launch"));
});

test("l’export masque les données sensibles", () => {
    const exported = buildReliabilityExport({
        snapshot: { appVersion: "9.9.28" },
        events: [{
            category: "spotify",
            level: "success",
            label: "Lecture Spotify confirmée",
            detail: "Aucun titre stocké",
            createdAt: 5_000
        }],
        activeDevice: {
            name: "Téléphone de quelqu’un",
            type: "Smartphone",
            id: "secret-device-id"
        }
    });

    const serialized = JSON.stringify(exported);
    assert.match(exported.privacy, /Aucun jeton Spotify/);
    assert.doesNotMatch(serialized, /secret-device-id|Téléphone de quelqu’un/);
    assert.equal(exported.device.available, true);
    assert.equal(exported.device.type, "Smartphone");
});

test("le rendu et le cache PWA intègrent le Centre de fiabilité", () => {
    assert.match(appSource, /Centre de fiabilité/);
    assert.match(appSource, /data-reliability-action/);
    assert.match(appSource, /buildReliabilityExport/);
    assert.match(styleSource, /\.reliability-services/);
    assert.match(styleSource, /var\(--accent-rgb\)/);
    assert.match(serviceWorkerSource, /core\/reliability-center\.js/);
    assert.equal(formatReliabilityAge(1_000, 61_000), "il y a 1 min");
});
