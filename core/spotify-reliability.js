// Point d’entrée unique « fiabilité Spotify » de Shuffle+ v12.
//
// Ce module regroupe, hors de app.js :
//  - le contrôleur de l’iPhone préféré (identité logique persistante) ;
//  - la résolution de l’appareil de lancement (strict ou non) ;
//  - la carte « Appareil Spotify préféré » ;
//  - la ré-exportation des briques fiabilité (erreurs, découverte, file
//    Player, garde Raccourcis), afin de ne pas multiplier les imports.

import {
    applyDeviceResolution,
    confirmPreferredDevice,
    createEmptyDeviceIdentity,
    describeDeviceIdentity,
    deviceModeToStrategy,
    forgetPreferredDeviceIdentity,
    getDeviceIdentityStatusLabel,
    isDeviceIdentityConfigured,
    isStrictDeviceMode,
    markDeviceIdentityUnavailable,
    maskSpotifyDeviceId,
    readPreferredDeviceIdentity,
    recordDeviceSuccess,
    resolvePreferredSpotifyDevice,
    toLegacyPreferredDevice,
    writePreferredDeviceIdentity
} from "./spotify-device-identity.js";
import {
    DEVICE_WAKE_SCHEDULE_MS,
    abortableSleep,
    refreshPreferredDeviceIdentity,
    throwIfAborted,
    waitForPreferredDevice
} from "./spotify-device-discovery.js";
import { createSpotifyError, normalizeSpotifyErrorCode } from "./spotify-errors.js";
import {
    buildPreferredDeviceDiscoveryPolicy,
    prioritizeLaunchDevices
} from "./launch-reliability.js";
import {
    findStoredPreferredDevice,
    normalizePreferredSpotifyDevice,
    selectSpotifyDevice
} from "./spotify-device.js";

export {
    findStoredPreferredDevice,
    normalizePreferredSpotifyDevice,
    selectSpotifyDevice
};
export {
    DEVICE_STRATEGIES,
    RECOMMENDED_DEVICE_STRATEGY,
    deviceModeToStrategy,
    isStrictDeviceMode,
    maskSpotifyDeviceId,
    normalizeSpotifyDeviceName
} from "./spotify-device-identity.js";
export {
    DEVICE_WAKE_MAX_MS,
    DEVICE_WAKE_SCHEDULE_MS,
    SHORTCUT_LAUNCH_MAX_MS
} from "./spotify-device-discovery.js";
export {
    SPOTIFY_ERROR_CODES,
    createSpotifyError,
    describeSpotifyError,
    normalizeSpotifyErrorCode
} from "./spotify-errors.js";
export {
    claimShortcutRequest,
    completeShortcutRequest,
    createLaunchAbortScope,
    createShortcutProgressPublisher
} from "./shortcut-launch-controller.js";
export {
    spotifyPlayerCommandQueue
} from "./spotify-player-command-queue.js";

const METHOD_LABELS = Object.freeze({
    "exact-id": "identifiant Spotify actuel",
    "known-id": "identifiant Spotify déjà connu",
    "name-and-type": "même nom et même type",
    "alias-and-type": "alias confirmé",
    "active-player": "lecture active sur cet iPhone",
    "user-confirmed": "choisi par toi",
    "migrated-v1": "réglage v11 migré"
});

export function describeResolutionMethod(method = "") {
    return METHOD_LABELS[method] || "";
}

// ---------------------------------------------------------------------------
// Contrôleur de l’iPhone préféré
// ---------------------------------------------------------------------------

