export const PLAYER_REPEAT_STATES = ["off", "context", "track"];

export function normalizePlayerRepeatState(value = "off") {
    return PLAYER_REPEAT_STATES.includes(value) ? value : "off";
}

export function getNextPlayerRepeatState(value = "off") {
    const current = normalizePlayerRepeatState(value);
    const index = PLAYER_REPEAT_STATES.indexOf(current);
    return PLAYER_REPEAT_STATES[(index + 1) % PLAYER_REPEAT_STATES.length];
}

export function getPlayerRepeatLabel(value = "off") {
    const state = normalizePlayerRepeatState(value);
    if (state === "track") return "Titre";
    if (state === "context") return "Contexte";
    return "OFF";
}

export function normalizePlayerVolume(value, fallback = 50) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return Math.min(100, Math.max(0, Math.round(Number(fallback) || 0)));
    }
    return Math.min(100, Math.max(0, Math.round(numeric)));
}

export function normalizePlayerSeekPosition(value, durationMs = 0) {
    const numeric = Math.max(0, Math.round(Number(value) || 0));
    const duration = Math.max(0, Math.round(Number(durationMs) || 0));
    return duration > 0 ? Math.min(numeric, duration) : numeric;
}
