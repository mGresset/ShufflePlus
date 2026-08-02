export const FEATURE_STYLE_ASSETS = Object.freeze({
    home: "./styles/feature-home.css",
    settings: "./styles/feature-settings.css",
    driving: "./styles/feature-driving.css",
    search: "./styles/feature-search.css"
});

const MENU_STYLE_MAP = Object.freeze({
    dashboard: ["home"],
    settings: ["settings"],
    driving: ["driving"]
});

export function getFeatureStyleNamesForMenu(menuId = "") {
    return [...(MENU_STYLE_MAP[String(menuId || "").trim()] || [])];
}

export function getFeatureStyleEntries() {
    return Object.entries(FEATURE_STYLE_ASSETS).map(([name, href]) => ({
        name,
        href
    }));
}
