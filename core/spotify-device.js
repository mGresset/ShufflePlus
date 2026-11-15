import {
    resolvePreferredSpotifyDevice
} from "./spotify-device-identity.js";

function cleanText(value, maxLength = 160) {
    return typeof value === "string"
        ? value.trim().slice(0, maxLength)
        : "";
}

export function normalizePreferredSpotifyDevice(device = {}) {
    return {
        id: cleanText(device.id, 160),
        name: cleanText(device.name, 120),
        type: cleanText(device.type, 80),
        savedAt: Number.isFinite(Number(device.savedAt))
            ? Math.max(0, Number(device.savedAt))
            : 0,
        lastSeenAt: Number.isFinite(Number(device.lastSeenAt))
            ? Math.max(0, Number(device.lastSeenAt))
            : 0
    };
}

export function isUsableSpotifyDevice(device) {
    return Boolean(
        device &&
        typeof device.id === "string" &&
        device.id.trim() &&
        device.is_restricted !== true
    );
}

function normalizeSearchText(value = "") {
    return String(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

// v12 : la recherche du préféré délègue au résolveur d’identité logique.
// Elle accepte l’ancien format { id, name, type } comme la projection v2 et
// ne retourne JAMAIS un appareil simplement « proche » ou « du même type ».
export function findStoredPreferredDevice(devices, preferredDevice) {
    const usable = Array.isArray(devices)
        ? devices.filter(isUsableSpotifyDevice)
        : [];

    if (!usable.length || !preferredDevice) {
        return null;
    }

    const resolution = resolvePreferredSpotifyDevice({
        identity: preferredDevice,
        devices: usable
    });

    return resolution.status === "resolved"
        ? usable.find((device) => device.id === resolution.device.id) || null
        : null;
}

export function selectSpotifyDevice(
    devices,
    {
        mode = "preferred",
        preferredDevice = null,
        deviceName = ""
    } = {}
) {
    const usable = Array.isArray(devices)
        ? devices.filter(isUsableSpotifyDevice)
        : [];

    if (!usable.length) {
        return null;
    }

    const preferredConfigured = Boolean(
        preferredDevice &&
        (preferredDevice.id || preferredDevice.name ||
            preferredDevice.currentSpotifyDeviceId || preferredDevice.normalizedName)
    );

    if (mode === "preferred" && preferredConfigured) {
        // Mode strict : l’iPhone préféré ou rien. Aucun repli vers un autre
        // smartphone, l’appareil actif ou le premier appareil disponible.
        return findStoredPreferredDevice(usable, preferredDevice);
    }

    // Sans iPhone préféré enregistré, « preferred » garde le comportement
    // historique (smartphone, puis appareil actif, puis premier disponible).
    if (mode === "preferred") {
        mode = "iphone";
    }

    if (mode === "named" && deviceName) {
        const wanted = normalizeSearchText(deviceName);
        const named = usable.find((device) =>
            normalizeSearchText(device.name).includes(wanted)
        );
        if (named) {
            return named;
        }
    }

    if (mode === "iphone") {
        const phone = usable.find((device) => {
            const name = normalizeSearchText(device.name);
            const type = normalizeSearchText(device.type);
            return name.includes("iphone") || type === "smartphone";
        });
        if (phone) {
            return phone;
        }
    }

    if (["active", "iphone"].includes(mode)) {
        const active = usable.find((device) => device.is_active);
        if (active) {
            return active;
        }
    }

    return usable[0];
}
