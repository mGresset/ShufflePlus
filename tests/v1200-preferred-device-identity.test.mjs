import test from "node:test";
import assert from "node:assert/strict";

import {
    MAX_KNOWN_DEVICE_IDS,
    PREFERRED_DEVICE_STORAGE_KEY,
    LEGACY_PREFERRED_DEVICE_STORAGE_KEY,
    PREFERRED_DEVICE_MIGRATION_BACKUP_KEY,
    applyDeviceResolution,
    confirmPreferredDevice,
    migrateLegacyPreferredDevice,
    normalizeDeviceIdentity,
    normalizeSpotifyDeviceName,
    readPreferredDeviceIdentity,
    resolvePreferredSpotifyDevice,
    toLegacyPreferredDevice,
    maskSpotifyDeviceId,
    deviceModeToStrategy,
    describeDeviceIdentity
} from "../core/spotify-device-identity.js";
import {
    waitForPreferredDevice
} from "../core/spotify-device-discovery.js";
import {
    createPreferredDeviceController,
    resolveLaunchDevice
} from "../core/spotify-reliability.js";
import {
    findStoredPreferredDevice,
    selectSpotifyDevice
} from "../core/spotify-device.js";
import { prioritizeLaunchDevices } from "../core/launch-reliability.js";

function memoryStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        get length() { return data.size; },
        key: (index) => [...data.keys()][index] ?? null,
        getItem: (key) => (data.has(key) ? data.get(key) : null),
        setItem: (key, value) => data.set(key, String(value)),
        removeItem: (key) => data.delete(key),
        dump: () => Object.fromEntries(data)
    };
}

const IPHONE_A = { id: "iphone-device-A", name: "iPhone", type: "Smartphone", is_active: false, is_restricted: false };
const IPHONE_B = { ...IPHONE_A, id: "iphone-device-B" };
const MAC = { id: "mac-device-1", name: "MacBook de Lamine", type: "Computer", is_active: true, is_restricted: false };
const OTHER_PHONE = { id: "other-phone-1", name: "Pixel de Sam", type: "Smartphone", is_active: false, is_restricted: false };

function preferredA(extra = {}) {
    return migrateLegacyPreferredDevice({ id: "iphone-device-A", name: "iPhone", type: "Smartphone", savedAt: 1000, ...extra }, { now: 2000 });
}

function fakeApi(sequence = [], { player = null, transfer = null } = {}) {
    let index = 0;
    const calls = [];
    return {
        calls,
        async getAvailableDevices(options) {
            calls.push({ type: "devices", options });
            const value = sequence[Math.min(index, sequence.length - 1)] ?? [];
            index += 1;
            if (value instanceof Error) throw value;
            return value;
        },
        async getCurrentPlayback() {
            calls.push({ type: "player" });
            return typeof player === "function" ? player(index) : player;
        },
        async transferPlayback(id, play) {
            calls.push({ type: "transfer", id, play });
            if (transfer) return transfer(id);
            const error = new Error("Device not found");
            error.status = 404;
            throw error;
        },
        getCooldownRemainingMs: () => 0
    };
}

const instantSleep = async () => {};

test("normalizeSpotifyDeviceName nettoie sans détruire l’information", () => {
    assert.equal(normalizeSpotifyDeviceName("  iPhone   de Lamine  "), "iphone de lamine");
    assert.equal(normalizeSpotifyDeviceName("iPhone de Léa"), "iphone de léa");
    assert.equal(normalizeSpotifyDeviceName("iPhone de Lamine’s"), "iphone de lamine's");
});

test("A — ID identique : résolution immédiate par ID exact", () => {
    const result = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [MAC, IPHONE_A] });
    assert.equal(result.status, "resolved");
    assert.equal(result.device.id, "iphone-device-A");
    assert.equal(result.method, "exact-id");
    assert.equal(result.confidence, 1);
});

