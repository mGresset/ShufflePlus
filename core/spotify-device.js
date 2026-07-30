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

export function findStoredPreferredDevice(devices, preferredDevice) {
    const usable = Array.isArray(devices)
        ? devices.filter(isUsableSpotifyDevice)
        : [];
    const preferred = normalizePreferredSpotifyDevice(preferredDevice);

    if (!usable.length || (!preferred.id && !preferred.name)) {
        return null;
    }

    if (preferred.id) {
        const exact = usable.find((device) => device.id === preferred.id);
        if (exact) {
            return exact;
        }
    }

    const wantedName = normalizeSearchText(preferred.name);
    const wantedType = normalizeSearchText(preferred.type);

    if (wantedName) {
        const sameNameAndType = usable.find((device) => {
            const name = normalizeSearchText(device.name);
            const type = normalizeSearchText(device.type);
            return name === wantedName && (!wantedType || type === wantedType);
        });

        if (sameNameAndType) {
            return sameNameAndType;
        }

        const closeName = usable.find((device) =>
            normalizeSearchText(device.name).includes(wantedName)
        );

        if (closeName) {
            return closeName;
        }
    }

    if (wantedType) {
        return usable.find(
            (device) => normalizeSearchText(device.type) === wantedType
        ) || null;
    }

    return null;
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

    if (mode === "preferred") {
        const stored = findStoredPreferredDevice(usable, preferredDevice);
        if (stored) {
            return stored;
        }
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

    if (mode === "iphone" || mode === "preferred") {
        const phone = usable.find((device) => {
            const name = normalizeSearchText(device.name);
            const type = normalizeSearchText(device.type);
            return name.includes("iphone") || type === "smartphone";
        });
        if (phone) {
            return phone;
        }
    }

    if (["active", "iphone", "preferred"].includes(mode)) {
        const active = usable.find((device) => device.is_active);
        if (active) {
            return active;
        }
    }

    return usable[0];
}
