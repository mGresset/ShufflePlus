export const DEFAULT_DYNAMIC_LYRICS_SETTINGS = Object.freeze({
    enabled: false,
    shortcutName: "Shuffle+ Dynamic Lyrics",
    launchDelayMs: 1200,
    updatedAt: 0
});

export function normalizeDynamicLyricsSettings(settings = {}) {
    const shortcutName =
        typeof settings.shortcutName === "string"
            ? settings.shortcutName.trim().slice(0, 120)
            : "";

    const delay = Number(settings.launchDelayMs);

    return {
        enabled: settings.enabled === true,
        shortcutName:
            shortcutName ||
            DEFAULT_DYNAMIC_LYRICS_SETTINGS.shortcutName,
        launchDelayMs: Number.isFinite(delay)
            ? Math.min(5000, Math.max(0, Math.round(delay)))
            : DEFAULT_DYNAMIC_LYRICS_SETTINGS.launchDelayMs,
        updatedAt: Number.isFinite(Number(settings.updatedAt))
            ? Math.max(0, Number(settings.updatedAt))
            : 0
    };
}

export function normalizeDynamicLyricsCommandOptions(command = {}) {
    return {
        openDynamicLyrics:
            command.openDynamicLyrics === true,
        dynamicLyricsShortcutName:
            typeof command.dynamicLyricsShortcutName === "string"
                ? command.dynamicLyricsShortcutName
                    .trim()
                    .slice(0, 120)
                : ""
    };
}

export function getDynamicLyricsShortcutName(
    command = {},
    settings = DEFAULT_DYNAMIC_LYRICS_SETTINGS
) {
    const normalizedSettings =
        normalizeDynamicLyricsSettings(settings);
    const normalizedCommand =
        normalizeDynamicLyricsCommandOptions(command);

    return (
        normalizedCommand.dynamicLyricsShortcutName ||
        normalizedSettings.shortcutName
    );
}

export function canLaunchDynamicLyrics(
    command = {},
    settings = DEFAULT_DYNAMIC_LYRICS_SETTINGS
) {
    const normalizedSettings =
        normalizeDynamicLyricsSettings(settings);
    const normalizedCommand =
        normalizeDynamicLyricsCommandOptions(command);

    return Boolean(
        normalizedSettings.enabled &&
        normalizedCommand.openDynamicLyrics &&
        getDynamicLyricsShortcutName(
            normalizedCommand,
            normalizedSettings
        )
    );
}

export function buildShortcutRunUrl(
    shortcutName,
    {
        inputText = "",
        callbackUrl = ""
    } = {}
) {
    const name =
        typeof shortcutName === "string"
            ? shortcutName.trim().slice(0, 120)
            : "";

    if (!name) {
        return "";
    }

    if (callbackUrl) {
        const params = new URLSearchParams({
            name
        });

        if (inputText) {
            params.set("input", "text");
            params.set("text", String(inputText).slice(0, 1000));
        }

        params.set("x-success", String(callbackUrl));
        params.set("x-cancel", String(callbackUrl));
        params.set("x-error", String(callbackUrl));

        return (
            "shortcuts://x-callback-url/run-shortcut?" +
            params.toString()
        );
    }

    const params = new URLSearchParams({
        name
    });

    if (inputText) {
        params.set("input", "text");
        params.set("text", String(inputText).slice(0, 1000));
    }

    return (
        "shortcuts://run-shortcut?" +
        params.toString()
    );
}

export function buildDynamicLyricsLaunchUrl(
    command = {},
    settings = DEFAULT_DYNAMIC_LYRICS_SETTINGS,
    options = {}
) {
    const normalizedSettings =
        normalizeDynamicLyricsSettings(settings);
    const normalizedCommand =
        normalizeDynamicLyricsCommandOptions(command);

    if (
        !normalizedSettings.enabled ||
        !normalizedCommand.openDynamicLyrics
    ) {
        return "";
    }

    return buildShortcutRunUrl(
        getDynamicLyricsShortcutName(
            normalizedCommand,
            normalizedSettings
        ),
        options
    );
}