test("B — ID renouvelé : même identité logique, B courant, A conservé", () => {
    const identity = preferredA();
    const resolution = resolvePreferredSpotifyDevice({ identity, devices: [IPHONE_B, MAC] });
    assert.equal(resolution.status, "resolved");
    assert.equal(resolution.method, "name-and-type");
    const applied = applyDeviceResolution(identity, resolution, { now: 5000 });
    assert.equal(applied.idChanged, true);
    assert.equal(applied.identity.logicalId, identity.logicalId);
    assert.equal(applied.identity.currentSpotifyDeviceId, "iphone-device-B");
    assert.deepEqual(applied.identity.knownSpotifyDeviceIds.map((entry) => entry.id).sort(), ["iphone-device-A", "iphone-device-B"]);
    assert.equal(applied.identity.lastSeenAt, 5000);
    assert.equal(applied.identity.lastResolutionAt, 5000);
    assert.equal(applied.identity.userConfirmed, true);
    assert.ok(!JSON.stringify(applied.identity.lastIdChange).includes("iphone-device-A"), "l’historique de changement est masqué");
});

test("C — l’ancien ID A revient : il redevient courant (ID historique)", () => {
    const identity = applyDeviceResolution(
        preferredA(),
        resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [IPHONE_B] }),
        { now: 5000 }
    ).identity;
    const renamedA = { ...IPHONE_A, name: "iPhone (renommé)" };
    const resolution = resolvePreferredSpotifyDevice({ identity, devices: [renamedA] });
    assert.equal(resolution.status, "resolved");
    assert.equal(resolution.method, "known-id");
    const applied = applyDeviceResolution(identity, resolution, { now: 6000 });
    assert.equal(applied.identity.currentSpotifyDeviceId, "iphone-device-A");
    assert.ok(applied.identity.aliases.includes("iphone (renommé)"), "un renommage prouvé par ID devient un alias");
});

test("D — /devices vide mais /me/player actif sur l’iPhone : résolu via /player", () => {
    const playback = { is_playing: true, device: { ...IPHONE_B, is_active: true } };
    const resolution = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [], playback });
    assert.equal(resolution.status, "resolved");
    assert.equal(resolution.method, "active-player");
    assert.equal(resolution.device.id, "iphone-device-B");
});

test("E — apparition retardée : [] puis [] puis B → succès", async () => {
    const api = fakeApi([[], [], [IPHONE_B]]);
    const result = await waitForPreferredDevice({ api, identity: preferredA(), sleep: instantSleep });
    assert.equal(result.status, "resolved");
    assert.equal(result.device.id, "iphone-device-B");
    assert.equal(result.attempts, 3);
    assert.ok(api.calls.every((call) => call.type !== "devices" || call.options.fresh === true), "toujours fresh=true");
});

test("F — timeout : toujours vide → indisponible temporairement, préférence conservée", async () => {
    const storage = memoryStorage({
        [LEGACY_PREFERRED_DEVICE_STORAGE_KEY]: JSON.stringify({ id: "iphone-device-A", name: "iPhone", type: "Smartphone", savedAt: 10 })
    });
    const controller = createPreferredDeviceController({ storage });
    const api = fakeApi([[]]);
    await assert.rejects(
        resolveLaunchDevice({ settings: { deviceMode: "preferred" }, controller, api, sleep: instantSleep }),
        (error) => error.code === "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE"
    );
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
    assert.equal(controller.getIdentity().displayName, "iPhone");
    assert.ok(storage.getItem(PREFERRED_DEVICE_STORAGE_KEY), "identité v2 toujours stockée");
    assert.ok(storage.getItem(LEGACY_PREFERRED_DEVICE_STORAGE_KEY), "miroir v1 toujours stocké");
    // Le seul transfert tenté vise l’ID du même iPhone logique.
    const transfers = api.calls.filter((call) => call.type === "transfer");
    assert.deepEqual(transfers.map((call) => call.id), ["iphone-device-A"]);
});

test("G — appareil restreint : jamais ciblé", async () => {
    const restricted = { ...IPHONE_B, is_restricted: true };
    const resolution = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [restricted] });
    assert.equal(resolution.status, "restricted");
    assert.equal(resolution.device, null);
    const exact = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [{ ...IPHONE_A, is_restricted: true }] });
    assert.equal(exact.status, "restricted");
    const api = fakeApi([[restricted]]);
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm(IPHONE_A);
    await assert.rejects(
        resolveLaunchDevice({ settings: { deviceMode: "preferred" }, controller, api, sleep: instantSleep }),
        (error) => error.code === "SPOTIFY_DEVICE_RESTRICTED"
    );
    assert.equal(api.calls.filter((call) => call.type === "transfer").length, 0);
});