export function createPreferredDeviceController({
    storage = globalThis.localStorage,
    now = () => Date.now(),
    onChange = null,
    onEvent = null
} = {}) {
    const initial = readPreferredDeviceIdentity(storage, { now: now() });
    let identity = initial.identity;
    let lastResolution = null;
    let lastDiscoveryAt = 0;

    function emit(type, detail = {}) {
        try {
            onEvent?.(type, detail);
        } catch {
            // Les diagnostics ne doivent jamais bloquer un lancement.
        }
    }

    function commit(next, { persist = true } = {}) {
        identity = next;
        if (persist && isDeviceIdentityConfigured(identity)) {
            writePreferredDeviceIdentity(storage, identity);
        }
        try {
            onChange?.(toLegacyPreferredDevice(identity), identity);
        } catch {
            // L’interface sera simplement rafraîchie plus tard.
        }
        return identity;
    }

    if (initial.migrated) {
        emit("DEVICE_IDENTITY_MIGRATED", {
            displayName: identity.displayName,
            source: initial.source
        });
    }

    // Observe des appareils Spotify. Ne met à jour l’identité que si un
    // appareil correspond de manière fiable à l’iPhone logique (jamais un
    // autre appareil). Retourne la résolution structurée.
    function observe(devices = [], {
        playback = null,
        markSuccess = false,
        silent = false,
        idOnly = false
    } = {}) {
        lastDiscoveryAt = now();

        if (!isDeviceIdentityConfigured(identity)) {
            lastResolution = { status: "not-configured" };
            return { resolution: lastResolution, idChanged: false, legacy: getLegacy() };
        }

        const resolution = resolvePreferredSpotifyDevice({ identity, devices, playback });
        lastResolution = resolution;

        if (resolution.status !== "resolved") {
            if (resolution.status === "ambiguous") {
                emit("DEVICE_AMBIGUOUS", { count: resolution.candidates.length });
                commit(markDeviceIdentityUnavailable(identity, { status: "ambiguous", now: now() }), { persist: false });
            } else if (resolution.status === "restricted") {
                commit(markDeviceIdentityUnavailable(identity, { status: "restricted", now: now() }), { persist: false });
            } else if (!silent) {
                commit(markDeviceIdentityUnavailable(identity, { status: "not-published", now: now() }), { persist: false });
            }
            return { resolution, idChanged: false, legacy: getLegacy() };
        }

        // Une observation isolée (un seul appareil, sans la liste complète)
        // ne peut pas détecter une ambiguïté : elle ne met l’identité à jour
        // que sur preuve par identifiant.
        if (idOnly && !["exact-id", "known-id"].includes(resolution.method)) {
            return { resolution, idChanged: false, legacy: getLegacy() };
        }

        const applied = applyDeviceResolution(identity, resolution, {
            now: now(),
            markSuccess
        });
        commit(applied.identity);

        if (applied.idChanged) {
            emit("DEVICE_FOUND_NEW_ID", {
                displayName: identity.displayName,
                method: resolution.method,
                from: maskSpotifyDeviceId(applied.previousId),
                to: maskSpotifyDeviceId(resolution.device.id)
            });
        } else {
            emit("DEVICE_FOUND_CURRENT_ID", {
                displayName: identity.displayName,
                method: resolution.method
            });
        }

        return {
            resolution,
            idChanged: applied.idChanged,
            legacy: getLegacy()
        };
    }

    function confirm(device = {}, { reassociate = true } = {}) {
        const next = confirmPreferredDevice(identity, device, { now: now(), reassociate });
        emit("DEVICE_CONFIRMED", { displayName: next.displayName });
        commit(next);
        return getLegacy();
    }

    function forget() {
        emit("DEVICE_FORGOTTEN", { displayName: identity.displayName });
        identity = forgetPreferredDeviceIdentity(storage);
        lastResolution = null;
        try {
            onChange?.(toLegacyPreferredDevice(identity), identity);
        } catch {
            // Rien à faire.
        }
        return getLegacy();
    }

    function recordSuccess(device = {}) {
        // Le dernier lancement réussi n’alimente l’identité que s’il s’agit
        // bien de l’iPhone logique.
        const observed = observe([device], { markSuccess: true, silent: true, idOnly: true });
        if (observed.resolution.status === "resolved") {
            const result = recordDeviceSuccess(identity, observed.resolution.device.id, { now: now() });
            if (result.changed) commit(result.identity);
        }
        return observed;
    }

    function markStatus(status) {
        if (!isDeviceIdentityConfigured(identity)) return getLegacy();
        commit(markDeviceIdentityUnavailable(identity, { status, now: now() }), { persist: false });
        return getLegacy();
    }

    async function waitForDevice({
        api,
        signal = null,
        schedule = DEVICE_WAKE_SCHEDULE_MS,
        maxMs,
        sleep = abortableSleep,
        onAttempt = null
    } = {}) {
        emit("DEVICE_DISCOVERY_STARTED", { displayName: identity.displayName });
        commit(markDeviceIdentityUnavailable(identity, { status: "warming", now: now() }), { persist: false });

        const result = await waitForPreferredDevice({
            api,
            identity,
            schedule,
            ...(maxMs ? { maxMs } : {}),
            signal,
            now,
            sleep,
            onAttempt
        });

        if (result.status === "resolved") {
            const observed = observe(result.devices, { playback: result.playback });
            return {
                ...result,
                device: observed.resolution.device || result.device,
                identityUpdated: observed.idChanged
            };
        }

        if (result.status === "ambiguous") {
            emit("DEVICE_AMBIGUOUS", { count: result.candidates?.length || 0 });
            commit(markDeviceIdentityUnavailable(identity, { status: "ambiguous", now: now() }), { persist: false });
        } else if (result.status === "restricted") {
            commit(markDeviceIdentityUnavailable(identity, { status: "restricted", now: now() }), { persist: false });
        } else if (result.status === "timeout") {
            emit("DEVICE_WAKE_TIMEOUT", {
                displayName: identity.displayName,
                attempts: result.attempts,
                reason: result.reason
            });
            commit(markDeviceIdentityUnavailable(identity, { status: "not-published", now: now() }), { persist: false });
        }

        return { ...result, identityUpdated: false };
    }

    async function refreshNow({ api, signal = null, includePlayback = true } = {}) {
        const pass = await refreshPreferredDeviceIdentity({ api, identity, signal, includePlayback });
        const observed = observe(pass.devices, { playback: pass.playback });
        return {
            ...pass,
            resolution: observed.resolution,
            idChanged: observed.idChanged
        };
    }

    function getIdentity() {
        return identity;
    }

    function getLegacy() {
        return toLegacyPreferredDevice(identity);
    }

    function describe() {
        return {
            ...describeDeviceIdentity(identity, { now: now() }),
            lastResolutionStatus: lastResolution?.status || "",
            lastDiscoveryAt
        };
    }

    return {
        observe,
        confirm,
        forget,
        recordSuccess,
        markStatus,
        waitForDevice,
        refreshNow,
        getIdentity,
        getLegacy,
        describe,
        isConfigured: () => isDeviceIdentityConfigured(identity)
    };
}

