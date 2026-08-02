const DEFAULT_STALE_AFTER_MS = 90_000;

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, Number(value) || 0));
}

function normalizeText(value = "") {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function readDurationMs(item = {}) {
    const value = Number(
        item?.durationMs ??
        item?.duration_ms ??
        0
    );

    return Number.isFinite(value)
        ? Math.max(0, value)
        : 0;
}

function readArtist(item = {}) {
    if (item?.artist) {
        return String(item.artist);
    }

    if (Array.isArray(item?.artists)) {
        return item.artists
            .map((artist) => artist?.name)
            .filter(Boolean)
            .join(", ");
    }

    return "";
}

function readIdentity(item = {}) {
    const direct = String(
        item?.uri ||
        item?.id ||
        ""
    ).trim();

    if (direct) {
        return direct.toLowerCase();
    }

    const name = normalizeText(item?.name);
    const artist = normalizeText(readArtist(item));

    return name || artist
        ? `${name}::${artist}`
        : "";
}

export function formatQueueWindowDuration(milliseconds = 0) {
    const totalMinutes = Math.max(
        0,
        Math.round(Number(milliseconds || 0) / 60_000)
    );

    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return minutes
        ? `${hours} h ${String(minutes).padStart(2, "0")}`
        : `${hours} h`;
}

export function shouldRefreshQueue({
    updatedAt = 0,
    now = Date.now(),
    staleAfterMs = DEFAULT_STALE_AFTER_MS
} = {}) {
    const timestamp = Math.max(0, Number(updatedAt || 0));

    if (!timestamp) {
        return true;
    }

    return Math.max(0, Number(now || Date.now()) - timestamp) >
        Math.max(1, Number(staleAfterMs || DEFAULT_STALE_AFTER_MS));
}

export function analyzeQueueContinuity(queue = [], {
    current = null,
    updatedAt = 0,
    now = Date.now(),
    staleAfterMs = DEFAULT_STALE_AFTER_MS
} = {}) {
    const items = (Array.isArray(queue) ? queue : [])
        .filter(Boolean);
    const identityCounts = new Map();
    const artistCounts = new Map();
    const itemFlags = [];
    let totalDurationMs = 0;
    let duplicateCount = 0;
    let repeatedArtistCount = 0;
    let explicitCount = 0;
    let previousArtist = normalizeText(readArtist(current));

    items.forEach((item, index) => {
        const identity = readIdentity(item);
        const artist = normalizeText(readArtist(item));
        const identityCount = identity
            ? identityCounts.get(identity) || 0
            : 0;
        const duplicate = Boolean(identity && identityCount > 0);
        const repeatedArtist = Boolean(
            artist &&
            previousArtist &&
            artist === previousArtist
        );

        if (identity) {
            identityCounts.set(identity, identityCount + 1);
        }

        if (artist) {
            artistCounts.set(
                artist,
                (artistCounts.get(artist) || 0) + 1
            );
        }

        if (duplicate) {
            duplicateCount += 1;
        }

        if (repeatedArtist) {
            repeatedArtistCount += 1;
        }

        if (item?.explicit) {
            explicitCount += 1;
        }

        totalDurationMs += readDurationMs(item);
        itemFlags.push({
            index,
            duplicate,
            repeatedArtist
        });
        previousArtist = artist || previousArtist;
    });

    const stale = shouldRefreshQueue({
        updatedAt,
        now,
        staleAfterMs
    });
    const score = clamp(
        100 -
        duplicateCount * 16 -
        repeatedArtistCount * 7 -
        (stale ? 14 : 0),
        0,
        100
    );
    const state = !items.length
        ? "empty"
        : stale
            ? "stale"
            : score >= 90
                ? "excellent"
                : score >= 70
                    ? "good"
                    : "warning";
    const label = state === "empty"
        ? "À charger"
        : state === "stale"
            ? "À actualiser"
            : state === "excellent"
                ? "File fluide"
                : state === "good"
                    ? "File correcte"
                    : "À surveiller";

    return {
        totalCount: items.length,
        uniqueCount: Math.max(0, items.length - duplicateCount),
        uniqueArtistCount: artistCounts.size,
        duplicateCount,
        repeatedArtistCount,
        explicitCount,
        totalDurationMs,
        durationLabel: formatQueueWindowDuration(totalDurationMs),
        stale,
        score,
        state,
        label,
        itemFlags
    };
}