test("H — ambiguïté : deux iPhone identiques, aucun choix", () => {
    const twin = { ...IPHONE_B, id: "iphone-device-C" };
    const resolution = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [IPHONE_B, twin] });
    assert.equal(resolution.status, "ambiguous");
    assert.equal(resolution.device, null);
    assert.equal(resolution.candidates.length, 2);
    // L’ID exact lève l’ambiguïté.
    const withExact = resolvePreferredSpotifyDevice({ identity: preferredA(), devices: [IPHONE_B, twin, IPHONE_A] });
    assert.equal(withExact.status, "resolved");
    assert.equal(withExact.device.id, "iphone-device-A");
});

test("I — iPhone absent, Mac présent, mode strict : aucune commande vers le Mac", async () => {
    const api = fakeApi([[MAC, OTHER_PHONE]], { player: { is_playing: true, device: MAC } });
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm(IPHONE_A);
    await assert.rejects(
        resolveLaunchDevice({ settings: { deviceMode: "preferred" }, controller, api, sleep: instantSleep }),
        (error) => error.code === "PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE"
    );
    const targeted = api.calls.filter((call) => call.type === "transfer").map((call) => call.id);
    assert.ok(!targeted.includes(MAC.id));
    assert.ok(!targeted.includes(OTHER_PHONE.id));
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A", "le Mac ne remplace jamais l’iPhone");
    // Les anciens sélecteurs restent stricts eux aussi.
    assert.equal(findStoredPreferredDevice([MAC, OTHER_PHONE], controller.getLegacy()), null);
    assert.equal(selectSpotifyDevice([MAC, OTHER_PHONE], { mode: "preferred", preferredDevice: controller.getLegacy() }), null);
    assert.deepEqual(prioritizeLaunchDevices([MAC, OTHER_PHONE], { preferredDevice: controller.getLegacy(), mode: "preferred" }), []);
});

test("« seul smartphone disponible » ou nom approchant ne suffisent jamais", () => {
    const identity = migrateLegacyPreferredDevice({ id: "a", name: "iPhone de Lamine", type: "Smartphone" });
    for (const devices of [
        [OTHER_PHONE],
        [{ id: "x", name: "iPhone de Lamine 2", type: "Smartphone" }],
        [{ id: "y", name: "iPhone de Lamine", type: "Computer" }]
    ]) {
        assert.notEqual(resolvePreferredSpotifyDevice({ identity, devices }).status, "resolved");
        assert.equal(findStoredPreferredDevice(devices, identity), null);
    }
});

test("J — historique des device_id borné avec horodatages", () => {
    let identity = preferredA();
    for (let index = 0; index < 12; index += 1) {
        const device = { ...IPHONE_A, id: `iphone-device-${index}` };
        identity = applyDeviceResolution(
            identity,
            resolvePreferredSpotifyDevice({ identity, devices: [device] }),
            { now: 10_000 + index * 1000 }
        ).identity;
    }
    assert.equal(identity.knownSpotifyDeviceIds.length, MAX_KNOWN_DEVICE_IDS);
    assert.equal(identity.knownSpotifyDeviceIds[0].id, "iphone-device-11", "l’ID courant reste en tête");
    assert.equal(identity.currentSpotifyDeviceId, "iphone-device-11");
    assert.ok(identity.knownSpotifyDeviceIds.every((entry) => entry.firstSeenAt > 0 && entry.lastSeenAt > 0));
    assert.ok(identity.knownSpotifyDeviceIds.slice(1).every((entry) => entry.stale === true));
});

