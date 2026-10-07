export const MIX_PROFILE_SHARE_SCHEMA = "shuffleplus.mix-profile";
export const MIX_PROFILE_SHARE_VERSION = 1;
export const MAX_SHARED_PROFILE_BYTES = 128 * 1024;

const PROFILE_FIELDS = Object.freeze([
    "name",
    "icon",
    "description",
    "shuffleSettings",
    "exclusionRules",
    "priorityRules",
    "coherenceSettings",
    "intensitySettings",
    "cleanupSettings"
]);

function cloneJsonValue(value) {
    if (value === undefined) {
        return undefined;
    }

    return JSON.parse(JSON.stringify(value));
}

function pickProfileFields(profile = {}) {
    const output = {};

    for (const field of PROFILE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(profile, field)) {
            output[field] = cloneJsonValue(profile[field]);
        }
    }

    return output;
}

export function buildMixProfileShareDocument(profile = {}, {
    appVersion = "",
    exportedAt = new Date().toISOString()
} = {}) {
    return {
        schema: MIX_PROFILE_SHARE_SCHEMA,
        version: MIX_PROFILE_SHARE_VERSION,
        appVersion: String(appVersion || "").slice(0, 32),
        exportedAt: String(exportedAt || "").slice(0, 64),
        profile: pickProfileFields(profile)
    };
}

export function parseMixProfileShareDocument(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Format de profil invalide.");
    }

    if (value.schema !== MIX_PROFILE_SHARE_SCHEMA) {
        throw new Error("Ce fichier n’est pas un profil Shuffle+ partageable.");
    }

    if (Number(value.version) !== MIX_PROFILE_SHARE_VERSION) {
        throw new Error("Version de profil partageable non prise en charge.");
    }

    if (!value.profile || typeof value.profile !== "object" || Array.isArray(value.profile)) {
        throw new Error("Le profil partagé est manquant ou invalide.");
    }

    const profile = pickProfileFields(value.profile);

    if (typeof profile.name !== "string" || !profile.name.trim()) {
        throw new Error("Le profil partagé n’a pas de nom valide.");
    }

    return {
        schema: MIX_PROFILE_SHARE_SCHEMA,
        version: MIX_PROFILE_SHARE_VERSION,
        appVersion: typeof value.appVersion === "string" ? value.appVersion.slice(0, 32) : "",
        exportedAt: typeof value.exportedAt === "string" ? value.exportedAt.slice(0, 64) : "",
        profile
    };
}

export function getMixProfileShareFilename(name = "profil") {
    const safeName = String(name || "profil")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)
        .toLowerCase() || "profil";

    return `shuffleplus-${safeName}.profile.json`;
}
