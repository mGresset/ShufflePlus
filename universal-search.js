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


export function getUniversalSearchSections() {
    return [
        {
            key: "section:dashboard",
            type: "section",
            icon: "🏠",
            title: "Accueil",
            subtitle: "Vue d’ensemble",
            description: "Lecture, recommandation, scène, routine et résumé musical.",
            menu: "dashboard",
            priority: 100,
            keywords: ["accueil", "dashboard", "résumé", "vue ensemble"]
        },
        {
            key: "section:music",
            type: "section",
            icon: "🎵",
            title: "Ma musique",
            subtitle: "Playlists et morceaux aimés",
            description: "Retrouver les sources Spotify et sélectionner les playlists d’un mix.",
            menu: "music",
            priority: 98,
            keywords: ["bibliothèque", "source", "playlist", "aimés"]
        },
        {
            key: "section:mixes",
            type: "section",
            icon: "🔀",
            title: "Profils & mix",
            subtitle: "Mix, raccourcis et routines",
            description: "Créer un mix, le sauvegarder et préparer une automatisation iPhone.",
            menu: "mixes",
            priority: 96,
            keywords: ["mix", "raccourci", "ios", "routine", "programme"]
        },
        {
            key: "section:adaptive",
            type: "section",
            icon: "🤖",
            title: "Adaptive DJ",
            subtitle: "Scènes et transitions",
            description: "Gérer Conduite, Chill, Focus, Sport, Party et les transitions.",
            menu: "adaptive",
            priority: 94,
            keywords: ["scène", "conduite", "chill", "focus", "sport", "party"]
        },
        {
            key: "section:assistant",
            type: "section",
            icon: "✨",
            title: "Assistant",
            subtitle: "Commandes texte et vocales",
            description: "Demander une action à Shuffle+ avec une phrase simple.",
            menu: "assistant",
            priority: 88,
            keywords: ["voix", "vocal", "commande", "parler"]
        },
        {
            key: "section:recommendations",
            type: "section",
            icon: "💜",
            title: "Pour toi",
            subtitle: "Recommandations personnalisées",
            description: "Voir les mix et scènes conseillés pour le moment.",
            menu: "recommendations",
            priority: 90,
            keywords: ["recommandation", "suggestion", "personnalisé"]
        },
        {
            key: "section:statistics",
            type: "section",
            icon: "📊",
            title: "Statistiques",
            subtitle: "Habitudes d’écoute",
            description: "Consulter les sessions, titres, durées et périodes d’activité.",
            menu: "statistics",
            priority: 84,
            keywords: ["bilan", "écoute", "durée", "session"]
        },
        {
            key: "section:goals",
            type: "section",
            icon: "🏆",
            title: "Objectifs",
            subtitle: "Progression hebdomadaire",
            description: "Suivre les objectifs et badges de la semaine.",
            menu: "goals",
            priority: 80,
            keywords: ["progression", "semaine", "badge", "objectif"]
        },
        {
            key: "section:intelligence",
            type: "section",
            icon: "🧠",
            title: "Intelligence",
            subtitle: "Apprentissage local",
            description: "Comprendre les observations et suggestions automatiques.",
            menu: "intelligence",
            priority: 74,
            keywords: ["apprentissage", "adaptation", "suggestion"]
        },
        {
            key: "section:quick",
            type: "section",
            icon: "⚡",
            title: "Rapide",
            subtitle: "Commandes essentielles",
            description: "Pause, reprise, suivant et contextes rapides.",
            menu: "quick",
            priority: 86,
            keywords: ["pause", "suivant", "commande", "raccourci"]
        },
        {
            key: "section:driving",
            type: "section",
            icon: "🚗",
            title: "Conduite",
            subtitle: "Interface voiture",
            description: "Ouvrir le mode mobile à gros boutons pour la voiture.",
            menu: "driving",
            priority: 92,
            keywords: ["voiture", "route", "trajet", "écran actif"]
        },
        {
            key: "section:modes",
            type: "section",
            icon: "🎛️",
            title: "Modes d’utilisation",
            subtitle: "Quotidien, Conduite, Sport, Soirée et Découverte",
            description: "Adapter rapidement Shuffle+ à la situation du moment.",
            menu: "modes",
            priority: 89,
            keywords: ["mode", "profil utilisation", "sport", "soirée", "découverte"]
        },
        {
            key: "section:guide",
            type: "help",
            icon: "📖",
            title: "Guide simplifié",
            subtitle: "Comprendre les rubriques",
            description: "Lire une explication courte de chaque catégorie.",
            menu: "guide",
            priority: 78,
            keywords: ["manuel", "aide", "explication", "readme"]
        },
        {
            key: "section:settings",
            type: "section",
            icon: "⚙️",
            title: "Réglages",
            subtitle: "Personnalisation et sauvegarde",
            description: "Thème, profils, sauvegarde, synchronisation et mise à jour.",
            menu: "settings",
            priority: 82,
            keywords: ["thème", "sauvegarde", "synchronisation", "mise à jour"]
        },
        {
            key: "setting:theme",
            type: "setting",
            icon: "🎨",
            title: "Thème et couleurs",
            subtitle: "Réglages",
            description: "Changer l’accent violet, bleu, rose, émeraude ou orange.",
            menu: "settings",
            priority: 65,
            keywords: ["apparence", "couleur", "contraste", "animation"]
        },
        {
            key: "setting:backup",
            type: "setting",
            icon: "💾",
            title: "Sauvegarde et restauration",
            subtitle: "Réglages",
            description: "Exporter ou restaurer les données locales de Shuffle+.",
            menu: "settings",
            priority: 68,
            keywords: ["export", "import", "backup", "restaurer"]
        },
        {
            key: "setting:sync",
            type: "setting",
            icon: "🔄",
            title: "Synchronisation",
            subtitle: "Réglages",
            description: "Retrouver les outils de synchronisation entre appareils.",
            menu: "settings",
            priority: 66,
            keywords: ["serveur", "appareil", "fusion", "sync"]
        },
        {
            key: "setting:update",
            type: "setting",
            icon: "⬆️",
            title: "Rechercher une mise à jour",
            subtitle: "Réglages",
            description: "Actualiser la PWA après un nouveau déploiement.",
            menu: "settings",
            priority: 70,
            keywords: ["version", "pwa", "cache", "actualiser"]
        }
    ];
}


