export const HOME_LAYOUT_BLOCKS = Object.freeze([
    "quickAccess",
    "main",
    "queue",
    "shortcuts"
]);


export const HOME_LAYOUT_LABELS = Object.freeze({
    quickAccess: "Accès immédiat",
    main: "Profil principal",
    queue: "File d’attente",
    shortcuts: "Raccourcis du bas"
});

export const HOME_LAYOUT_PRESETS = Object.freeze({
    balanced: Object.freeze([
        "quickAccess",
        "main",
        "queue",
        "shortcuts"
    ]),
    launchFirst: Object.freeze([
        "main",
        "quickAccess",
        "queue",
        "shortcuts"
    ]),
    queueFirst: Object.freeze([
        "queue",
        "main",
        "quickAccess",
        "shortcuts"
    ])
});

export const DEFAULT_HOME_LAYOUT = Object.freeze({
    density: "comfortable",
    order: [...HOME_LAYOUT_PRESETS.balanced],
    showQuickAccess: true,
    showNowPlaying: true,
    showQueue: true,
    showShortcuts: true,
    queuePreviewCount: 3,
    updatedAt: 0
});

function normalizeOrder(order) {
    const safe = Array.isArray(order) ? order : [];
    const unique = safe.filter((block, index) => (
        HOME_LAYOUT_BLOCKS.includes(block) &&
        safe.indexOf(block) === index
    ));

    return [
        ...unique,
        ...HOME_LAYOUT_BLOCKS.filter((block) => !unique.includes(block))
    ];
}

export function normalizeHomeLayout(value = {}) {
    const queuePreviewCount = [2, 3, 5].includes(
        Number(value.queuePreviewCount)
    )
        ? Number(value.queuePreviewCount)
        : DEFAULT_HOME_LAYOUT.queuePreviewCount;

    return {
        density: value.density === "compact"
            ? "compact"
            : "comfortable",
        order: normalizeOrder(value.order),
        showQuickAccess: value.showQuickAccess !== false,
        showNowPlaying: value.showNowPlaying !== false,
        showQueue: value.showQueue !== false,
        showShortcuts: value.showShortcuts !== false,
        queuePreviewCount,
        updatedAt: Math.max(0, Number(value.updatedAt) || 0)
    };
}

export function applyHomeLayoutPreset(layout, presetId) {
    const preset = HOME_LAYOUT_PRESETS[presetId] || HOME_LAYOUT_PRESETS.balanced;
    return normalizeHomeLayout({
        ...layout,
        order: [...preset],
        updatedAt: Date.now()
    });
}

export function getHomeLayoutPresetId(layout) {
    const normalized = normalizeHomeLayout(layout);
    const serialized = normalized.order.join("|");
    return Object.entries(HOME_LAYOUT_PRESETS)
        .find(([, order]) => order.join("|") === serialized)?.[0]
        || "custom";
}

export function moveHomeLayoutBlock(layout, blockId, direction) {
    const normalized = normalizeHomeLayout(layout);
    const id = String(blockId || "");
    const step = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    const index = normalized.order.indexOf(id);

    if (!step || index < 0) {
        return normalized;
    }

    const nextIndex = index + step;
    if (nextIndex < 0 || nextIndex >= normalized.order.length) {
        return normalized;
    }

    const order = [...normalized.order];
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];

    return normalizeHomeLayout({
        ...normalized,
        order,
        updatedAt: Date.now()
    });
}
