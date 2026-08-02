export const HOME_LAYOUT_BLOCKS = Object.freeze([
    "quickAccess",
    "main",
    "queue",
    "shortcuts"
]);

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
