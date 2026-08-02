import { formatQueueDuration } from "./playback-queue.js";

export const DEFAULT_DRIVING_QUEUE_STALE_MS = 90_000;

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

export function getDrivingPlaybackProgress(playback = {}) {
    const durationMs = Math.max(
        0,
        Number(playback?.item?.duration_ms || 0)
    );
    const progressMs = clamp(
        Number(playback?.progress_ms || 0),
        0,
        durationMs || Number.MAX_SAFE_INTEGER
    );
    const percent = durationMs > 0
        ? clamp((progressMs / durationMs) * 100, 0, 100)
        : 0;
    const remainingMs = Math.max(0, durationMs - progressMs);

    return {
        available: durationMs > 0,
        progressMs,
        durationMs,
        remainingMs,
        percent,
        elapsedLabel: formatQueueDuration(progressMs),
        durationLabel: formatQueueDuration(durationMs),
        remainingLabel: `-${formatQueueDuration(remainingMs)}`
    };
}

export function getDrivingQueueFreshness(
    updatedAt = 0,
    now = Date.now(),
    staleAfterMs = DEFAULT_DRIVING_QUEUE_STALE_MS
) {
    const timestamp = Math.max(0, Number(updatedAt || 0));

    if (!timestamp) {
        return {
            state: "empty",
            label: "À charger",
            ageMs: 0
        };
    }

    const ageMs = Math.max(0, Number(now || Date.now()) - timestamp);

    if (ageMs > Math.max(1, Number(staleAfterMs || 0))) {
        return {
            state: "stale",
            label: "À actualiser",
            ageMs
        };
    }

    return {
        state: "fresh",
        label: "À jour",
        ageMs
    };
}

export function buildDrivingQueuePreview(queue = [], limit = 3) {
    const safeLimit = clamp(Number(limit || 3), 1, 5);

    return (Array.isArray(queue) ? queue : [])
        .slice(0, safeLimit)
        .map((item, index) => ({
            index: index + 1,
            name: String(item?.name || "Titre inconnu"),
            artist: String(item?.artist || "Artiste inconnu"),
            imageUrl: String(item?.imageUrl || ""),
            durationLabel: formatQueueDuration(item?.durationMs || 0)
        }));
}