// ---------------------------------------------------------------------------
// Résolution de l’appareil d’un lancement (Raccourcis, profils, mix)
// ---------------------------------------------------------------------------

function wakeMessage(event = {}, displayName = "l’iPhone") {
    switch (event.status) {
        case "warming":
            return "Réveil de Spotify Connect sur l’iPhone…";
        case "waiting":
            return "Spotify Connect démarre… nouvel essai automatique";
        case "searching":
            return `Recherche de ${displayName} ${event.attempt}/${event.maxAttempts}`;
        case "empty":
            return event.visibleDeviceCount
                ? `${displayName} pas encore annoncé · aucun autre appareil ne sera utilisé`
                : "Spotify ne publie encore aucun appareil";
        case "ambiguous":
            return "Plusieurs appareils ressemblent à ton iPhone";
        case "error":
            return event.error?.message || "Recherche interrompue, nouvel essai…";
        default:
            return "";
    }
}

function isUsable(device) {
    return Boolean(device?.id) && device.is_restricted !== true;
}

// Mode strict (« iPhone préféré ») : l’iPhone logique ou un échec propre.
async function resolveStrictLaunchDevice({
    controller,
    api,
    signal,
    onAttempt,
    onDevices,
    sleep
}) {
    if (!controller.isConfigured()) {
        throw createSpotifyError("PREFERRED_DEVICE_NOT_CONFIGURED");
    }

    const identity = controller.getIdentity();
    const displayName = identity.displayName || "l’iPhone";
    const result = await controller.waitForDevice({
        api,
        signal,
        sleep,
        onAttempt(event) {
            onAttempt?.({
                attempt: event.attempt,
                maxAttempts: event.maxAttempts,
                status: event.status === "found" ? "found" : event.status,
                device: event.device || null,
                message: event.status === "found"
                    ? `${event.device?.name || displayName} retrouvé · ${describeResolutionMethod(event.method)}`
                    : wakeMessage(event, displayName)
            });
        }
    });

    onDevices?.((result.devices || []).filter(isUsable));

    if (result.status === "resolved") {
        return {
            ...result.device,
            selectionReason: result.identityUpdated
                ? "iPhone retrouvé automatiquement (identifiant Spotify renouvelé)"
                : `iPhone enregistré · ${describeResolutionMethod(result.method)}`,
            identityMethod: result.method,
            identityUpdated: result.identityUpdated === true,
            fallbackCandidates: []
        };
    }

    if (result.status === "ambiguous") {
        throw createSpotifyError("PREFERRED_DEVICE_AMBIGUOUS", {
            diagnosticMessage: `${result.candidates?.length || 0} candidats`,
            details: {
                candidates: (result.candidates || []).map((candidate) => ({
                    name: candidate.name,
                    type: candidate.type
                }))
            }
        });
    }

    if (result.status === "restricted") {
        throw createSpotifyError("SPOTIFY_DEVICE_RESTRICTED");
    }

    if (result.reason === "rate-limited") {
        throw createSpotifyError("SPOTIFY_RATE_LIMITED", { status: 429 });
    }

    if (
        result.reason === "discovery-error" &&
        normalizeSpotifyErrorCode(result.error, {
            online: globalThis.navigator?.onLine !== false
        }) === "OFFLINE"
    ) {
        throw createSpotifyError("OFFLINE", { cause: result.error });
    }

    // Dernière tentative contrôlée : uniquement l’identifiant courant du même
    // iPhone logique (jamais un autre appareil). Spotify accepte parfois un
    // transfert vers un iPhone qui ne s’affiche pas encore dans /devices.
    const currentId = identity.currentSpotifyDeviceId;
    if (currentId && typeof api.transferPlayback === "function") {
        throwIfAborted(signal);
        onAttempt?.({
            attempt: result.attempts,
            maxAttempts: result.attempts,
            status: "searching",
            message: `Dernière tentative uniquement avec ${displayName}`
        });
        try {
            await api.transferPlayback(currentId, false);
            return {
                id: currentId,
                name: identity.displayName,
                type: identity.type,
                is_active: false,
                is_restricted: false,
                is_cached: true,
                selectionReason: "iPhone enregistré uniquement",
                identityMethod: "exact-id",
                fallbackCandidates: []
            };
        } catch (error) {
            if (error?.code === "SPOTIFY_REAUTH_REQUIRED") throw error;
            if (Number(error?.status) === 429) {
                throw createSpotifyError("SPOTIFY_RATE_LIMITED", { status: 429, cause: error });
            }
        }
    }

    throw createSpotifyError("PREFERRED_DEVICE_TEMPORARILY_UNAVAILABLE", {
        diagnosticMessage: `${result.attempts} recherches · ${result.reason || "non annoncé"}`
    });
}