export function getSpotifyCatalogSearchErrorMessage(error) {
    if (error?.status === 429) {
        return error?.reason === "QUOTA_EXCEEDED"
            ? "Quota Spotify temporairement atteint. Réessaie un peu plus tard."
            : "Spotify limite momentanément les recherches. Réessaie dans quelques secondes.";
    }

    if (error?.status === 401) {
        return "La session Spotify doit être renouvelée avant de rechercher dans le catalogue.";
    }

    if (error?.status === 403) {
        return "Spotify refuse momentanément cette recherche avec ce compte.";
    }

    return String(
        error?.spotifyMessage ||
        error?.message ||
        "Recherche Spotify indisponible."
    ).slice(0, 220);
}



export function renderSpotifyCatalogProfileChooser(item, {
    profileTargetKey = "",
    profiles = [],
    activeProfileId = "",
    escapeHtml = (value) => String(value ?? "")
} = {}) {
    if (!item || profileTargetKey !== item.key) {
        return "";
    }

    const editableProfiles = (Array.isArray(profiles) ? profiles : [])
        .filter((profile) => profile && !profile.isDefault);
    if (!editableProfiles.length) {
        return `
            <div class="spotify-catalog-profile-chooser is-empty">
                <span>
                    Crée d’abord un profil personnalisé pour y enregistrer cette priorité.
                </span>
                <button
                    type="button"
                    data-spotify-catalog-open-profiles
                >
                    Ouvrir les profils
                </button>
            </div>
        `;
    }

    const preferredProfileId = editableProfiles.some(
        (profile) => profile.id === activeProfileId
    )
        ? activeProfileId
        : editableProfiles[0].id;

    return `
        <div class="spotify-catalog-profile-chooser">
            <label>
                <span>Ajouter comme priorité à</span>
                <select data-spotify-catalog-profile-select>
                    ${editableProfiles.map((profile) => `
                        <option
                            value="${escapeHtml(profile.id)}"
                            ${profile.id === preferredProfileId ? "selected" : ""}
                        >
                            ${escapeHtml(profile.icon || "🎛️")} ${escapeHtml(profile.name)}
                        </option>
                    `).join("")}
                </select>
            </label>
            <button
                type="button"
                data-spotify-catalog-add-profile="${escapeHtml(item.key)}"
            >
                ⭐ Ajouter
            </button>
        </div>
    `;
}

