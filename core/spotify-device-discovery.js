// Découverte Spotify Connect et fenêtre de réveil de l’iPhone préféré.
//
// Toutes les fonctions reçoivent une « api » injectée :
//   { getAvailableDevices({ fresh }), getCurrentPlayback({ fresh }),
//     getCooldownRemainingMs?() }
// ce qui permet de tester sans réseau ni vrai compte Spotify.

import {
    mergeDeviceObservations,
    resolvePreferredSpotifyDevice,
    isDeviceIdentityConfigured
} from "./spotify-device-identity.js";

// Retries progressifs : Spotify Connect peut mettre plusieurs secondes à
// annoncer l’iPhone juste après son ouverture par Apple Raccourcis.
export const DEVICE_WAKE_SCHEDULE_MS = Object.freeze([
    0, 800, 1600, 2800, 4500, 7000, 10000, 14000, 18000
]);
export const DEVICE_WAKE_MAX_MS = 18000;
export const SHORTCUT_LAUNCH_MAX_MS = 30000;

function createAbortError(signal) {
    const reason = signal?.reason;
    if (reason instanceof Error) return reason;
    const error = new Error("Recherche de l’appareil annulée.");
    error.name = "AbortError";
    error.code = "LAUNCH_CANCELLED";
    return error;
}

export function throwIfAborted(signal) {
    if (signal?.aborted) {
        throw createAbortError(signal);
    }
}

export function abortableSleep(ms, signal, {
    setTimer = globalThis.setTimeout,
    clearTimer = globalThis.clearTimeout
} = {}) {
    const delay = Math.max(0, Number(ms) || 0);
    if (signal?.aborted) return Promise.reject(createAbortError(signal));
    if (!delay) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const onAbort = () => {
            clearTimer(timer);
            reject(createAbortError(signal));
        };
        const timer = setTimer(() => {
            signal?.removeEventListener?.("abort", onAbort);
            resolve();
        }, delay);
        signal?.addEventListener?.("abort", onAbort, { once: true });
    });
}

function isReauthError(error) {
    return error?.code === "SPOTIFY_REAUTH_REQUIRED";
}

export async function fetchAvailableDevices(api, { fresh = true } = {}) {
    const devices = await api.getAvailableDevices({ fresh });
    return Array.isArray(devices) ? devices : [];
}

export async function fetchCurrentPlaybackDevice(api, { fresh = true } = {}) {
    const playback = await api.getCurrentPlayback({ fresh });
    return playback && typeof playback === "object" ? playback : null;
}

// Un passage de découverte : /devices puis, si nécessaire, /player.
export async function discoverOnce(api, identity, {
    includePlayback = "auto",
    signal = null
} = {}) {
    throwIfAborted(signal);
    let devices = [];
    let devicesError = null;

    try {
        devices = await fetchAvailableDevices(api, { fresh: true });
    } catch (error) {
        if (isReauthError(error)) throw error;
        devicesError = error;
    }

    throwIfAborted(signal);
    let resolution = resolvePreferredSpotifyDevice({ identity, devices });
    let playback = null;
    let playbackError = null;
    const shouldQueryPlayback = includePlayback === true ||
        (includePlayback === "auto" &&
            ["unavailable", "restricted"].includes(resolution.status));

    if (shouldQueryPlayback) {
        try {
            playback = await fetchCurrentPlaybackDevice(api, { fresh: true });
        } catch (error) {
            if (isReauthError(error)) throw error;
            playbackError = error;
        }
        throwIfAborted(signal);
        if (playback?.device) {
            resolution = resolvePreferredSpotifyDevice({ identity, devices, playback });
        }
    }

    return {
        resolution,
        devices: mergeDeviceObservations(devices, playback),
        rawDevices: devices,
        playback,
        error: devicesError && playbackError ? devicesError : (devicesError && !playback ? devicesError : null)
    };
}