test("migration v1 → v2 : idempotente, non destructive, sauvegarde préalable", () => {
    const legacy = { id: "iphone-device-A", name: "iPhone de Lamine", type: "Smartphone", savedAt: 1234, lastSeenAt: 2345 };
    const storage = memoryStorage({ [LEGACY_PREFERRED_DEVICE_STORAGE_KEY]: JSON.stringify(legacy) });
    const first = readPreferredDeviceIdentity(storage, { now: 9999 });
    assert.equal(first.migrated, true);
    assert.equal(first.identity.displayName, "iPhone de Lamine");
    assert.equal(first.identity.type, "Smartphone");
    assert.equal(first.identity.userConfirmed, true);
    assert.equal(first.identity.currentSpotifyDeviceId, "iphone-device-A");
    assert.deepEqual(first.identity.knownSpotifyDeviceIds.map((entry) => entry.id), ["iphone-device-A"]);
    assert.ok(storage.getItem(PREFERRED_DEVICE_MIGRATION_BACKUP_KEY).includes("iphone-device-A"));
    assert.deepEqual(JSON.parse(storage.getItem(LEGACY_PREFERRED_DEVICE_STORAGE_KEY)).id, "iphone-device-A");

    const second = readPreferredDeviceIdentity(storage, { now: 19999 });
    assert.equal(second.migrated, false);
    assert.equal(second.identity.logicalId, first.identity.logicalId);
    assert.deepEqual(normalizeDeviceIdentity(second.identity), second.identity);
});

test("le miroir v1 permet un retour arrière v11 et la projection garde id/name/type", () => {
    const legacy = toLegacyPreferredDevice(preferredA());
    assert.equal(legacy.id, "iphone-device-A");
    assert.equal(legacy.name, "iPhone");
    assert.equal(legacy.type, "Smartphone");
    assert.equal(legacy.schemaVersion, 2);
});

test("le contrôleur ne remplace jamais l’iPhone par un appareil observé différent", () => {
    const storage = memoryStorage();
    const controller = createPreferredDeviceController({ storage });
    controller.confirm(IPHONE_A);
    controller.observe([MAC]);
    controller.recordSuccess(MAC);
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
    const events = [];
    const tracked = createPreferredDeviceController({ storage, onEvent: (type) => events.push(type) });
    const observed = tracked.observe([IPHONE_B]);
    assert.equal(observed.idChanged, true);
    assert.ok(events.includes("DEVICE_FOUND_NEW_ID"));
    assert.equal(tracked.getIdentity().currentSpotifyDeviceId, "iphone-device-B");
});

test("/devices=[] et erreurs n’effacent jamais l’identité ; seul Oublier le fait", () => {
    const storage = memoryStorage();
    const controller = createPreferredDeviceController({ storage });
    controller.confirm(IPHONE_A);
    controller.observe([]);
    controller.markStatus("reauth-required");
    assert.equal(controller.isConfigured(), true);
    assert.ok(storage.getItem(PREFERRED_DEVICE_STORAGE_KEY));
    controller.forget();
    assert.equal(controller.isConfigured(), false);
    assert.equal(storage.getItem(PREFERRED_DEVICE_STORAGE_KEY), null);
    assert.equal(storage.getItem(LEGACY_PREFERRED_DEVICE_STORAGE_KEY), null);
});

test("réassociation vers un AUTRE appareil : historique et alias de l’ancien choix effacés", () => {
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    // Erreur de choix : le Mac est enregistré, puis corrigé par l’iPhone.
    controller.confirm(MAC);
    controller.confirm(IPHONE_A);
    const identity = controller.getIdentity();
    assert.deepEqual(identity.knownSpotifyDeviceIds.map((entry) => entry.id), ["iphone-device-A"]);
    assert.deepEqual(identity.aliases, []);
    // iPhone absent, Mac en ligne : le Mac ne doit jamais être résolu.
    assert.notEqual(resolvePreferredSpotifyDevice({ identity, devices: [MAC] }).status, "resolved");
});

test("réassociation du MÊME iPhone renommé : identité, historique et alias conservés", () => {
    const identity = preferredA();
    const next = confirmPreferredDevice(identity, { id: "iphone-device-A", name: "iPhone 16", type: "Smartphone" }, { now: 50 });
    assert.equal(next.logicalId, identity.logicalId);
    assert.equal(next.currentSpotifyDeviceId, "iphone-device-A");
    assert.ok(next.aliases.includes("iphone"));
});

