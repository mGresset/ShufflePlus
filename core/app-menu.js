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

export const APP_PRIMARY_MENU_IDS = Object.freeze([
    "dashboard",
    "music",
    "mixes",
    "quick",
    "settings"
]);

export const APP_MENU_GROUPS = Object.freeze([
    Object.freeze({
        id: "primary",
        label: "Navigation",
        items: Object.freeze([
            Object.freeze(["dashboard", "🏠", "Accueil"]),
            Object.freeze(["music", "🎵", "Musique"]),
            Object.freeze(["mixes", "✨", "Créer"]),
            Object.freeze(["quick", "📱", "Raccourcis"]),
            Object.freeze(["settings", "⚙️", "Réglages"])
        ])
    })
]);

export const APP_MENU_PARENT = Object.freeze({
    dashboard: "dashboard",
    music: "music",
    recommendations: "music",
    statistics: "music",
    goals: "music",
    intelligence: "music",
    mixes: "mixes",
    adaptive: "mixes",
    assistant: "mixes",
    modes: "mixes",
    quick: "quick",
    driving: "quick",
    settings: "settings",
    guide: "settings"
});

export const APP_SECTION_GROUPS = Object.freeze({
    music: Object.freeze({
        id: "music",
        label: "Musique",
        featured: Object.freeze([
            Object.freeze(["music", "🎵", "Ma musique"]),
            Object.freeze(["recommendations", "💜", "Pour toi"])
        ]),
        more: Object.freeze([
            Object.freeze(["statistics", "📊", "Statistiques"]),
            Object.freeze(["goals", "🏆", "Objectifs"]),
            Object.freeze(["intelligence", "🧠", "Analyses"])
        ])
    }),
    mixes: Object.freeze({
        id: "mixes",
        label: "Créer",
        featured: Object.freeze([
            Object.freeze(["mixes", "🔀", "Mix & iOS"]),
            Object.freeze(["assistant", "✨", "Assistant"])
        ]),
        more: Object.freeze([
            Object.freeze(["adaptive", "🤖", "Adaptive DJ"]),
            Object.freeze(["modes", "🎛️", "Modes"])
        ])
    }),
    quick: Object.freeze({
        id: "quick",
        label: "Raccourcis",
        featured: Object.freeze([
            Object.freeze(["quick", "📱", "Mes raccourcis"])
        ]),
        more: Object.freeze([
            Object.freeze(["driving", "🚗", "Conduite"])
        ])
    }),
    settings: Object.freeze({
        id: "settings",
        label: "Réglages",
        featured: Object.freeze([
            Object.freeze(["settings", "⚙️", "Réglages"])
        ]),
        more: Object.freeze([
            Object.freeze(["guide", "📖", "Guide et aide"])
        ])
    })
});

export function normalizeAppMenu(value = "") {
    const normalized = String(value || "").trim().toLowerCase();
    return APP_MENU_IDS.includes(normalized)
        ? normalized
        : "dashboard";
}

export function getPrimaryAppMenu(value = "") {
    const normalized = normalizeAppMenu(value);
    return APP_MENU_PARENT[normalized] || "dashboard";
}

export function getAppSectionGroup(
    value = "",
    { drivingAvailable = true } = {}
) {
    const primaryId = getPrimaryAppMenu(value);
    const section = APP_SECTION_GROUPS[primaryId];

    if (!section) {
        return null;
    }

    const filterItems = (items) => items.filter(
        ([id]) => drivingAvailable || id !== "driving"
    );

    return {
        ...section,
        featured: filterItems(section.featured),
        more: filterItems(section.more)
    };
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

export function getVisibleAppMenuGroups() {
    return APP_MENU_GROUPS.map((group) => ({
        ...group,
        items: [...group.items]
    }));
}
