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

    return score;
}

export function smartShuffleTracks(tracks, customOptions = {}) {
    const options = {
        artistGap: 3,
        albumGap: 2,
        trackGap: 12,
        candidatePoolSize: 80,
        recentStartWindow: 25,
        artistPenalty: 140,
        albumPenalty: 70,
        trackPenalty: 240,
        recentTrackPenalty: 90,
        ...customOptions
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
