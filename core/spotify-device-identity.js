// Identité logique de l’appareil Spotify préféré (v12).
//
// Principe : « mon iPhone » est une identité logique persistante. Le
// device_id Spotify n’est qu’un identifiant technique renouvelable. Une
// absence temporaire dans /me/player/devices ne supprime JAMAIS l’identité :
// seule l’action explicite « Oublier cet appareil » le fait.
//
// La résolution est strictement déterministe et ne choisit jamais au hasard :
//   1. ID courant exact                 → certitude
//   2. ID historique exact              → certitude
//   3. Nom normalisé exact + type exact → forte confiance
//   4. Alias confirmé + type exact      → forte confiance
//   5. Appareil actif de /me/player avec la même correspondance forte
//   6. Plusieurs candidats au même niveau → ambiguïté (aucun choix)
// « Seul smartphone disponible » ou « nom approchant » ne suffisent jamais.

export const DEVICE_IDENTITY_SCHEMA_VERSION = 2;
export const MAX_KNOWN_DEVICE_IDS = 5;
export const MAX_DEVICE_ALIASES = 5;
export const PREFERRED_DEVICE_STORAGE_KEY = "shuffleplus_preferred_spotify_device_v2";
export const LEGACY_PREFERRED_DEVICE_STORAGE_KEY = "shuffleplus_preferred_spotify_device_v1";
export const PREFERRED_DEVICE_MIGRATION_BACKUP_KEY = "shuffleplus_preferred_spotify_device_v1_backup";

export const DEVICE_STRATEGIES = Object.freeze({
    PREFERRED_STRICT: "PREFERRED_STRICT",
    PREFERRED_THEN_LAST_SUCCESSFUL: "PREFERRED_THEN_LAST_SUCCESSFUL",
    ACTIVE_DEVICE: "ACTIVE_DEVICE",
    FIRST_AVAILABLE: "FIRST_AVAILABLE",
    NAMED_DEVICE: "NAMED_DEVICE"
});

// Les modes historiques des profils restent stockés tels quels : seule leur
// interprétation est formalisée ici.
const MODE_TO_STRATEGY = Object.freeze({
    preferred: DEVICE_STRATEGIES.PREFERRED_STRICT,
    iphone: DEVICE_STRATEGIES.PREFERRED_THEN_LAST_SUCCESSFUL,
    active: DEVICE_STRATEGIES.ACTIVE_DEVICE,
    first: DEVICE_STRATEGIES.FIRST_AVAILABLE,
    named: DEVICE_STRATEGIES.NAMED_DEVICE
});

export const RECOMMENDED_DEVICE_STRATEGY = DEVICE_STRATEGIES.PREFERRED_STRICT;

export function deviceModeToStrategy(mode = "preferred") {
    return MODE_TO_STRATEGY[String(mode || "preferred")] ||
        DEVICE_STRATEGIES.PREFERRED_STRICT;
}

export function isStrictDeviceMode(mode = "preferred") {
    return deviceModeToStrategy(mode) === DEVICE_STRATEGIES.PREFERRED_STRICT;
}

const RESOLUTION_CONFIDENCE = Object.freeze({
    "exact-id": 1,
    "known-id": 1,
    "name-and-type": 0.9,
    "alias-and-type": 0.85,
    "active-player": 0.85
});

function cleanText(value, maxLength = 160) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

function toTimestamp(value) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

