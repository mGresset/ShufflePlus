const HISTORY_KEY = "shuffleplus_recent_track_uris_v1";
const HISTORY_LIMIT = 50;

function normalize(value = "") {
    return String(value).trim().toLowerCase();
}

function getTrackKey(track) {
    return track?.uri || track?.id || "";
}

function getAlbumKey(track) {
    return track?.album?.id || normalize(track?.album?.name);
}

function getArtistKeys(track) {
    return (track?.artists || [])
        .map((artist) => artist?.id || normalize(artist?.name))
        .filter(Boolean);
}

function sharesArtist(firstTrack, secondTrack) {
    const firstArtists = new Set(getArtistKeys(firstTrack));

    return getArtistKeys(secondTrack).some((artist) =>
        firstArtists.has(artist)
    );
}

function fisherYates(items) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [shuffled[index], shuffled[randomIndex]] = [
            shuffled[randomIndex],
            shuffled[index]
        ];
    }

    return shuffled;
}

export function getRecentTrackUris() {
    try {
        const storedValue = localStorage.getItem(HISTORY_KEY);
        const parsedValue = storedValue ? JSON.parse(storedValue) : [];

        return Array.isArray(parsedValue)
            ? parsedValue.filter((uri) => typeof uri === "string")
            : [];
    } catch (error) {
        console.warn("Historique Shuffle+ illisible :", error);
        return [];
    }
}

export function rememberPlaybackOrder(tracks, limit = 30) {
    const newUris = tracks
        .slice(0, limit)
        .map(getTrackKey)
        .filter(Boolean);

    if (!newUris.length) {
        return;
    }

    const previousUris = getRecentTrackUris();
    const mergedUris = [];
    const seenUris = new Set();

    for (const uri of [...newUris, ...previousUris]) {
        if (!seenUris.has(uri)) {
            seenUris.add(uri);
            mergedUris.push(uri);
        }

        if (mergedUris.length >= HISTORY_LIMIT) {
            break;
        }
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(mergedUris));
}