test("observation isolée (succès, mode souple) : jamais d’écrasement sur simple ressemblance", () => {
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm(IPHONE_A);
    const lookAlike = { ...IPHONE_A, id: "family-phone" };
    controller.recordSuccess(lookAlike);
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
    controller.observe([lookAlike], { idOnly: true });
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
    // Avec la liste complète, le vrai iPhone reste prioritaire (ID exact).
    const full = controller.observe([lookAlike, IPHONE_A]);
    assert.equal(full.resolution.device.id, "iphone-device-A");
});

test("mode souple : l’appareil retenu ne remplace pas l’iPhone sans preuve par ID", async () => {
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm(IPHONE_A);
    const lookAlike = { ...IPHONE_A, id: "family-phone" };
    const api = fakeApi([[lookAlike]]);
    const device = await resolveLaunchDevice({ settings: { deviceMode: "iphone" }, controller, api, sleep: instantSleep });
    assert.equal(device.id, "family-phone");
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
});

test("diagnostic : jamais de device_id complet", () => {
    const text = JSON.stringify(describeDeviceIdentity(preferredA()));
    assert.ok(!text.includes("iphone-device-A"));
    assert.equal(maskSpotifyDeviceId("iphone-device-A"), "••••ce-A");
});

test("stratégies formalisées et PREFERRED_STRICT par défaut", () => {
    assert.equal(deviceModeToStrategy("preferred"), "PREFERRED_STRICT");
    assert.equal(deviceModeToStrategy(""), "PREFERRED_STRICT");
    assert.equal(deviceModeToStrategy("iphone"), "PREFERRED_THEN_LAST_SUCCESSFUL");
    assert.equal(deviceModeToStrategy("active"), "ACTIVE_DEVICE");
    assert.equal(deviceModeToStrategy("first"), "FIRST_AVAILABLE");
});

test("ambiguïté pendant la fenêtre de réveil → PREFERRED_DEVICE_AMBIGUOUS", async () => {
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm({ ...IPHONE_A, id: "" , observed: false });
    const api = fakeApi([[IPHONE_A, IPHONE_B]]);
    await assert.rejects(
        resolveLaunchDevice({ settings: { deviceMode: "preferred" }, controller, api, sleep: instantSleep }),
        (error) => error.code === "PREFERRED_DEVICE_AMBIGUOUS"
    );
});

test("la fenêtre de réveil s’annule proprement", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
        waitForPreferredDevice({ api: fakeApi([[]]), identity: preferredA(), signal: controller.signal, sleep: instantSleep }),
        (error) => error.name === "AbortError"
    );
});

test("la fenêtre de réveil respecte le cooldown 429 et la reauth interrompt tout", async () => {
    const slept = [];
    const api = fakeApi([[IPHONE_B]]);
    let cooldown = 4000;
    api.getCooldownRemainingMs = () => {
        const value = cooldown;
        cooldown = 0;
        return value;
    };
    const result = await waitForPreferredDevice({
        api,
        identity: preferredA(),
        sleep: async (ms) => slept.push(ms)
    });
    assert.equal(result.status, "resolved");
    assert.ok(slept[0] >= 4000);

    const reauth = Object.assign(new Error("reauth"), { code: "SPOTIFY_REAUTH_REQUIRED" });
    await assert.rejects(
        waitForPreferredDevice({ api: fakeApi([reauth]), identity: preferredA(), sleep: instantSleep }),
        (error) => error.code === "SPOTIFY_REAUTH_REQUIRED"
    );
});

test("hors ligne pendant la fenêtre de réveil → OFFLINE, préférence conservée", async () => {
    const controller = createPreferredDeviceController({ storage: memoryStorage() });
    controller.confirm(IPHONE_A);
    const offline = new TypeError("Failed to fetch");
    const api = fakeApi([offline]);
    api.getCurrentPlayback = async () => { throw offline; };
    api.transferPlayback = async () => { throw offline; };
    await assert.rejects(
        resolveLaunchDevice({ settings: { deviceMode: "preferred" }, controller, api, sleep: instantSleep }),
        (error) => error.code === "OFFLINE"
    );
    assert.equal(controller.getIdentity().currentSpotifyDeviceId, "iphone-device-A");
});
