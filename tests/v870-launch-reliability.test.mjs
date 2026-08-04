import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
    buildLaunchPreflight,
    buildLaunchRecoveryActions,
    classifyLaunchError,
    normalizeLastWorkingSpotifyDevice,
    prioritizeLaunchDevices,
    upsertLaunchStep
} from "../core/launch-reliability.js";

const appSource = await readFile("app.js", "utf8");
const workerSource = await readFile("service-worker.js", "utf8");
const styleSource = await readFile("style.css", "utf8");
const packageSource = await readFile("package.json", "utf8");
const versionSource = (await readFile("VERSION", "utf8")).trim();

test("le mode préféré cible uniquement l’iPhone enregistré", () => {
    const devices = [
        { id: "active", name: "Chrome", type: "Computer", is_active: true },
        { id: "preferred", name: "iPhone ancien", type: "Smartphone" },
        { id: "working", name: "iPhone de Matthieu", type: "Smartphone" }
    ];

    const result = prioritizeLaunchDevices(devices, {
        preferredDevice: { id: "preferred", name: "iPhone ancien", type: "Smartphone" },
        lastWorkingDevice: { id: "working", name: "iPhone de Matthieu" },
        mode: "preferred"
    });

    assert.deepEqual(result.map((device) => device.id), ["preferred"]);
    assert.equal(result[0].selectionReason, "iPhone enregistré uniquement");
});

test("un device_id renouvelé du même iPhone est retrouvé par son nom et son type", () => {
    const result = prioritizeLaunchDevices(
        [{ id: "new-id", name: "iPhone de Matthieu", type: "Smartphone" }],
        {
            preferredDevice: {
                id: "old-id",
                name: "iPhone de Matthieu",
                type: "Smartphone"
            },
            lastWorkingDevice: { id: "computer", name: "Chrome", type: "Computer" },
            mode: "preferred"
        }
    );

    assert.equal(result.length, 1);
    assert.equal(result[0].id, "new-id");
    assert.equal(result[0].selectionReason, "iPhone enregistré uniquement");
});

test("le précontrôle bloque le hors connexion et une playlist supprimée", () => {
    const result = buildLaunchPreflight({
        online: false,
        spotifyConfigured: true,
        spotifyConnected: true,
        command: {
            commandType: "fixed",
            playlistId: "missing",
            autoplay: true,
            deviceMode: "preferred"
        },
        playlistIds: ["available"],
        preferredDevice: { id: "iphone" }
    });

    assert.equal(result.ready, false);
    assert.deepEqual(
        result.blocking.map((check) => check.id),
        ["network", "profile"]
    );
});

test("une session non encore résolue reste un avertissement et non un blocage", () => {
    const result = buildLaunchPreflight({
        online: true,
        spotifyConfigured: true,
        spotifyConnected: false,
        command: {
            commandType: "fixed",
            playlistId: "playlist",
            autoplay: true,
            deviceMode: "iphone"
        },
        playlistIds: ["playlist"]
    });

    assert.equal(result.ready, true);
    assert.deepEqual(result.warnings.map((check) => check.id), ["spotify-session"]);
});

test("les erreurs de lancement proposent une récupération ciblée", () => {
    const noDevice = classifyLaunchError(
        new Error("Aucun appareil Spotify disponible. Ouvre Spotify sur l’iPhone.")
    );
    assert.equal(noDevice.code, "NO_DEVICE");
    assert.equal(noDevice.action, "open-spotify");
    assert.equal(noDevice.keepPending, true);

    const authError = new Error("La connexion Spotify doit être renouvelée.");
    authError.code = "SPOTIFY_REAUTH_REQUIRED";
    const auth = classifyLaunchError(authError);
    assert.equal(auth.action, "reconnect");

    const permissionError = new Error("La lecture à distance nécessite Spotify Premium.");
    permissionError.status = 403;
    assert.equal(classifyLaunchError(permissionError).code, "SPOTIFY_PERMISSION");
});

test("les actions de récupération gardent une seule action principale et le diagnostic", () => {
    const actions = buildLaunchRecoveryActions({
        action: "open-spotify",
        actionLabel: "Ouvrir Spotify"
    });

    assert.deepEqual(actions[0], {
        id: "open-spotify",
        label: "Ouvrir Spotify",
        primary: true
    });
    assert.ok(actions.some((item) => item.id === "retry"));
    assert.ok(actions.some((item) => item.id === "copy-diagnostic"));
    assert.equal(actions.filter((item) => item.primary).length, 1);
});

test("une étape de lancement est mise à jour sans doublon", () => {
    const first = upsertLaunchStep([], {
        id: "device",
        label: "Appareil",
        status: "pending",
        attempt: 1
    });
    const second = upsertLaunchStep(first, {
        id: "device",
        label: "Appareil Spotify",
        status: "success",
        message: "iPhone détecté",
        attempt: 2
    });

    assert.equal(second.length, 1);
    assert.equal(second[0].status, "success");
    assert.equal(second[0].attempt, 2);
    assert.equal(second[0].message, "iPhone détecté");
});

test("la mémoire du dernier appareil ignore les objets sans device_id", () => {
    assert.equal(normalizeLastWorkingSpotifyDevice({ name: "iPhone" }).id, "");
    assert.deepEqual(
        normalizeLastWorkingSpotifyDevice({
            id: "device",
            name: "iPhone",
            type: "Smartphone",
            lastSuccessfulAt: 123
        }),
        {
            id: "device",
            name: "iPhone",
            type: "Smartphone",
            is_active: false,
            is_restricted: false,
            volume_percent: null,
            lastSeenAt: 0,
            lastSuccessfulAt: 123
        }
    );
});

test("Shuffle+ 8.7 branche le précontrôle, les six étapes et la récupération", () => {
    assert.equal(versionSource, "9.9.24");
    assert.match(packageSource, /"version": "9\.9\.24"/);
    assert.match(appSource, /buildLaunchPreflight\(/);
    assert.match(appSource, /prioritizeLaunchDevices\(/);
    assert.match(appSource, /rememberLastWorkingSpotifyDevice\(/);
    assert.match(appSource, /data-launch-recovery-action/);
    assert.match(appSource, /\["verification", "Vérification"/);
    assert.match(workerSource, /\.\/core\/launch-reliability\.js/);
    assert.match(styleSource, /lancement fiable et récupération actionnable/);
    assert.match(styleSource, /\.launch-recovery-grid/);
});
