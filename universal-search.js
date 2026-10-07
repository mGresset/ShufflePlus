const DEFAULT_LIMIT = 14;

function clamp(value, minimum, maximum) {
    return Math.max(
        minimum,
        Math.min(
            maximum,
            Number(value) || 0
        )
    );
}

export function normalizeUniversalSearchText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizeItem(item = {}, index = 0) {
    const title = String(item.title || "").trim();
    const subtitle = String(item.subtitle || "").trim();
    const description = String(item.description || "").trim();
    const keywords = Array.isArray(item.keywords)
        ? item.keywords.map((value) => String(value || "").trim()).filter(Boolean)
        : [];
    const type = String(item.type || "section").trim();
    const targetId = String(item.targetId || "").trim();
    const key = String(
        item.key || `${type}:${targetId || title || index}`
    ).slice(0, 240);
    const searchableText = normalizeUniversalSearchText([
        title,
        subtitle,
        description,
        type,
        keywords.join(" ")
    ].join(" "));

    return {
        key,
        type,
        icon: String(item.icon || "🔎").slice(0, 12),
        title: title || "Résultat Shuffle+",
        subtitle,
        description,
        menu: String(item.menu || "dashboard").trim(),
        targetId,
        action: String(item.action || "navigate").trim(),
        priority: clamp(item.priority ?? 50, 0, 200),
        keywords,
        normalizedTitle: normalizeUniversalSearchText(title),
        normalizedSubtitle: normalizeUniversalSearchText(subtitle),
        searchableText
    };
}

export function buildUniversalSearchIndex({
    sections = [],
    playlists = [],
    savedMixes = [],
    scenes = [],
    profiles = [],
    schedules = [],
    quickContexts = []
} = {}) {
    const rawItems = [
        ...sections,
        ...playlists.map((playlist) => ({
            key: `playlist:${playlist.id || playlist.name}`,
            type: "playlist",
            icon: playlist.icon || "🎵",
            title: playlist.name || "Playlist sans nom",
            subtitle: playlist.owner || "Bibliothèque Spotify",
            description: playlist.description || "Ouvrir cette source dans Ma musique.",
            menu: "music",
            targetId: playlist.id || "",
            action: playlist.liked ? "liked" : "playlist",
            priority: playlist.favorite ? 86 : 62,
            keywords: ["playlist", "source", "spotify", playlist.owner || ""]
        })),
        ...savedMixes.map((mix) => ({
            key: `mix:${mix.id || mix.name}`,
            type: "mix",
            icon: mix.icon || "🔀",
            title: mix.name || "Mix enregistré",
            subtitle: `${Number(mix.sourceCount || 0)} source(s)`,
            description: mix.description || "Ouvrir ce mix dans Mix & iOS.",
            menu: "mixes",
            targetId: mix.id || "",
            action: "mix",
            priority: 78,
            keywords: ["mix", "mélange", "ios", mix.profileName || ""]
        })),
        ...scenes.map((scene) => ({
            key: `scene:${scene.id || scene.label}`,
            type: "scene",
            icon: scene.icon || "🤖",
            title: scene.label || "Scène Adaptive DJ",
            subtitle: scene.mixName || "Adaptive DJ",
            description: scene.description || "Ouvrir cette scène dans Adaptive DJ.",
            menu: "adaptive",
            targetId: scene.id || "",
            action: "scene",
            priority: scene.active ? 92 : 74,
            keywords: ["scène", "adaptive", "dj", scene.mixName || ""]
        })),
        ...profiles.map((profile) => ({
            key: `profile:${profile.id || profile.name}`,
            type: "profile",
            icon: profile.icon || "🎚️",
            title: profile.name || "Profil de mix",
            subtitle: profile.active ? "Profil actif" : "Profil de mélange",
            description: profile.description || "Ouvrir ce profil dans les Réglages.",
            menu: "settings",
            targetId: profile.id || "",
            action: "profile",
            priority: profile.active ? 82 : 58,
            keywords: ["profil", "règles", "mélange", "réglages"]
        })),
        ...schedules.map((schedule) => ({
            key: `schedule:${schedule.id || schedule.name}`,
            type: "schedule",
            icon: "⏰",
            title: schedule.name || "Routine musicale",
            subtitle: schedule.targetLabel || "Programmation",
            description: schedule.enabled
                ? "Routine active à retrouver dans Mix & iOS."
                : "Routine désactivée à retrouver dans Mix & iOS.",
            menu: "mixes",
            targetId: schedule.id || "",
            action: "schedule",
            priority: schedule.enabled ? 70 : 48,
            keywords: ["routine", "programme", "horaire", schedule.targetLabel || ""]
        })),
        ...quickContexts.map((context) => ({
            key: `quick-context:${context.id || context.name}`,
            type: "quick-context",
            icon: context.icon || "⚡",
            title: context.name || "Contexte rapide",
            subtitle: "Commande rapide",
            description: "Ouvrir ce contexte dans la rubrique Rapide.",
            menu: "quick",
            targetId: context.id || "",
            action: "quick-context",
            priority: 56,
            keywords: ["rapide", "raccourci", "contexte"]
        }))
    ];

    const unique = new Map();
    rawItems.forEach((item, index) => {
        const normalized = normalizeItem(item, index);
        if (!unique.has(normalized.key)) {
            unique.set(normalized.key, normalized);
        }
    });

    return [...unique.values()];
}

