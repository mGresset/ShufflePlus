export const POST_UPDATE_DIAGNOSTIC_KEY =
    "shuffleplus_post_update_diagnostic_v1";

const DEVICE_LIMIT = 12;

function normalizeText(value = "") {
    return String(value || "").trim();
}

function normalizeDevice(device = {}, source = "devices") {
    return {
        id: normalizeText(device.id),
        name: normalizeText(device.name) || "Appareil Spotify",
        type: normalizeText(device.type),
        isActive: device.is_active === true,
        isRestricted: device.is_restricted === true,
        volumePercent: Number.isFinite(Number(device.volume_percent))
            ? Math.max(0, Math.min(100, Number(device.volume_percent)))
            : null,
        source
    };
}

function isPhoneLike(device = {}) {
    const text = `${device.name || ""} ${device.type || ""}`.toLocaleLowerCase("fr-FR");
    return text.includes("iphone") ||
        text.includes("smartphone") ||
        text.includes("phone") ||
        text.includes("mobile");
}

function sameDevice(left = {}, right = {}) {
    if (left.id && right.id) return left.id === right.id;
    return normalizeText(left.name).toLocaleLowerCase("fr-FR") ===
        normalizeText(right.name).toLocaleLowerCase("fr-FR") &&
        Boolean(normalizeText(left.name));
}

function sanitizeError(error) {
    if (!error) return "";
    const status = Number(error.status || error.statusCode) || 0;
    if (status) return `HTTP ${status}`;
    const code = normalizeText(error.code);
    return code ? code.slice(0, 64) : "Erreur API";
}

export function buildSpotifyConnectDiagnostic({
    connected = false,
    devices = [],
    playback = null,
    preferredDevice = null,
    lastWorkingDevice = null,
    devicesError = null,
    playbackError = null,
    now = Date.now()
} = {}) {
    const listedDevices = (Array.isArray(devices) ? devices : [])
        .filter(Boolean)
        .slice(0, DEVICE_LIMIT)
        .map((device) => normalizeDevice(device, "devices"));
    const playbackDevice = playback?.device?.id
        ? normalizeDevice(playback.device, "player")
        : null;
    const mergedDevices = [...listedDevices];

    if (
        playbackDevice &&
        !mergedDevices.some((device) => sameDevice(device, playbackDevice))
    ) {
        mergedDevices.unshift(playbackDevice);
    }

    const preferred = preferredDevice?.id || preferredDevice?.name
        ? normalizeDevice(preferredDevice, "preferred")
        : null;
    const lastWorking = lastWorkingDevice?.id || lastWorkingDevice?.name
        ? normalizeDevice(lastWorkingDevice, "last-working")
        : null;
    const preferredMatch = preferred
        ? mergedDevices.find((device) => sameDevice(device, preferred)) || null
        : null;
    const lastWorkingMatch = lastWorking
        ? mergedDevices.find((device) => sameDevice(device, lastWorking)) || null
        : null;
    const activeDevice = mergedDevices.find((device) => device.isActive) || playbackDevice || null;
    const phoneDevice = mergedDevices.find(isPhoneLike) || null;
    const resolvedDevice = preferredMatch || activeDevice || phoneDevice || lastWorkingMatch || mergedDevices[0] || null;
    const source = resolvedDevice?.source || "none";

    let level = "healthy";
    let label = "Spotify Connect prêt";
    let summary = resolvedDevice
        ? `${resolvedDevice.name}${resolvedDevice.isActive ? " · actif" : ""}`
        : "Aucun appareil";

    if (!connected) {
        level = "critical";
        label = "Spotify déconnecté";
        summary = "Reconnecte Spotify";
    } else if (devicesError && playbackError) {
        level = "critical";
        label = "Spotify Connect inaccessible";
        summary = "Les deux vérifications API ont échoué";
    } else if (!resolvedDevice) {
        level = "attention";
        label = "Aucun appareil détecté";
        summary = "Ouvre Spotify et lance brièvement un morceau";
    } else if (!preferredMatch && preferred) {
        level = "attention";
        label = "Appareil de secours détecté";
        summary = `${resolvedDevice.name} · appareil préféré absent`;
    } else if (!listedDevices.length && playbackDevice) {
        level = "attention";
        label = "Fallback lecteur actif";
        summary = `${playbackDevice.name} · trouvé via /me/player`;
    }

    const checks = [
        {
            id: "session",
            ok: connected,
            label: "Session Spotify",
            value: connected ? "Connectée" : "Déconnectée"
        },
        {
            id: "devices-endpoint",
            ok: !devicesError,
            label: "/me/player/devices",
            value: devicesError
                ? sanitizeError(devicesError)
                : `${listedDevices.length} appareil(s)`
        },
        {
            id: "player-endpoint",
            ok: !playbackError,
            label: "/me/player",
            value: playbackError
                ? sanitizeError(playbackError)
                : playbackDevice
                    ? `${playbackDevice.name}${playbackDevice.isActive ? " · actif" : ""}`
                    : "Aucun lecteur actif"
        },
        {
            id: "preferred",
            ok: !preferred || Boolean(preferredMatch),
            label: "Appareil préféré",
            value: !preferred
                ? "Non défini"
                : preferredMatch
                    ? "Détecté"
                    : "Absent"
        },
        {
            id: "resolved",
            ok: Boolean(resolvedDevice),
            label: "Appareil utilisable",
            value: resolvedDevice
                ? `${resolvedDevice.name} · ${source}`
                : "Aucun"
        }
    ];

    return {
        generatedAt: Number(now) || Date.now(),
        level,
        label,
        summary,
        source,
        connected: Boolean(connected),
        listedDeviceCount: listedDevices.length,
        mergedDeviceCount: mergedDevices.length,
        playbackActive: Boolean(playback?.is_playing),
        preferredConfigured: Boolean(preferred),
        preferredMatched: Boolean(preferredMatch),
        fallbackUsed: Boolean(playbackDevice && !listedDevices.some((device) => sameDevice(device, playbackDevice))),
        resolvedDevice: resolvedDevice
            ? {
                name: resolvedDevice.name,
                type: resolvedDevice.type,
                isActive: resolvedDevice.isActive,
                source: resolvedDevice.source,
                isPhoneLike: isPhoneLike(resolvedDevice)
            }
            : null,
        devices: mergedDevices.map((device) => ({
            name: device.name,
            type: device.type,
            isActive: device.isActive,
            source: device.source,
            isPhoneLike: isPhoneLike(device)
        })),
        checks,
        errors: {
            devices: sanitizeError(devicesError),
            playback: sanitizeError(playbackError)
        }
    };
}