function normalizePriorityText(value = "") {
    return normalize(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function includesPriorityText(value, items = []) {
    const normalizedValue = normalizePriorityText(value);

    return items.some((item) =>
        normalizedValue.includes(
            normalizePriorityText(item)
        )
    );
}

function getPriorityMatchCount(track, rules = {}) {
    let matches = 0;
    const favoredTrackUris = Array.isArray(
        rules.favoredTrackUris
    )
        ? rules.favoredTrackUris
        : [];
    const favoredArtists = Array.isArray(
        rules.favoredArtists
    )
        ? rules.favoredArtists
        : [];
    const favoredAlbums = Array.isArray(
        rules.favoredAlbums
    )
        ? rules.favoredAlbums
        : [];

    if (
        track?.uri &&
        favoredTrackUris.includes(track.uri)
    ) {
        matches += 1;
    }

    if (
        favoredArtists.length &&
        (track?.artists || []).some((artist) =>
            includesPriorityText(
                artist?.name || "",
                favoredArtists
            )
        )
    ) {
        matches += 1;
    }

    if (
        favoredAlbums.length &&
        includesPriorityText(
            track?.album?.name || "",
            favoredAlbums
        )
    ) {
        matches += 1;
    }

    return matches;
}


function getTrackDurationSeconds(track) {
    return Math.max(
        0,
        Number(track?.duration_ms || 0) / 1000
    );
}

function getTrackVersionType(track) {
    const text = normalizePriorityText([
        track?.name,
        track?.album?.name
    ].filter(Boolean).join(" "));

    if (/\blive\b|en concert|concert\b/.test(text)) {
        return "live";
    }

    if (/\bremix\b|\brework\b|\bedit\b/.test(text)) {
        return "remix";
    }

    if (/\binstrumental\b/.test(text)) {
        return "instrumental";
    }

    if (/\bkaraoke\b/.test(text)) {
        return "karaoke";
    }

    return "standard";
}

function getDurationCategory(track) {
    const duration = getTrackDurationSeconds(track);

    if (duration < 150) {
        return "short";
    }

    if (duration > 330) {
        return "long";
    }

    return "medium";
}

function getTransitionPenalty(
    previousTrack,
    nextTrack,
    options,
    position
) {
    if (
        !previousTrack ||
        options.coherenceSettings.level === "free"
    ) {
        return 0;
    }

    const settings = options.coherenceSettings;
    const basePenalty =
        settings.level === "fluid" ? 85 : 38;
    const earlyMultiplier =
        settings.strengthenFirstThirty &&
        position < 30
            ? 1.45 - (position / 30) * 0.25
            : 1;

    let penalty = 0;

    const previousDuration =
        getTrackDurationSeconds(previousTrack);
    const nextDuration =
        getTrackDurationSeconds(nextTrack);
    const durationDifference = Math.abs(
        previousDuration - nextDuration
    );

    if (
        previousDuration > 0 &&
        nextDuration > 0 &&
        durationDifference >=
            settings.durationJumpSeconds
    ) {
        penalty += basePenalty *
            Math.min(
                2.2,
                durationDifference /
                    settings.durationJumpSeconds
            );
    }

    const previousCategory =
        getDurationCategory(previousTrack);
    const nextCategory =
        getDurationCategory(nextTrack);

    if (
        (previousCategory === "short" &&
            nextCategory === "long") ||
        (previousCategory === "long" &&
            nextCategory === "short")
    ) {
        penalty += basePenalty * 0.75;
    }

    const previousType =
        getTrackVersionType(previousTrack);
    const nextType =
        getTrackVersionType(nextTrack);

    if (
        previousType !== "standard" &&
        previousType === nextType
    ) {
        penalty += basePenalty * 1.15;
    } else if (
        previousType !== "standard" &&
        nextType !== "standard" &&
        previousType !== nextType
    ) {
        penalty += basePenalty * 0.55;
    }

    return penalty * earlyMultiplier;
}

function analyzeTransition(
    previousTrack,
    nextTrack,
    durationJumpSeconds = 150
) {
    const previousDuration =
        getTrackDurationSeconds(previousTrack);
    const nextDuration =
        getTrackDurationSeconds(nextTrack);
    const durationDifference = Math.abs(
        previousDuration - nextDuration
    );
    const durationJump =
        previousDuration > 0 &&
        nextDuration > 0 &&
        durationDifference >= durationJumpSeconds;

    const previousCategory =
        getDurationCategory(previousTrack);
    const nextCategory =
        getDurationCategory(nextTrack);
    const extremeDurationSwitch =
        (
            previousCategory === "short" &&
            nextCategory === "long"
        ) ||
        (
            previousCategory === "long" &&
            nextCategory === "short"
        );

    const previousType =
        getTrackVersionType(previousTrack);
    const nextType =
        getTrackVersionType(nextTrack);
    const repeatedVersion =
        previousType !== "standard" &&
        previousType === nextType;

    return {
        durationJump,
        repeatedVersion,
        abrupt:
            durationJump ||
            extremeDurationSwitch ||
            repeatedVersion
    };
}

function scoreCandidate(track, orderedTracks, recentTrackUris, options) {
    let score = Math.random();
    const trackKey = getTrackKey(track);
    const albumKey = getAlbumKey(track);
    const position = orderedTracks.length;

    if (
        trackKey &&
        recentTrackUris.has(trackKey) &&
        position < options.recentStartWindow
    ) {
        score += options.recentTrackPenalty *
            (1 - position / options.recentStartWindow);
    }

    for (let distance = 1; distance <= options.artistGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];

        if (previousTrack && sharesArtist(track, previousTrack)) {
            score += options.artistPenalty / distance;
        }
    }

    for (let distance = 1; distance <= options.albumGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];

        if (
            previousTrack &&
            albumKey &&
            albumKey === getAlbumKey(previousTrack)
        ) {
            score += options.albumPenalty / distance;
        }
    }

    for (let distance = 1; distance <= options.trackGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];

        if (
            previousTrack &&
            trackKey &&
            trackKey === getTrackKey(previousTrack)
        ) {
            score += options.trackPenalty / distance;
        }
    }


    const previousTrack =
        orderedTracks[position - 1];

    score += getTransitionPenalty(
        previousTrack,
        track,
        options,
        position
    );

    const priorityMatchCount =
        getPriorityMatchCount(
            track,
            options.priorityRules
        );

    if (priorityMatchCount > 0) {
        const intensityBonus = {
            light: 18,
            normal: 45,
            strong: 85
        }[
            options.priorityRules?.intensity
        ] || 45;

        const firstTwentyMultiplier =
            options.priorityRules?.boostFirstTwenty &&
            position < 20
                ? 1.8 - (position / 20) * 0.55
                : 1;

        score -=
            intensityBonus *
            priorityMatchCount *
            firstTwentyMultiplier;
    }

    return score;
}

function normalizeNumberOption(
    value,
    minimum,
    maximum,
    fallback
) {
    const normalizedValue = Number(value);

    if (!Number.isFinite(normalizedValue)) {
        return fallback;
    }

    return Math.min(
        maximum,
        Math.max(minimum, normalizedValue)
    );
}