// Modes non stricts (iPhone ou smartphone, actif, premier, nommé). Le
// comportement historique est conservé, mais un appareil retenu ne remplace
// JAMAIS l’iPhone préféré : seule une correspondance fiable le met à jour.
async function resolveFlexibleLaunchDevice({
    settings,
    controller,
    api,
    lastWorkingDevice,
    resolveDevice,
    defaults,
    signal,
    onAttempt,
    onDevices,
    setStatus,
    sleep
}) {
    const mode = settings.deviceMode || "preferred";
    const { maxAttempts, retryDelayMs } = buildPreferredDeviceDiscoveryPolicy({
        strict: false,
        attempts: Number(settings.autoRetryCount) || defaults.autoRetryCount,
        delayMs: Number(settings.retryDelayMs) || defaults.retryDelayMs
    });
    const rank = (devices) => {
        const preferredDevice = controller.getLegacy();
        const candidates = prioritizeLaunchDevices(devices, {
            preferredDevice,
            lastWorkingDevice,
            mode,
            deviceName: settings.deviceName || ""
        });
        return { candidates, device: candidates[0] || resolveDevice(devices, settings) || null };
    };

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        throwIfAborted(signal);
        try {
            onAttempt?.({
                attempt,
                maxAttempts,
                status: "searching",
                message: `Recherche Spotify Connect ${attempt}/${maxAttempts}`
            });

            let devices = await api.getAvailableDevices({ fresh: true });
            onDevices?.(devices);

            let { candidates, device } = rank(devices);

            // /me/player peut annoncer l’appareil actif avant /devices.
            if (!device) {
                const playback = await api.getCurrentPlayback({ fresh: true }).catch(() => null);
                const playbackDevice = playback?.device;
                if (isUsable(playbackDevice) && !devices.some((item) => item?.id === playbackDevice.id)) {
                    devices = [playbackDevice, ...devices];
                    onDevices?.(devices);
                    ({ candidates, device } = rank(devices));
                }
            }

            if (device) {
                // Met à jour l’identité seulement si c’est le même iPhone logique.
                controller.observe([device], { silent: true, idOnly: true });
                onAttempt?.({
                    attempt,
                    maxAttempts,
                    status: "found",
                    device,
                    message: `${device.name || "Appareil Spotify"} détecté${device.selectionReason ? ` · ${device.selectionReason}` : ""}`
                });
                return {
                    ...device,
                    fallbackCandidates: candidates.slice(1, 4).map((candidate) => ({ ...candidate }))
                };
            }

            onAttempt?.({ attempt, maxAttempts, status: "empty", message: "Aucun appareil contrôlable détecté" });
        } catch (error) {
            if (error?.code === "SPOTIFY_REAUTH_REQUIRED" || error?.name === "AbortError") throw error;
            onAttempt?.({ attempt, maxAttempts, status: "error", error, message: error?.message || "Recherche interrompue" });
        }

        if (attempt < maxAttempts) {
            setStatus?.(`Recherche de l’appareil… ${attempt}/${maxAttempts}`);
            await sleep(retryDelayMs, signal);
        }
    }

    const storedFallback = lastWorkingDevice?.id
        ? lastWorkingDevice
        : controller.getLegacy();

    if (mode === "iphone" && storedFallback?.id) {
        onAttempt?.({
            attempt: maxAttempts,
            maxAttempts,
            status: "cached",
            device: storedFallback,
            message: `Tentative avec ${storedFallback.name || "le dernier appareil mémorisé"}`
        });
        return {
            id: storedFallback.id,
            name: storedFallback.name,
            type: storedFallback.type,
            is_active: false,
            is_restricted: false,
            is_cached: true,
            selectionReason: "dernier appareil mémorisé"
        };
    }

    return null;
}