export function formatSpotifyConnectDiagnosticText(diagnostic = {}) {
    const lines = [
        "Shuffle+ — diagnostic Spotify Connect",
        `État : ${diagnostic.label || "Non vérifié"}`,
        `Résumé : ${diagnostic.summary || "—"}`,
        `Appareils /devices : ${Number(diagnostic.listedDeviceCount) || 0}`,
        `Lecture active : ${diagnostic.playbackActive ? "oui" : "non"}`,
        `Appareil préféré : ${diagnostic.preferredConfigured ? (diagnostic.preferredMatched ? "détecté" : "absent") : "non défini"}`,
        `Fallback /me/player : ${diagnostic.fallbackUsed ? "utilisé" : "non"}`
    ];

    if (diagnostic.resolvedDevice) {
        lines.push(
            `Appareil retenu : ${diagnostic.resolvedDevice.isPhoneLike ? "smartphone" : (diagnostic.resolvedDevice.type || "appareil Spotify")}`,
            `Type : ${diagnostic.resolvedDevice.type || "inconnu"}`,
            `Source : ${diagnostic.resolvedDevice.source || diagnostic.source || "inconnue"}`
        );
    }

    for (const check of Array.isArray(diagnostic.checks) ? diagnostic.checks : []) {
        lines.push(`${check.ok ? "✅" : "⚠️"} ${check.label}: ${check.value}`);
    }

    lines.push("Confidentialité : aucun token OAuth ni device_id n’est inclus.");
    return lines.join("\n");
}

export function buildPostUpdateDiagnosticMarker({
    fromBuild = "",
    toBuild = "",
    createdAt = Date.now()
} = {}) {
    return {
        format: "shuffleplus-post-update-diagnostic",
        schemaVersion: 1,
        fromBuild: normalizeText(fromBuild),
        toBuild: normalizeText(toBuild),
        createdAt: Number(createdAt) || Date.now()
    };
}


export function readPostUpdateDiagnosticMarker(storage) {
    if (!storage) return null;
    try {
        const parsed = JSON.parse(storage.getItem(POST_UPDATE_DIAGNOSTIC_KEY) || "null");
        if (parsed?.format !== "shuffleplus-post-update-diagnostic") return null;
        return {
            ...parsed,
            fromBuild: normalizeText(parsed.fromBuild),
            toBuild: normalizeText(parsed.toBuild),
            createdAt: Math.max(0, Number(parsed.createdAt) || 0)
        };
    } catch {
        return null;
    }
}

export function clearPostUpdateDiagnosticMarker(storage) {
    try {
        storage?.removeItem?.(POST_UPDATE_DIAGNOSTIC_KEY);
        return true;
    } catch {
        return false;
    }
}
