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
        recentTracksInFirstTwenty
    };
}