function scoreItem(item, normalizedQuery, tokens) {
    if (!normalizedQuery) {
        return item.priority;
    }

    let score = item.priority * 0.12;
    const title = item.normalizedTitle;
    const subtitle = item.normalizedSubtitle;
    const text = item.searchableText;

    if (title === normalizedQuery) score += 150;
    else if (title.startsWith(normalizedQuery)) score += 112;
    else if (title.includes(normalizedQuery)) score += 86;

    if (subtitle.startsWith(normalizedQuery)) score += 58;
    else if (subtitle.includes(normalizedQuery)) score += 34;

    if (text.includes(normalizedQuery)) score += 38;

    let matchedTokens = 0;
    for (const token of tokens) {
        if (!token) continue;
        if (title.includes(token)) {
            score += 28;
            matchedTokens += 1;
        } else if (subtitle.includes(token)) {
            score += 17;
            matchedTokens += 1;
        } else if (text.includes(token)) {
            score += 10;
            matchedTokens += 1;
        }
    }

    if (tokens.length && matchedTokens === tokens.length) {
        score += 42;
    }

    return matchedTokens || text.includes(normalizedQuery)
        ? score
        : 0;
}

export function searchUniversalIndex(
    index = [],
    query = "",
    limit = DEFAULT_LIMIT
) {
    const normalizedQuery = normalizeUniversalSearchText(query);
    const tokens = normalizedQuery.split(" ").filter(Boolean);
    const normalizedLimit = clamp(limit, 1, 30);

    return (Array.isArray(index) ? index : [])
        .map((item) => ({
            ...item,
            score: scoreItem(item, normalizedQuery, tokens)
        }))
        .filter((item) => item.score > 0)
        .sort((left, right) =>
            right.score - left.score ||
            left.title.localeCompare(right.title, "fr")
        )
        .slice(0, normalizedLimit);
}

export function groupUniversalSearchResults(results = []) {
    const groups = new Map();

    (Array.isArray(results) ? results : []).forEach((item, index) => {
        const type = String(item?.type || "section").trim() || "section";
        if (!groups.has(type)) {
            groups.set(type, {
                type,
                label: getUniversalSearchTypeLabel(type),
                items: []
            });
        }

        groups.get(type).items.push({
            ...item,
            resultIndex: index
        });
    });

    return [...groups.values()];
}

export function getUniversalSearchTypeLabel(type = "") {
    const labels = {
        section: "Rubrique",
        setting: "Réglage",
        help: "Aide",
        playlist: "Playlist",
        mix: "Mix",
        scene: "Scène",
        profile: "Profil",
        schedule: "Routine",
        "quick-context": "Raccourci"
    };

    return labels[type] || "Résultat";
}

function cleanSpotifyCatalogText(value = "", maxLength = 180) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

function getSpotifyCatalogImage(item = {}) {
    const images = Array.isArray(item?.images)
        ? item.images
        : Array.isArray(item?.album?.images)
            ? item.album.images
            : [];

    return cleanSpotifyCatalogText(
        images.find((image) => image?.url)?.url || "",
        600
    );
}

