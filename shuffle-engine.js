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

function fisherYates(items, random = Math.random) {
    const shuffled = [...items];

    for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(random() * (index + 1));

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


function getTrackIntensityScore(track) {
    const popularity = normalizeNumberOption(
        track?.popularity,
        0,
        100,
        50
    );
    const type = getTrackVersionType(track);
    const duration = getTrackDurationSeconds(track);

    let score = popularity;

    if (track?.explicit) {
        score += 3;
    }

    if (type === "remix") {
        score += 9;
    } else if (type === "live") {
        score += 5;
    } else if (type === "instrumental") {
        score -= 7;
    } else if (type === "karaoke") {
        score -= 10;
    }

    if (duration > 0 && duration < 135) {
        score += 4;
    }

    if (duration > 420) {
        score -= 4;
    }

    return Math.min(
        100,
        Math.max(0, score)
    );
}

function getTargetIntensity(
    settings,
    position,
    totalTracks
) {
    const progress =
        totalTracks <= 1
            ? 0
            : position / (totalTracks - 1);
    const start = settings.startIntensity;
    const end = settings.endIntensity;
    const peak = settings.peakIntensity;

    switch (settings.curve) {
        case "rising":
        case "falling":
        case "stable":
            return start + (end - start) * progress;
        case "waves": {
            const baseline =
                start + (end - start) * progress;
            const amplitude = Math.max(
                8,
                peak - Math.max(start, end)
            );

            return Math.min(
                100,
                Math.max(
                    0,
                    baseline +
                    Math.sin(
                        progress * Math.PI * 4
                    ) * amplitude
                )
            );
        }
        case "central-peak":
            return progress <= 0.5
                ? start +
                    (peak - start) *
                    (progress * 2)
                : peak +
                    (end - peak) *
                    ((progress - 0.5) * 2);
        default:
            return start;
    }
}

function getIntensityPenalty(
    track,
    previousTrack,
    options,
    position
) {
    const settings = options.intensitySettings;
    const target = getTargetIntensity(
        settings,
        position,
        options.totalTracks
    );
    const actual = getTrackIntensityScore(track);
    const strengthMultiplier = {
        light: 0.65,
        normal: 1.35,
        strong: 2.35
    }[settings.strength] || 1.35;

    let penalty =
        Math.abs(actual - target) *
        strengthMultiplier;

    if (
        settings.smoothTransitions &&
        previousTrack
    ) {
        const previousIntensity =
            getTrackIntensityScore(previousTrack);
        const jump = Math.abs(
            actual - previousIntensity
        );

        if (jump > 24) {
            penalty +=
                (jump - 24) *
                strengthMultiplier *
                1.2;
        }
    }

    return penalty;
}

function scoreCandidate(track, orderedTracks, recentTrackUris, options, random = Math.random) {
    let score = random();
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

    score += getIntensityPenalty(
        track,
        previousTrack,
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

function normalizeShuffleOptions(tracks, customOptions = {}) {
    return {
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
        totalTracks: Math.max(1, tracks.length),
        intensitySettings: {
            curve: [
                "rising",
                "falling",
                "stable",
                "waves",
                "central-peak"
            ].includes(customOptions.intensitySettings?.curve)
                ? customOptions.intensitySettings.curve
                : "stable",
            startIntensity: normalizeNumberOption(
                customOptions.intensitySettings?.startIntensity,
                0,
                100,
                45
            ),
            endIntensity: normalizeNumberOption(
                customOptions.intensitySettings?.endIntensity,
                0,
                100,
                65
            ),
            peakIntensity: normalizeNumberOption(
                customOptions.intensitySettings?.peakIntensity,
                0,
                100,
                85
            ),
            strength: ["light", "normal", "strong"].includes(
                customOptions.intensitySettings?.strength
            )
                ? customOptions.intensitySettings.strength
                : "normal",
            smoothTransitions:
                customOptions.intensitySettings?.smoothTransitions !== false
        },
        coherenceSettings: {
            level: ["free", "balanced", "fluid"].includes(
                customOptions.coherenceSettings?.level
            )
                ? customOptions.coherenceSettings.level
                : "balanced",
            strengthenFirstThirty:
                customOptions.coherenceSettings?.strengthenFirstThirty !== false,
            durationJumpSeconds: normalizeNumberOption(
                customOptions.coherenceSettings?.durationJumpSeconds,
                60,
                600,
                150
            )
        },
        priorityRules: {
            favoredArtists: Array.isArray(
                customOptions.priorityRules?.favoredArtists
            )
                ? customOptions.priorityRules.favoredArtists
                : [],
            favoredAlbums: Array.isArray(
                customOptions.priorityRules?.favoredAlbums
            )
                ? customOptions.priorityRules.favoredAlbums
                : [],
            favoredTrackUris: Array.isArray(
                customOptions.priorityRules?.favoredTrackUris
            )
                ? customOptions.priorityRules.favoredTrackUris
                : [],
            intensity: ["light", "normal", "strong"].includes(
                customOptions.priorityRules?.intensity
            )
                ? customOptions.priorityRules.intensity
                : "normal",
            boostFirstTwenty:
                customOptions.priorityRules?.boostFirstTwenty !== false
        }
    };
}

function hashShuffleSeed(value = "") {
    const text = String(value || "shuffleplus");
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

export function normalizeShuffleSeed(value = "") {
    const normalized = String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "")
        .slice(0, 32);

    return normalized || "shuffleplus";
}

export function createShuffleSeed() {
    try {
        const values = new Uint32Array(2);
        globalThis.crypto?.getRandomValues?.(values);

        if (values.some((value) => value !== 0)) {
            return `${values[0].toString(36)}${values[1].toString(36)}`;
        }
    } catch {
        // Le secours temporel suffit pour créer un nouveau mélange local.
    }

    return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

export function createSeededRandom(seed = "shuffleplus") {
    let state = hashShuffleSeed(normalizeShuffleSeed(seed));

    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

function getConstraintViolations(track, orderedTracks, options) {
    const position = orderedTracks.length;
    const trackKey = getTrackKey(track);
    const albumKey = getAlbumKey(track);
    let artistDistance = 0;
    let albumDistance = 0;
    let trackDistance = 0;

    for (let distance = 1; distance <= options.artistGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];
        if (previousTrack && sharesArtist(track, previousTrack)) {
            artistDistance = distance;
            break;
        }
    }

    for (let distance = 1; distance <= options.albumGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];
        if (
            previousTrack &&
            albumKey &&
            albumKey === getAlbumKey(previousTrack)
        ) {
            albumDistance = distance;
            break;
        }
    }

    for (let distance = 1; distance <= options.trackGap; distance += 1) {
        const previousTrack = orderedTracks[position - distance];
        if (
            previousTrack &&
            trackKey &&
            trackKey === getTrackKey(previousTrack)
        ) {
            trackDistance = distance;
            break;
        }
    }

    return {
        artist: artistDistance > 0,
        album: albumDistance > 0,
        track: trackDistance > 0,
        immediateArtist: artistDistance === 1,
        artistDistance,
        albumDistance,
        trackDistance
    };
}

function chooseCandidateTier(candidates) {
    const tiers = [
        {
            id: "strict",
            label: "Toutes les contraintes respectées",
            filter: ({ violations }) =>
                !violations.artist &&
                !violations.album &&
                !violations.track
        },
        {
            id: "album-relaxed",
            label: "Écart d’album relâché",
            filter: ({ violations }) =>
                !violations.artist && !violations.track
        },
        {
            id: "artist-relaxed",
            label: "Écart d’artiste relâché",
            filter: ({ violations }) =>
                !violations.track && !violations.immediateArtist
        },
        {
            id: "immediate-artist-relaxed",
            label: "Répétition immédiate d’artiste autorisée",
            filter: ({ violations }) => !violations.track
        },
        {
            id: "fallback",
            label: "Contraintes relâchées faute d’alternative",
            filter: () => true
        }
    ];

    for (const tier of tiers) {
        const eligible = candidates.filter(tier.filter);
        if (eligible.length) {
            return { ...tier, eligible };
        }
    }

    return { ...tiers.at(-1), eligible: candidates };
}

function getPlacementReasons({
    track,
    orderedTracks,
    options,
    recentTrackUris,
    tier,
    violations
}) {
    const position = orderedTracks.length;
    const reasons = [];
    const targetIntensity = getTargetIntensity(
        options.intensitySettings,
        position,
        options.totalTracks
    );
    const actualIntensity = getTrackIntensityScore(track);
    const previousTrack = orderedTracks[position - 1];
    const priorityMatches = getPriorityMatchCount(
        track,
        options.priorityRules
    );

    if (position === 0) {
        reasons.push(
            `ouvre le mix près de l’intensité cible (${Math.round(targetIntensity)} %)`
        );
    }

    if (priorityMatches > 0) {
        reasons.push(
            priorityMatches > 1
                ? "cumule plusieurs priorités définies"
                : "correspond à une priorité définie"
        );
    }

    if (position > 0 && !violations.artist) {
        reasons.push("garde de la distance avec le même artiste");
    }

    if (position > 0 && !violations.album && reasons.length < 3) {
        reasons.push("évite un album trop proche");
    }

    if (Math.abs(actualIntensity - targetIntensity) <= 12 && reasons.length < 3) {
        reasons.push("suit la courbe d’intensité demandée");
    }

    if (
        previousTrack &&
        getTransitionPenalty(
            previousTrack,
            track,
            options,
            position
        ) < 18 &&
        reasons.length < 3
    ) {
        reasons.push("forme une transition cohérente avec le titre précédent");
    }

    if (
        recentTrackUris.has(getTrackKey(track)) &&
        position >= options.recentStartWindow &&
        reasons.length < 3
    ) {
        reasons.push("repousse un titre récemment lu après le début du mix");
    }

    if (tier.id !== "strict") {
        reasons.push(tier.label.toLowerCase());
    }

    return reasons.slice(0, 4);
}

function getShuffleQualityScore(stats, trackCount) {
    if (!stats || trackCount < 2) {
        return 100;
    }

    const transitions = Math.max(1, trackCount - 1);
    const firstTwenty = Math.max(1, Math.min(20, trackCount));
    const inverse = (value, total) =>
        Math.max(0, 100 - Math.round((Math.max(0, value) / total) * 100));

    return Math.round((
        inverse(stats.consecutiveArtistRepeats, transitions) * 1.3 +
        inverse(stats.consecutiveAlbumRepeats, transitions) * 0.9 +
        inverse(stats.abruptTransitions, transitions) * 1.1 +
        inverse(stats.recentTracksInFirstTwenty, firstTwenty) * 0.7 +
        Math.max(0, Math.min(100, stats.intensityCurveAdherence || 0)) * 1.2
    ) / 5.2);
}

function summarizeRelaxations(placements = []) {
    const grouped = new Map();

    for (const placement of placements) {
        if (placement.relaxation === "strict") {
            continue;
        }

        const existing = grouped.get(placement.relaxation) || {
            id: placement.relaxation,
            label: placement.relaxationLabel,
            count: 0,
            positions: []
        };
        existing.count += 1;
        if (existing.positions.length < 8) {
            existing.positions.push(placement.position);
        }
        grouped.set(placement.relaxation, existing);
    }

    return [...grouped.values()];
}

export function smartShuffleTracksDetailed(tracks, customOptions = {}) {
    const validTracks = tracks.filter((track) => track?.uri);
    const options = normalizeShuffleOptions(validTracks, customOptions);
    const seed = normalizeShuffleSeed(
        customOptions.seed || createShuffleSeed()
    );
    const random = createSeededRandom(seed);
    const remainingTracks = fisherYates(validTracks, random);
    const orderedTracks = [];
    const placements = [];
    const recentTrackUris = new Set(
        Array.isArray(customOptions.recentTrackUris)
            ? customOptions.recentTrackUris.filter(
                (uri) => typeof uri === "string"
            )
            : getRecentTrackUris()
    );
    const analysisOptions = {
        ...customOptions,
        recentTrackUris: [...recentTrackUris]
    };
    const before = analyzeShuffleOrder(validTracks, analysisOptions);

    while (remainingTracks.length) {
        const candidateCount = Math.min(
            remainingTracks.length,
            options.candidatePoolSize
        );
        const candidateEntries = [];

        for (let index = 0; index < candidateCount; index += 1) {
            const track = remainingTracks[index];
            candidateEntries.push({
                index,
                track,
                score: scoreCandidate(
                    track,
                    orderedTracks,
                    recentTrackUris,
                    options,
                    random
                ),
                violations: getConstraintViolations(
                    track,
                    orderedTracks,
                    options
                )
            });
        }

        const tier = chooseCandidateTier(candidateEntries);
        tier.eligible.sort((first, second) => first.score - second.score);
        const selected = tier.eligible[0];
        const [selectedTrack] = remainingTracks.splice(selected.index, 1);
        const reasons = getPlacementReasons({
            track: selectedTrack,
            orderedTracks,
            options,
            recentTrackUris,
            tier,
            violations: selected.violations
        });

        orderedTracks.push(selectedTrack);
        placements.push({
            position: orderedTracks.length,
            trackUri: getTrackKey(selectedTrack),
            trackName: selectedTrack?.name || "Morceau",
            artists: (selectedTrack?.artists || [])
                .map((artist) => artist?.name)
                .filter(Boolean)
                .join(", "),
            albumName: selectedTrack?.album?.name || "",
            reasons,
            relaxation: tier.id,
            relaxationLabel: tier.label,
            targetIntensity: Math.round(
                getTargetIntensity(
                    options.intensitySettings,
                    orderedTracks.length - 1,
                    options.totalTracks
                )
            ),
            actualIntensity: Math.round(
                getTrackIntensityScore(selectedTrack)
            )
        });
    }

    const after = analyzeShuffleOrder(orderedTracks, analysisOptions);
    const beforeScore = getShuffleQualityScore(before, validTracks.length);
    const afterScore = getShuffleQualityScore(after, orderedTracks.length);

    return {
        tracks: orderedTracks,
        seed,
        generatedAt: Date.now(),
        before,
        after,
        beforeScore,
        afterScore,
        improvement: afterScore - beforeScore,
        placements,
        relaxations: summarizeRelaxations(placements),
        recentTrackUris: [...recentTrackUris],
        settings: {
            artistGap: options.artistGap,
            albumGap: options.albumGap,
            trackGap: options.trackGap,
            recentStartWindow: options.recentStartWindow,
            intensityCurve: options.intensitySettings.curve,
            coherenceLevel: options.coherenceSettings.level
        }
    };
}

export function smartShuffleTracks(tracks, customOptions = {}) {
    return smartShuffleTracksDetailed(tracks, customOptions).tracks;
}

export function analyzeShuffleOrder(tracks, customOptions = {}) {
    let consecutiveArtistRepeats = 0;
    let consecutiveAlbumRepeats = 0;
    let consecutiveTrackRepeats = 0;
    let abruptTransitions = 0;
    let durationJumpTransitions = 0;
    let repeatedVersionTransitions = 0;
    let intensityJumpTransitions = 0;
    let totalIntensityDeviation = 0;

    const intensitySettings = {
        curve:
            [
                "rising",
                "falling",
                "stable",
                "waves",
                "central-peak"
            ].includes(
                customOptions.intensitySettings?.curve
            )
                ? customOptions.intensitySettings.curve
                : "stable",
        startIntensity:
            normalizeNumberOption(
                customOptions.intensitySettings
                    ?.startIntensity,
                0,
                100,
                45
            ),
        endIntensity:
            normalizeNumberOption(
                customOptions.intensitySettings
                    ?.endIntensity,
                0,
                100,
                65
            ),
        peakIntensity:
            normalizeNumberOption(
                customOptions.intensitySettings
                    ?.peakIntensity,
                0,
                100,
                85
            )
    };

    for (let index = 0; index < tracks.length; index += 1) {
        const currentTrack = tracks[index];
        const targetIntensity = getTargetIntensity(
            intensitySettings,
            index,
            tracks.length
        );
        const currentIntensity =
            getTrackIntensityScore(currentTrack);

        totalIntensityDeviation += Math.abs(
            currentIntensity - targetIntensity
        );

        if (index === 0) {
            continue;
        }
        const previousTrack = tracks[index - 1];

        if (
            Math.abs(
                getTrackIntensityScore(currentTrack) -
                getTrackIntensityScore(previousTrack)
            ) > 28
        ) {
            intensityJumpTransitions += 1;
        }

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

    const averageIntensityDeviation =
        tracks.length
            ? totalIntensityDeviation / tracks.length
            : 0;
    const intensityCurveAdherence = Math.max(
        0,
        Math.round(
            100 - averageIntensityDeviation
        )
    );

    const recentTrackUris = new Set(
        Array.isArray(customOptions.recentTrackUris)
            ? customOptions.recentTrackUris
            : getRecentTrackUris()
    );
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
        repeatedVersionTransitions,
        intensityJumpTransitions,
        intensityCurveAdherence,
        averageIntensityDeviation:
            Math.round(
                averageIntensityDeviation * 10
            ) / 10
    };
}
