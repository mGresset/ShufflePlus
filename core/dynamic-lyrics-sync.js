export function getPlaybackTrackKey(playback = {}) {
    const item = playback?.item;
    if (!item || item.type !== "track") return "";

    const id = typeof item.id === "string" ? item.id.trim() : "";
    if (id) return `id:${id}`;

    const uri = typeof item.uri === "string" ? item.uri.trim() : "";
    if (uri) return `uri:${uri}`;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const artists = Array.isArray(item.artists)
        ? item.artists.map((artist) => artist?.name || "").filter(Boolean).join(", ")
        : "";

    return name ? `meta:${name}|${artists}` : "";
}

export function describePlaybackTrack(playback = {}) {
    const item = playback?.item;
    if (!item || item.type !== "track") {
        return {
            key: "",
            title: "",
            artist: "",
            album: ""
        };
    }

    return {
        key: getPlaybackTrackKey(playback),
        title: String(item.name || "").trim().slice(0, 200),
        artist: Array.isArray(item.artists)
            ? item.artists.map((artist) => artist?.name || "").filter(Boolean).join(", ").slice(0, 240)
            : "",
        album: String(item.album?.name || "").trim().slice(0, 200)
    };
}

export function evaluateDynamicLyricsTrackChange({
    playback = {},
    previousTrackKey = "",
    enabled = false,
    autoSyncOnTrackChange = false,
    visible = true,
    force = false
} = {}) {
    const track = describePlaybackTrack(playback);

    if (!track.key) {
        return {
            track,
            nextTrackKey: previousTrackKey,
            changed: false,
            initializeOnly: false,
            shouldSync: false
        };
    }

    const changed = Boolean(
        previousTrackKey &&
        previousTrackKey !== track.key
    );
    const initializeOnly = !previousTrackKey && !force;

    return {
        track,
        nextTrackKey: track.key,
        changed,
        initializeOnly,
        shouldSync: Boolean(
            enabled &&
            autoSyncOnTrackChange &&
            visible &&
            (force || changed)
        )
    };
}

export function buildDynamicLyricsTrackInput(playback = {}) {
    const track = describePlaybackTrack(playback);
    if (!track.key) return "";

    return [
        "Shuffle+ Dynamic Lyrics",
        track.title ? `Titre: ${track.title}` : "",
        track.artist ? `Artiste: ${track.artist}` : "",
        track.album ? `Album: ${track.album}` : ""
    ].filter(Boolean).join("\n");
}