function getSpotifyArtistNames(item = {}) {
    return (Array.isArray(item?.artists) ? item.artists : [])
        .map((artist) => cleanSpotifyCatalogText(artist?.name, 120))
        .filter(Boolean);
}

function normalizeSpotifyTrack(item = {}) {
    const id = cleanSpotifyCatalogText(item?.id, 120);
    const uri = cleanSpotifyCatalogText(item?.uri, 180);
    if (!id || !uri.startsWith("spotify:track:")) return null;

    const artists = getSpotifyArtistNames(item);
    const album = cleanSpotifyCatalogText(item?.album?.name, 160);

    return {
        key: `track:${id}`,
        id,
        type: "track",
        uri,
        title: cleanSpotifyCatalogText(item?.name, 180) || "Titre Spotify",
        subtitle: artists.join(", ") || "Artiste inconnu",
        description: album || "Titre Spotify",
        imageUrl: getSpotifyCatalogImage(item),
        externalUrl: cleanSpotifyCatalogText(item?.external_urls?.spotify, 600),
        artists,
        album,
        durationMs: Math.max(0, Number(item?.duration_ms) || 0),
        playable: item?.is_playable !== false,
        explicit: Boolean(item?.explicit)
    };
}

function normalizeSpotifyAlbum(item = {}) {
    const id = cleanSpotifyCatalogText(item?.id, 120);
    const uri = cleanSpotifyCatalogText(item?.uri, 180);
    if (!id || !uri.startsWith("spotify:album:")) return null;

    const artists = getSpotifyArtistNames(item);
    const releaseYear = cleanSpotifyCatalogText(item?.release_date, 20).slice(0, 4);
    const totalTracks = Math.max(0, Number(item?.total_tracks) || 0);

    return {
        key: `album:${id}`,
        id,
        type: "album",
        uri,
        title: cleanSpotifyCatalogText(item?.name, 180) || "Album Spotify",
        subtitle: artists.join(", ") || "Artiste inconnu",
        description: [
            releaseYear,
            totalTracks ? `${totalTracks} titre${totalTracks > 1 ? "s" : ""}` : ""
        ].filter(Boolean).join(" · ") || "Album Spotify",
        imageUrl: getSpotifyCatalogImage(item),
        externalUrl: cleanSpotifyCatalogText(item?.external_urls?.spotify, 600),
        artists,
        album: cleanSpotifyCatalogText(item?.name, 180),
        playable: true,
        explicit: false
    };
}

function normalizeSpotifyArtist(item = {}) {
    const id = cleanSpotifyCatalogText(item?.id, 120);
    const uri = cleanSpotifyCatalogText(item?.uri, 180);
    if (!id || !uri.startsWith("spotify:artist:")) return null;

    const genres = (Array.isArray(item?.genres) ? item.genres : [])
        .map((genre) => cleanSpotifyCatalogText(genre, 80))
        .filter(Boolean)
        .slice(0, 2);

    return {
        key: `artist:${id}`,
        id,
        type: "artist",
        uri,
        title: cleanSpotifyCatalogText(item?.name, 180) || "Artiste Spotify",
        subtitle: "Artiste",
        description: genres.join(" · ") || "Catalogue Spotify",
        imageUrl: getSpotifyCatalogImage(item),
        externalUrl: cleanSpotifyCatalogText(item?.external_urls?.spotify, 600),
        artists: [cleanSpotifyCatalogText(item?.name, 180)].filter(Boolean),
        album: "",
        playable: true,
        explicit: false
    };
}

export function normalizeSpotifyCatalogResults(
    payload = {},
    {
        trackLimit = 6,
        albumLimit = 3,
        artistLimit = 3
    } = {}
) {
    const take = (items, limit, normalizer) =>
        (Array.isArray(items) ? items : [])
            .map(normalizer)
            .filter(Boolean)
            .slice(0, Math.max(0, Number(limit) || 0));

    return [
        ...take(payload?.tracks?.items, trackLimit, normalizeSpotifyTrack),
        ...take(payload?.albums?.items, albumLimit, normalizeSpotifyAlbum),
        ...take(payload?.artists?.items, artistLimit, normalizeSpotifyArtist)
    ];
}

export function getSpotifyCatalogTypeLabel(type = "") {
    if (type === "track") return "Titre";
    if (type === "album") return "Album";
    if (type === "artist") return "Artiste";
    return "Spotify";
}
