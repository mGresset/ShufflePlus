function cleanText(value, maxLength = 220) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

export function normalizePlaybackQueueItem(item = {}) {
    const type = item?.type === "episode" ? "episode" : "track";
    const artists = type === "episode"
        ? [item?.show?.name].filter(Boolean)
        : (Array.isArray(item?.artists) ? item.artists : [])
            .map((artist) => artist?.name)
            .filter(Boolean);
    const images = type === "episode"
        ? item?.images
        : item?.album?.images;

    return {
        id: cleanText(item?.id || item?.uri, 180),
        uri: cleanText(item?.uri, 220),
        type,
        name: cleanText(item?.name, 220) || "Titre inconnu",
        artist: cleanText(artists.join(", "), 220) || "Artiste inconnu",
        album: cleanText(
            type === "episode" ? item?.show?.name : item?.album?.name,
            220
        ),
        imageUrl: cleanText(
            Array.isArray(images) ? images[0]?.url : "",
            500
        ),
        durationMs: Number.isFinite(Number(item?.duration_ms))
            ? Math.max(0, Number(item.duration_ms))
            : 0,
        explicit: Boolean(item?.explicit)
    };
}

export function normalizePlaybackQueue(payload = {}, limit = 20) {
    const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
    const current = payload?.currently_playing
        ? normalizePlaybackQueueItem(payload.currently_playing)
        : null;
    const queue = Array.isArray(payload?.queue)
        ? payload.queue
            .filter((item) => item && ["track", "episode"].includes(item.type))
            .slice(0, safeLimit)
            .map(normalizePlaybackQueueItem)
        : [];

    return {
        current,
        queue,
        totalVisible: queue.length,
        updatedAt: Date.now()
    };
}

export function formatQueueDuration(milliseconds) {
    const seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
}
