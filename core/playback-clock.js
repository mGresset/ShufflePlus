export function getPlaybackTrackIdentity(playback = null) {
    return String(
        playback?.item?.id ||
        playback?.item?.uri ||
        ""
    );
}

export function clampPlaybackProgress(
    progressMs = 0,
    durationMs = 0
) {
    const safeProgress = Math.max(
        0,
        Number(progressMs || 0)
    );
    const safeDuration = Math.max(
        0,
        Number(durationMs || 0)
    );

    return safeDuration > 0
        ? Math.min(safeDuration, safeProgress)
        : safeProgress;
}

export function getPlaybackClockSnapshot(
    playback = null,
    now = Date.now()
) {
    if (!playback) {
        return playback;
    }

    const durationMs = Math.max(
        0,
        Number(playback?.item?.duration_ms || 0)
    );
    const anchorProgressMs = clampPlaybackProgress(
        playback.__shuffleplusClockProgressMs ??
            playback.progress_ms,
        durationMs
    );
    const anchorAt = Math.max(
        0,
        Number(
            playback.__shuffleplusClockAt ||
            now
        )
    );
    const elapsedMs = playback.is_playing
        ? Math.max(0, Number(now || Date.now()) - anchorAt)
        : 0;
    const progressMs = clampPlaybackProgress(
        anchorProgressMs + elapsedMs,
        durationMs
    );

    return {
        ...playback,
        progress_ms: progressMs,
        __shuffleplusClockProgressMs:
            anchorProgressMs,
        __shuffleplusClockAt: anchorAt
    };
}

export function stampPlaybackClock(
    playback = null,
    now = Date.now()
) {
    if (!playback) {
        return playback;
    }

    const durationMs = Math.max(
        0,
        Number(playback?.item?.duration_ms || 0)
    );
    const progressMs = clampPlaybackProgress(
        playback.progress_ms,
        durationMs
    );

    return {
        ...playback,
        progress_ms: progressMs,
        __shuffleplusClockProgressMs:
            progressMs,
        __shuffleplusClockAt:
            Number(now || Date.now())
    };
}

export function setPlaybackClockPlayingState(
    playback = null,
    isPlaying = false,
    now = Date.now()
) {
    const snapshot = getPlaybackClockSnapshot(
        playback,
        now
    ) || {};
    const progressMs = Math.max(
        0,
        Number(snapshot.progress_ms || 0)
    );

    return {
        ...snapshot,
        is_playing: Boolean(isPlaying),
        progress_ms: progressMs,
        __shuffleplusClockProgressMs:
            progressMs,
        __shuffleplusClockAt:
            Number(now || Date.now())
    };
}


export function applyPlaybackIntentOverride(
    playback = null,
    {
        anchorPlayback = null,
        expectedPlaying = null,
        now = Date.now()
    } = {}
) {
    if (typeof expectedPlaying !== "boolean") {
        return getPlaybackClockSnapshot(playback, now);
    }

    const remoteSnapshot =
        getPlaybackClockSnapshot(playback, now) || {};
    const anchorSnapshot =
        getPlaybackClockSnapshot(
            anchorPlayback,
            now
        ) || {};
    const mergedPlayback = {
        ...remoteSnapshot,
        ...anchorSnapshot
    };

    return setPlaybackClockPlayingState(
        mergedPlayback,
        expectedPlaying,
        now
    );
}

export function formatPlaybackClockLabel(
    milliseconds = 0
) {
    const totalSeconds = Math.max(
        0,
        Math.floor(
            Number(milliseconds || 0) / 1000
        )
    );
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor(
        (totalSeconds % 3600) / 60
    );
    const seconds = totalSeconds % 60;

    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
        : `${minutes}:${String(seconds).padStart(2, "0")}`;
}
