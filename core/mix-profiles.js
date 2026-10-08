export function normalizeMixProfileRecord(profile = {}, {
    createId,
    normalizeShuffleSettings,
    normalizeExclusionRules,
    normalizePriorityRules,
    normalizeCoherenceSettings,
    normalizeIntensitySettings,
    normalizeCleanupSettings
} = {}) {
    return {
        id:
            typeof profile.id === "string" && profile.id.trim()
                ? profile.id.trim().slice(0, 120)
                : createId(),
        name:
            typeof profile.name === "string" && profile.name.trim()
                ? profile.name.trim().slice(0, 60)
                : "Profil personnalisé",
        icon:
            typeof profile.icon === "string" && profile.icon.trim()
                ? profile.icon.trim().slice(0, 8)
                : "🎛️",
        description:
            typeof profile.description === "string"
                ? profile.description.trim().slice(0, 180)
                : "",
        isDefault: Boolean(profile.isDefault),
        shuffleSettings: normalizeShuffleSettings(profile.shuffleSettings),
        exclusionRules: normalizeExclusionRules(profile.exclusionRules),
        priorityRules: normalizePriorityRules(profile.priorityRules),
        coherenceSettings: normalizeCoherenceSettings(profile.coherenceSettings),
        intensitySettings: normalizeIntensitySettings(profile.intensitySettings),
        cleanupSettings: normalizeCleanupSettings(profile.cleanupSettings)
    };
}

export function readMixProfileRecords({
    storage,
    key,
    defaults = [],
    maxProfiles = 20,
    normalizeProfile
} = {}) {
    try {
        const raw = storage?.getItem?.(key);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!Array.isArray(parsed) || !parsed.length) {
            return defaults.map((profile) => normalizeProfile(profile));
        }

        return parsed
            .map((profile) => normalizeProfile(profile))
            .slice(0, maxProfiles);
    } catch (error) {
        console.warn("Profils de mix illisibles :", error);
        return defaults.map((profile) => normalizeProfile(profile));
    }
}

export function saveMixProfileRecords({ storage, key, profiles = [] } = {}) {
    try {
        storage?.setItem?.(key, JSON.stringify(profiles));
        return true;
    } catch (error) {
        console.warn("Impossible d’enregistrer les profils :", error);
        return false;
    }
}

export function getUniqueMixProfileName(profiles = [], name = "Profil importé") {
    const base = String(name || "Profil importé").trim().slice(0, 60) || "Profil importé";
    const names = new Set(
        profiles.map((profile) =>
            String(profile?.name || "").trim().toLocaleLowerCase("fr")
        )
    );

    if (!names.has(base.toLocaleLowerCase("fr"))) {
        return base;
    }

    for (let index = 2; index <= 99; index += 1) {
        const suffix = ` (${index})`;
        const candidate = `${base.slice(0, Math.max(1, 60 - suffix.length))}${suffix}`;
        if (!names.has(candidate.toLocaleLowerCase("fr"))) {
            return candidate;
        }
    }

    return `${base.slice(0, 48)}-${Date.now().toString(36)}`.slice(0, 60);
}

export function findMixProfileById(profiles = [], profileId = "") {
    return profiles.find((profile) => profile?.id === profileId) || null;
}

export function duplicateMixProfileRecord(profiles = [], profileId = "", {
    normalizeProfile,
    createId,
    maxProfiles = 20
} = {}) {
    const source = findMixProfileById(profiles, profileId);
    if (!source) {
        return { profiles, source: null, duplicate: null, reason: "missing" };
    }

    if (profiles.length >= maxProfiles) {
        return { profiles, source, duplicate: null, reason: "limit" };
    }

    const duplicate = normalizeProfile({
        ...source,
        id: createId(),
        name: `${source.name} copie`,
        isDefault: false
    });

    return {
        profiles: [duplicate, ...profiles].slice(0, maxProfiles),
        source,
        duplicate,
        reason: "ok"
    };
}

