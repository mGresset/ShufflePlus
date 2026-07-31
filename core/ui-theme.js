const HEX_COLOR_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const UI_ACCENT_PRESETS = Object.freeze({
    violet: Object.freeze({
        id: "violet",
        label: "Violet",
        primary: "#8b5cf6",
        secondary: "#2563eb"
    }),
    indigo: Object.freeze({
        id: "indigo",
        label: "Indigo",
        primary: "#6366f1",
        secondary: "#8b5cf6"
    }),
    blue: Object.freeze({
        id: "blue",
        label: "Bleu",
        primary: "#3b82f6",
        secondary: "#06b6d4"
    }),
    sky: Object.freeze({
        id: "sky",
        label: "Bleu clair",
        primary: "#0ea5e9",
        secondary: "#38bdf8"
    }),
    turquoise: Object.freeze({
        id: "turquoise",
        label: "Turquoise",
        primary: "#14b8a6",
        secondary: "#06b6d4"
    }),
    emerald: Object.freeze({
        id: "emerald",
        label: "Vert",
        primary: "#10b981",
        secondary: "#22c55e"
    }),
    lime: Object.freeze({
        id: "lime",
        label: "Citron",
        primary: "#84cc16",
        secondary: "#22c55e"
    }),
    orange: Object.freeze({
        id: "orange",
        label: "Orange",
        primary: "#f59e0b",
        secondary: "#f97316"
    }),
    red: Object.freeze({
        id: "red",
        label: "Rouge",
        primary: "#ef4444",
        secondary: "#f97316"
    }),
    pink: Object.freeze({
        id: "pink",
        label: "Rose",
        primary: "#ec4899",
        secondary: "#f43f5e"
    }),
    fuchsia: Object.freeze({
        id: "fuchsia",
        label: "Fuchsia",
        primary: "#d946ef",
        secondary: "#8b5cf6"
    }),
    gold: Object.freeze({
        id: "gold",
        label: "Or",
        primary: "#eab308",
        secondary: "#f59e0b"
    }),
    graphite: Object.freeze({
        id: "graphite",
        label: "Graphite",
        primary: "#64748b",
        secondary: "#475569"
    })
});

export const DEFAULT_UI_THEME_SETTINGS = Object.freeze({
    accent: "violet",
    customColor: "#8b5cf6",
    motionEnabled: true,
    highContrast: false,
    updatedAt: 0
});

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function componentToHex(value) {
    return clamp(Math.round(value), 0, 255)
        .toString(16)
        .padStart(2, "0");
}

export function normalizeHexColor(value, fallback = "") {
    const candidate = String(value || "").trim();
    const match = candidate.match(HEX_COLOR_PATTERN);

    if (!match) {
        return fallback;
    }

    let hex = match[1].toLowerCase();

    if (hex.length === 3) {
        hex = hex
            .split("")
            .map((character) => character.repeat(2))
            .join("");
    }

    return `#${hex}`;
}

export function hexToRgb(value) {
    const normalized = normalizeHexColor(value);

    if (!normalized) {
        return null;
    }

    return {
        r: Number.parseInt(normalized.slice(1, 3), 16),
        g: Number.parseInt(normalized.slice(3, 5), 16),
        b: Number.parseInt(normalized.slice(5, 7), 16)
    };
}