// Attend que l’iPhone préféré soit visible, sans jamais élargir la recherche
// à un autre appareil. Retourne toujours un résultat structuré.
export async function waitForPreferredDevice({
    api,
    identity,
    schedule = DEVICE_WAKE_SCHEDULE_MS,
    maxMs = DEVICE_WAKE_MAX_MS,
    signal = null,
    now = () => Date.now(),
    sleep = abortableSleep,
    onAttempt = null
} = {}) {
    if (!isDeviceIdentityConfigured(identity)) {
        return {
            status: "not-configured",
            reason: "no-preferred-device",
            attempts: 0,
            devices: [],
            elapsedMs: 0
        };
    }

    const startedAt = now();
    const offsets = [...new Set(
        (Array.isArray(schedule) && schedule.length ? schedule : DEVICE_WAKE_SCHEDULE_MS)
            .map((value) => Math.max(0, Number(value) || 0))
            .filter((value) => value <= maxMs)
    )].sort((first, second) => first - second);
    let attempts = 0;
    let last = null;
    let lastError = null;
    let restrictedSeen = null;

    for (const offset of offsets) {
        throwIfAborted(signal);
        const elapsed = now() - startedAt;
        let waitMs = Math.max(0, offset - elapsed);
        const cooldownMs = Math.max(0, Number(api.getCooldownRemainingMs?.() || 0));

        // Le rate limiting Spotify est prioritaire sur le calendrier de réveil.
        if (cooldownMs > waitMs) {
            if (elapsed + cooldownMs > maxMs) {
                lastError = lastError || Object.assign(
                    new Error("Spotify limite temporairement les requêtes."),
                    { status: 429, code: "SPOTIFY_RATE_LIMITED" }
                );
                break;
            }
            waitMs = cooldownMs;
        }

        if (waitMs > 0) {
            onAttempt?.({
                attempt: attempts,
                maxAttempts: offsets.length,
                status: attempts === 0 ? "warming" : "waiting",
                reason: "spotify-connect-warming",
                waitMs
            });
            await sleep(waitMs, signal);
        }

        attempts += 1;
        onAttempt?.({
            attempt: attempts,
            maxAttempts: offsets.length,
            status: "searching",
            reason: "spotify-connect-warming"
        });

        let pass;
        try {
            pass = await discoverOnce(api, identity, { signal });
        } catch (error) {
            if (isReauthError(error) || error?.name === "AbortError" || signal?.aborted) {
                throw error;
            }
            lastError = error;
            onAttempt?.({
                attempt: attempts,
                maxAttempts: offsets.length,
                status: "error",
                error
            });
            continue;
        }

        last = pass;
        lastError = pass.error || null;
        const { resolution } = pass;

        if (resolution.status === "resolved") {
            onAttempt?.({
                attempt: attempts,
                maxAttempts: offsets.length,
                status: "found",
                device: resolution.device,
                method: resolution.method
            });
            return {
                status: "resolved",
                device: resolution.device,
                method: resolution.method,
                confidence: resolution.confidence,
                resolution,
                devices: pass.devices,
                playback: pass.playback,
                attempts,
                elapsedMs: now() - startedAt
            };
        }

        if (resolution.status === "ambiguous") {
            onAttempt?.({
                attempt: attempts,
                maxAttempts: offsets.length,
                status: "ambiguous",
                candidates: resolution.candidates
            });
            return {
                status: "ambiguous",
                reason: resolution.reason,
                candidates: resolution.candidates,
                resolution,
                devices: pass.devices,
                attempts,
                elapsedMs: now() - startedAt
            };
        }

        if (resolution.status === "restricted") {
            restrictedSeen = resolution;
        }

        onAttempt?.({
            attempt: attempts,
            maxAttempts: offsets.length,
            status: "empty",
            reason: pass.devices.length
                ? "preferred-device-not-published"
                : "no-device-published",
            visibleDeviceCount: pass.devices.length
        });
    }

    if (restrictedSeen) {
        return {
            status: "restricted",
            reason: "preferred-device-restricted",
            candidates: restrictedSeen.candidates,
            devices: last?.devices || [],
            attempts,
            elapsedMs: now() - startedAt
        };
    }

    return {
        status: "timeout",
        reason: lastError
            ? (Number(lastError.status) === 429 ? "rate-limited" : "discovery-error")
            : "preferred-device-not-published",
        error: lastError,
        devices: last?.devices || [],
        attempts,
        elapsedMs: now() - startedAt
    };
}

// « Rechercher maintenant » / reprise : force /devices et /player puis
// retourne la résolution (sans attendre). L’appelant applique la mise à jour.
export async function refreshPreferredDeviceIdentity({
    api,
    identity,
    signal = null,
    includePlayback = true
} = {}) {
    if (!isDeviceIdentityConfigured(identity)) {
        const devices = await fetchAvailableDevices(api, { fresh: true }).catch(() => []);
        return {
            resolution: resolvePreferredSpotifyDevice({ identity, devices }),
            devices: mergeDeviceObservations(devices, null),
            playback: null
        };
    }
    return discoverOnce(api, identity, { includePlayback, signal });
}
