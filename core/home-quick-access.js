const MAX_PINNED_PROFILES = 4;
const MAX_RECENT_LAUNCHES = 3;
const MAX_FAVORITES = 4;

function safeArray(value) {
    return Array.isArray(value) ? value : [];
}

function uniqueStrings(values = [], limit = 20) {
    const result = [];
    const seen = new Set();

    for (const value of safeArray(values)) {
        const normalized = String(value || "").trim().slice(0, 160);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        result.push(normalized);
        if (result.length >= limit) break;
    }

    return result;
}

export function normalizePinnedProfileIds(
    values = [],
    availableIds = [],
    { fallbackId = "", limit = MAX_PINNED_PROFILES } = {}
) {
    const allowed = new Set(uniqueStrings(availableIds, 100));
    const normalized = uniqueStrings(values, Math.max(1, Number(limit) || MAX_PINNED_PROFILES))
        .filter((id) => !allowed.size || allowed.has(id));
    const safeFallback = String(fallbackId || "").trim();

    if (!normalized.length && safeFallback && (!allowed.size || allowed.has(safeFallback))) {
        return [safeFallback];
    }

    return normalized;
}

export function formatHomeQuickAccessAge(timestamp = 0, now = Date.now()) {
    const ageMs = Math.max(0, Number(now) - Number(timestamp || 0));
    const minutes = Math.floor(ageMs / 60000);

    if (minutes < 1) return "À l’instant";
    if (minutes < 60) return `Il y a ${minutes} min`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} h`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days} j`;

    return new Intl.DateTimeFormat("fr-FR", {
        day: "numeric",
        month: "short"
    }).format(new Date(Number(timestamp || now)));
}

function normalizeCommand(command = {}) {
    return {
        id: String(command.id || "").trim(),
        name: String(command.name || "Profil de lancement").trim(),
        icon: String(command.icon || "▶️").slice(0, 12),
        commandType: String(command.commandType || "fixed"),
        playlistName: String(command.playlistName || "").trim(),
        mixId: String(command.mixId || "").trim()
    };
}

function buildCommandLabel(command = {}, savedMixes = []) {
    if (command.commandType === "smartmix") {
        const mix = safeArray(savedMixes).find((item) => item?.id === command.mixId);
        return String(mix?.name || "Mix intelligent");
    }
    return command.playlistName || "Playlist Spotify";
}

export function buildHomeQuickAccess({
    commands = [],
    history = [],
    pinnedIds = [],
    favoriteSourceKeys = [],
    playlists = [],
    savedMixes = [],
    now = Date.now()
} = {}) {
    const normalizedCommands = safeArray(commands)
        .map(normalizeCommand)
        .filter((command) => command.id);
    const commandById = new Map(
        normalizedCommands.map((command) => [command.id, command])
    );
    const safePinnedIds = normalizePinnedProfileIds(
        pinnedIds,
        normalizedCommands.map((command) => command.id),
        { fallbackId: "" }
    );

    const latestRunByCommand = new Map();
    for (const item of safeArray(history)) {
        const commandId = String(item?.commandId || "").trim();
        if (!commandId || !commandById.has(commandId)) continue;
        if (!latestRunByCommand.has(commandId)) {
            latestRunByCommand.set(commandId, item);
        }
    }

    const pinnedProfiles = safePinnedIds
        .map((id) => commandById.get(id))
        .filter(Boolean)
        .map((command) => {
            const lastRun = latestRunByCommand.get(command.id) || null;
            return {
                ...command,
                subtitle: buildCommandLabel(command, savedMixes),
                lastStatus: lastRun?.status || "never",
                lastRunLabel: lastRun
                    ? formatHomeQuickAccessAge(lastRun.createdAt, now)
                    : "Jamais lancé"
            };
        });

    const recentLaunches = [];
    const recentSeen = new Set();
    for (const item of safeArray(history)) {
        const commandId = String(item?.commandId || "").trim();
        if (
            item?.status !== "success" ||
            !commandId ||
            recentSeen.has(commandId) ||
            !commandById.has(commandId)
        ) {
            continue;
        }

        recentSeen.add(commandId);
        const command = commandById.get(commandId);
        recentLaunches.push({
            ...command,
            subtitle: buildCommandLabel(command, savedMixes),
            deviceLabel: String(item.deviceName || "Appareil Spotify"),
            ageLabel: formatHomeQuickAccessAge(item.createdAt, now)
        });

        if (recentLaunches.length >= MAX_RECENT_LAUNCHES) break;
    }

    const playlistById = new Map(
        safeArray(playlists)
            .filter((playlist) => playlist?.id)
            .map((playlist) => [String(playlist.id), playlist])
    );
    const favorites = uniqueStrings(favoriteSourceKeys, 100)
        .map((sourceKey) => {
            if (sourceKey === "liked") {
                return {
                    key: "liked",
                    icon: "💚",
                    name: "Titres likés"
                };
            }

            const playlistId = sourceKey.replace(/^playlist:/, "");
            const playlist = playlistById.get(playlistId);
            if (!playlist) return null;

            return {
                key: sourceKey,
                icon: "★",
                name: String(playlist.name || "Playlist favorite")
            };
        })
        .filter(Boolean);

    return {
        pinnedProfiles,
        recentLaunches,
        favorites: favorites.slice(0, MAX_FAVORITES),
        favoriteCount: favorites.length,
        hasContent: Boolean(
            pinnedProfiles.length ||
            recentLaunches.length ||
            favorites.length
        )
    };
}

export const HOME_QUICK_ACCESS_LIMITS = Object.freeze({
    pinnedProfiles: MAX_PINNED_PROFILES,
    recentLaunches: MAX_RECENT_LAUNCHES,
    favorites: MAX_FAVORITES
});