export function smartShuffleTracks(tracks, customOptions = {}) {
    const options = {
        artistGap: normalizeNumberOption(
            customOptions.artistGap,
            0,
            10,
            3
        ),
        albumGap: normalizeNumberOption(
            customOptions.albumGap,
            0,
            8,
            2
        ),
        trackGap: normalizeNumberOption(
            customOptions.trackGap,
            0,
            30,
            12
        ),
        candidatePoolSize: normalizeNumberOption(
            customOptions.candidatePoolSize,
            1,
            250,
            80
        ),
        recentStartWindow: normalizeNumberOption(
            customOptions.recentStartWindow,
            0,
            100,
            25
        ),
        artistPenalty: normalizeNumberOption(
            customOptions.artistPenalty,
            0,
            1000,
            140
        ),
        albumPenalty: normalizeNumberOption(
            customOptions.albumPenalty,
            0,
            1000,
            70
        ),
        trackPenalty: normalizeNumberOption(
            customOptions.trackPenalty,
            0,
            1000,
            240
        ),
        recentTrackPenalty: normalizeNumberOption(
            customOptions.recentTrackPenalty,
            0,
            1000,
            90
        ),
        coherenceSettings: {
            level:
                ["free", "balanced", "fluid"].includes(
                    customOptions.coherenceSettings?.level
                )
                    ? customOptions.coherenceSettings.level
                    : "balanced",
            strengthenFirstThirty:
                customOptions.coherenceSettings
                    ?.strengthenFirstThirty !== false,
            durationJumpSeconds:
                normalizeNumberOption(
                    customOptions.coherenceSettings
                        ?.durationJumpSeconds,
                    60,
                    600,
                    150
                )
        },
        priorityRules: {
            favoredArtists:
                Array.isArray(
                    customOptions.priorityRules?.favoredArtists
                )
                    ? customOptions.priorityRules.favoredArtists
                    : [],
            favoredAlbums:
                Array.isArray(
                    customOptions.priorityRules?.favoredAlbums
                )
                    ? customOptions.priorityRules.favoredAlbums
                    : [],
            favoredTrackUris:
                Array.isArray(
                    customOptions.priorityRules?.favoredTrackUris
                )
                    ? customOptions.priorityRules.favoredTrackUris
                    : [],
            intensity:
                ["light", "normal", "strong"].includes(
                    customOptions.priorityRules?.intensity
                )
                    ? customOptions.priorityRules.intensity
                    : "normal",
            boostFirstTwenty:
                customOptions.priorityRules?.boostFirstTwenty !== false
        }
    };

    const remainingTracks = fisherYates(
        tracks.filter((track) => track?.uri)
    );

    const orderedTracks = [];
    const recentTrackUris = new Set(getRecentTrackUris());

    while (remainingTracks.length) {
        const candidateCount = Math.min(
            remainingTracks.length,
            options.candidatePoolSize
        );

        let bestIndex = 0;
        let bestScore = Number.POSITIVE_INFINITY;

        for (let index = 0; index < candidateCount; index += 1) {
            const candidateScore = scoreCandidate(
                remainingTracks[index],
                orderedTracks,
                recentTrackUris,
                options
            );

            if (candidateScore < bestScore) {
                bestScore = candidateScore;
                bestIndex = index;
            }
        }

        const [selectedTrack] = remainingTracks.splice(bestIndex, 1);
        orderedTracks.push(selectedTrack);
    }

    return orderedTracks;
}

export function analyzeShuffleOrder(tracks) {
    let consecutiveArtistRepeats = 0;
    let consecutiveAlbumRepeats = 0;
    let consecutiveTrackRepeats = 0;
    let abruptTransitions = 0;
    let durationJumpTransitions = 0;
    let repeatedVersionTransitions = 0;

    for (let index = 1; index < tracks.length; index += 1) {
        const currentTrack = tracks[index];
        const previousTrack = tracks[index - 1];

        if (sharesArtist(currentTrack, previousTrack)) {
            consecutiveArtistRepeats += 1;
        }

        const currentAlbum = getAlbumKey(currentTrack);
        const previousAlbum = getAlbumKey(previousTrack);

        if (
            currentAlbum &&
            previousAlbum &&
            currentAlbum === previousAlbum
        ) {
            consecutiveAlbumRepeats += 1;
        }

        const currentTrackKey = getTrackKey(currentTrack);
        const previousTrackKey = getTrackKey(previousTrack);

        if (
            currentTrackKey &&
            currentTrackKey === previousTrackKey
        ) {
            consecutiveTrackRepeats += 1;
        }

        const transition = analyzeTransition(
            previousTrack,
            currentTrack
        );

        if (transition.abrupt) {
            abruptTransitions += 1;
        }

        if (transition.durationJump) {
            durationJumpTransitions += 1;
        }

        if (transition.repeatedVersion) {
            repeatedVersionTransitions += 1;
        }
    }

    const recentTrackUris = new Set(getRecentTrackUris());
    const recentTracksInFirstTwenty = tracks
        .slice(0, 20)
        .filter((track) => recentTrackUris.has(getTrackKey(track)))
        .length;

    return {
        consecutiveArtistRepeats,
        consecutiveAlbumRepeats,
        consecutiveTrackRepeats,
        recentTracksInFirstTwenty,
        abruptTransitions,
        durationJumpTransitions,
        repeatedVersionTransitions
    };
}