export function normalizeSpotifyDeviceName(value = "") {
    return String(value ?? "")
        .normalize("NFKC")
        .replace(/[‘’ʼ]/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .slice(0, 120);
}

export function normalizeSpotifyDeviceType(value = "") {
    return String(value ?? "")
        .trim()
        .toLowerCase()
        .slice(0, 40);
}

export function maskSpotifyDeviceId(id = "") {
    const value = cleanText(String(id || ""), 200);
    if (!value) return "";
    if (value.length <= 6) return "••••";
    return `••••${value.slice(-4)}`;
}

function createLogicalId() {
    try {
        if (globalThis.crypto?.randomUUID) {
            return globalThis.crypto.randomUUID();
        }
    } catch {
        // Repli ci-dessous.
    }
    const random = Math.random().toString(16).slice(2, 10);
    return `device-${Date.now().toString(16)}-${random}`;
}

export function createEmptyDeviceIdentity() {
    return {
        schemaVersion: DEVICE_IDENTITY_SCHEMA_VERSION,
        logicalId: "",
        userConfirmed: false,
        userConfirmedAt: 0,
        displayName: "",
        normalizedName: "",
        type: "",
        aliases: [],
        currentSpotifyDeviceId: "",
        knownSpotifyDeviceIds: [],
        lastSeenAt: 0,
        lastSuccessfulAt: 0,
        lastResolutionAt: 0,
        lastIdChange: null,
        status: "unknown",
        matching: {
            lastMethod: "",
            confidence: 0
        },
        migratedFrom: ""
    };
}

export function isDeviceIdentityConfigured(identity) {
    return Boolean(
        identity &&
        (cleanText(identity.currentSpotifyDeviceId) ||
            cleanText(identity.normalizedName) ||
            (Array.isArray(identity.knownSpotifyDeviceIds) &&
                identity.knownSpotifyDeviceIds.length))
    );
}

function normalizeKnownEntry(entry = {}) {
    const id = cleanText(typeof entry === "string" ? entry : entry?.id, 200);
    if (!id) return null;
    return {
        id,
        firstSeenAt: toTimestamp(entry?.firstSeenAt),
        lastSeenAt: toTimestamp(entry?.lastSeenAt),
        lastSuccessfulAt: toTimestamp(entry?.lastSuccessfulAt),
        stale: entry?.stale === true
    };
}

function entryRecency(entry) {
    return Math.max(entry.lastSuccessfulAt, entry.lastSeenAt, entry.firstSeenAt);
}

// Historique borné : l’ID courant est toujours conservé, puis les plus récents.
function boundKnownIds(entries, currentId) {
    const byId = new Map();
    for (const entry of entries) {
        const normalized = normalizeKnownEntry(entry);
        if (!normalized) continue;
        const previous = byId.get(normalized.id);
        byId.set(normalized.id, previous
            ? {
                id: normalized.id,
                firstSeenAt: Math.min(
                    previous.firstSeenAt || normalized.firstSeenAt,
                    normalized.firstSeenAt || previous.firstSeenAt
                ),
                lastSeenAt: Math.max(previous.lastSeenAt, normalized.lastSeenAt),
                lastSuccessfulAt: Math.max(previous.lastSuccessfulAt, normalized.lastSuccessfulAt),
                stale: previous.stale && normalized.stale
            }
            : normalized);
    }

    const list = [...byId.values()].map((entry) => ({
        ...entry,
        stale: Boolean(currentId) && entry.id !== currentId
    }));
    const current = list.find((entry) => entry.id === currentId);
    const others = list
        .filter((entry) => entry.id !== currentId)
        .sort((first, second) => entryRecency(second) - entryRecency(first) ||
            first.id.localeCompare(second.id));

    return [...(current ? [current] : []), ...others]
        .slice(0, MAX_KNOWN_DEVICE_IDS);
}

function boundAliases(aliases, normalizedName) {
    const seen = new Set();
    const result = [];
    for (const alias of Array.isArray(aliases) ? aliases : []) {
        const normalized = normalizeSpotifyDeviceName(alias);
        if (!normalized || normalized === normalizedName || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
    }
    return result.slice(0, MAX_DEVICE_ALIASES);
}

// Accepte l’ancien format v1 ({ id, name, type, savedAt, lastSeenAt }) ou
// le format v2, et retourne toujours une identité v2 valide. Idempotent.
export function normalizeDeviceIdentity(value = null, { now = Date.now() } = {}) {
    if (!value || typeof value !== "object") {
        return createEmptyDeviceIdentity();
    }

    if (Number(value.schemaVersion) !== DEVICE_IDENTITY_SCHEMA_VERSION) {
        return migrateLegacyPreferredDevice(value, { now });
    }

    const empty = createEmptyDeviceIdentity();
    const displayName = cleanText(value.displayName, 120);
    const normalizedName = normalizeSpotifyDeviceName(value.normalizedName || displayName);
    const currentSpotifyDeviceId = cleanText(value.currentSpotifyDeviceId, 200);
    const knownSpotifyDeviceIds = boundKnownIds(
        [
            ...(Array.isArray(value.knownSpotifyDeviceIds) ? value.knownSpotifyDeviceIds : []),
            ...(currentSpotifyDeviceId ? [{ id: currentSpotifyDeviceId }] : [])
        ],
        currentSpotifyDeviceId
    );
    const identity = {
        ...empty,
        logicalId: cleanText(value.logicalId, 80),
        userConfirmed: value.userConfirmed === true,
        userConfirmedAt: toTimestamp(value.userConfirmedAt),
        displayName,
        normalizedName,
        type: cleanText(value.type, 40),
        aliases: boundAliases(value.aliases, normalizedName),
        currentSpotifyDeviceId,
        knownSpotifyDeviceIds,
        lastSeenAt: toTimestamp(value.lastSeenAt),
        lastSuccessfulAt: toTimestamp(value.lastSuccessfulAt),
        lastResolutionAt: toTimestamp(value.lastResolutionAt),
        lastIdChange: value.lastIdChange && typeof value.lastIdChange === "object"
            ? {
                at: toTimestamp(value.lastIdChange.at),
                method: cleanText(value.lastIdChange.method, 40),
                from: maskSpotifyDeviceId(value.lastIdChange.from || ""),
                to: maskSpotifyDeviceId(value.lastIdChange.to || "")
            }
            : null,
        status: cleanText(value.status, 40) || "known",
        matching: {
            lastMethod: cleanText(value.matching?.lastMethod, 40),
            confidence: Math.max(0, Math.min(1, Number(value.matching?.confidence) || 0))
        },
        migratedFrom: cleanText(value.migratedFrom, 20)
    };

    if (isDeviceIdentityConfigured(identity) && !identity.logicalId) {
        identity.logicalId = createLogicalId();
    }

    return identity;
}

export function migrateLegacyPreferredDevice(legacy = {}, { now = Date.now() } = {}) {
    if (!legacy || typeof legacy !== "object") {
        return createEmptyDeviceIdentity();
    }

    const id = cleanText(legacy.id, 200);
    const name = cleanText(legacy.name, 120);

    if (!id && !name) {
        return createEmptyDeviceIdentity();
    }

    const savedAt = toTimestamp(legacy.savedAt);
    const lastSeenAt = toTimestamp(legacy.lastSeenAt);

    return normalizeDeviceIdentity({
        schemaVersion: DEVICE_IDENTITY_SCHEMA_VERSION,
        logicalId: createLogicalId(),
        // L’appareil v1 a toujours été choisi (ou validé) par l’utilisateur.
        userConfirmed: true,
        userConfirmedAt: savedAt || lastSeenAt || toTimestamp(now),
        displayName: name,
        normalizedName: normalizeSpotifyDeviceName(name),
        type: cleanText(legacy.type, 40),
        aliases: [],
        currentSpotifyDeviceId: id,
        knownSpotifyDeviceIds: id
            ? [{
                id,
                firstSeenAt: savedAt || lastSeenAt,
                lastSeenAt,
                lastSuccessfulAt: toTimestamp(legacy.lastSuccessfulAt)
            }]
            : [],
        lastSeenAt,
        lastSuccessfulAt: toTimestamp(legacy.lastSuccessfulAt),
        lastResolutionAt: 0,
        status: "known",
        matching: { lastMethod: "migrated-v1", confidence: id ? 1 : 0.9 },
        migratedFrom: "v1"
    }, { now });
}

// Projection compatible avec l’ancien format : tout le code historique qui lit
// preferredDevice.id / .name / .type continue de fonctionner, tandis que les
// résolveurs reconnaissent schemaVersion 2 et utilisent l’historique.
export function toLegacyPreferredDevice(identity) {
    const normalized = normalizeDeviceIdentity(identity);
    return {
        ...normalized,
        id: normalized.currentSpotifyDeviceId,
        name: normalized.displayName,
        savedAt: normalized.userConfirmedAt,
        lastSeenAt: normalized.lastSeenAt
    };
}

function toLegacyStoragePayload(identity) {
    return {
        id: identity.currentSpotifyDeviceId,
        name: identity.displayName,
        type: identity.type,
        savedAt: identity.userConfirmedAt,
        lastSeenAt: identity.lastSeenAt
    };
}

function coerceIdentity(value) {
    if (!value || typeof value !== "object") return createEmptyDeviceIdentity();
    return normalizeDeviceIdentity(value);
}

function normalizeObservedDevice(device = {}, source = "devices") {
    const id = cleanText(device?.id, 200);
    if (!id) return null;
    return {
        ...device,
        id,
        name: cleanText(device.name, 120),
        type: cleanText(device.type, 40),
        is_active: device.is_active === true,
        is_restricted: device.is_restricted === true,
        source: device.source || source
    };
}

// Fusionne /me/player/devices et l’appareil de /me/player sans doublon.
export function mergeDeviceObservations(devices = [], playback = null) {
    const merged = [];
    const byId = new Map();

    for (const raw of Array.isArray(devices) ? devices : []) {
        const device = normalizeObservedDevice(raw, "devices");
        if (!device || byId.has(device.id)) continue;
        byId.set(device.id, device);
        merged.push(device);
    }

    const playbackDevice = normalizeObservedDevice(playback?.device, "player");
    if (playbackDevice) {
        const existing = byId.get(playbackDevice.id);
        if (existing) {
            existing.is_active = existing.is_active || playbackDevice.is_active;
            existing.seenInPlayer = true;
        } else {
            merged.push({ ...playbackDevice, seenInPlayer: true });
        }
    }

    return merged;
}

function typeMatches(identityType, deviceType) {
    const wanted = normalizeSpotifyDeviceType(identityType);
    if (!wanted) return true;
    return wanted === normalizeSpotifyDeviceType(deviceType);
}

function buildResult(status, extra = {}) {
    return {
        status,
        device: null,
        method: "",
        confidence: 0,
        candidates: [],
        reason: "",
        identityUpdated: false,
        ...extra
    };
}

function describeCandidate(device) {
    return {
        id: device.id,
        name: device.name,
        type: device.type,
        is_active: device.is_active === true,
        is_restricted: device.is_restricted === true,
        source: device.source || "devices"
    };
}

// Résolution déterministe du préféré parmi les appareils observés.
export function resolvePreferredSpotifyDevice({
    identity = null,
    devices = [],
    playback = null
} = {}) {
    const preferred = coerceIdentity(identity);

    if (!isDeviceIdentityConfigured(preferred)) {
        return buildResult("not-configured", { reason: "no-preferred-device" });
    }

    const observed = mergeDeviceObservations(devices, playback);

    if (!observed.length) {
        return buildResult("unavailable", { reason: "no-device-published" });
    }

    const restrictedMatches = [];
    const pick = (matches, method) => {
        const usable = matches.filter((device) => !device.is_restricted);
        restrictedMatches.push(...matches.filter((device) => device.is_restricted));

        if (usable.length === 1) {
            const device = usable[0];
            const resolvedMethod = method !== "exact-id" && method !== "known-id" &&
                device.source === "player"
                ? "active-player"
                : method;
            return buildResult("resolved", {
                device,
                method: resolvedMethod,
                confidence: RESOLUTION_CONFIDENCE[resolvedMethod] || 0.8
            });
        }

        if (usable.length > 1) {
            return buildResult("ambiguous", {
                method,
                reason: `several-${method}`,
                candidates: usable.map(describeCandidate)
            });
        }

        return null;
    };

    // Niveau 1 — ID courant exact.
    const currentId = preferred.currentSpotifyDeviceId;
    if (currentId) {
        const result = pick(observed.filter((device) => device.id === currentId), "exact-id");
        if (result) return result;
    }

    // Niveau 2 — ID historique exact (le plus récent en premier, déterministe).
    const history = preferred.knownSpotifyDeviceIds
        .filter((entry) => entry.id !== currentId);
    for (const entry of history) {
        const result = pick(observed.filter((device) => device.id === entry.id), "known-id");
        if (result) return result;
    }

    // Niveau 3 — Nom normalisé exact + type exact.
    if (preferred.normalizedName) {
        const result = pick(
            observed.filter((device) =>
                normalizeSpotifyDeviceName(device.name) === preferred.normalizedName &&
                typeMatches(preferred.type, device.type)
            ),
            "name-and-type"
        );
        if (result) return result;
    }

    // Niveau 4 — Alias confirmé + type exact.
    if (preferred.aliases.length) {
        const aliases = new Set(preferred.aliases);
        const result = pick(
            observed.filter((device) =>
                aliases.has(normalizeSpotifyDeviceName(device.name)) &&
                typeMatches(preferred.type, device.type)
            ),
            "alias-and-type"
        );
        if (result) return result;
    }

    if (restrictedMatches.length) {
        return buildResult("restricted", {
            reason: "preferred-device-restricted",
            candidates: restrictedMatches.map(describeCandidate)
        });
    }

    return buildResult("unavailable", {
        reason: "preferred-device-not-published",
        candidates: []
    });
}

// Applique une résolution réussie : met à jour l’ID courant (A → B), conserve
// l’historique borné et horodate la détection. Ne crée jamais d’identité.
export function applyDeviceResolution(identity, resolution, {
    now = Date.now(),
    markSuccess = false
} = {}) {
    const current = coerceIdentity(identity);

    if (!isDeviceIdentityConfigured(current) || resolution?.status !== "resolved" || !resolution.device?.id) {
        return {
            identity: current,
            changed: false,
            idChanged: false,
            previousId: ""
        };
    }

    const timestamp = toTimestamp(now) || Date.now();
    const device = resolution.device;
    const previousId = current.currentSpotifyDeviceId;
    const idChanged = Boolean(previousId) && previousId !== device.id;
    const known = current.knownSpotifyDeviceIds.map((entry) => ({ ...entry }));
    let entry = known.find((item) => item.id === device.id);

    if (!entry) {
        entry = {
            id: device.id,
            firstSeenAt: timestamp,
            lastSeenAt: timestamp,
            lastSuccessfulAt: 0,
            stale: false
        };
        known.push(entry);
    }

    entry.lastSeenAt = timestamp;
    if (!entry.firstSeenAt) entry.firstSeenAt = timestamp;
    if (markSuccess) entry.lastSuccessfulAt = timestamp;

    const aliases = [...current.aliases];
    const observedName = normalizeSpotifyDeviceName(device.name);
    // Un renommage de l’iPhone n’est appris qu’avec une preuve certaine (ID).
    if (
        observedName &&
        observedName !== current.normalizedName &&
        ["exact-id", "known-id"].includes(resolution.method)
    ) {
        aliases.unshift(observedName);
    }

    const next = normalizeDeviceIdentity({
        ...current,
        aliases,
        currentSpotifyDeviceId: device.id,
        knownSpotifyDeviceIds: known,
        type: current.type || cleanText(device.type, 40),
        displayName: current.displayName || cleanText(device.name, 120),
        lastSeenAt: timestamp,
        lastSuccessfulAt: markSuccess ? timestamp : current.lastSuccessfulAt,
        lastResolutionAt: timestamp,
        lastIdChange: idChanged
            ? {
                at: timestamp,
                method: resolution.method,
                from: previousId,
                to: device.id
            }
            : current.lastIdChange,
        status: device.is_active ? "active" : "available",
        matching: {
            lastMethod: resolution.method,
            confidence: resolution.confidence || RESOLUTION_CONFIDENCE[resolution.method] || 0
        }
    }, { now: timestamp });

    return {
        identity: next,
        changed: true,
        idChanged,
        previousId
    };
}

// Marque l’état « non annoncé » sans jamais effacer l’identité.
export function markDeviceIdentityUnavailable(identity, { status = "not-published", now = Date.now() } = {}) {
    const current = coerceIdentity(identity);
    if (!isDeviceIdentityConfigured(current)) return current;
    return {
        ...current,
        status: cleanText(status, 40) || "not-published",
        lastResolutionAt: toTimestamp(now) || current.lastResolutionAt
    };
}

// Choix explicite de l’utilisateur (« Choisir » / « Réassocier »).
// La réassociation conserve l’identité logique et l’historique.
export function confirmPreferredDevice(identity, device = {}, {
    now = Date.now(),
    reassociate = true
} = {}) {
    const id = cleanText(device?.id, 200);
    const name = cleanText(device?.name, 120);

    if (!id && !name) {
        return coerceIdentity(identity);
    }

    const timestamp = toTimestamp(now) || Date.now();
    const current = coerceIdentity(identity);
    // L’historique (IDs, alias) n’est conservé que si l’appareil choisi est
    // prouvé être le même appareil logique (ID courant ou historique). Un
    // autre appareil repart d’une identité neuve : un ancien choix erroné
    // (Mac, ancien téléphone…) ne doit jamais rester ciblable en mode strict.
    const provenSameDevice = Boolean(id) && current.knownSpotifyDeviceIds
        .some((entry) => entry.id === id);
    const keep = reassociate && isDeviceIdentityConfigured(current) && provenSameDevice;
    const previousName = keep ? current.normalizedName : "";
    const newName = normalizeSpotifyDeviceName(name || current.displayName);
    const known = keep ? current.knownSpotifyDeviceIds.map((entry) => ({ ...entry })) : [];

    if (id && !known.some((entry) => entry.id === id)) {
        known.push({ id, firstSeenAt: timestamp, lastSeenAt: timestamp, lastSuccessfulAt: 0 });
    }

    return normalizeDeviceIdentity({
        ...(keep ? current : createEmptyDeviceIdentity()),
        schemaVersion: DEVICE_IDENTITY_SCHEMA_VERSION,
        logicalId: keep ? current.logicalId : createLogicalId(),
        userConfirmed: true,
        userConfirmedAt: timestamp,
        displayName: name || current.displayName,
        normalizedName: newName,
        type: cleanText(device?.type, 40) || (keep ? current.type : ""),
        aliases: keep && previousName && previousName !== newName
            ? [previousName, ...current.aliases]
            : (keep ? current.aliases : []),
        currentSpotifyDeviceId: id || (keep ? current.currentSpotifyDeviceId : ""),
        knownSpotifyDeviceIds: known,
        lastSeenAt: device?.observed === false ? (keep ? current.lastSeenAt : 0) : timestamp,
        status: "known",
        matching: { lastMethod: "user-confirmed", confidence: 1 }
    }, { now: timestamp });
}

export function recordDeviceSuccess(identity, deviceId, { now = Date.now() } = {}) {
    const current = coerceIdentity(identity);
    const id = cleanText(deviceId, 200);
    if (!id || !current.knownSpotifyDeviceIds.some((entry) => entry.id === id)) {
        return { identity: current, changed: false };
    }
    const timestamp = toTimestamp(now) || Date.now();
    return {
        identity: normalizeDeviceIdentity({
            ...current,
            lastSuccessfulAt: timestamp,
            knownSpotifyDeviceIds: current.knownSpotifyDeviceIds.map((entry) =>
                entry.id === id
                    ? { ...entry, lastSuccessfulAt: timestamp, lastSeenAt: Math.max(entry.lastSeenAt, timestamp) }
                    : entry
            )
        }, { now: timestamp }),
        changed: true
    };
}

// Indique si un appareil observé appartient à l’identité (sans la modifier).
export function isSameLogicalDevice(identity, device) {
    if (!device?.id) return false;
    const resolution = resolvePreferredSpotifyDevice({
        identity,
        devices: [device]
    });
    return resolution.status === "resolved" && resolution.device?.id === device.id;
}

// ----- Stockage -------------------------------------------------------------

function safeGet(storage, key) {
    try {
        return storage?.getItem?.(key) ?? null;
    } catch {
        return null;
    }
}

function safeSet(storage, key, value) {
    try {
        storage?.setItem?.(key, value);
        return true;
    } catch {
        return false;
    }
}

function safeParse(raw) {
    if (!raw) return null;
    try {
        const value = JSON.parse(raw);
        return value && typeof value === "object" ? value : null;
    } catch {
        return null;
    }
}

// Lecture + migration idempotente et non destructive :
//  - v2 présent → utilisé ;
//  - sinon v1 → migré, sauvegarde préalable de la valeur brute, v1 conservé.
export function readPreferredDeviceIdentity(storage = globalThis.localStorage, { now = Date.now() } = {}) {
    const v2Raw = safeGet(storage, PREFERRED_DEVICE_STORAGE_KEY);
    const v2 = safeParse(v2Raw);

    if (v2 && Number(v2.schemaVersion) === DEVICE_IDENTITY_SCHEMA_VERSION) {
        return { identity: normalizeDeviceIdentity(v2, { now }), migrated: false, source: "v2" };
    }

    const v1Raw = safeGet(storage, LEGACY_PREFERRED_DEVICE_STORAGE_KEY);
    const v1 = safeParse(v1Raw);

    if (!v1) {
        return { identity: createEmptyDeviceIdentity(), migrated: false, source: v1Raw ? "unreadable" : "empty" };
    }

    const identity = migrateLegacyPreferredDevice(v1, { now });

    if (!isDeviceIdentityConfigured(identity)) {
        return { identity, migrated: false, source: "empty" };
    }

    if (!safeGet(storage, PREFERRED_DEVICE_MIGRATION_BACKUP_KEY)) {
        safeSet(storage, PREFERRED_DEVICE_MIGRATION_BACKUP_KEY, JSON.stringify({
            format: "shuffleplus-preferred-device-backup",
            createdAt: toTimestamp(now) || Date.now(),
            raw: String(v1Raw).slice(0, 4000)
        }));
    }

    writePreferredDeviceIdentity(storage, identity);
    return { identity, migrated: true, source: "v1" };
}

// Écrit l’identité v2 et maintient un miroir v1 pour qu’un retour arrière
// PWA vers la v11 retrouve toujours l’iPhone préféré.
export function writePreferredDeviceIdentity(storage = globalThis.localStorage, identity) {
    const normalized = normalizeDeviceIdentity(identity);

    if (!isDeviceIdentityConfigured(normalized)) {
        return false;
    }

    const savedV2 = safeSet(storage, PREFERRED_DEVICE_STORAGE_KEY, JSON.stringify(normalized));
    if (normalized.currentSpotifyDeviceId) {
        safeSet(
            storage,
            LEGACY_PREFERRED_DEVICE_STORAGE_KEY,
            JSON.stringify(toLegacyStoragePayload(normalized))
        );
    }
    return savedV2;
}

// Uniquement pour l’action explicite « Oublier cet appareil ».
export function forgetPreferredDeviceIdentity(storage = globalThis.localStorage) {
    for (const key of [PREFERRED_DEVICE_STORAGE_KEY, LEGACY_PREFERRED_DEVICE_STORAGE_KEY]) {
        try {
            storage?.removeItem?.(key);
        } catch {
            // Stockage indisponible : l’identité en mémoire est tout de même vidée.
        }
    }
    return createEmptyDeviceIdentity();
}

// ----- Diagnostic (sans device_id complet) ---------------------------------

const STATUS_LABELS = Object.freeze({
    unknown: "Non configuré",
    known: "Enregistré",
    available: "Disponible",
    active: "Actif",
    "not-published": "Non annoncé actuellement",
    warming: "Spotify Connect démarre",
    reassociated: "Réassociation automatique",
    ambiguous: "Ambigu",
    restricted: "Restreint",
    "reauth-required": "Session Spotify à renouveler",
    sleeping: "En veille"
});

export function getDeviceIdentityStatusLabel(status = "") {
    return STATUS_LABELS[status] || STATUS_LABELS.known;
}

export function describeDeviceIdentity(identity, { now = Date.now() } = {}) {
    const normalized = coerceIdentity(identity);
    return {
        configured: isDeviceIdentityConfigured(normalized),
        displayName: normalized.displayName,
        type: normalized.type,
        status: normalized.status,
        statusLabel: getDeviceIdentityStatusLabel(normalized.status),
        userConfirmed: normalized.userConfirmed,
        currentDeviceId: maskSpotifyDeviceId(normalized.currentSpotifyDeviceId),
        knownDeviceIdCount: normalized.knownSpotifyDeviceIds.length,
        aliasCount: normalized.aliases.length,
        lastMethod: normalized.matching.lastMethod,
        confidence: normalized.matching.confidence,
        lastSeenAt: normalized.lastSeenAt,
        lastSuccessfulAt: normalized.lastSuccessfulAt,
        lastResolutionAt: normalized.lastResolutionAt,
        lastIdChange: normalized.lastIdChange,
        lastSeenAgeMs: normalized.lastSeenAt ? Math.max(0, Number(now) - normalized.lastSeenAt) : null
    };
}
