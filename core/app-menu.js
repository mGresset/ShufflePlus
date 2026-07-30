export const APP_MENU_IDS = Object.freeze([
    "dashboard",
    "music",
    "mixes",
    "quick",
    "driving",
    "adaptive",
    "assistant",
    "recommendations",
    "statistics",
    "goals",
    "intelligence",
    "modes",
    "guide",
    "settings"
]);

export const APP_MENU_GROUPS = Object.freeze([
    Object.freeze({
        id: "essential",
        label: "Essentiel",
        items: Object.freeze([
            Object.freeze(["dashboard", "🏠", "Accueil"]),
            Object.freeze(["music", "🎵", "Ma musique"]),
            Object.freeze(["mixes", "🔀", "Mix & iOS"]),
            Object.freeze(["quick", "📱", "Mes raccourcis"]),
            Object.freeze(["driving", "🚗", "Conduite"])
        ])
    }),
    Object.freeze({
        id: "smart",
        label: "Intelligence",
        items: Object.freeze([
            Object.freeze(["adaptive", "🤖", "Adaptive DJ"]),
            Object.freeze(["assistant", "✨", "Assistant"]),
            Object.freeze(["recommendations", "💜", "Pour toi"]),
            Object.freeze(["statistics", "📊", "Statistiques"]),
            Object.freeze(["goals", "🏆", "Objectifs"]),
            Object.freeze(["intelligence", "🧠", "Analyses"])
        ])
    }),
    Object.freeze({
        id: "tools",
        label: "Outils",
        items: Object.freeze([
            Object.freeze(["modes", "🎛️", "Modes"]),
            Object.freeze(["guide", "📖", "Guide"]),
            Object.freeze(["settings", "⚙️", "Réglages"])
        ])
    })
]);

export function normalizeAppMenu(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return APP_MENU_IDS.includes(normalized)
        ? normalized
        : "dashboard";
}

export function resolveAppMenuView(urlLike) {
    try {
        const url = new URL(
            String(urlLike || ""),
            "https://shuffleplus.local/"
        );
        const requested = String(
            url.searchParams.get("view") || ""
        ).trim().toLowerCase();

        if (!APP_MENU_IDS.includes(requested)) {
            return {
                consumed: false,
                menuId: null,
                cleanPath: `${url.pathname}${url.search}${url.hash}`
            };
        }

        url.searchParams.delete("view");
        return {
            consumed: true,
            menuId: requested,
            cleanPath: `${url.pathname}${url.search}${url.hash}`
        };
    } catch {
        return {
            consumed: false,
            menuId: null,
            cleanPath: ""
        };
    }
}

export function readStoredAppMenu(
    storage,
    key,
    fallback = "dashboard"
) {
    try {
        return normalizeAppMenu(
            storage?.getItem?.(key) || fallback
        );
    } catch {
        return normalizeAppMenu(fallback);
    }
}

export function writeStoredAppMenu(
    storage,
    key,
    menuId
) {
    const normalized = normalizeAppMenu(menuId);
    try {
        storage?.setItem?.(key, normalized);
        return true;
    } catch {
        return false;
    }
}

export function normalizeAppMenuScrollPositions(value) {
    if (
        !value ||
        typeof value !== "object" ||
        Array.isArray(value)
    ) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(value)
            .filter(([key, position]) =>
                APP_MENU_IDS.includes(String(key)) &&
                Number.isFinite(Number(position))
            )
            .map(([key, position]) => [
                key,
                Math.max(0, Math.round(Number(position)))
            ])
    );
}