export async function resolveLaunchDevice({
    settings = {},
    controller,
    api,
    lastWorkingDevice = null,
    resolveDevice = () => null,
    defaults = { autoRetryCount: 6, retryDelayMs: 1100 },
    signal = null,
    onAttempt = null,
    onDevices = null,
    setStatus = null,
    sleep = abortableSleep
} = {}) {
    if (isStrictDeviceMode(settings.deviceMode || "preferred")) {
        return resolveStrictLaunchDevice({ controller, api, signal, onAttempt, onDevices, sleep });
    }

    return resolveFlexibleLaunchDevice({
        settings,
        controller,
        api,
        lastWorkingDevice,
        resolveDevice,
        defaults,
        signal,
        onAttempt,
        onDevices,
        setStatus,
        sleep
    });
}

// Vrai seulement si les deux identifiants appartiennent au même iPhone logique
// (ID courant ou historique) : jamais sur une simple ressemblance de nom.
function isKnownIdOfLogicalDevice(controller, observedId, targetId) {
    if (!controller?.isConfigured?.()) return false;
    const known = controller.getIdentity().knownSpotifyDeviceIds.map((entry) => entry.id);
    return known.includes(observedId) && known.includes(targetId);
}

// Vérifie réellement via GET /me/player que la lecture est active sur le bon
// appareil logique (le device_id peut avoir été renouvelé entre-temps).
export async function verifyPlaybackOnLogicalDevice({
    api,
    controller,
    deviceId,
    expectedContextUri = "",
    attempts = 3,
    delayMs = 650,
    signal = null,
    sleep = abortableSleep
} = {}) {
    let lastState = null;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
        if (attempt > 0) await sleep(delayMs, signal);
        throwIfAborted(signal);
        lastState = await api.getCurrentPlayback({ fresh: true }).catch(() => null);
        const device = lastState?.device;
        const rightDevice = Boolean(device?.id) && (
            device.id === deviceId ||
            isKnownIdOfLogicalDevice(controller, device.id, deviceId)
        );
        const rightContext = !expectedContextUri ||
            lastState?.context?.uri === expectedContextUri;

        if (rightDevice && lastState?.is_playing === true && rightContext) {
            return lastState;
        }
    }

    return lastState;
}