export function restoreDefaultMixProfileRecords(profiles = [], {
    defaults = [],
    normalizeProfile,
    maxProfiles = 20
} = {}) {
    const customProfiles = profiles.filter((profile) => !profile?.isDefault);

    return [
        ...defaults.map((profile) => normalizeProfile(profile)),
        ...customProfiles
    ].slice(0, maxProfiles);
}

export function renderMixProfilesPanel({
    profiles = [],
    activeProfileId = "",
    maxProfiles = 20,
    escapeHtml,
    getSummary
} = {}) {
    const activeProfile = findMixProfileById(profiles, activeProfileId);
    const html = (value) => escapeHtml?.(value) ?? String(value ?? "");

    const cards = profiles.map((profile) => `
        <article
            class="mix-profile-card ${profile.id === activeProfileId ? "is-active" : ""}"
            data-mix-profile-card-id="${html(profile.id)}"
        >
            <div class="mix-profile-card-main">
                <span class="mix-profile-icon">${html(profile.icon)}</span>
                <div>
                    <h4>${html(profile.name)}</h4>
                    <p>${html(profile.description || "Profil Shuffle+")}</p>
                    <small>${html(getSummary(profile))}</small>
                </div>
            </div>

            <div class="mix-profile-actions">
                <button
                    class="mix-profile-apply"
                    type="button"
                    data-profile-action="apply"
                    data-profile-id="${html(profile.id)}"
                >
                    ${profile.id === activeProfileId ? "✓ Actif" : "Appliquer"}
                </button>

                <button
                    class="mix-profile-secondary"
                    type="button"
                    data-profile-action="duplicate"
                    data-profile-id="${html(profile.id)}"
                    title="Dupliquer"
                >
                    📄
                </button>

                <button
                    class="mix-profile-secondary"
                    type="button"
                    data-profile-action="share"
                    data-profile-id="${html(profile.id)}"
                    title="Partager ou exporter"
                    aria-label="Partager ou exporter ${html(profile.name)}"
                >
                    📤
                </button>

                ${profile.isDefault ? "" : `
                    <button
                        class="mix-profile-secondary"
                        type="button"
                        data-profile-action="rename"
                        data-profile-id="${html(profile.id)}"
                        title="Renommer"
                    >
                        ✏️
                    </button>

                    <button
                        class="mix-profile-secondary mix-profile-delete"
                        type="button"
                        data-profile-action="delete"
                        data-profile-id="${html(profile.id)}"
                        title="Supprimer"
                    >
                        🗑️
                    </button>
                `}
            </div>
        </article>
    `).join("");

    return `
        <section class="mix-profiles-panel">
            <div class="mix-profiles-heading">
                <div>
                    <h3>Profils de mix intelligents</h3>
                    <p>
                        ${activeProfile
                            ? `Profil actif : ${html(activeProfile.name)}`
                            : "Aucun profil actif"}
                        · ${profiles.length}/${maxProfiles}
                    </p>
                </div>

                <div class="mix-profiles-heading-actions">
                    <button
                        id="createProfileFromCurrentButton"
                        class="mix-profile-create"
                        type="button"
                    >
                        + Créer depuis les réglages actuels
                    </button>

                    <button
                        id="importMixProfileButton"
                        class="mix-profile-restore"
                        type="button"
                    >
                        📥 Importer un profil
                    </button>

                    <input
                        id="importMixProfileInput"
                        class="mix-profile-import-input"
                        type="file"
                        accept=".json,.profile.json,application/json"
                        hidden
                    >

                    <button
                        id="restoreDefaultProfilesButton"
                        class="mix-profile-restore"
                        type="button"
                    >
                        Restaurer les profils par défaut
                    </button>

                    ${activeProfile ? `
                        <button
                            id="clearActiveProfileButton"
                            class="mix-profile-restore"
                            type="button"
                        >
                            Désactiver
                        </button>
                    ` : ""}
                </div>
            </div>

            <div class="mix-profiles-list">
                ${cards}
            </div>
        </section>
    `;
}