export function renderSpotifyCatalogSearchResults({
    query = "",
    minimumQueryLength = 2,
    state = {},
    profileTargetKey = "",
    profiles = [],
    activeProfileId = "",
    escapeHtml = (value) => String(value ?? "")
} = {}) {
    const normalizedQuery = String(query || "").trim().slice(0, 100);
    if (normalizedQuery.length < minimumQueryLength) {
        return "";
    }

    const matchingQuery = state?.query === normalizedQuery;
    const status = matchingQuery ? state?.status : "loading";
    const items = matchingQuery && Array.isArray(state?.items) ? state.items : [];
    const error = matchingQuery ? String(state?.error || "") : "";

    if (status === "loading") {
        return `
            <section class="spotify-catalog-search is-loading" aria-busy="true">
                <header>
                    <div>
                        <span>Spotify</span>
                        <strong>Recherche dans le catalogue…</strong>
                    </div>
                    <span class="spotify-catalog-search__spinner" aria-hidden="true"></span>
                </header>
            </section>
        `;
    }

    if (status === "error" || status === "offline") {
        return `
            <section class="spotify-catalog-search is-error">
                <header>
                    <div>
                        <span>Spotify</span>
                        <strong>Catalogue indisponible</strong>
                    </div>
                    <button
                        type="button"
                        data-retry-spotify-catalog-search
                        ${status === "offline" ? "disabled" : ""}
                    >
                        Réessayer
                    </button>
                </header>
                <p>${escapeHtml(error)}</p>
            </section>
        `;
    }

    if (status !== "ready") {
        return "";
    }

    if (!items.length) {
        return `
            <section class="spotify-catalog-search is-empty">
                <header>
                    <div>
                        <span>Spotify</span>
                        <strong>Aucun titre, album ou artiste trouvé</strong>
                    </div>
                </header>
            </section>
        `;
    }

    return `
        <section class="spotify-catalog-search" aria-label="Résultats du catalogue Spotify">
            <header>
                <div>
                    <span>Spotify</span>
                    <strong>Catalogue</strong>
                </div>
                <small>${items.length} résultat${items.length > 1 ? "s" : ""}</small>
            </header>
            <div class="spotify-catalog-search__list">
                ${items.map((item) => {
                    const busy = state?.busyKey === item.key;
                    const typeLabel = getSpotifyCatalogTypeLabel(item.type);
                    const profileOpen = profileTargetKey === item.key;

                    return `
                        <article
                            class="spotify-catalog-result ${profileOpen ? "is-profile-open" : ""}"
                            data-spotify-catalog-result="${escapeHtml(item.key)}"
                        >
                            <div class="spotify-catalog-result__main">
                                <span class="spotify-catalog-result__cover" aria-hidden="true">
                                    ${item.imageUrl
                                        ? `<img src="${escapeHtml(item.imageUrl)}" alt="" loading="lazy">`
                                        : item.type === "artist"
                                            ? "🎤"
                                            : item.type === "album"
                                                ? "💿"
                                                : "🎵"}
                                </span>
                                <div class="spotify-catalog-result__copy">
                                    <span>
                                        <strong>${escapeHtml(item.title)}</strong>
                                        <small>${escapeHtml(typeLabel)}</small>
                                    </span>
                                    <em>${escapeHtml(item.subtitle)}</em>
                                    <span>${escapeHtml(item.description)}</span>
                                </div>
                            </div>
                            <div class="spotify-catalog-result__actions">
                                <button
                                    type="button"
                                    data-spotify-catalog-action="play"
                                    data-spotify-catalog-key="${escapeHtml(item.key)}"
                                    ${busy || item.playable === false ? "disabled" : ""}
                                >
                                    ${busy ? "…" : "▶"} Lire
                                </button>
                                ${item.type === "track" ? `
                                    <button
                                        type="button"
                                        data-spotify-catalog-action="queue"
                                        data-spotify-catalog-key="${escapeHtml(item.key)}"
                                        ${busy || item.playable === false ? "disabled" : ""}
                                    >
                                        ➕ Ensuite
                                    </button>
                                ` : ""}
                                <button
                                    type="button"
                                    data-spotify-catalog-action="profile"
                                    data-spotify-catalog-key="${escapeHtml(item.key)}"
                                    ${busy ? "disabled" : ""}
                                >
                                    ⭐ Profil
                                </button>
                                ${item.externalUrl ? `
                                    <a
                                        href="${escapeHtml(item.externalUrl)}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Spotify ↗
                                    </a>
                                ` : ""}
                            </div>
                            ${renderSpotifyCatalogProfileChooser(item, {
                                profileTargetKey,
                                profiles,
                                activeProfileId,
                                escapeHtml
                            })}
                        </article>
                    `;
                }).join("")}
            </div>
        </section>
    `;
}