// ---------------------------------------------------------------------------
// Carte « Appareil Spotify préféré »
// ---------------------------------------------------------------------------

function formatAge(timestamp, now) {
    if (!timestamp) return "Jamais";
    const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
    if (seconds < 60) return `Il y a ${seconds} s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes} min`;
    const date = new Date(timestamp);
    const today = new Date(now);
    const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === today.toDateString()) return `Aujourd’hui ${time}`;
    return `${date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ${time}`;
}

const STATUS_TONES = Object.freeze({
    available: "ok",
    active: "ok",
    known: "neutral",
    warming: "pending",
    "not-published": "neutral",
    sleeping: "neutral",
    ambiguous: "warning",
    restricted: "warning",
    "reauth-required": "warning",
    unknown: "neutral"
});

export function renderPreferredDevicePanelMarkup({
    controller,
    availableDevices = [],
    escapeHtml,
    sessionReauthRequired = false,
    now = Date.now()
} = {}) {
    const identity = controller.getIdentity();
    const description = controller.describe();
    const configured = description.configured;
    const status = sessionReauthRequired ? "reauth-required" : (identity.status || "known");
    const statusLabel = getDeviceIdentityStatusLabel(status);
    const tone = STATUS_TONES[status] || "neutral";
    const devices = (Array.isArray(availableDevices) ? availableDevices : [])
        .filter((device) => device?.id && device.is_restricted !== true);
    const currentId = identity.currentSpotifyDeviceId;
    const idChange = identity.lastIdChange?.at
        ? `${formatAge(identity.lastIdChange.at, now)} · ${escapeHtml(describeResolutionMethod(identity.lastIdChange.method) || "automatique")}`
        : "Aucun";

    return `
        <section class="ios-preferred-device-panel preferred-device-card" data-preferred-device-card data-device-status="${escapeHtml(status)}">
            <div class="ios-preferred-device-heading">
                <div>
                    <span>📱 Appareil Spotify préféré</span>
                    <strong data-preferred-device-name>
                        ${escapeHtml(identity.displayName || "Aucun iPhone enregistré")}
                    </strong>
                    <small class="preferred-device-status is-${tone}" data-preferred-device-status>
                        <span aria-hidden="true">●</span> ${escapeHtml(configured ? statusLabel : "Choisis ton iPhone une seule fois")}
                    </small>
                </div>
                <button
                    id="refreshPreferredSpotifyDevicesButton"
                    type="button"
                    class="preferred-device-primary"
                >
                    ↻ Rechercher maintenant
                </button>
            </div>
            ${configured ? `
                <dl class="preferred-device-facts">
                    <div><dt>Dernière détection</dt><dd>${escapeHtml(formatAge(identity.lastSeenAt, now))}</dd></div>
                    <div><dt>Dernier lancement réussi</dt><dd>${escapeHtml(formatAge(identity.lastSuccessfulAt, now))}</dd></div>
                    <div><dt>Identifiant Spotify</dt><dd>Géré automatiquement</dd></div>
                    <div><dt>Dernier renouvellement</dt><dd>${idChange}</dd></div>
                </dl>
            ` : ""}
            <div class="ios-preferred-device-grid">
                <label>
                    <span>${configured ? "Réassocier avec un appareil présent" : "Appareil détecté"}</span>
                    <select id="preferredSpotifyDeviceSelect">
                        <option value="">${devices.length ? "Choisir un appareil" : "Ouvre Spotify puis « Rechercher »"}</option>
                        ${devices.map((device) => `
                            <option value="${escapeHtml(device.id)}" ${device.id === currentId ? "selected" : ""}>
                                ${escapeHtml(device.name || "Appareil Spotify")} · ${escapeHtml(device.type || "inconnu")}${device.is_active ? " · actif" : ""}
                            </option>
                        `).join("")}
                    </select>
                </label>
            </div>
            <details class="preferred-device-advanced">
                <summary>Saisie manuelle (avancé)</summary>
                <div class="ios-preferred-device-grid">
                    <label>
                        <span>device_id manuel</span>
                        <input id="preferredSpotifyDeviceIdInput" type="text" value="" placeholder="${escapeHtml(currentId ? maskSpotifyDeviceId(currentId) : "d03a1e…")}" autocomplete="off" autocapitalize="off" spellcheck="false">
                    </label>
                    <label>
                        <span>Nom affiché</span>
                        <input id="preferredSpotifyDeviceNameInput" type="text" value="${escapeHtml(identity.displayName || "iPhone")}" placeholder="iPhone">
                    </label>
                </div>
            </details>
            <div class="ios-preferred-device-actions">
                <button id="clearPreferredSpotifyDeviceButton" type="button" class="preferred-device-danger" ${configured ? "" : "disabled"}>
                    Oublier
                </button>
                <button id="testPreferredSpotifyDeviceButton" type="button" ${configured ? "" : "disabled"}>
                    Tester
                </button>
                <button id="savePreferredSpotifyDeviceButton" type="button">
                    ${configured ? "Réassocier" : "Enregistrer cet iPhone"}
                </button>
            </div>
            <p>
                Shuffle+ mémorise ton iPhone comme une identité logique. Si Spotify renouvelle son identifiant,
                l’iPhone est retrouvé automatiquement (même nom et même type, ou identifiant déjà connu).
                Une absence temporaire dans Spotify Connect n’efface jamais ce choix.
            </p>
        </section>
    `;
}

export function getPreferredDeviceStrategyLabel(mode = "preferred") {
    switch (deviceModeToStrategy(mode)) {
        case "PREFERRED_STRICT":
            return "iPhone préféré uniquement (recommandé)";
        case "PREFERRED_THEN_LAST_SUCCESSFUL":
            return "iPhone préféré puis dernier appareil réussi";
        case "ACTIVE_DEVICE":
            return "Appareil Spotify actif";
        case "FIRST_AVAILABLE":
            return "Premier appareil disponible";
        default:
            return "Appareil portant un nom précis";
    }
}

export { createEmptyDeviceIdentity, isDeviceIdentityConfigured, toLegacyPreferredDevice };