function rgbToHex({ r, g, b }) {
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

function rgbToHsl({ r, g, b }) {
    const red = r / 255;
    const green = g / 255;
    const blue = b / 255;
    const maximum = Math.max(red, green, blue);
    const minimum = Math.min(red, green, blue);
    const delta = maximum - minimum;
    let hue = 0;

    if (delta) {
        if (maximum === red) {
            hue = 60 * (((green - blue) / delta) % 6);
        } else if (maximum === green) {
            hue = 60 * ((blue - red) / delta + 2);
        } else {
            hue = 60 * ((red - green) / delta + 4);
        }
    }

    if (hue < 0) {
        hue += 360;
    }

    const lightness = (maximum + minimum) / 2;
    const saturation = delta === 0
        ? 0
        : delta / (1 - Math.abs(2 * lightness - 1));

    return { h: hue, s: saturation, l: lightness };
}

function hslToRgb({ h, s, l }) {
    const hue = ((h % 360) + 360) % 360;
    const saturation = clamp(s, 0, 1);
    const lightness = clamp(l, 0, 1);
    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const segment = hue / 60;
    const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
    let red = 0;
    let green = 0;
    let blue = 0;

    if (segment < 1) {
        red = chroma;
        green = secondary;
    } else if (segment < 2) {
        red = secondary;
        green = chroma;
    } else if (segment < 3) {
        green = chroma;
        blue = secondary;
    } else if (segment < 4) {
        green = secondary;
        blue = chroma;
    } else if (segment < 5) {
        red = secondary;
        blue = chroma;
    } else {
        red = chroma;
        blue = secondary;
    }

    const match = lightness - chroma / 2;

    return {
        r: (red + match) * 255,
        g: (green + match) * 255,
        b: (blue + match) * 255
    };
}

function getRelativeLuminance({ r, g, b }) {
    const channel = (value) => {
        const normalized = value / 255;
        return normalized <= 0.03928
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    };

    return (
        0.2126 * channel(r) +
        0.7152 * channel(g) +
        0.0722 * channel(b)
    );
}

export function getContrastText(value) {
    const rgb = hexToRgb(value);

    if (!rgb) {
        return "#ffffff";
    }

    const luminance = getRelativeLuminance(rgb);
    const contrastWithWhite = 1.05 / (luminance + 0.05);
    const contrastWithBlack = (luminance + 0.05) / 0.05;

    return contrastWithBlack >= contrastWithWhite
        ? "#0b0b12"
        : "#ffffff";
}

export function createCustomAccentPalette(value) {
    const primary = normalizeHexColor(
        value,
        DEFAULT_UI_THEME_SETTINGS.customColor
    );
    const rgb = hexToRgb(primary);
    const hsl = rgbToHsl(rgb);
    const secondaryHsl = {
        h: hsl.h + 34,
        s: clamp(Math.max(hsl.s, 0.58), 0, 0.92),
        l: hsl.l > 0.7
            ? clamp(hsl.l - 0.18, 0.32, 0.68)
            : hsl.l < 0.28
                ? clamp(hsl.l + 0.2, 0.36, 0.64)
                : clamp(hsl.l + 0.08, 0.36, 0.68)
    };
    const secondary = rgbToHex(hslToRgb(secondaryHsl));

    return {
        id: "custom",
        label: "Personnalisée",
        primary,
        secondary,
        rgb: `${rgb.r} ${rgb.g} ${rgb.b}`,
        contrast: getContrastText(primary)
    };
}

function buildPresetPalette(preset) {
    const rgb = hexToRgb(preset.primary);

    return {
        ...preset,
        rgb: `${rgb.r} ${rgb.g} ${rgb.b}`,
        contrast: getContrastText(preset.primary)
    };
}

export function normalizeUiThemeSettings(value = {}) {
    const customColor = normalizeHexColor(
        value.customColor,
        DEFAULT_UI_THEME_SETTINGS.customColor
    );
    const requestedAccent = String(value.accent || "").trim();
    const accent = requestedAccent === "custom" ||
        Object.hasOwn(UI_ACCENT_PRESETS, requestedAccent)
        ? requestedAccent
        : DEFAULT_UI_THEME_SETTINGS.accent;

    return {
        accent,
        customColor,
        motionEnabled: value.motionEnabled !== false,
        highContrast: value.highContrast === true,
        updatedAt: Number(value.updatedAt || 0)
    };
}

export function getUiThemePalette(settings = {}) {
    const normalized = normalizeUiThemeSettings(settings);

    if (normalized.accent === "custom") {
        return createCustomAccentPalette(normalized.customColor);
    }

    return buildPresetPalette(
        UI_ACCENT_PRESETS[normalized.accent] ||
        UI_ACCENT_PRESETS.violet
    );
}
