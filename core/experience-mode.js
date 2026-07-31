export const EXPERIENCE_MODE_KEY =
    "shuffleplus_experience_mode_v1";

export const EXPERIENCE_MODES = Object.freeze({
    essential: Object.freeze({
        id: "essential",
        label: "Essentiel",
        icon: "✨",
        description:
            "Les fonctions utiles au quotidien restent visibles. Les outils avancés sont masqués pour alléger l’interface."
    }),
    expert: Object.freeze({
        id: "expert",
        label: "Expert",
        icon: "🧰",
        description:
            "Toutes les analyses, automatisations et options avancées de Shuffle+ sont accessibles."
    })
});

const EXISTING_USAGE_KEYS = Object.freeze([
    "shuffleplus_spotify_app_config_v1",
    "shuffleplus_access_token",
    "shuffleplus_refresh_token",
    "shuffleplus_saved_mixes_v1",
    "shuffleplus_ios_commands_v1",
    "shuffleplus_server_sync_v1",
    "shuffleplus_offline_library_v1"
]);

function safeGet(storage, key) {
    try {
        return storage?.getItem?.(key) ?? null;
    } catch {
        return null;
    }
}

function safeSet(storage, key, value) {
    try {
        storage?.setItem?.(key, value);
        return true;
    } catch {
        return false;
    }
}

export function normalizeExperienceMode(value = "") {
    return value === "expert"
        ? "expert"
        : "essential";
}

export function hasExistingShufflePlusUsage(
    storage = globalThis.localStorage
) {
    return EXISTING_USAGE_KEYS.some((key) => {
        const value = safeGet(storage, key);
        return typeof value === "string" && value.trim().length > 0;
    });
}

export function readExperienceMode(
    storage = globalThis.localStorage,
    fallback = "essential"
) {
    const raw = safeGet(storage, EXPERIENCE_MODE_KEY);
    if (raw === "essential" || raw === "expert") {
        return raw;
    }
    return normalizeExperienceMode(fallback);
}

export function saveExperienceMode(
    storage = globalThis.localStorage,
    mode = "essential"
) {
    const normalized = normalizeExperienceMode(mode);
    return {
        mode: normalized,
        saved: safeSet(storage, EXPERIENCE_MODE_KEY, normalized)
    };
}

export function ensureExperienceMode({
    storage = globalThis.localStorage,
    existingUsage = hasExistingShufflePlusUsage(storage)
} = {}) {
    const stored = safeGet(storage, EXPERIENCE_MODE_KEY);

    if (stored === "essential" || stored === "expert") {
        return {
            mode: stored,
            created: false,
            migratedExistingUser: false
        };
    }

    const mode = existingUsage ? "expert" : "essential";
    const result = saveExperienceMode(storage, mode);

    return {
        mode,
        created: result.saved,
        migratedExistingUser: existingUsage
    };
}

export function getExperienceModeDefinition(mode = "essential") {
    return EXPERIENCE_MODES[normalizeExperienceMode(mode)];
}

export function isExpertExperience(mode = "essential") {
    return normalizeExperienceMode(mode) === "expert";
}
